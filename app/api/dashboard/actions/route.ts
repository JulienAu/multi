import { NextRequest, NextResponse } from 'next/server'
import { db, actionValidations } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUserId } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  actionId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
})

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = schema.parse(await req.json())

    const [updated] = await db.update(actionValidations)
      .set({
        status: body.decision,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(actionValidations.id, body.actionId),
          eq(actionValidations.userId, userId),
        )
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Action non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ action: { id: updated.id, status: updated.status } })
  } catch (error) {
    console.error('[dashboard/actions]', error)
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 })
  }
}
