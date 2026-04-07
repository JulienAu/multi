import { NextRequest, NextResponse } from 'next/server'
import { db, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { logUsage } from '@/lib/llm/gateway'

/**
 * POST /api/llm/v1/chat/completions
 *
 * OpenAI-compatible proxy for OpenClaw containers.
 * Auth: Bearer token = the container's gatewayToken (identifies the user).
 * Forwards requests to OpenRouter, strips the API key from the container.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate via gateway token
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: { message: 'Missing authorization', type: 'auth_error' } }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const instance = await db.query.openclawInstances.findFirst({
    where: (o, { eq }) => eq(o.gatewayToken, token),
    columns: { userId: true, containerName: true },
  })
  if (!instance) {
    return NextResponse.json({ error: { message: 'Invalid token', type: 'auth_error' } }, { status: 401 })
  }

  // 2. Forward to OpenRouter
  const body = await req.json()
  const isStream = body.stream === true

  // Strip custom provider prefix (e.g. 'multi/qwen/model' → 'qwen/model')
  if (body.model && body.model.startsWith('multi/')) {
    body.model = body.model.slice(6)
  }

  const openrouterResponse = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://multi.app',
      'X-Title': 'MULTI - Generative Business Platform',
    },
    body: JSON.stringify(body),
  })

  if (!openrouterResponse.ok) {
    const errorText = await openrouterResponse.text()
    return new Response(errorText, {
      status: openrouterResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Stream: pipe through directly
  if (isStream) {
    // Log usage at the end is not possible with streaming without parsing SSE,
    // so we skip detailed token logging for streamed agent calls for now.
    return new Response(openrouterResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // 4. Non-stream: parse, log usage, return
  const data = await openrouterResponse.json()

  if (data.usage) {
    logUsage(instance.userId, body.model || 'unknown', 'agent', data.usage).catch(console.error)
  }

  return NextResponse.json(data)
}
