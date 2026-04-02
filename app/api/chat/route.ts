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
    const maybeUserId = await getCurrentUserId()
    if (!maybeUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId: string = maybeUserId

    const { message } = sendSchema.parse(await req.json())

    const instance = await getOpenClawInstance(userId)
    if (!instance || instance.status !== 'running') {
      return NextResponse.json(
        { error: 'Agent non déployé. Provisionnez votre agent d\'abord.' },
        { status: 400 },
      )
    }

    // Save user message
    await db.insert(chatMessages).values({ userId, role: 'user', content: message })

    // Start streaming from OpenClaw
    const openclawResponse = await streamFromOpenClaw(instance, message)
    if (!openclawResponse.body) {
      return NextResponse.json({ error: 'No stream body' }, { status: 500 })
    }

    const openclawReader = openclawResponse.body.getReader()
    const decoder = new TextDecoder()

    // Shared state between the background consumer and the client stream
    let fullContent = ''
    let clientClosed = false
    let streamDone = false

    // Background task: consume the OpenClaw stream fully, regardless of client state.
    // This ensures the response is saved to DB even if the user leaves the page.
    const backgroundConsume = async (onDelta: (text: string) => void) => {
      try {
        while (true) {
          const { done, value } = await openclawReader.read()
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
                onDelta(delta)
              }
            } catch { /* skip unparseable */ }
          }
        }
      } catch (e) {
        console.error('[chat/background]', e)
      } finally {
        streamDone = true
        // Always save the response, even if client disconnected mid-stream
        fullContent = cleanOpenClawResponse(fullContent)
        if (fullContent) {
          await db.insert(chatMessages).values({
            userId,
            role: 'assistant',
            content: fullContent,
          }).catch(console.error)
        }
      }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Start background consumer — it calls onDelta for each chunk
        backgroundConsume((delta) => {
          if (clientClosed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`))
          } catch {
            clientClosed = true
          }
        }).then(() => {
          if (!clientClosed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
              controller.close()
            } catch { /* already closed */ }
          }
        })
      },
      cancel() {
        // Client disconnected — mark as closed but DON'T abort the OpenClaw reader
        clientClosed = true
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
