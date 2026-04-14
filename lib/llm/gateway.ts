// LLM Gateway — proxy all OpenRouter calls through per-business model resolution,
// rate limiting, and usage tracking.

import { db, modelConfigs, llmUsage, businesses } from '@/lib/db'
import { eq, and, sql, gte } from 'drizzle-orm'
import { callLLM, MODELS, type OpenRouterRequest, type OpenRouterResponse } from './client'
import type { ModelConfig } from '@/lib/db/schema'

export type LlmPurpose = 'generation' | 'light' | 'agent' | 'fallback'

// Default model mapping per plan (used when no modelConfig row exists)
const DEFAULT_MODELS: Record<string, Record<LlmPurpose, string>> = {
  starter: {
    generation: MODELS.LIGHT,
    light:      MODELS.LIGHT,
    agent:      MODELS.LIGHT,
    fallback:   MODELS.FALLBACK,
  },
  pro: {
    generation: MODELS.GENERATION,
    light:      MODELS.LIGHT,
    agent:      MODELS.GENERATION,
    fallback:   MODELS.FALLBACK,
  },
  business: {
    generation: MODELS.GENERATION,
    light:      MODELS.LIGHT,
    agent:      MODELS.GENERATION,
    fallback:   MODELS.FALLBACK,
  },
}

// Fallback for businesses with no plan (pre-subscription)
const NO_PLAN_MODELS: Record<LlmPurpose, string> = {
  generation: MODELS.LIGHT,
  light:      MODELS.LIGHT,
  agent:      MODELS.LIGHT,
  fallback:   MODELS.FALLBACK,
}

/**
 * Resolve which model a business should use for a given purpose.
 * Priority: modelConfigs table > DEFAULT_MODELS > env vars.
 */
export async function resolveModel(
  businessId: string,
  purpose: LlmPurpose,
): Promise<{ model: string; config: ModelConfig | null }> {
  const business = await db.query.businesses.findFirst({
    where: (b, { eq }) => eq(b.id, businessId),
    columns: { plan: true },
  })

  const plan = business?.plan ?? null

  if (plan) {
    const config = await db.query.modelConfigs.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.plan, plan),
        eq(c.purpose, purpose),
        eq(c.isActive, true),
      ),
    })

    if (config) {
      return { model: config.model, config }
    }
  }

  const planModels = plan ? (DEFAULT_MODELS[plan] ?? NO_PLAN_MODELS) : NO_PLAN_MODELS
  return { model: planModels[purpose], config: null }
}

/**
 * Check if business has exceeded its daily token limit.
 */
export async function checkRateLimit(
  businessId: string,
  config: ModelConfig | null,
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const limit = config?.maxTokensPerDay ?? null
  if (!limit) return { allowed: true, used: 0, limit: null }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [result] = await db
    .select({
      totalTokens: sql<number>`COALESCE(SUM(${llmUsage.promptTokens} + ${llmUsage.completionTokens}), 0)`,
    })
    .from(llmUsage)
    .where(
      and(
        eq(llmUsage.businessId, businessId),
        gte(llmUsage.createdAt, todayStart),
      ),
    )

  const used = Number(result?.totalTokens ?? 0)
  return { allowed: used < limit, used, limit }
}

/**
 * Log usage after a successful LLM call.
 */
export async function logUsage(
  businessId: string,
  model: string,
  endpoint: string,
  usage: { prompt_tokens: number; completion_tokens: number },
): Promise<void> {
  await db.insert(llmUsage).values({
    businessId,
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    endpoint,
  })
}

/**
 * Gateway: the single entry point for all LLM calls.
 * Resolves model per business plan, checks rate limits, calls OpenRouter, logs usage.
 * Pass businessId === 'anonymous' to skip plan resolution + tracking (pre-auth wizard).
 */
export async function llmGateway(
  businessId: string,
  purpose: LlmPurpose,
  endpoint: string,
  request: Omit<OpenRouterRequest, 'model'>,
): Promise<OpenRouterResponse> {
  const isAnonymous = businessId === 'anonymous'

  const { model, config } = isAnonymous
    ? { model: NO_PLAN_MODELS[purpose], config: null }
    : await resolveModel(businessId, purpose)

  if (!isAnonymous) {
    const rateLimit = await checkRateLimit(businessId, config)
    if (!rateLimit.allowed) {
      throw new LlmRateLimitError(
        `Limite quotidienne atteinte (${rateLimit.used}/${rateLimit.limit} tokens). Réessayez demain.`,
        rateLimit.used,
        rateLimit.limit!,
      )
    }
  }

  const response = await callLLM({ ...request, model })

  if (response.usage && !isAnonymous) {
    logUsage(businessId, model, endpoint, response.usage).catch(console.error)
  }

  return response
}

export class LlmRateLimitError extends Error {
  public used: number
  public limit: number
  constructor(message: string, used: number, limit: number) {
    super(message)
    this.name = 'LlmRateLimitError'
    this.used = used
    this.limit = limit
  }
}

/**
 * Resolve the OpenClaw agent model for a business's plan.
 * Used at container provisioning time.
 */
export async function resolveOpenClawModel(businessId: string): Promise<string> {
  const { model } = await resolveModel(businessId, 'agent')
  return model
}
