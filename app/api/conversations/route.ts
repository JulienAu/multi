import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, conversations, chatMessages } from '@/lib/db'
import { desc, eq, and, ilike } from 'drizzle-orm'
import { z } from 'zod'

// GET: list/search conversations
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const search = req.nextUrl.searchParams.get('q')?.trim()

    let list
    if (search) {
      list = await db.query.conversations.findMany({
        where: (c, { eq, and, ilike }) => and(
          eq(c.userId, userId),
          ilike(c.title, `%${search}%`),
        ),
        orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
      })
    } else {
      list = await db.query.conversations.findMany({
        where: (c, { eq }) => eq(c.userId, userId),
        orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
      })
    }

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

// POST: create
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

const deleteSchema = z.object({
  conversationId: z.string().uuid(),
})

// DELETE: remove conversation + its messages
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { conversationId } = deleteSchema.parse(await req.json())

    // Delete messages first (FK constraint)
    await db.delete(chatMessages).where(
      and(eq(chatMessages.userId, userId), eq(chatMessages.conversationId, conversationId))
    )

    // Delete conversation
    await db.delete(conversations).where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[conversations/delete]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
