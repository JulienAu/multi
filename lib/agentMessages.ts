import type { WizardAnswers } from './types'

export const INITIAL_MESSAGE =
  "Bonjour ! Je suis votre futur agent MULTI. Pendant que vous répondez aux 12 questions, je prépare déjà votre stratégie. Commençons."

export const SECTOR_MESSAGES: Record<string, string> = {
  'Restaurant / Food': "Restaurant — excellente verticale. Je vais préparer vos skill files marketing restauration, votre séquence de prospection B2B, et votre calendrier saisonnier.",
  'E-commerce': "E-commerce — je connais bien. Je vais analyser votre marché, préparer vos séquences d'acquisition, et configurer le tracking de conversion.",
  'Consulting / Coaching': "Consulting — parfait. Je vais préparer votre stratégie de positionnement, vos séquences LinkedIn, et votre pipeline de prospection B2B.",
  'Services locaux (artisan, immobilier...)': "Services locaux — gros potentiel. Je vais travailler votre SEO local, vos avis Google, et votre prospection de quartier.",
  'SaaS / Produit digital': "SaaS — mon terrain de jeu. Je vais configurer votre acquisition digitale, votre onboarding, et vos boucles de rétention.",
  'Contenu / Média': "Contenu — intéressant. Je vais préparer votre stratégie de distribution multi-plateforme et vos mécanismes de monétisation.",
  'Freelance / Indépendant': "Freelance — je vais vous aider à passer de la vente de temps à la vente de systèmes. C'est exactement ce pour quoi MULTI est conçu.",
  'Autre': "Secteur original — j'adore. Dites-m'en plus et je m'adapte.",
}

export function getLocationMessage(location: string): string {
  const loc = location.toLowerCase()
  const matchers: [string[], string][] = [
    [['sophia', 'antipolis', 'biot', 'valbonne'],
     "Sophia Antipolis — excellent marché tech. 8 entreprises de +500 salariés dans un rayon de 5 km. Je les ajouterai à votre plan de prospection."],
    [['paris', '75'], "Paris — marché dense. Je vais identifier vos arrondissements prioritaires et zones de chalandise."],
    [['lyon', '69'],  "Lyon — belle dynamique économique. Je cartographie les zones d'activité et entreprises clés."],
    [['marseille', '13'], "Marseille — marché en forte croissance. J'analyse votre zone et identifie les opportunités."],
    [['bordeaux', '33'], "Bordeaux — écosystème dynamique. Je prépare votre stratégie locale."],
    [['toulouse', '31'], "Toulouse — hub tech et aérospatial. Je vais identifier vos cibles B2B prioritaires."],
    [['nantes', '44'],   "Nantes — marché attractif en croissance. Je cartographie les opportunités de votre zone."],
    [['lille', '59'],    "Lille — carrefour économique franco-belge. Excellent potentiel B2B que j'analyse."],
  ]
  for (const [keywords, message] of matchers) {
    if (keywords.some(kw => loc.includes(kw))) return message
  }
  return "Je note votre localisation. Je vais analyser votre zone de chalandise et identifier les opportunités locales."
}

export function getDelegateMessage(delegated: string[]): string {
  const count = delegated.length
  const agents: string[] = []
  if (delegated.some(d => ['Réseaux sociaux', 'Publicité Google/Meta', 'Prospection clients', 'Emails marketing', 'Fidélisation'].includes(d)))
    agents.push('un agent Marketing')
  if (delegated.some(d => ['Site web', 'Facturation', 'Reporting'].includes(d)))
    agents.push('un agent Engineering')
  if (delegated.some(d => ['Support client', 'Standard téléphonique'].includes(d)))
    agents.push('un agent Support')

  const agentList = agents.length === 0 ? 'les agents nécessaires'
    : agents.length === 1 ? agents[0]
    : agents.slice(0, -1).join(', ') + ' et ' + agents[agents.length - 1]

  return `${count} fonction${count > 1 ? 's' : ''} déléguée${count > 1 ? 's' : ''}. Je vais configurer ${agentList}. Votre premier cycle nocturne démarrera cette nuit à 2h.`
}

export function getAgentMessage(
  questionId: string,
  answer: string | string[],
  _answers: WizardAnswers
): string | null {
  switch (questionId) {
    case 'sector':   return SECTOR_MESSAGES[answer as string] ?? SECTOR_MESSAGES['Autre']
    case 'location': return getLocationMessage(answer as string)
    case 'delegate': return getDelegateMessage(Array.isArray(answer) ? answer : [answer])
    default:         return null
  }
}
