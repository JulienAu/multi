import { NextRequest, NextResponse } from 'next/server'
import { db, leads } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  value: z.string().min(1).max(255),
})

const EARLY_ACCESS_CODE = process.env.EARLY_ACCESS_CODE || 'Multi2026'

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { value } = body.data

  // Secret early access code
  if (value === EARLY_ACCESS_CODE) {
    const res = NextResponse.json({ access: true })
    res.cookies.set('multi_early_access', '1', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
    return res
  }

  // Otherwise treat as email subscription
  const email = z.string().email().safeParse(value)
  if (!email.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  // Save as lead (ignore duplicates)
  try {
    await db.insert(leads).values({
      email: email.data,
      source: 'coming_soon',
    })
  } catch {
    // Likely duplicate email — that's fine
  }

  return NextResponse.json({ subscribed: true })
}
