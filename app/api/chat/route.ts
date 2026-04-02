import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { db, chatMessages } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { z } from 'zod'
import type { OpenClawEvent } from '@/lib/openclaw/ws-client'

const sendSchema = z.object({
  message: z.string().min(1).max(10000),
})

export async function POST(req: NextRequest) {
  try {
    const maybeUserId = await getCurrentUserId()
    if (!maybeUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId: string = maybeUserId

    const { message } = sendSchema.parse(await req.json())

    // Save user message
    await db.insert(chatMessages).values({
      userId,
      role: 'user',
      content: message,
    })

    // Get WS session and send message
    const session = await sessionManager.getSession(userId)
    const removeListener = { fn: () => {} }

    let fullContent = ''
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Listen for events from OpenClaw
        const callback = (event: OpenClawEvent) => {
          try {
            switch (event.type) {
              case 'chat.delta':
                fullContent += event.data.content
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'delta', content: event.data.content })}\n\n`
                ))
                break

              case 'chat.final':
                if (event.content) fullContent = event.content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                cleanup()
                break

              case 'chat.error':
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`
                ))
                cleanup()
                break

              case 'tool.requested':
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'tool_request',
                    id: event.request.id,
                    toolType: event.request.type,
                    command: event.request.command,
                    title: event.request.title,
                    description: event.request.description || event.request.command,
                  })}\n\n`
                ))
                break

              case 'tool.resolved':
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'tool_resolved',
                    id: event.id,
                    decision: event.decision,
                  })}\n\n`
                ))
                break
            }
          } catch {
            // Controller may be closed
          }
        }

        removeListener.fn = sessionManager.addListener(userId, callback)

        // Send the message via WS
        sessionManager.sendMessage(userId, message).catch((err) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`
          ))
          cleanup()
        })

        // Timeout after 3 minutes
        const timeout = setTimeout(() => {
          if (fullContent) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          }
          cleanup()
        }, 180_000)

        function cleanup() {
          clearTimeout(timeout)
          removeListener.fn()
          try { controller.close() } catch { /* already closed */ }

          // Save assistant response
          if (fullContent) {
            const cleaned = fullContent.replace(/^\/approve\s+\S+\s+(allow-once|allow-always|deny)\s*/i, '').trim()
            db.insert(chatMessages).values({
              userId,
              role: 'assistant',
              content: cleaned,
            }).catch(console.error)
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[chat]', error)
    const msg = error instanceof Error ? error.message : 'Chat failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')
    const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')

    const messages = await db.query.chatMessages.findMany({
      where: (m, { eq }) => eq(m.userId, userId),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit,
      offset,
    })

    return NextResponse.json({
      messages: messages.reverse().map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[chat/history]', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
