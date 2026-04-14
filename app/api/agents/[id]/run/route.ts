import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { db } from '@/lib/db'
import { executeAgentJob } from '@/lib/agents/cron-manager'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const businessId = await getCurrentBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.businessId, businessId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  try {
    const runId = await executeAgentJob(job)
    return NextResponse.json({ status: 'completed', runId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Echec' }, { status: 500 })
  }
}
