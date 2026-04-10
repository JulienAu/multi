import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, agentJobs } from '@/lib/db'
import { executeAgentJob } from '@/lib/agents/cron-manager'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/agents/[id]/run — manually trigger an agent run
 */
export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { id } = await params
  const job = await db.query.agentJobs.findFirst({
    where: (j, { eq, and }) => and(eq(j.id, id), eq(j.userId, userId)),
  })
  if (!job) return NextResponse.json({ error: 'Agent non trouve' }, { status: 404 })

  try {
    const runId = await executeAgentJob(job)
    return NextResponse.json({ status: 'completed', runId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Echec' }, { status: 500 })
  }
}
