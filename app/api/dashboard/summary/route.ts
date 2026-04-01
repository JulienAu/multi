import { NextRequest, NextResponse } from 'next/server'
import { db, ars, actionValidations, businessDocs } from '@/lib/db'
import { desc, eq, and, gte } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
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

    const activeArs = await db.query.ars.findFirst({
      where: (a, { eq, and }) => and(eq(a.userId, userId), eq(a.status, 'active')),
    })

    const latestDoc = await db.query.businessDocs.findFirst({
      where: (d, { eq }) => eq(d.userId, userId),
      orderBy: [desc(businessDocs.createdAt)],
    })

    // Actions récentes
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

    // Métriques VALUE mockées (seront alimentées par les agents à partir du Lot 10+)
    const scorecardData = (activeArs?.scorecardData as Record<string, number> | null) ?? null
    const metrics = {
      revenue:      { value: scorecardData?.revenue ?? 0,      variation: '+12%', trend: 'up' as const },
      orders:       { value: scorecardData?.orders ?? 0,       variation: '+8%',  trend: 'up' as const },
      satisfaction: { value: scorecardData?.satisfaction ?? 0,  variation: '+3%',  trend: 'up' as const },
      traffic:      { value: scorecardData?.traffic ?? 0,      variation: '-2%',  trend: 'down' as const },
    }

    return NextResponse.json({
      user: user ? { plan: user.plan, email: user.email, firstName: user.firstName } : null,
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
      briefing: null, // Sera alimenté par le cycle nocturne (Lot 11)
    })
  } catch (error) {
    console.error('[dashboard/summary]', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
