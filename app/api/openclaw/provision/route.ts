import { NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { provisionOpenClaw, getOpenClawInstance } from '@/lib/openclaw/manager'

export async function POST() {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const existing = await getOpenClawInstance(businessId)
    if (existing?.status === 'running') {
      return NextResponse.json({ status: 'running', instanceId: existing.id })
    }

    if (existing?.status === 'provisioning') {
      return NextResponse.json({ status: 'provisioning', instanceId: existing.id })
    }

    provisionOpenClaw(businessId).catch(err => {
      console.error('[openclaw/provision] background error:', err)
    })

    return NextResponse.json({ status: 'provisioning' })
  } catch (error) {
    console.error('[openclaw/provision]', error)
    const msg = error instanceof Error ? error.message : 'Provisioning failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
