import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { readFile, writeFile } from 'fs/promises'

const schema = z.object({
  enabled: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { enabled } = schema.parse(await req.json())

    // Update DB flag
    await db.update(openclawInstances)
      .set({ autoApprove: enabled, updatedAt: new Date() })
      .where(eq(openclawInstances.userId, userId))

    // Update OpenClaw config directly
    const instance = await getOpenClawInstance(userId)
    if (instance) {
      const configPath = `/tmp/openclaw-homes/${instance.containerName}/openclaw.json`
      try {
        const configRaw = await readFile(configPath, 'utf-8')
        const config = JSON.parse(configRaw)
        config.execApprovals = {
          version: 1,
          defaults: {
            security: enabled ? 'full' : 'allowlist',
            ask: enabled ? 'off' : 'always',
          },
        }
        await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
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
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await db.query.openclawInstances.findFirst({
      where: (o, { eq }) => eq(o.userId, userId),
    })

    return NextResponse.json({ autoApprove: instance?.autoApprove ?? false })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
