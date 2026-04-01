'use client'

import { PRICING_PLANS } from '@/lib/stripe/plans'
import { Button } from '@/components/ui/Button'

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PRICING_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-lg border p-6 flex flex-col ${
            plan.recommended
              ? 'border-brand-violet bg-brand-violet-light'
              : 'border-ui-border bg-ui-bg'
          }`}
        >
          {plan.recommended && (
            <span className="absolute -top-2.5 left-4 bg-brand-violet text-white text-xs px-2 py-0.5 rounded-full">
              Recommandé
            </span>
          )}

          <h3 className="text-md font-medium text-ui-text-primary">{plan.name}</h3>
          <p className="text-2xl font-medium text-ui-text-primary mt-2">
            {plan.priceLabel}
          </p>

          <ul className="mt-4 space-y-2 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="text-sm text-ui-text-secondary flex items-start gap-2">
                <span className="text-brand-green mt-0.5 shrink-0">&#10003;</span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            variant={plan.recommended ? 'primary' : 'secondary'}
            className="mt-6 w-full"
          >
            Choisir {plan.name}
          </Button>
        </div>
      ))}
    </div>
  )
}
