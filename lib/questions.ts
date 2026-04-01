import type { Question } from './types'

// Placeholders contextuels par secteur pour les questions texte/textarea
const SECTOR_PLACEHOLDERS: Record<string, Record<string, string>> = {
  'Restaurant / Food': {
    name: 'Ex: Premium Sushi, La Belle Assiette, Monsieur Croque...',
    offer: 'Ex: Des plateaux sushi premium livrés aux entreprises. Panier moyen 18€.',
    customer: 'Ex: Salariés des entreprises tech, 25-45 ans, déjeuner premium au bureau.',
    keep: 'Ex: La cuisine et les stocks. Les relations avec les fournisseurs.',
  },
  'E-commerce': {
    name: 'Ex: MaMarque, NaturShop, LeBonProduit...',
    offer: 'Ex: Des cosmétiques bio en vente en ligne. Panier moyen 35€, 200 commandes/mois.',
    customer: 'Ex: Femmes 25-40 ans, sensibles au bio, qui achètent en ligne régulièrement.',
    keep: 'Ex: Le sourcing produit et la relation fournisseurs. Le branding.',
  },
  'Consulting / Coaching': {
    name: 'Ex: Studio Clara, Growth Lab, Impactiv...',
    offer: 'Ex: Accompagnement stratégique pour dirigeants de PME. 2000€/mois par client.',
    customer: 'Ex: Dirigeants de PME 10-50 salariés, CA 1-5M€, en phase de structuration.',
    keep: 'Ex: Les sessions de coaching et la relation client directe.',
  },
  'Services locaux (artisan, immobilier...)': {
    name: 'Ex: Renov\'Expert, ImmoSophia, Jardins du Sud...',
    offer: 'Ex: Rénovation intérieure haut de gamme. Budget moyen 25 000€ par chantier.',
    customer: 'Ex: Propriétaires 35-60 ans, résidence principale, budget rénovation 15-50k€.',
    keep: 'Ex: Les chantiers, les devis techniques, la supervision des artisans.',
  },
  'SaaS / Produit digital': {
    name: 'Ex: DataPilot, FlowMetrics, TaskBoard...',
    offer: 'Ex: Outil de reporting automatisé pour e-commerçants. 49€/mois par compte.',
    customer: 'Ex: E-commerçants faisant 10-100k€/mois, qui perdent du temps sur leurs reportings.',
    keep: 'Ex: Le développement produit et la roadmap. Les décisions techniques.',
  },
  'Contenu / Média': {
    name: 'Ex: Le Digest, TechVox, CreativeStudio...',
    offer: 'Ex: Newsletter quotidienne sur l\'IA pour décideurs. Sponsoring + formation premium.',
    customer: 'Ex: Cadres et dirigeants tech, 30-50 ans, qui veulent rester à jour sur l\'IA.',
    keep: 'Ex: La ligne éditoriale et la création de contenu original.',
  },
  'Freelance / Indépendant': {
    name: 'Ex: Marie Design, DevExpert, StratConseil...',
    offer: 'Ex: Design UI/UX pour startups. TJM 500€, missions de 2-4 semaines.',
    customer: 'Ex: Startups en série A/B qui ont besoin de refaire leur produit rapidement.',
    keep: 'Ex: La production créative et les relations avec mes clients clés.',
  },
  'Autre': {
    name: 'Ex: Le nom de votre activité',
    offer: 'Ex: Décrivez ce que vous vendez, à quel prix, et comment.',
    customer: 'Ex: Décrivez la personne précise qui achète chez vous.',
    keep: 'Ex: Ce que vous continuez de faire vous-même.',
  },
}

/** Retourne le placeholder adapté au secteur pour une question donnée */
export function getPlaceholder(questionId: string, sector: string | undefined): string | undefined {
  if (!sector) return undefined
  return SECTOR_PLACEHOLDERS[sector]?.[questionId]
}

export const QUESTIONS: Question[] = [
  {
    id: 'sector', phase: 'TOI', num: '01',
    title: 'Dans quel secteur est votre activité ?',
    subtitle: 'Choisissez le plus proche. On affinera ensuite.',
    type: 'select',
    options: [
      'Restaurant / Food', 'E-commerce', 'Consulting / Coaching',
      'Services locaux (artisan, immobilier...)', 'SaaS / Produit digital',
      'Contenu / Média', 'Freelance / Indépendant', 'Autre',
    ],
    required: true, agentTrigger: true,
  },
  {
    id: 'name', phase: 'TOI', num: '02',
    title: 'Comment s\'appelle votre activité ?',
    subtitle: 'Le nom que vos clients voient.',
    type: 'text', placeholder: 'Ex: Premium Sushi, Studio Clara, DataPilot...',
    required: true, agentTrigger: false,
  },
  {
    id: 'location', phase: 'TOI', num: '03',
    title: 'Où êtes-vous basé ?',
    subtitle: 'Adresse ou ville. Important pour le ciblage et le SEO local.',
    type: 'text', placeholder: 'Ex: 400 av. Roumanille, Sophia Antipolis',
    required: true, agentTrigger: true,
  },
  {
    id: 'offer', phase: 'VOTRE OFFRE', num: '04',
    title: 'Qu\'est-ce que vous vendez exactement ?',
    subtitle: 'Décrivez votre offre en 1-2 phrases. Produits, services, prix moyen.',
    type: 'textarea', placeholder: 'Ex: Des plateaux sushi premium livrés aux entreprises. Panier moyen 18€.',
    required: true, agentTrigger: false,
  },
  {
    id: 'customer', phase: 'VOTRE OFFRE', num: '05',
    title: 'Qui est votre client idéal ?',
    subtitle: 'Pas « tout le monde ». La personne précise qui paie.',
    type: 'textarea', placeholder: 'Ex: Salariés des entreprises tech, 25-45 ans, déjeuner premium au bureau.',
    required: true, agentTrigger: false,
  },
  {
    id: 'revenue', phase: 'VOTRE OFFRE', num: '06',
    title: 'Quel est votre revenu mensuel actuel ?',
    subtitle: 'Pas de jugement. C\'est pour calibrer votre ARS.',
    type: 'select',
    options: [
      'Pas encore de revenus', 'Moins de 1 000€/mois', '1 000 — 5 000€/mois',
      '5 000 — 15 000€/mois', '15 000 — 50 000€/mois', 'Plus de 50 000€/mois',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'channels', phase: 'VOTRE ACQUISITION', num: '07',
    title: 'Comment vos clients vous trouvent aujourd\'hui ?',
    subtitle: 'Sélectionnez tous les canaux actifs.',
    type: 'tags',
    options: [
      'Bouche-à-oreille', 'Google / SEO', 'Réseaux sociaux', 'Publicité payante',
      'Prospection directe', 'Plateformes (Uber, Deliveroo...)',
      'Marchés / événements', 'Aucun pour le moment',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'delegate', phase: 'VOTRE ACQUISITION', num: '08',
    title: 'Que voulez-vous que votre ARS gère ?',
    subtitle: 'Sélectionnez tout ce que vous voulez déléguer aux agents.',
    type: 'tags',
    options: [
      'Site web', 'Réseaux sociaux', 'Publicité Google/Meta', 'Prospection clients',
      'Emails marketing', 'Support client', 'Fidélisation',
      'Standard téléphonique', 'Facturation', 'Reporting',
    ],
    required: true, agentTrigger: true,
  },
  {
    id: 'keep', phase: 'VOTRE ARS', num: '09',
    title: 'Que gardez-vous en main ?',
    subtitle: 'Ce que vous, l\'Architecte, continuez de faire.',
    type: 'textarea', placeholder: 'Ex: La cuisine et les stocks. Les relations clés.',
    required: true, agentTrigger: false,
  },
  {
    id: 'goal', phase: 'VOTRE AMBITION', num: '10',
    title: 'Quel est votre objectif de revenu mensuel à 12 mois ?',
    subtitle: 'L\'objectif que votre ARS doit vous aider à atteindre.',
    type: 'select',
    options: [
      '2 000 — 5 000€/mois', '5 000 — 10 000€/mois', '10 000 — 30 000€/mois',
      '30 000 — 100 000€/mois', 'Plus de 100 000€/mois',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'tone', phase: 'VOTRE AMBITION', num: '11',
    title: 'Comment votre marque parle à ses clients ?',
    subtitle: 'Le ton que vos agents adopteront dans toutes les communications.',
    type: 'select',
    options: [
      'Pro et sobre — on inspire confiance',
      'Chaleureux et accessible — on est un ami expert',
      'Direct et décalé — on assume notre différence',
      'Premium et exclusif — on sélectionne nos mots',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'autonomy', phase: 'VOTRE AMBITION', num: '12',
    title: 'Quel niveau d\'autonomie pour votre ARS ?',
    subtitle: 'Vous pourrez ajuster à tout moment.',
    type: 'select',
    options: [
      'Prudent — il me demande avant chaque action importante',
      'Équilibré — il agit seul sauf pour les dépenses et contacts clients',
      'Autonome — il gère, je supervise chaque matin',
      'Full auto — il opère 24/7, je regarde les résultats',
    ],
    required: true, agentTrigger: false,
  },
]
