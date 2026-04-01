import type { PricingPlan } from '@/lib/types'

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter', name: 'STARTER', price: 79, priceLabel: '79\u20AC/mois',
    arsCount: 1, tasksPerDay: 20, recommended: false,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    features: ['1 ARS', '20 taches/jour', 'Templates generalistes', 'Support communaute'],
  },
  {
    id: 'pro', name: 'PRO', price: 199, priceLabel: '199\u20AC/mois',
    arsCount: 1, tasksPerDay: 50, recommended: true,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    features: [
      '1 ARS', '50 taches/jour', 'Templates sectoriels (5 verticales)',
      'Quality gates avances', 'LLMs premium', 'Onboarding guide 7 jours',
      'Support prioritaire',
    ],
  },
  {
    id: 'business', name: 'BUSINESS', price: 499, priceLabel: '499\u20AC/mois',
    arsCount: 3, tasksPerDay: 'unlimited', recommended: false,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? '',
    features: [
      '3 ARS', 'Taches illimitees', 'Templates custom',
      'Quality gates custom', 'Coaching mensuel',
    ],
  },
]
