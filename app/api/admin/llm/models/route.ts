import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AdminError } from '@/lib/admin'
import { db, modelConfigs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * GET /api/admin/llm/models — list all model configs
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  const configs = await db.query.modelConfigs.findMany({
    orderBy: (c, { asc }) => [asc(c.plan), asc(c.purpose)],
  })

  return NextResponse.json({ configs })
}

const upsertSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  purpose: z.enum(['generation', 'light', 'agent', 'fallback']),
  model: z.string().min(1),
  maxTokensPerDay: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * POST /api/admin/llm/models — create or update a model config
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  const body = upsertSchema.parse(await req.json())

  // Check if config exists for this plan+purpose
  const existing = await db.query.modelConfigs.findFirst({
    where: (c, { eq, and }) => and(eq(c.plan, body.plan), eq(c.purpose, body.purpose)),
  })

  if (existing) {
    await db.update(modelConfigs)
      .set({
        model: body.model,
        maxTokensPerDay: body.maxTokensPerDay ?? null,
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(modelConfigs.id, existing.id))

    return NextResponse.json({ status: 'updated', id: existing.id })
  }

  const [created] = await db.insert(modelConfigs).values({
    plan: body.plan,
    purpose: body.purpose,
    model: body.model,
    maxTokensPerDay: body.maxTokensPerDay ?? null,
    isActive: body.isActive ?? true,
  }).returning()

  return NextResponse.json({ status: 'created', id: created.id })
}

const deleteSchema = z.object({ id: z.string().uuid() })

/**
 * DELETE /api/admin/llm/models — delete a model config (revert to defaults)
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  const { id } = deleteSchema.parse(await req.json())
  await db.delete(modelConfigs).where(eq(modelConfigs.id, id))

  return NextResponse.json({ status: 'deleted' })
}
