import { NextRequest, NextResponse } from 'next/server'
import { db, arsCoachSessions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().email(),
})

/** POST /api/ars-coach/activate — Link an email to a session. */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { sessionId, email } = body.data

  const session = await db.query.arsCoachSessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.email) return NextResponse.json({ ok: true, alreadyActivated: true })

  await db.update(arsCoachSessions)
    .set({ email, updatedAt: new Date() })
    .where(eq(arsCoachSessions.id, sessionId))

  return NextResponse.json({ ok: true })
}
