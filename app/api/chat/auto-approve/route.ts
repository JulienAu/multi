import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { sessionManager } from '@/lib/openclaw/session-manager'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  enabled: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { enabled } = schema.parse(await req.json())
    await sessionManager.setAutoApprove(userId, enabled)

    return NextResponse.json({ autoApprove: enabled })
  } catch (error) {
    console.error('[chat/auto-approve]', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const instance = await db.query.openclawInstances.findFirst({
      where: (o, { eq }) => eq(o.userId, userId),
    })

    return NextResponse.json({ autoApprove: instance?.autoApprove ?? false })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
