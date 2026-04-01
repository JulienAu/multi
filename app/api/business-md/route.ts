import { NextResponse } from 'next/server'
import { db, businessDocs } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ content: null })
    }

    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq }) => eq(d.userId, userId),
      orderBy: [desc(businessDocs.createdAt)],
    })

    if (!doc) {
      return NextResponse.json({ content: null })
    }

    return NextResponse.json({
      id: doc.id,
      content: doc.content,
      version: doc.version,
      lineCount: doc.lineCount,
      sectionCount: doc.sectionCount,
      sector: doc.sector,
      businessName: doc.businessName,
      regenerating: !!doc.regeneratingAt,
      createdAt: doc.createdAt,
    })
  } catch (error) {
    console.error('[business-md]', error)
    return NextResponse.json({ error: 'Failed to fetch business doc' }, { status: 500 })
  }
}
