// OpenRouter est l'unique point d'entrée pour tous les LLMs.
// Compatible API OpenAI — fetch natif pour rester léger.

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is required')
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  max_tokens?: number
  temperature?: number
}

export interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callLLM(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  const response = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://multi.app',
      'X-Title': 'MULTI - Generative Business Platform',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${error}`)
  }

  return response.json()
}

/** Streaming variant — returns the raw Response with SSE body. */
export async function callLLMStream(request: OpenRouterRequest): Promise<Response> {
  const response = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://multi.app',
      'X-Title': 'MULTI - Generative Business Platform',
    },
    body: JSON.stringify({ ...request, stream: true }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${error}`)
  }

  return response
}

// Modèles disponibles via OpenRouter
export const MODELS = {
  GENERATION:   process.env.LLM_MODEL_GENERATION || 'anthropic/claude-sonnet-4-5',
  LIGHT:        process.env.LLM_MODEL_LIGHT || 'anthropic/claude-haiku-4-5',
  FALLBACK:     'openai/gpt-4o-mini',
} as const
