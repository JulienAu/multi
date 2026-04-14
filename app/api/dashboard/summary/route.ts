import { NextRequest, NextResponse } from 'next/server'
import { db, actionValidations, businessDocs } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { getCurrentUserId, getCurrentBusinessId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    const businessId = await getCurrentBusinessId()
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const period = req.nextUrl.searchParams.get('period') ?? 'today'
    const now = new Date()
    let since: Date
    switch (period) {
      case '7d':  since = new Date(now.getTime() - 7 * 86400_000); break
      case '30d': since = new Date(now.getTime() - 30 * 86400_000); break
      default:    since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    })

    const business = await db.query.businesses.findFirst({
      where: (b, { eq }) => eq(b.id, businessId),
    })

    const activeArs = await db.query.ars.findFirst({
      where: (a, { eq, and }) => and(eq(a.businessId, businessId), eq(a.status, 'active')),
    })

    const latestDoc = await db.query.businessDocs.findFirst({
      where: (d, { eq }) => eq(d.businessId, businessId),
      orderBy: [desc(businessDocs.createdAt)],
    })

    let actions: typeof actionValidations.$inferSelect[] = []
    if (activeArs) {
      actions = await db.query.actionValidations.findMany({
        where: (a, { eq, and, gte }) => and(
          eq(a.arsId, activeArs.id),
          gte(a.createdAt, since),
        ),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
        limit: 20,
      })
    }

    const scorecardData = (activeArs?.scorecardData as Record<string, number> | null) ?? null
    const metrics = {
      revenue:      { value: scorecardData?.revenue ?? 0,      variation: '+12%', trend: 'up' as const },
      orders:       { value: scorecardData?.orders ?? 0,       variation: '+8%',  trend: 'up' as const },
      satisfaction: { value: scorecardData?.satisfaction ?? 0,  variation: '+3%',  trend: 'up' as const },
      traffic:      { value: scorecardData?.traffic ?? 0,      variation: '-2%',  trend: 'down' as const },
    }

    return NextResponse.json({
      user: user ? { email: user.email, firstName: user.firstName } : null,
      business: business ? { id: business.id, name: business.name, plan: business.plan } : null,
      ars: activeArs ? {
        id: activeArs.id,
        name: activeArs.name,
        status: activeArs.status,
        lastNightlyCycleAt: activeArs.lastNightlyCycleAt,
      } : null,
      businessName: latestDoc?.businessName ?? null,
      sector: latestDoc?.sector ?? null,
      metrics,
      actions: actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        description: a.description,
        status: a.status,
        agentSource: a.agentSource,
        createdAt: a.createdAt.toISOString(),
      })),
      briefing: null,
    })
  } catch (error) {
    console.error('[dashboard/summary]', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
