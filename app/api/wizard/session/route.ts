import { NextResponse } from 'next/server'
import { db, wizardSessions } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function POST() {
  try {
    const userId = await getCurrentUserId()

    const [session] = await db
      .insert(wizardSessions)
      .values({ userId })
      .returning({ id: wizardSessions.id })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('[wizard/session]', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
