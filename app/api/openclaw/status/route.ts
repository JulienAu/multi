import { NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance, checkHealth } from '@/lib/openclaw/manager'

export async function GET() {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ provisioned: false, status: null })
    }

    let healthy = false
    if (instance.status === 'running') {
      healthy = await checkHealth(businessId)
    }

    return NextResponse.json({
      provisioned: true,
      status: instance.status,
      healthy,
      port: instance.port,
      containerId: instance.containerId,
      hasToken: instance.gatewayToken !== 'pending',
      lastError: instance.lastError,
      lastHealthAt: instance.lastHealthAt,
      createdAt: instance.createdAt,
    })
  } catch (error) {
    console.error('[openclaw/status]', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
