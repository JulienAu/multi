import { NextResponse } from 'next/server'
import { db, arsCoachSessions } from '@/lib/db'

/** POST /api/ars-coach/session — Create an anonymous session. */
export async function POST() {
  const [session] = await db.insert(arsCoachSessions).values({}).returning({ id: arsCoachSessions.id })
  return NextResponse.json({ sessionId: session.id })
}
