import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AdminError } from '@/lib/admin'
import { hotSwapAgentModel } from '@/lib/openclaw/manager'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  businessId: z.string().min(1),
  model: z.string().min(1),
})

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
  } catch {
    return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
  }

  try {
    await hotSwapAgentModel(body.businessId, body.model)
    return NextResponse.json({ status: 'swapped', model: body.model })
  } catch (e) {
    console.error('[admin/swap-agent]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Swap failed' },
      { status: 500 },
    )
  }
}

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

  const { orchestrator } = await import('@/lib/orchestrator')
  const agents = await Promise.all(
    instances.map(async (inst) => {
      let currentModel = 'unknown'
      try {
        const configRaw = await orchestrator.readFile(inst.containerName, '/home/node/.openclaw/openclaw.json')
        const config = JSON.parse(configRaw)
        currentModel = config.agents?.defaults?.model?.primary ?? 'unknown'
      } catch {}

      return {
        businessId: inst.businessId,
        containerName: inst.containerName,
        port: inst.port,
        currentModel,
      }
    })
  )

  return NextResponse.json({ agents })
}
