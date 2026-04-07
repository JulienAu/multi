import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AdminError } from '@/lib/admin'
import { db, llmUsage, users } from '@/lib/db'
import { eq, desc, gte, and, sql } from 'drizzle-orm'

/**
 * GET /api/admin/llm/usage
 * Query params:
 *   - days: number of days to look back (default 7)
 *   - userId: filter by specific user
 *   - groupBy: 'user' | 'model' | 'endpoint' | 'day' (default 'user')
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }

  const params = req.nextUrl.searchParams
  const days = Math.min(Number(params.get('days') || 7), 90)
  const filterUserId = params.get('userId')
  const groupBy = params.get('groupBy') || 'user'

  const since = new Date()
  since.setDate(since.getDate() - days)

  const conditions = [gte(llmUsage.createdAt, since)]
  if (filterUserId) conditions.push(eq(llmUsage.userId, filterUserId))

  if (groupBy === 'user') {
    const rows = await db
      .select({
        userId: llmUsage.userId,
        email: users.email,
        firstName: users.firstName,
        plan: users.plan,
        totalPromptTokens: sql<number>`SUM(${llmUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`SUM(${llmUsage.completionTokens})`,
        totalCalls: sql<number>`COUNT(*)`,
      })
      .from(llmUsage)
      .innerJoin(users, eq(llmUsage.userId, users.id))
      .where(and(...conditions))
      .groupBy(llmUsage.userId, users.email, users.firstName, users.plan)
      .orderBy(sql`SUM(${llmUsage.promptTokens} + ${llmUsage.completionTokens}) DESC`)
      .limit(100)

    return NextResponse.json({ groupBy, days, data: rows })
  }

  if (groupBy === 'model') {
    const rows = await db
      .select({
        model: llmUsage.model,
        totalPromptTokens: sql<number>`SUM(${llmUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`SUM(${llmUsage.completionTokens})`,
        totalCalls: sql<number>`COUNT(*)`,
      })
      .from(llmUsage)
      .where(and(...conditions))
      .groupBy(llmUsage.model)
      .orderBy(sql`SUM(${llmUsage.promptTokens} + ${llmUsage.completionTokens}) DESC`)

    return NextResponse.json({ groupBy, days, data: rows })
  }

  if (groupBy === 'endpoint') {
    const rows = await db
      .select({
        endpoint: llmUsage.endpoint,
        totalPromptTokens: sql<number>`SUM(${llmUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`SUM(${llmUsage.completionTokens})`,
        totalCalls: sql<number>`COUNT(*)`,
      })
      .from(llmUsage)
      .where(and(...conditions))
      .groupBy(llmUsage.endpoint)
      .orderBy(sql`SUM(${llmUsage.promptTokens} + ${llmUsage.completionTokens}) DESC`)

    return NextResponse.json({ groupBy, days, data: rows })
  }

  if (groupBy === 'day') {
    const rows = await db
      .select({
        day: sql<string>`DATE(${llmUsage.createdAt})`,
        totalPromptTokens: sql<number>`SUM(${llmUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`SUM(${llmUsage.completionTokens})`,
        totalCalls: sql<number>`COUNT(*)`,
      })
      .from(llmUsage)
      .where(and(...conditions))
      .groupBy(sql`DATE(${llmUsage.createdAt})`)
      .orderBy(sql`DATE(${llmUsage.createdAt}) DESC`)

    return NextResponse.json({ groupBy, days, data: rows })
  }

  return NextResponse.json({ error: 'Invalid groupBy' }, { status: 400 })
}
