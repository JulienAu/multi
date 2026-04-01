import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { provisionOpenClaw, getOpenClawInstance } from '@/lib/openclaw/manager'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Check if already running
    const existing = await getOpenClawInstance(userId)
    if (existing?.status === 'running') {
      return NextResponse.json({ status: 'running', instanceId: existing.id })
    }

    if (existing?.status === 'provisioning') {
      return NextResponse.json({ status: 'provisioning', instanceId: existing.id })
    }

    // Launch provisioning in background (takes 30-60s)
    provisionOpenClaw(userId).catch(err => {
      console.error('[openclaw/provision] background error:', err)
    })

    return NextResponse.json({ status: 'provisioning' })
  } catch (error) {
    console.error('[openclaw/provision]', error)
    const msg = error instanceof Error ? error.message : 'Provisioning failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
