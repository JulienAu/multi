import { NextRequest, NextResponse } from 'next/server'
import { getCurrentBusinessId } from '@/lib/auth'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { z } from 'zod'

const schema = z.object({
  openclawId: z.string(),
  decision: z.enum(['allow-once', 'allow-always', 'deny']),
})

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const body = schema.parse(await req.json())
    await sessionManager.resolveApproval(businessId, body.openclawId, body.decision)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[chat/approve]', error)
    const msg = error instanceof Error ? error.message : 'Approval failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
