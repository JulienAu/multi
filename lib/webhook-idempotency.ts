import { db, webhookEvents } from '@/lib/db'

/**
 * Enregistre un événement webhook et retourne :
 *   - `true` si c'est la première fois (→ traiter)
 *   - `false` si déjà vu (→ ignorer, renvoyer 200 sans rien faire)
 *
 * Appuyé sur l'index unique (provider, externalId) + ON CONFLICT DO NOTHING.
 */
export async function recordWebhookEvent(
  provider: 'stripe' | 'openclaw',
  externalId: string,
): Promise<boolean> {
  const [row] = await db
    .insert(webhookEvents)
    .values({ provider, externalId })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.externalId] })
    .returning({ id: webhookEvents.id })
  return !!row
}
