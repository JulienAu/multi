export interface AgentTemplate {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
  schedule: string
  scheduleHuman: string
  requiresApproval: boolean
  category: 'marketing' | 'veille' | 'operations' | 'strategie'
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'marketing-instagram',
    name: 'Marketing Instagram',
    icon: '📸',
    description: 'Genere un post Instagram adapte a votre activite et votre calendrier marketing.',
    prompt: `Tu es l'agent Marketing Instagram. En te basant sur le BUSINESS.md de l'Architecte :
1. Consulte le calendrier marketing et les evenements saisonniers
2. Identifie un sujet pertinent pour aujourd'hui
3. Redige un post Instagram engageant (texte + suggestions de hashtags)
4. Adapte le ton a la voix de marque definie dans le BUSINESS.md
5. Propose une description d'image/visuel a creer

Reponds en francais. Sois concret et specifique au secteur.`,
    schedule: '0 9 * * *',
    scheduleHuman: 'Chaque jour a 9h',
    requiresApproval: true,
    category: 'marketing',
  },
  {
    id: 'veille-concurrentielle',
    name: 'Veille concurrentielle',
    icon: '🔍',
    description: 'Analyse vos concurrents et identifie les opportunites et menaces.',
    prompt: `Tu es l'agent de Veille Concurrentielle. En te basant sur le BUSINESS.md :
1. Identifie les concurrents mentionnes dans les CIBLES PRIORITAIRES
2. Analyse leurs forces et faiblesses par rapport a notre positionnement
3. Identifie 2-3 opportunites concretes a exploiter cette semaine
4. Identifie 1 menace potentielle a surveiller
5. Propose une action concrete pour cette semaine

Reponds en francais avec des recommandations actionnables.`,
    schedule: '0 8 * * 1',
    scheduleHuman: 'Chaque lundi a 8h',
    requiresApproval: false,
    category: 'veille',
  },
  {
    id: 'email-prospection',
    name: 'Email de prospection',
    icon: '✉️',
    description: 'Redige un email de prospection personnalise pour vos cibles prioritaires.',
    prompt: `Tu es l'agent de Prospection Email. En te basant sur le BUSINESS.md :
1. Choisis une cible dans la section CIBLES PRIORITAIRES (Tier 1 de preference)
2. Redige un email de prospection personnalise
3. Utilise le processus de vente et les objections/reponses du BUSINESS.md
4. Adapte le ton a la voix de marque
5. Propose un objet d'email accrocheur + le corps du message

L'email doit etre court (150 mots max), personnalise, et avoir un CTA clair.`,
    schedule: '0 10 * * 2,4',
    scheduleHuman: 'Mardi et jeudi a 10h',
    requiresApproval: true,
    category: 'marketing',
  },
  {
    id: 'rapport-hebdo',
    name: 'Rapport hebdomadaire',
    icon: '📊',
    description: 'Resume de la semaine : actions realisees, metriques et recommandations.',
    prompt: `Tu es l'agent de Reporting. En te basant sur le BUSINESS.md et le contexte disponible :
1. Resume les actions cles realisees cette semaine
2. Identifie les metriques importantes (si disponibles dans le workspace)
3. Evalue l'avancement par rapport aux objectifs du BUSINESS.md
4. Propose 3 priorites pour la semaine prochaine
5. Identifie 1 point de blocage eventuel

Reponds en francais avec un format structure et lisible.`,
    schedule: '0 17 * * 5',
    scheduleHuman: 'Chaque vendredi a 17h',
    requiresApproval: false,
    category: 'strategie',
  },
  {
    id: 'veille-sectorielle',
    name: 'Veille sectorielle',
    icon: '📰',
    description: 'Surveille les actualites de votre secteur et identifie les tendances.',
    prompt: `Tu es l'agent de Veille Sectorielle. En te basant sur le BUSINESS.md :
1. Identifie le secteur et la localisation de l'activite
2. Recherche les tendances actuelles du secteur
3. Identifie 2-3 actualites ou tendances pertinentes
4. Analyse l'impact potentiel sur l'activite de l'Architecte
5. Propose 1 action concrete a envisager

Reponds en francais. Sois factuel et specifique au secteur et a la localisation.`,
    schedule: '0 7 * * *',
    scheduleHuman: 'Chaque jour a 7h',
    requiresApproval: false,
    category: 'veille',
  },
  {
    id: 'amelioration-site',
    name: 'Amelioration site web',
    icon: '🌐',
    description: 'Analyse votre site web et propose des ameliorations concretes.',
    prompt: `Tu es l'agent d'Amelioration Web. En te basant sur le BUSINESS.md et les fichiers du workspace :
1. Lis les fichiers du site web dans le workspace (index.html, style.css, etc.)
2. Analyse le contenu, le design et la structure
3. Identifie 3 ameliorations concretes a faire
4. Propose le code modifie pour 1 amelioration prioritaire
5. Explique l'impact attendu sur la conversion

Reponds en francais. Si tu modifies du code, utilise les outils Write/Edit.`,
    schedule: '0 14 * * 3',
    scheduleHuman: 'Chaque mercredi a 14h',
    requiresApproval: true,
    category: 'operations',
  },
]

/**
 * Visual schedule options for the UI (maps to cron expressions)
 */
export const SCHEDULE_PRESETS = [
  { label: 'Chaque jour', cron: '0 {hour} * * *', needsDays: false },
  { label: 'Jours specifiques', cron: '0 {hour} * * {days}', needsDays: true },
  { label: 'Chaque semaine', cron: '0 {hour} * * {days}', needsDays: true },
] as const

export const DAYS_OF_WEEK = [
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mer' },
  { value: '4', label: 'Jeu' },
  { value: '5', label: 'Ven' },
  { value: '6', label: 'Sam' },
  { value: '0', label: 'Dim' },
] as const

/**
 * Build a cron expression from UI inputs
 */
export function buildCronExpression(
  scheduleType: 'daily' | 'specific_days' | 'weekly',
  hour: number,
  minute: number,
  days: string[],
): { cron: string; human: string } {
  const timeStr = `${hour}h${minute > 0 ? String(minute).padStart(2, '0') : ''}`

  if (scheduleType === 'daily') {
    return {
      cron: `${minute} ${hour} * * *`,
      human: `Chaque jour a ${timeStr}`,
    }
  }

  const dayLabels = days.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).filter(Boolean)

  if (scheduleType === 'weekly' && days.length === 1) {
    return {
      cron: `${minute} ${hour} * * ${days[0]}`,
      human: `Chaque ${dayLabels[0]} a ${timeStr}`,
    }
  }

  return {
    cron: `${minute} ${hour} * * ${days.join(',')}`,
    human: `${dayLabels.join(', ')} a ${timeStr}`,
  }
}
