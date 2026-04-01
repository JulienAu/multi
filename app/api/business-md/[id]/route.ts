import { NextRequest, NextResponse } from 'next/server'
import { db, businessDocs, businessDocVersions } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  content: z.string().min(1),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = updateSchema.parse(await req.json())

    const existing = await db.query.businessDocs.findFirst({
      where: (d, { eq, and }) => and(eq(d.id, id), eq(d.userId, userId)),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const lines = body.content.split('\n').length
    const sections = (body.content.match(/^#\s/gm) || []).length
    const newVersion = existing.version + 1

    // Sauvegarder la version précédente
    await db.insert(businessDocVersions).values({
      docId: id,
      content: existing.content,
      version: existing.version,
      lineCount: existing.lineCount,
    })

    // Mettre à jour le doc principal
    const [updated] = await db.update(businessDocs)
      .set({
        content: body.content,
        version: newVersion,
        lineCount: lines,
        sectionCount: sections,
        updatedAt: new Date(),
      })
      .where(and(eq(businessDocs.id, id), eq(businessDocs.userId, userId)))
      .returning()

    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      lineCount: updated.lineCount,
      sectionCount: updated.sectionCount,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('[business-md/update]', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Historique des versions
    const versions = await db.query.businessDocVersions.findMany({
      where: (v, { eq }) => eq(v.docId, id),
      orderBy: (v, { desc }) => [desc(v.version)],
      columns: { id: true, version: true, lineCount: true, createdAt: true },
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('[business-md/versions]', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}
