import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance, streamFromOpenClaw, cleanOpenClawResponse } from '@/lib/openclaw/manager'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { callLLM, MODELS } from '@/lib/llm/client'
import { db, chatMessages, conversations } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { OpenClawEvent } from '@/lib/openclaw/ws-client'

const sendSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid(),
  images: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const maybeUserId = await getCurrentUserId()
    if (!maybeUserId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const userId: string = maybeUserId

    const { message, conversationId, images } = sendSchema.parse(await req.json())

    const instance = await getOpenClawInstance(userId)
    if (!instance || instance.status !== 'running') {
      return NextResponse.json({ error: 'Agent non déployé.' }, { status: 400 })
    }

    // Save user message
    await db.insert(chatMessages).values({ userId, conversationId, role: 'user', content: message })

    // Auto-title on first message
    const conv = await db.query.conversations.findFirst({
      where: (c, { eq }) => eq(c.id, conversationId),
    })
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId))
    if (conv?.title === 'Nouvelle conversation') {
      generateConversationTitle(conversationId, message).catch(console.error)
    }

    const hasImages = images && images.length > 0

    // For messages with images: use HTTP multimodal endpoint
    // For text-only: use WebSocket (full agent mode with tool loop)
    if (hasImages) {
      return handleMultimodalChat(userId, conversationId, message, images!, instance)
    }

    // Connect via WebSocket (full agent mode with tool loop)
    let session
    try {
      session = await sessionManager.getSession(userId)
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Cannot connect to agent' }, { status: 500 })
    }

    let fullContent = ''
    let lastSeenContent = '' // For cumulative delta detection
    let clientClosed = false
    const APPROVE_PATTERN = /\/?[Aa]pprove\s+\S+\s+(allow-once|allow-always|allow|deny)\s*/g
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        const removeListener = sessionManager.addListener(userId, (event: OpenClawEvent) => {
          if (clientClosed) return
          try {
            switch (event.type) {
              case 'chat.delta': {
                const received = event.data.content
                // Detect cumulative vs incremental
                let delta: string
                if (received.length > lastSeenContent.length && received.startsWith(lastSeenContent)) {
                  delta = received.slice(lastSeenContent.length)
                  lastSeenContent = received
                } else {
                  delta = received
                  lastSeenContent += received
                }
                if (!delta) break

                // Filter /approve commands
                const cleaned = delta.replace(APPROVE_PATTERN, '')
                if (cleaned) {
                  fullContent += cleaned
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: cleaned })}\n\n`))
                }
                break
              }
              case 'chat.final':
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                cleanup()
                break
              case 'chat.error':
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`))
                cleanup()
                break
              case 'tool.requested':
                // Notify client that agent is using a tool
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_use',
                  command: event.request.command || event.request.title || event.request.description,
                })}\n\n`))
                break
            }
          } catch { clientClosed = true }
        })

        // Send message via WebSocket (triggers full agent loop)
        sessionManager.sendMessage(userId, message).catch((err) => {
          if (!clientClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`))
          }
          cleanup()
        })

        // Timeout 5 minutes
        const timeout = setTimeout(() => {
          if (fullContent) {
            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)) } catch {}
          }
          cleanup()
        }, 300_000)

        function cleanup() {
          clearTimeout(timeout)
          removeListener()
          clientClosed = true
          try { controller.close() } catch {}

          // Save response
          const cleaned = fullContent.replace(APPROVE_PATTERN, '').trim()
          if (cleaned) {
            db.insert(chatMessages).values({
              userId, conversationId, role: 'assistant', content: cleaned,
            }).catch(console.error)
          }
        }
      },
      cancel() { clientClosed = true },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (error) {
    console.error('[chat]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Chat failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const conversationId = req.nextUrl.searchParams.get('conversationId')
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

    const messages = await db.query.chatMessages.findMany({
      where: (m, { eq, and }) => and(eq(m.userId, userId), eq(m.conversationId, conversationId)),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 50,
    })

    return NextResponse.json({
      messages: messages.reverse().map(m => ({
        id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[chat/history]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * Handle messages with images via HTTP multimodal endpoint.
 * Uses OpenAI-compatible /v1/chat/completions with content blocks.
 */
async function handleMultimodalChat(
  userId: string,
  conversationId: string,
  message: string,
  imageDataUrls: string[],
  instance: { port: number; gatewayToken: string; containerName: string },
) {
  // Build multimodal content blocks
  const contentBlocks: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: 'text', text: message },
  ]
  for (const dataUrl of imageDataUrls) {
    contentBlocks.push({ type: 'image_url', image_url: { url: dataUrl } })
  }

  // Load history (text only for previous messages)
  const history = await db.query.chatMessages.findMany({
    where: (m, { eq, and }) => and(eq(m.userId, userId), eq(m.conversationId, conversationId)),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
    limit: 10,
  })
  const chatHistory = history.reverse().slice(0, -1).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Add current multimodal message
  const messages = [...chatHistory, { role: 'user' as const, content: contentBlocks }]

  const openclawResponse = await streamFromOpenClaw(instance, messages as { role: string; content: string }[])
  if (!openclawResponse.body) {
    return NextResponse.json({ error: 'No stream body' }, { status: 500 })
  }

  const openclawReader = openclawResponse.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let clientClosed = false
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await openclawReader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                if (!clientClosed) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`))
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.error('[chat/multimodal]', e)
      } finally {
        fullContent = cleanOpenClawResponse(fullContent)
        if (!clientClosed) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)); controller.close() } catch {}
        }
        if (fullContent) {
          await db.insert(chatMessages).values({ userId, conversationId, role: 'assistant', content: fullContent }).catch(console.error)
        }
      }
    },
    cancel() { clientClosed = true },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

async function generateConversationTitle(conversationId: string, firstMessage: string) {
  try {
    const response = await callLLM({
      model: MODELS.LIGHT,
      max_tokens: 30,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Génère un titre court (3-6 mots max, en français) pour une conversation qui commence par ce message. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.\n\nMessage: "${firstMessage.slice(0, 200)}"`,
      }],
    })
    const title = response.choices[0]?.message?.content?.trim().slice(0, 80)
    if (title) {
      await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId))
    }
  } catch {
    await db.update(conversations)
      .set({ title: firstMessage.slice(0, 60) })
      .where(eq(conversations.id, conversationId))
  }
}
