import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, conversations } from '@/lib/db'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

// GET: list all conversations for user
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const list = await db.query.conversations.findMany({
      where: (c, { eq }) => eq(c.userId, userId),
      orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
    })

    return NextResponse.json({
      conversations: list.map(c => ({
        id: c.id,
        title: c.title,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[conversations]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(255).optional(),
})

// POST: create a new conversation
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { title } = createSchema.parse(body)

    const [conv] = await db.insert(conversations).values({
      userId,
      title: title ?? 'Nouvelle conversation',
    }).returning()

    return NextResponse.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('[conversations/create]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
