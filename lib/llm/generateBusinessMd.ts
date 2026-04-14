import { llmGateway } from './gateway'
import type { WizardAnswers } from '@/lib/types'

export async function generateBusinessMd(
  answers: WizardAnswers,
  businessId: string,
): Promise<{ content: string; model: string }> {
  const response = await llmGateway(businessId, 'generation', 'business-md', {
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: buildPrompt(answers),
      },
    ],
  })

  const content = response.choices[0]?.message?.content ?? ''
  return { content, model: response.model }
}

function buildPrompt(answers: WizardAnswers): string {
  const sector   = answers.sector as string
  const name     = answers.name as string
  const location = answers.location as string
  const offer    = answers.offer as string
  const customer = answers.customer as string
  const revenue  = answers.revenue as string
  const channels = Array.isArray(answers.channels)
    ? (answers.channels as string[]).join(', ')
    : (answers.channels as string)
  const delegate = Array.isArray(answers.delegate)
    ? (answers.delegate as string[]).join(', ')
    : (answers.delegate as string)
  const keep     = answers.keep as string
  const goal     = answers.goal as string
  const tone     = answers.tone as string
  const autonomy = answers.autonomy as string

  return `Tu es un expert en stratégie business et en systèmes d'agents IA (ARS — Agentic Revenue Systems).
Tu dois générer un BUSINESS.md complet et hautement personnalisé pour un entrepreneur.
Ce document sera la source de vérité unique pour tous les agents IA qui opèreront son business.

## Informations de l'entrepreneur

- Secteur : ${sector}
- Nom de l'activité : ${name}
- Localisation : ${location}
- Offre exacte : ${offer}
- Client idéal : ${customer}
- Revenus actuels : ${revenue}
- Canaux d'acquisition actuels : ${channels}
- Fonctions à déléguer à l'ARS : ${delegate}
- Ce que l'Architecte garde en main : ${keep}
- Objectif revenu à 12 mois : ${goal}
- Ton de la marque : ${tone}
- Niveau d'autonomie souhaité : ${autonomy}

## Instructions de génération

Génère un document markdown structuré avec ces 10 sections.
Sois TRÈS concret, spécifique, adapté au secteur "${sector}" à "${location}".
Pas de généralités — des actions, des noms, des chiffres, des exemples réels.

## 1. IDENTITÉ BUSINESS
Nom, secteur, localisation, positionnement en une phrase percutante, ce que nous ne sommes PAS.

## 2. VALUE — L'OFFRE
Proposition de valeur détaillée, carte produit avec prix et marges estimées, jobs-to-be-done (fonctionnels, sociaux, émotionnels), douleurs adressées, gains inattendus.

## 3. ACQUISITION — COMMENT TROUVER DES CLIENTS
Tableau des canaux (statut, priorité, responsable), stratégie 90 jours en 3 phases (semaine 1-4, 5-8, 9-12), métriques cibles chiffrées.

## 4. LEVERAGE — COMMENT CONVERTIR
Process de vente étape par étape, 5+ objections avec réponses, pricing et seuils.

## 5. UPTAKE — COMMENT LIVRER LA VALEUR
Opérations humaines (avec horaires), opérations agents (liste exhaustive), standards de qualité mesurables.

## 6. ENHANCEMENT — COMMENT S'AMÉLIORER EN CONTINU
4-5 hypothèses à tester avec métriques, cycle nocturne 2h du matin, axes d'amélioration.

## 7. CIBLES PRIORITAIRES
Tier 1 grandes cibles (tableau : nom, secteur, effectif, distance, statut), Tier 2 secondaires, approche en 5 étapes.

## 8. CONTRAINTES ET LIMITES
Budget max, 7+ actions JAMAIS autorisées, escalades obligatoires, conformité RGPD.

## 9. CALENDRIER MARKETING
Événements récurrents et saisonniers avec actions marketing associées.

## 10. VOIX ET TON DE LA MARQUE
Personnalité, 4 exemples OUI et 4 NON, langue, instructions visuelles.

## Format
- Commence par "# BUSINESS.md — ${name}"
- Tableaux markdown pour les données tabulaires
- 250 à 350 lignes au total
- Spécifique à "${location}" — citer des entreprises, quartiers, lieux réels
- Pas de conclusion — c'est un document opérationnel`
}
