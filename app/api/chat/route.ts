import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance, streamFromOpenClaw, cleanOpenClawResponse } from '@/lib/openclaw/manager'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { llmGateway } from '@/lib/llm/gateway'
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
      generateConversationTitle(conversationId, message, userId).catch(console.error)
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

    let lastSeenContent = '' // For cumulative delta detection
    let clientClosed = false
    let agentDone = false
    let savedToDb = false
    const APPROVE_PATTERN = /\/?[Aa]pprove\s+\S+\s+(allow-once|allow-always|allow|deny)\s*/g
    const encoder = new TextEncoder()

    // Track tool steps and text for clean DB save
    const toolSteps: string[] = []
    let currentTextSegment = ''

    function buildDbContent(): string {
      let content = ''
      if (toolSteps.length > 0) {
        content = toolSteps.map(s => `> ⚙ ${s}`).join('\n') + '\n\n'
      }
      content += currentTextSegment.replace(APPROVE_PATTERN, '').trim()
      return content.trim()
    }

    // Save response to DB (idempotent — only saves once)
    function saveResponse() {
      if (savedToDb) return
      savedToDb = true
      const cleaned = buildDbContent()
      if (cleaned) {
        db.insert(chatMessages).values({
          userId, conversationId, role: 'assistant', content: cleaned,
        }).catch(console.error)
      }
    }

    // Background listener — keeps running even if client disconnects
    const removeListener = sessionManager.addListener(userId, (event: OpenClawEvent) => {
      try {
        switch (event.type) {
          case 'chat.delta': {
            const received = event.data.content
            // OpenClaw sends cumulative content per turn — extract only the new part
            let delta: string
            if (received.length > lastSeenContent.length && received.startsWith(lastSeenContent)) {
              delta = received.slice(lastSeenContent.length)
            } else if (received.length < lastSeenContent.length || !received.startsWith(lastSeenContent)) {
              // Content reset = new agent turn after tool execution
              // Emit a synthetic tool_use event to collapse the previous text
              const prevSummary = currentTextSegment.trim().slice(0, 60).replace(/\n/g, ' ')
              if (prevSummary && currentTextSegment.length > 20) {
                toolSteps.push(prevSummary + (currentTextSegment.length > 60 ? '...' : ''))
                currentTextSegment = ''
                if (!clientClosed) {
                  try {
                    streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_use', command: toolSteps[toolSteps.length - 1] })}\n\n`))
                  } catch {}
                }
              }
              delta = received
            } else {
              delta = ''
            }
            lastSeenContent = received
            if (!delta) break

            // Filter /approve commands
            const cleaned = delta.replace(APPROVE_PATTERN, '')
            if (cleaned) {
              currentTextSegment += cleaned
              if (!clientClosed) {
                try {
                  streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: cleaned })}\n\n`))
                } catch { clientClosed = true }
              }
            }
            break
          }
          case 'chat.final':
            agentDone = true
            if (!clientClosed) {
              try { streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)) } catch {}
            }
            finalize()
            break
          case 'chat.error':
            agentDone = true
            if (!clientClosed) {
              try { streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`)) } catch {}
            }
            finalize()
            break
          case 'tool.requested': {
            const cmd = event.request.command || event.request.title || event.request.description || 'tool'
            toolSteps.push(cmd)
            currentTextSegment = ''
            if (!clientClosed) {
              try {
                streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_use',
                  command: cmd,
                })}\n\n`))
              } catch { clientClosed = true }
            }
          }
            break
          case 'disconnected':
            agentDone = true
            if (!clientClosed) {
              try { streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Agent disconnected' })}\n\n`)) } catch {}
            }
            finalize()
            break
        }
      } catch { clientClosed = true }
    })

    // Send message via WebSocket (triggers full agent loop)
    sessionManager.sendMessage(userId, message).catch((err) => {
      if (!clientClosed) {
        try { streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)) } catch {}
      }
      agentDone = true
      finalize()
    })

    // Timeout 5 minutes
    const timeout = setTimeout(() => {
      if (!agentDone) {
        agentDone = true
        if (!clientClosed) {
          try { streamController?.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)) } catch {}
        }
        finalize()
      }
    }, 300_000)

    function finalize() {
      clearTimeout(timeout)
      removeListener()
      saveResponse()
      if (!clientClosed) {
        try { streamController?.close() } catch {}
      }
      clientClosed = true
    }

    let streamController: ReadableStreamDefaultController | null = null

    const stream = new ReadableStream({
      start(controller) {
        streamController = controller
      },
      cancel() {
        // Client disconnected — agent keeps running in background
        clientClosed = true
        // If agent already finished, save now
        if (agentDone) saveResponse()
      },
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

async function generateConversationTitle(conversationId: string, firstMessage: string, userId: string) {
  try {
    const response = await llmGateway(userId, 'light', 'auto-title', {
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
