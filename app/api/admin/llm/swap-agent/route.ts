import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AdminError } from '@/lib/admin'
import { hotSwapAgentModel } from '@/lib/openclaw/manager'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().min(1),
  model: z.string().min(1),
})

/**
 * POST /api/admin/llm/swap-agent
 * Hot-swap the agent model on a user's running OpenClaw container.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
  }

  try {
    await hotSwapAgentModel(body.userId, body.model)
    return NextResponse.json({ status: 'swapped', model: body.model })
  } catch (e) {
    console.error('[admin/swap-agent]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Swap failed' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/admin/llm/swap-agent — list all running agents with their current model
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  const instances = await db.query.openclawInstances.findMany({
    where: (o, { eq }) => eq(o.status, 'running'),
  })

  const fs = await import('fs/promises')
  const agents = await Promise.all(
    instances.map(async (inst) => {
      let currentModel = 'unknown'
      try {
        const configRaw = await fs.readFile(`/tmp/openclaw-homes/${inst.containerName}/openclaw.json`, 'utf-8')
        const config = JSON.parse(configRaw)
        currentModel = config.agents?.defaults?.model?.primary ?? 'unknown'
      } catch {}

      return {
        userId: inst.userId,
        containerName: inst.containerName,
        port: inst.port,
        currentModel,
      }
    })
  )

  return NextResponse.json({ agents })
}
