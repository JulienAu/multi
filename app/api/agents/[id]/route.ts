import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { db, agentJobs, agentJobRuns } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const businessId = await getCurrentBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.businessId, businessId)),
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

export async function PATCH(req: NextRequest, { params }: Params) {
  const businessId = await getCurrentBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.businessId, businessId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  const body = patchSchema.parse(await req.json())

  await db.update(agentJobs)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agentJobs.id, id))

  return NextResponse.json({ status: 'updated' })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const businessId = await getCurrentBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.businessId, businessId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  await db.delete(agentJobRuns).where(eq(agentJobRuns.jobId, id))
  await db.delete(agentJobs).where(eq(agentJobs.id, id))

  return NextResponse.json({ status: 'deleted' })
}
