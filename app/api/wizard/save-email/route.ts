import { NextRequest, NextResponse } from 'next/server'
import { db, leads, wizardSessions, businessDocs } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { sendEmail, buildBusinessMdEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  sessionId: z.string().uuid(),
  email:     z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const { sessionId, email } = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    })

    const businessName = (session?.answers?.name as string) || 'Votre business'
    const sector = session?.answers?.sector as string

    // Sauvegarder le lead
    await db.insert(leads).values({
      email, sessionId, sector, businessName,
    })
    await db.update(wizardSessions)
      .set({ email, emailCapturedAt: new Date() })
      .where(eq(wizardSessions.id, sessionId))

    // Récupérer le BUSINESS.md — soit en DB, soit stocké dans la session
    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq }) => eq(d.sessionId, sessionId),
      orderBy: [desc(businessDocs.createdAt)],
    })

    const content = doc?.content
      ?? (session?.answers as Record<string, unknown>)?._generatedContent as string | undefined

    // Envoyer l'email
    if (content) {
      await sendEmail({
        to: email,
        subject: `Votre BUSINESS.md — ${businessName}`,
        html: buildBusinessMdEmail(content, businessName),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('[wizard/save-email]', error)
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
  }
}
