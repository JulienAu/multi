import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance, sendToOpenClaw } from '@/lib/openclaw/manager'
import { db, chatMessages } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
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

    // Send to OpenClaw and get response
    const response = await sendToOpenClaw(instance, message)

    // Save assistant response
    await db.insert(chatMessages).values({
      userId,
      role: 'assistant',
      content: response,
    })

    return NextResponse.json({ response })
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

    // Return in chronological order
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
