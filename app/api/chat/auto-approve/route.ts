import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { orchestrator } from '@/lib/orchestrator'

const schema = z.object({
  enabled: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const { enabled } = schema.parse(await req.json())

    await db.update(openclawInstances)
      .set({ autoApprove: enabled, updatedAt: new Date() })
      .where(eq(openclawInstances.businessId, businessId))

    const instance = await getOpenClawInstance(businessId)
    if (instance) {
      const configPath = '/home/node/.openclaw/openclaw.json'
      try {
        const configRaw = await orchestrator.readFile(instance.containerName, configPath)
        const config = JSON.parse(configRaw)
        config.execApprovals = {
          version: 1,
          defaults: {
            security: enabled ? 'full' : 'allowlist',
            ask: enabled ? 'off' : 'always',
          },
        }
        await orchestrator.writeFile(instance.containerName, configPath, JSON.stringify(config, null, 2))
      } catch { /* ignore if config not accessible */ }
    }

    return NextResponse.json({ autoApprove: enabled })
  } catch (error) {
    console.error('[chat/auto-approve]', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await db.query.openclawInstances.findFirst({
      where: (o, { eq }) => eq(o.businessId, businessId),
    })

    return NextResponse.json({ autoApprove: instance?.autoApprove ?? false })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
