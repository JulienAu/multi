import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { z } from 'zod'

const schema = z.object({
  openclawId: z.string(),
  decision: z.enum(['allow-once', 'allow-always', 'deny']),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = schema.parse(await req.json())
    await sessionManager.resolveApproval(userId, body.openclawId, body.decision)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[chat/approve]', error)
    const msg = error instanceof Error ? error.message : 'Approval failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
