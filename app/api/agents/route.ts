import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db, agentJobs, agentJobRuns } from '@/lib/db'
import { AGENT_TEMPLATES } from '@/lib/agents/templates'
import { registerCronJob } from '@/lib/agents/cron-manager'
import { z } from 'zod'

/**
 * GET /api/agents — list user's agent jobs + last run per job
 */
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const jobs = await db.query.agentJobs.findMany({
    where: (j, { eq }) => eq(j.userId, userId),
    orderBy: (j, { desc }) => [desc(j.createdAt)],
  })

  const jobsWithRuns = await Promise.all(
    jobs.map(async (job) => {
      const lastRun = await db.query.agentJobRuns.findFirst({
        where: (r, { eq }) => eq(r.jobId, job.id),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      })
      return { ...job, lastRun }
    })
  )

  return NextResponse.json({ jobs: jobsWithRuns })
}

const createSchema = z.object({
  templateId: z.string().optional(),
  name: z.string().min(1).max(255),
  icon: z.string().max(10).optional(),
  description: z.string().min(1).max(5000),
  schedule: z.string().min(1),
  scheduleHuman: z.string().optional(),
  timezone: z.string().default('Europe/Paris'),
  requiresApproval: z.boolean().default(true),
})

/**
 * POST /api/agents — create an agent job
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const body = createSchema.parse(await req.json())

  let icon = body.icon ?? '🤖'
  if (body.templateId) {
    const tpl = AGENT_TEMPLATES.find(t => t.id === body.templateId)
    if (tpl) icon = tpl.icon
  }

  const [job] = await db.insert(agentJobs).values({
    userId,
    name: body.name,
    icon,
    description: body.description,
    schedule: body.schedule,
    scheduleHuman: body.scheduleHuman ?? body.schedule,
    timezone: body.timezone,
    requiresApproval: body.requiresApproval,
    templateId: body.templateId ?? null,
    status: 'active',
  }).returning()

  // Register cron in OpenClaw (best effort — agent must be deployed)
  registerCronJob(userId, {
    name: body.name,
    message: body.description.slice(0, 500),
    cron: body.schedule,
    timezone: body.timezone,
  }).catch(err => console.log(`[agents] cron registration failed for "${body.name}":`, err.message))

  return NextResponse.json({ job })
}
