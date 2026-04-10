// Manages agent jobs.
// - Scheduled jobs: created by asking OpenClaw agent to run `openclaw cron add`
// - Manual runs: executed directly via sendToOpenClaw with the prompt
// - Results: received via webhook (cron) or saved directly (manual)

import { db, agentJobs, agentJobRuns, businessDocs } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { sendToOpenClaw, getOpenClawInstance } from '@/lib/openclaw/manager'

/**
 * Execute an agent job immediately: send the prompt to OpenClaw and save the result.
 */
export async function executeAgentJob(job: typeof agentJobs.$inferSelect): Promise<string> {
  const instance = await getOpenClawInstance(job.userId)
  if (!instance || instance.status !== 'running') throw new Error('Agent non deploye')

  // Get BUSINESS.md for context
  const doc = await db.query.businessDocs.findFirst({
    where: (d, { eq }) => eq(d.userId, job.userId),
    orderBy: [desc(businessDocs.createdAt)],
    columns: { content: true },
  })

  const businessContext = doc?.content
    ? `\n\n---\nContexte BUSINESS.md :\n${doc.content.slice(0, 4000)}\n---\n`
    : ''

  const fullPrompt = `${job.description}${businessContext}`

  // Create run in DB
  const [run] = await db.insert(agentJobRuns).values({
    jobId: job.id,
    userId: job.userId,
    status: 'running',
  }).returning()

  try {
    const output = await sendToOpenClaw(instance, [
      { role: 'user', content: fullPrompt },
    ])

    const finalStatus = job.requiresApproval ? 'pending_approval' : 'completed'
    await db.update(agentJobRuns)
      .set({ status: finalStatus, output, completedAt: new Date() })
      .where(eq(agentJobRuns.id, run.id))

    await db.update(agentJobs)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(agentJobs.id, job.id))

    return run.id
  } catch (e) {
    await db.update(agentJobRuns)
      .set({ status: 'failed', output: e instanceof Error ? e.message : 'Erreur', completedAt: new Date() })
      .where(eq(agentJobRuns.id, run.id))
    throw e
  }
}

/**
 * Register a cron job inside the OpenClaw container by asking the agent.
 */
export async function registerCronJob(
  userId: string,
  opts: { name: string; message: string; cron: string; timezone: string },
): Promise<void> {
  const instance = await getOpenClawInstance(userId)
  if (!instance || instance.status !== 'running') throw new Error('Agent non deploye')

  const escapedName = opts.name.replace(/'/g, "'\\''")
  const escapedMessage = opts.message.replace(/'/g, "'\\''").slice(0, 500)

  await sendToOpenClaw(instance, [
    {
      role: 'user',
      content: `Execute cette commande exactement dans ton terminal sans modification :\n\n\`\`\`bash\nopenclaw cron add --name '${escapedName}' --cron '${opts.cron}' --tz '${opts.timezone}' --message '${escapedMessage}' --session isolated --timeout-seconds 900\n\`\`\`\n\nReponds uniquement avec le resultat de la commande.`,
    },
  ])
}

/**
 * Remove a cron job from OpenClaw by asking the agent.
 */
export async function removeCronJob(userId: string, jobName: string): Promise<void> {
  const instance = await getOpenClawInstance(userId)
  if (!instance || instance.status !== 'running') return

  const escapedName = jobName.replace(/'/g, "'\\''")
  await sendToOpenClaw(instance, [
    {
      role: 'user',
      content: `Execute cette commande exactement :\n\n\`\`\`bash\nopenclaw cron rm '${escapedName}'\n\`\`\`\n\nReponds uniquement avec le resultat.`,
    },
  ]).catch(console.error)
}
