// ARS Coach — System prompt builder with chapter routing.
// Selects relevant chapters via a fast LLM call, then builds the full prompt.

import { readFileSync } from 'fs'
import { join } from 'path'
import { CHAPTERS } from './corpus/index'
import { callLLM, MODELS } from '@/lib/llm/client'

const CORPUS_DIR = join(process.cwd(), 'lib/ars-coach/corpus')
const SOUL_PATH = join(process.cwd(), 'lib/ars-coach/SOUL.md')

let soulCache: string | null = null
const chapterCache = new Map<string, string>()

function loadSoul(): string {
  if (!soulCache) soulCache = readFileSync(SOUL_PATH, 'utf-8')
  return soulCache
}

function loadChapter(id: string): string {
  if (!chapterCache.has(id)) {
    chapterCache.set(id, readFileSync(join(CORPUS_DIR, `${id}.md`), 'utf-8'))
  }
  return chapterCache.get(id)!
}

/** Use a fast LLM to pick 2-3 relevant chapters for the user's question. */
export async function selectChapters(
  userMessage: string,
  conversationContext: string,
): Promise<string[]> {
  const chapterList = CHAPTERS.map(c =>
    `- ${c.id}: ${c.title} — ${c.description}`
  ).join('\n')

  const response = await callLLM({
    model: MODELS.LIGHT,
    max_tokens: 100,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `Tu es un routeur de chapitres. Étant donné la question d'un lecteur et le contexte de conversation, sélectionne les 2-3 chapitres les plus pertinents pour y répondre.

Chapitres disponibles :
${chapterList}

Contexte de conversation (derniers messages) :
${conversationContext || '(début de conversation)'}

Question du lecteur :
${userMessage}

Réponds UNIQUEMENT avec les IDs des chapitres séparés par des virgules, sans explication. Exemple : 04_agentic_revenue_systems,06_methode_value,13_glossaire`,
    }],
  })

  const raw = response.choices[0]?.message?.content?.trim() || ''
  const ids = raw.split(',').map(s => s.trim()).filter(id =>
    CHAPTERS.some(c => c.id === id)
  )

  // Fallback: always include glossaire + avant-propos if nothing matched
  if (ids.length === 0) return ['00_avant_propos', '13_glossaire']
  return ids.slice(0, 3)
}

/** Build the full system prompt with SOUL + selected chapters. */
export function buildSystemPrompt(chapterIds: string[]): string {
  const soul = loadSoul()
  const chapters = chapterIds.map(id => {
    const meta = CHAPTERS.find(c => c.id === id)
    const content = loadChapter(id)
    return `\n---\n## ${meta?.title || id}\n\n${content}`
  }).join('\n')

  return `${soul}

---

# Contenu du livre (chapitres sélectionnés)

Les chapitres suivants sont extraits du livre *Agentic Revenue Systems*. Utilise-les pour répondre au lecteur. Cite le chapitre quand tu fais référence à un concept.
${chapters}`
}

/** Build conversation messages for the LLM call. */
export function buildMessages(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  return [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-10), // last 10 messages for context
    { role: 'user' as const, content: userMessage },
  ]
}
