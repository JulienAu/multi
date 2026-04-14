import { NextRequest, NextResponse } from 'next/server'
import { db, businessDocs, businessDocVersions } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentBusinessId } from '@/lib/auth'
import { generateBusinessMd } from '@/lib/llm/generateBusinessMd'
import { z } from 'zod'

const schema = z.object({ docId: z.string().uuid() })

async function runRegeneration(docId: string, businessId: string) {
  try {
    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq, and }) => and(eq(d.id, docId), eq(d.businessId, businessId)),
    })
    if (!doc || !doc.sessionId) return

    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, doc.sessionId!),
    })
    const answers = (session?.answers as Record<string, string | string[]>) ?? null
    if (!answers) return

    await db.insert(businessDocVersions).values({
      docId,
      content: doc.content,
      version: doc.version,
      lineCount: doc.lineCount,
    })

    const t0 = Date.now()
    const { content, model } = await generateBusinessMd(answers, businessId)
    const generationSeconds = Math.round((Date.now() - t0) / 1000)
    const lines = content.split('\n').length
    const sections = (content.match(/^## /gm) || []).length

    await db.update(businessDocs)
      .set({
        content,
        version: doc.version + 1,
        lineCount: lines,
        sectionCount: sections,
        generatedByModel: model,
        generationSeconds,
        regeneratingAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(businessDocs.id, docId), eq(businessDocs.businessId, businessId)))
  } catch (error) {
    console.error('[business-md/regenerate] background error:', error)
    await db.update(businessDocs)
      .set({ regeneratingAt: null, updatedAt: new Date() })
      .where(eq(businessDocs.id, docId))
      .catch(() => {})
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId()
    if (!businessId) {
      return NextResponse.json({ error: 'Aucun business actif' }, { status: 401 })
    }

    const { docId } = schema.parse(await req.json())

    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq, and }) => and(eq(d.id, docId), eq(d.businessId, businessId)),
    })
    if (!doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.regeneratingAt) {
      return NextResponse.json({ error: 'Régénération déjà en cours' }, { status: 409 })
    }

    if (!doc.sessionId) {
      return NextResponse.json({ error: 'Réponses wizard introuvables' }, { status: 400 })
    }

    await db.update(businessDocs)
      .set({ regeneratingAt: new Date(), updatedAt: new Date() })
      .where(and(eq(businessDocs.id, docId), eq(businessDocs.businessId, businessId)))

    runRegeneration(docId, businessId)

    return NextResponse.json({ status: 'started', version: doc.version })
  } catch (error) {
    console.error('[business-md/regenerate]', error)
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 })
  }
}
