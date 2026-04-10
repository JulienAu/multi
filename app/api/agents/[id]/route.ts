import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, agentJobs, agentJobRuns } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/agents/[id] — get agent detail + runs
 */
export async function GET(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.userId, userId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  const runs = await db.query.agentJobRuns.findMany({
    where: (r, { eq }) => eq(r.jobId, id),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 20,
  })

  return NextResponse.json({ job, runs })
}

const patchSchema = z.object({
  status: z.enum(['active', 'paused']).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  requiresApproval: z.boolean().optional(),
})

/**
 * PATCH /api/agents/[id] — update agent (pause/resume/edit)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.userId, userId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  const body = patchSchema.parse(await req.json())

  await db.update(agentJobs)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agentJobs.id, id))

  return NextResponse.json({ status: 'updated' })
}

/**
 * DELETE /api/agents/[id] — delete agent + its runs
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.userId, userId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  await db.delete(agentJobRuns).where(eq(agentJobRuns.jobId, id))
  await db.delete(agentJobs).where(eq(agentJobs.id, id))

  return NextResponse.json({ status: 'deleted' })
}
