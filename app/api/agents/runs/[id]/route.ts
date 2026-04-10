import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, agentJobRuns } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  decision: z.enum(['approved', 'rejected']),
})

/**
 * PATCH /api/agents/runs/[id] — approve or reject a pending run
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { id } = await params
  const run = await db.query.agentJobRuns.findFirst({
    where: (r, { eq, and }) => and(eq(r.id, id), eq(r.userId, userId)),
  })
  if (!run) return NextResponse.json({ error: 'Run non trouve' }, { status: 404 })
  if (run.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Ce run n\'est pas en attente de validation' }, { status: 400 })
  }

  const { decision } = schema.parse(await req.json())

  await db.update(agentJobRuns)
    .set({ status: decision, completedAt: new Date() })
    .where(eq(agentJobRuns.id, id))

  return NextResponse.json({ status: decision })
}
