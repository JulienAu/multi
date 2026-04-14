import { NextRequest, NextResponse } from 'next/server'
import { db, agentJobs, agentJobRuns } from '@/lib/db'
import { eq } from 'drizzle-orm'

if (!process.env.OPENCLAW_WEBHOOK_SECRET) {
  throw new Error('OPENCLAW_WEBHOOK_SECRET is required')
}
const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET

/**
 * POST /api/agents/webhook
 * Called by OpenClaw after each cron job run.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') ?? req.headers.get('x-webhook-token') ?? ''
  if (token !== WEBHOOK_SECRET) {
    console.log('[agents/webhook] invalid token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  console.log('[agents/webhook] received:', JSON.stringify(payload).slice(0, 500))

  try {
    const jobName = payload.jobName ?? payload.name ?? payload.job?.name ?? ''
    const output = payload.output ?? payload.result ?? payload.message ?? payload.content ?? ''
    const status = payload.status ?? (payload.error ? 'failed' : 'completed')
    const containerName = payload.containerName ?? payload.source ?? ''

    if (!jobName) {
      console.log('[agents/webhook] no job name in payload, storing raw')
    }

    let businessId: string | null = null
    if (containerName) {
      const instance = await db.query.openclawInstances.findFirst({
        where: (o, { eq }) => eq(o.containerName, containerName),
        columns: { businessId: true },
      })
      businessId = instance?.businessId ?? null
    }

    if (jobName && businessId) {
      const job = await db.query.agentJobs.findFirst({
        where: (j, { eq, and }) => and(eq(j.businessId, businessId!), eq(j.name, jobName)),
      })

      if (job) {
        const finalStatus = job.requiresApproval ? 'pending_approval' : 'completed'
        await db.insert(agentJobRuns).values({
          jobId: job.id,
          businessId: businessId!,
          status: status === 'failed' ? 'failed' : finalStatus,
          output: typeof output === 'string' ? output : JSON.stringify(output),
          completedAt: new Date(),
        })

        await db.update(agentJobs)
          .set({ lastRunAt: new Date(), updatedAt: new Date() })
          .where(eq(agentJobs.id, job.id))

        console.log(`[agents/webhook] saved run for job "${jobName}" (${finalStatus})`)
        return NextResponse.json({ status: 'saved' })
      }
    }

    console.log(`[agents/webhook] no matching job for name="${jobName}" businessId="${businessId}"`)
    return NextResponse.json({ status: 'no_match', jobName, businessId })
  } catch (e) {
    console.error('[agents/webhook] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
