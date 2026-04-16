// Index des chapitres du livre ARS pour le routing contextuel.
// Utilisé par le LLM léger (Haiku) pour sélectionner les chapitres pertinents.

export const CHAPTERS = [
  {
    id: '00_avant_propos',
    title: 'Avant-propos',
    description: 'Introduction au livre, thèse AC > HW (Agentic Capital > Human Work), présentation des concepts clés : Capital Agentique, ARS, VALUE, Canvas ARS.',
    concepts: ['AC > HW', 'Capital Agentique', 'ARS', 'VALUE', 'Canvas ARS', 'introduction'],
  },
  {
    id: '01_le_jour_ou_tout_change',
    title: 'Chapitre 1 — Le jour où j\'ai compris que tout allait changer',
    description: 'Récit personnel de prise de conscience. Les quatre prisons dorées (freelance, employé, entrepreneur classique, investisseur passif). Le système ne récompense pas l\'effort.',
    concepts: ['prisons dorées', 'basculement', 'prise de conscience', 'travail humain', 'système'],
  },
  {
    id: '02_le_tsunami_agentique',
    title: 'Chapitre 2 — Le tsunami agentique',
    description: 'Les six signaux du tsunami agentique. Différence agent vs outil. L\'échiquier de riz (croissance exponentielle). L\'ère des agents autonomes.',
    concepts: ['tsunami agentique', 'six signaux', 'agent vs outil', 'échiquier de riz', 'exponentiel', 'agents autonomes'],
  },
  {
    id: '03_la_fin_des_illusions',
    title: 'Chapitre 3 — La fin des illusions',
    description: 'Trois illusions à abandonner : l\'IA assiste seulement, la formation suffit, quelqu\'un viendra vous sauver. Réalité de la disruption.',
    concepts: ['illusions', 'disruption', 'formation', 'IA assistant', 'responsabilité'],
  },
  {
    id: '04_agentic_revenue_systems',
    title: 'Chapitre 4 — Les Agentic Revenue Systems',
    description: 'Définition formelle du Capital Agentique et des ARS. Les trois lois : Déflation Agentique, Propriété Agentique, Inévitabilité Agentique.',
    concepts: ['Capital Agentique', 'ARS définition', 'trois lois', 'Déflation Agentique', 'Propriété Agentique', 'Inévitabilité Agentique'],
  },
  {
    id: '05_ecosysteme_ars',
    title: 'Chapitre 5 — L\'écosystème ARS',
    description: 'L\'arbitrage agentique. Cas fondateurs (Nat Eliason, Oliver Henry, etc.). Les sept catégories d\'ARS. Les six modèles de monétisation. Le Flywheel Agentique.',
    concepts: ['arbitrage agentique', 'cas fondateurs', 'catégories ARS', 'monétisation', 'Flywheel', 'exemples', 'niches'],
  },
  {
    id: '06_methode_value',
    title: 'Chapitre 6 — La méthode VALUE',
    description: 'Les cinq piliers VALUE : Value (proposition de valeur), Acquisition (trafic), Leverage (levier agentique), Uptake (adoption/conversion), Enhancement (amélioration continue). L\'ARS Canvas.',
    concepts: ['VALUE', 'Value', 'Acquisition', 'Leverage', 'Uptake', 'Enhancement', 'ARS Canvas', 'piliers', 'méthode'],
  },
  {
    id: '07_trouver_votre_levier',
    title: 'Chapitre 7 — Trouver votre levier de revenu',
    description: 'La Matrice de Positionnement (4 quadrants). L\'Échelle de Maturité ARS (niveaux 0-4). L\'ARS Score (10 questions). Les dix profils (entrepreneur, freelance, étudiant, cadre, etc.).',
    concepts: ['Matrice de Positionnement', 'quadrants', 'Échelle de Maturité', 'ARS Score', 'profils', 'diagnostic', 'positionnement'],
  },
  {
    id: '08_construire_premier_systeme',
    title: 'Chapitre 8 — Construire votre premier système',
    description: 'La stack technique (5 couches). Le cas Felix. Le Quickstart Guide (20 étapes du week-end). Les skill files. De l\'agent unique au multi-agents.',
    concepts: ['stack technique', 'Quickstart', 'skill files', 'multi-agents', 'construction', 'premier ARS', 'technique', 'OpenClaw', 'Claude', 'MCP'],
  },
  {
    id: '09_et_si_jechouais',
    title: 'Chapitre 9 — Et si j\'échouais ?',
    description: 'Les dix patterns d\'échec. La fiabilité composée. Le fossé démo-production. La méthode VALUE comme diagnostic d\'échec.',
    concepts: ['patterns échec', 'fiabilité', 'fossé démo-production', 'diagnostic', 'échec', 'erreurs', 'pièges'],
  },
  {
    id: '10_optimiser_et_scaler',
    title: 'Chapitre 10 — Optimiser et scaler',
    description: 'De 1000 à 30000 dollars par mois. Les trois paliers de revenus. Le pricing par la valeur. Le multi-agents avancé.',
    concepts: ['optimisation', 'scaling', 'revenus', 'pricing', 'paliers', 'croissance', 'multi-agents avancé'],
  },
  {
    id: '11_de_travailleur_a_architecte',
    title: 'Chapitre 11 — De travailleur à Architecte',
    description: 'Le shift identitaire. De la vente de temps à la conception de systèmes. Le Chief Question Officer. Le Capital Agentique comme patrimoine.',
    concepts: ['Architecte', 'shift identitaire', 'patrimoine', 'Chief Question Officer', 'transformation personnelle'],
  },
  {
    id: '12_ere_agentique',
    title: 'Chapitre 12 — L\'ère agentique',
    description: 'Les trois horizons temporels. Le Capital Agentique dans le monde réel. La Pause d\'Engels. Vers une infrastructure ouverte. L\'appel à construire.',
    concepts: ['ère agentique', 'horizons', 'Pause d\'Engels', 'infrastructure ouverte', 'futur', 'vision'],
  },
  {
    id: '13_glossaire',
    title: 'Glossaire',
    description: 'Définitions de tous les termes clés du livre : ARS, Capital Agentique, VALUE, Canvas ARS, etc.',
    concepts: ['glossaire', 'définitions', 'termes', 'vocabulaire'],
  },
] as const

export type ChapterId = typeof CHAPTERS[number]['id']
