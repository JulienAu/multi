import { NextRequest, NextResponse } from 'next/server'
import { setCurrentBusinessId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { businessId?: string }
  if (!body.businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const ok = await setCurrentBusinessId(body.businessId)
  if (!ok) return NextResponse.json({ error: 'not owned' }, { status: 403 })

  return NextResponse.json({ ok: true })
}
