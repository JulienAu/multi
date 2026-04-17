import { NextRequest, NextResponse } from 'next/server'
import { db, arsCoachSessions, arsCoachMessages } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { callLLMStream } from '@/lib/llm/client'
import { selectChapters, buildSystemPrompt, buildMessages } from '@/lib/ars-coach/prompt'

// ARS Coach uses its own models, independent of MULTI's per-plan config.
const ARS_COACH_MODEL = process.env.ARS_COACH_MODEL || 'anthropic/claude-sonnet-4-5'

const PRE_ACTIVATION_LIMIT = 10
const ACTIVATED_DAILY_LIMIT = 20

const schema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().uuid(),
})

/** GET /api/ars-coach/chat?sessionId=... — Load message history. */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const session = await db.query.arsCoachSessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const messages = await db.query.arsCoachMessages.findMany({
    where: (m, { eq }) => eq(m.sessionId, sessionId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    limit: 100,
  })

  return NextResponse.json({
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
    session: {
      messageCount: session.messageCount,
      email: session.email,
      activated: !!session.email,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { message, sessionId } = body.data

    // Load session
    const session = await db.query.arsCoachSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Rate limit
    if (!session.email && session.messageCount >= PRE_ACTIVATION_LIMIT) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'Tu as atteint la limite de messages. Entre ton email pour continuer.',
      }, { status: 429 })
    }
    if (session.email && session.messageCount >= ACTIVATED_DAILY_LIMIT) {
      return NextResponse.json({
        error: 'daily_limit',
        message: 'Tu as atteint la limite quotidienne de 20 messages. Reviens demain !',
      }, { status: 429 })
    }

    // Save user message + increment counter
    await Promise.all([
      db.insert(arsCoachMessages).values({ sessionId, role: 'user', content: message }),
      db.update(arsCoachSessions)
        .set({
          messageCount: sql`${arsCoachSessions.messageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(arsCoachSessions.id, sessionId)),
    ])

    // Load conversation history
    const history = await db.query.arsCoachMessages.findMany({
      where: (m, { eq }) => eq(m.sessionId, sessionId),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 12,
    })
    const historyMessages = history.reverse().slice(0, -1).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Build context summary for chapter routing
    const contextSummary = historyMessages.slice(-4).map(m =>
      `${m.role}: ${m.content.slice(0, 200)}`
    ).join('\n')

    // Select relevant chapters
    const chapterIds = await selectChapters(message, contextSummary)

    // Build system prompt with selected chapters
    const systemPrompt = buildSystemPrompt(chapterIds)
    const messages = buildMessages(systemPrompt, historyMessages, message)

    // Stream from OpenRouter
    const llmResponse = await callLLMStream({
      model: ARS_COACH_MODEL,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    })

    if (!llmResponse.body) {
      return NextResponse.json({ error: 'No stream body' }, { status: 500 })
    }

    // Transform OpenRouter SSE → simplified SSE for the client
    const reader = llmResponse.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let fullContent = ''
    let clientClosed = false
    let finishReason = 'stop'

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  if (!clientClosed) {
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`
                    ))
                  }
                }
                const reason = parsed.choices?.[0]?.finish_reason
                if (reason) finishReason = reason
              } catch { /* skip malformed chunks */ }
            }
          }
        } catch (e) {
          console.error('[ars-coach/chat]', e)
        } finally {
          if (!clientClosed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', truncated: finishReason === 'length' })}\n\n`))
              controller.close()
            } catch { /* already closed */ }
          }
          // Save assistant response
          if (fullContent.trim()) {
            db.insert(arsCoachMessages).values({
              sessionId, role: 'assistant', content: fullContent.trim(),
            }).catch(console.error)
          }
        }
      },
      cancel() { clientClosed = true },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[ars-coach/chat]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 },
    )
  }
}
