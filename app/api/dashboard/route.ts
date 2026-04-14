import { NextResponse } from 'next/server'
import { db, businessDocs, wizardSessions } from '@/lib/db'
import { desc, eq, count } from 'drizzle-orm'
import { getCurrentUserId, getCurrentBusinessId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ user: null })
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    })

    const businessId = await getCurrentBusinessId()
    const business = businessId
      ? await db.query.businesses.findFirst({
          where: (b, { eq }) => eq(b.id, businessId),
        })
      : null

    const latestDoc = businessId
      ? await db.query.businessDocs.findFirst({
          where: (d, { eq }) => eq(d.businessId, businessId),
          orderBy: [desc(businessDocs.createdAt)],
        })
      : null

    const sessionsResult = await db
      .select({ count: count() })
      .from(wizardSessions)
      .where(eq(wizardSessions.userId, userId))

    return NextResponse.json({
      user: user ? { email: user.email } : null,
      business: business ? { id: business.id, name: business.name, plan: business.plan } : null,
      hasBusinessMd: !!latestDoc,
      businessName: latestDoc?.businessName ?? null,
      sector: latestDoc?.sector ?? null,
      wizardSessions: sessionsResult[0]?.count ?? 0,
    })
  } catch (error) {
    console.error('[dashboard]', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
