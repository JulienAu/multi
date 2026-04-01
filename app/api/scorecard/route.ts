import { NextRequest, NextResponse } from 'next/server'
import { db, ars } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'
import { z } from 'zod'

export interface ScorecardData {
  value:       number  // V — Value (l'offre)
  acquisition: number  // A — Acquisition
  leverage:    number  // L — Leverage (conversion)
  uptake:      number  // U — Uptake (livraison)
  enhancement: number  // E — Enhancement (amélioration)
}

const DEFAULT_SCORECARD: ScorecardData = {
  value: 0,
  acquisition: 0,
  leverage: 0,
  uptake: 0,
  enhancement: 0,
}

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const activeArs = await db.query.ars.findFirst({
      where: (a, { eq, and }) => and(eq(a.userId, userId), eq(a.status, 'active')),
    })

    if (!activeArs) {
      return NextResponse.json({ scorecard: null, arsId: null })
    }

    const scorecard = (activeArs.scorecardData as ScorecardData | null) ?? DEFAULT_SCORECARD

    return NextResponse.json({
      scorecard,
      arsId: activeArs.id,
      arsName: activeArs.name,
      lastCycleAt: activeArs.lastNightlyCycleAt,
    })
  } catch (error) {
    console.error('[scorecard/GET]', error)
    return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 })
  }
}

const updateSchema = z.object({
  arsId: z.string().uuid(),
  scorecard: z.object({
    value: z.number().min(0).max(100),
    acquisition: z.number().min(0).max(100),
    leverage: z.number().min(0).max(100),
    uptake: z.number().min(0).max(100),
    enhancement: z.number().min(0).max(100),
  }),
})

export async function PUT(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = updateSchema.parse(await req.json())

    const [updated] = await db.update(ars)
      .set({
        scorecardData: body.scorecard,
        updatedAt: new Date(),
      })
      .where(and(eq(ars.id, body.arsId), eq(ars.userId, userId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'ARS non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ scorecard: body.scorecard })
  } catch (error) {
    console.error('[scorecard/PUT]', error)
    return NextResponse.json({ error: 'Failed to update scorecard' }, { status: 500 })
  }
}
