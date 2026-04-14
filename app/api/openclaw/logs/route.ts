import { NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { getOpenClawInstance } from '@/lib/openclaw/manager'
import { orchestrator } from '@/lib/orchestrator'

export async function GET() {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const instance = await getOpenClawInstance(businessId)
    if (!instance) {
      return NextResponse.json({ logs: null })
    }

    const logs = await orchestrator.logs(instance.containerName, 30)
    return NextResponse.json({ logs, status: instance.status })
  } catch (error) {
    console.error('[openclaw/logs]', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
