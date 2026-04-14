import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { db, conversations, chatMessages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const search = req.nextUrl.searchParams.get('q')?.trim()

    const list = search
      ? await db.query.conversations.findMany({
          where: (c, { eq, and, ilike }) => and(
            eq(c.businessId, businessId),
            ilike(c.title, `%${search}%`),
          ),
          orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
        })
      : await db.query.conversations.findMany({
          where: (c, { eq }) => eq(c.businessId, businessId),
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

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { title } = createSchema.parse(body)

    const [conv] = await db.insert(conversations).values({
      businessId,
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

export async function DELETE(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

    const { conversationId } = deleteSchema.parse(await req.json())

    await db.delete(chatMessages).where(
      and(eq(chatMessages.businessId, businessId), eq(chatMessages.conversationId, conversationId))
    )

    await db.delete(conversations).where(
      and(eq(conversations.id, conversationId), eq(conversations.businessId, businessId))
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[conversations/delete]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
