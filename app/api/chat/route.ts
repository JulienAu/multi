import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance, streamFromOpenClaw, cleanOpenClawResponse } from '@/lib/openclaw/manager'
import { callLLM, MODELS } from '@/lib/llm/client'
import { db, chatMessages, conversations } from '@/lib/db'
import { desc, eq, and } from 'drizzle-orm'
import { z } from 'zod'

const sendSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const maybeUserId = await getCurrentUserId()
    if (!maybeUserId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const userId: string = maybeUserId

    const { message, conversationId } = sendSchema.parse(await req.json())

    const instance = await getOpenClawInstance(userId)
    if (!instance || instance.status !== 'running') {
      return NextResponse.json({ error: 'Agent non déployé.' }, { status: 400 })
    }

    // Save user message
    await db.insert(chatMessages).values({ userId, conversationId, role: 'user', content: message })

    // Update conversation timestamp
    const conv = await db.query.conversations.findFirst({
      where: (c, { eq }) => eq(c.id, conversationId),
    })
    await db.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId))

    // Auto-generate title via LLM on first message (fire-and-forget)
    if (conv?.title === 'Nouvelle conversation') {
      generateConversationTitle(conversationId, message).catch(console.error)
    }

    // Load conversation history (last 20 messages of THIS conversation)
    const history = await db.query.chatMessages.findMany({
      where: (m, { eq, and }) => and(eq(m.userId, userId), eq(m.conversationId, conversationId)),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 20,
    })
    const chatHistory = history.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Stream from OpenClaw
    const openclawResponse = await streamFromOpenClaw(instance, chatHistory)
    if (!openclawResponse.body) return NextResponse.json({ error: 'No stream body' }, { status: 500 })

    const openclawReader = openclawResponse.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let clientClosed = false

    const APPROVE_PATTERN = /\/?[Aa]pprove\s+\S+\s+(allow-once|allow-always|allow|deny)\s*/g

    const backgroundConsume = async (onDelta: (text: string) => void) => {
      let pendingBuffer = ''

      const flushClean = (force: boolean) => {
        if (!pendingBuffer) return
        if (!force) {
          const lastSlash = pendingBuffer.lastIndexOf('/')
          const lastA = pendingBuffer.lastIndexOf('A')
          const suspectStart = Math.max(lastSlash, lastA)
          if (suspectStart >= 0 && pendingBuffer.length - suspectStart < 50) {
            const safe = pendingBuffer.slice(0, suspectStart)
            if (safe) onDelta(safe)
            pendingBuffer = pendingBuffer.slice(suspectStart)
            return
          }
        }
        const cleaned = pendingBuffer.replace(APPROVE_PATTERN, '')
        if (cleaned) onDelta(cleaned)
        pendingBuffer = ''
      }

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
              if (delta) { fullContent += delta; pendingBuffer += delta; flushClean(false) }
            } catch {}
          }
        }
        flushClean(true)
      } catch (e) {
        console.error('[chat/background]', e)
      } finally {
        fullContent = cleanOpenClawResponse(fullContent)
        if (fullContent) {
          await db.insert(chatMessages).values({
            userId, conversationId, role: 'assistant', content: fullContent,
          }).catch(console.error)
        }
      }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        backgroundConsume((delta) => {
          if (clientClosed) return
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`)) }
          catch { clientClosed = true }
        }).then(() => {
          if (!clientClosed) {
            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)); controller.close() }
            catch {}
          }
        })
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
      await db.update(conversations)
        .set({ title })
        .where(eq(conversations.id, conversationId))
    }
  } catch (e) {
    console.error('[chat/title]', e)
    // Fallback: use truncated message
    await db.update(conversations)
      .set({ title: firstMessage.slice(0, 60) })
      .where(eq(conversations.id, conversationId))
  }
}
