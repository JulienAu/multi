import { NextRequest, NextResponse } from 'next/server'
import { db, businesses } from '@/lib/db'
import { and, eq, desc } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const list = await db.query.businesses.findMany({
    where: (b, { eq }) => eq(b.userId, userId),
    orderBy: [desc(businesses.createdAt)],
  })
  return NextResponse.json({ businesses: list })
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [business] = await db.insert(businesses).values({ userId, name }).returning()
  return NextResponse.json({ business })
}
