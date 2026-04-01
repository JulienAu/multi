import { NextRequest, NextResponse } from 'next/server'
import { db, wizardSessions, businessDocs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { generateBusinessMd } from '@/lib/llm/generateBusinessMd'
import { getCurrentUserId } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ sessionId: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    })
    if (!session?.answers) {
      return NextResponse.json({ error: 'Session not found or incomplete' }, { status: 404 })
    }

    const t0 = Date.now()
    const { content, model } = await generateBusinessMd(session.answers)
    const generationSeconds = Math.round((Date.now() - t0) / 1000)
    const lines    = content.split('\n').length
    const sections = (content.match(/^## /gm) || []).length

    await db.update(wizardSessions)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(wizardSessions.id, sessionId))

    // Persister si l'utilisateur est connecté
    const userId = await getCurrentUserId()
    if (userId) {
      await db.insert(businessDocs).values({
        userId,
        sessionId,
        content,
        lineCount: lines,
        sectionCount: sections,
        sector: session.answers.sector as string,
        businessName: session.answers.name as string,
        generatedByModel: model,
        generationSeconds,
      })
    }

    return NextResponse.json({ businessMd: content, lines, sections, generationSeconds, model })
  } catch (error) {
    console.error('[wizard/complete]', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
