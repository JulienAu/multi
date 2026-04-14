import { NextRequest, NextResponse } from 'next/server'
import { db, agentJobs, agentJobRuns, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { recordWebhookEvent } from '@/lib/webhook-idempotency'

/**
 * POST /api/agents/webhook
 *
 * Appelé par OpenClaw après chaque run cron.
 * L'authentification utilise le `webhook_secret` UNIQUE à l'instance
 * (cf. openclaw_instances.webhook_secret). On résout le businessId
 * depuis le token, JAMAIS depuis le `containerName` fourni par le client
 * (sinon un container compromis pourrait injecter des runs dans un autre business).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') ?? req.headers.get('x-webhook-token') ?? ''
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lookup instance par token (qui identifie de façon sûre le business émetteur).
  const instance = await db.query.openclawInstances.findFirst({
    where: (o, { eq }) => eq(o.webhookSecret, token),
    columns: { businessId: true, containerName: true },
  })
  if (!instance) {
    console.log('[agents/webhook] invalid token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const businessId = instance.businessId

  const rawBody = await req.text()
  const payload = JSON.parse(rawBody)
  console.log(`[agents/webhook] received for business ${businessId.slice(0, 8)}: ${rawBody.slice(0, 300)}`)

  // Idempotency
  const digest = crypto.createHash('sha256').update(rawBody).digest('hex')
  const fresh = await recordWebhookEvent('openclaw', digest)
  if (!fresh) {
    console.log('[agents/webhook] duplicate, ignored')
    return NextResponse.json({ status: 'duplicate' })
  }

  try {
    const jobName = payload.jobName ?? payload.name ?? payload.job?.name ?? ''
    const output = payload.output ?? payload.result ?? payload.message ?? payload.content ?? ''
    const status = payload.status ?? (payload.error ? 'failed' : 'completed')

    if (!jobName) {
      console.log('[agents/webhook] no job name in payload')
      return NextResponse.json({ status: 'no_job_name' })
    }

    const job = await db.query.agentJobs.findFirst({
      where: (j, { eq, and }) => and(eq(j.businessId, businessId), eq(j.name, jobName)),
    })

    if (!job) {
      console.log(`[agents/webhook] no job "${jobName}" for business ${businessId.slice(0, 8)}`)
      return NextResponse.json({ status: 'no_match' })
    }

    const finalStatus = job.requiresApproval ? 'pending_approval' : 'completed'
    await db.insert(agentJobRuns).values({
      jobId: job.id,
      businessId,
      status: status === 'failed' ? 'failed' : finalStatus,
      output: typeof output === 'string' ? output : JSON.stringify(output),
      completedAt: new Date(),
    })

    await db.update(agentJobs)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(agentJobs.id, job.id))

    console.log(`[agents/webhook] saved run for job "${jobName}" (${finalStatus})`)
    return NextResponse.json({ status: 'saved' })
  } catch (e) {
    console.error('[agents/webhook] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
