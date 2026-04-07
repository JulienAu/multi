import { NextRequest, NextResponse } from 'next/server'
import { db, businessDocs, businessDocVersions } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'
import { generateBusinessMd } from '@/lib/llm/generateBusinessMd'
import { z } from 'zod'

const schema = z.object({ docId: z.string().uuid() })

async function runRegeneration(docId: string, userId: string) {
  try {
    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq, and }) => and(eq(d.id, docId), eq(d.userId, userId)),
    })
    if (!doc || !doc.sessionId) return

    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, doc.sessionId!),
    })
    const answers = (session?.answers as Record<string, string | string[]>) ?? null
    if (!answers) return

    // Sauvegarder version actuelle
    await db.insert(businessDocVersions).values({
      docId,
      content: doc.content,
      version: doc.version,
      lineCount: doc.lineCount,
    })

    // Régénérer via LLM
    const t0 = Date.now()
    const { content, model } = await generateBusinessMd(answers, userId)
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
        regeneratingAt: null, // Terminé
        updatedAt: new Date(),
      })
      .where(and(eq(businessDocs.id, docId), eq(businessDocs.userId, userId)))
  } catch (error) {
    // En cas d'échec, retirer le flag regenerating
    console.error('[business-md/regenerate] background error:', error)
    await db.update(businessDocs)
      .set({ regeneratingAt: null, updatedAt: new Date() })
      .where(eq(businessDocs.id, docId))
      .catch(() => {})
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { docId } = schema.parse(await req.json())

    const doc = await db.query.businessDocs.findFirst({
      where: (d, { eq, and }) => and(eq(d.id, docId), eq(d.userId, userId)),
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

    // Marquer comme en cours de régénération
    await db.update(businessDocs)
      .set({ regeneratingAt: new Date(), updatedAt: new Date() })
      .where(and(eq(businessDocs.id, docId), eq(businessDocs.userId, userId)))

    // Lancer la régénération en background (ne bloque pas la réponse HTTP)
    runRegeneration(docId, userId)

    return NextResponse.json({ status: 'started', version: doc.version })
  } catch (error) {
    console.error('[business-md/regenerate]', error)
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 })
  }
}
