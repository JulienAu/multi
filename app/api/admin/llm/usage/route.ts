import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AdminError } from '@/lib/admin'
import { db, llmUsage, businesses, users } from '@/lib/db'
import { eq, gte, and, sql } from 'drizzle-orm'

/**
 * GET /api/admin/llm/usage
 * Query params:
 *   - days: number of days to look back (default 7)
 *   - businessId: filter by specific business
 *   - groupBy: 'business' | 'model' | 'endpoint' | 'day' (default 'business')
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
  const filterBusinessId = params.get('businessId')
  const groupBy = params.get('groupBy') || 'business'

  const since = new Date()
  since.setDate(since.getDate() - days)

  const conditions = [gte(llmUsage.createdAt, since)]
  if (filterBusinessId) conditions.push(eq(llmUsage.businessId, filterBusinessId))

  if (groupBy === 'business') {
    const rows = await db
      .select({
        businessId: llmUsage.businessId,
        businessName: businesses.name,
        ownerEmail: users.email,
        plan: businesses.plan,
        totalPromptTokens: sql<number>`SUM(${llmUsage.promptTokens})`,
        totalCompletionTokens: sql<number>`SUM(${llmUsage.completionTokens})`,
        totalCalls: sql<number>`COUNT(*)`,
      })
      .from(llmUsage)
      .innerJoin(businesses, eq(llmUsage.businessId, businesses.id))
      .innerJoin(users, eq(businesses.userId, users.id))
      .where(and(...conditions))
      .groupBy(llmUsage.businessId, businesses.name, users.email, businesses.plan)
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
