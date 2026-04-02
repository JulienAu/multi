import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance, streamFromOpenClaw, cleanOpenClawResponse } from '@/lib/openclaw/manager'
import { db, chatMessages } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { z } from 'zod'

const sendSchema = z.object({
  message: z.string().min(1).max(10000),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { message } = sendSchema.parse(await req.json())

    const instance = await getOpenClawInstance(userId)
    if (!instance || instance.status !== 'running') {
      return NextResponse.json(
        { error: 'Agent non déployé. Provisionnez votre agent d\'abord.' },
        { status: 400 },
      )
    }

    // Save user message
    await db.insert(chatMessages).values({
      userId,
      role: 'user',
      content: message,
    })

    // Stream from OpenClaw
    const openclawResponse = await streamFromOpenClaw(instance, message)

    if (!openclawResponse.body) {
      return NextResponse.json({ error: 'No stream body' }, { status: 500 })
    }

    // Transform the OpenClaw SSE stream:
    // - Forward delta chunks to client
    // - Accumulate full response to save in DB at the end
    let fullContent = ''
    const reader = openclawResponse.body.getReader()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  // Send SSE event to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }

          // Clean response and save to DB
          fullContent = cleanOpenClawResponse(fullContent)
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()

          // Save assistant response
          await db.insert(chatMessages).values({
            userId,
            role: 'assistant',
            content: fullContent,
          })
        } catch (e) {
          console.error('[chat/stream]', e)
          controller.error(e)
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
