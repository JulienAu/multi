import { NextRequest, NextResponse } from 'next/server'
import { db, wizardSessions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  sessionId:  z.string().uuid(),
  questionId: z.string(),
  answer:     z.union([z.string(), z.array(z.string())]),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, body.sessionId),
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const updatedAnswers = { ...(session.answers ?? {}), [body.questionId]: body.answer }
    await db.update(wizardSessions)
      .set({ answers: updatedAnswers, lastQuestionId: body.questionId, updatedAt: new Date() })
      .where(eq(wizardSessions.id, body.sessionId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('[wizard/answer]', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
}
