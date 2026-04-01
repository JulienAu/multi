'use client'

import type { GenerationMeta } from '@/lib/types'
import { BusinessMdDisplay } from './BusinessMdDisplay'
import { PricingCards } from './PricingCards'
import { EmailCapture } from './EmailCapture'
import { FAQ } from '@/components/FAQ'

interface ResultScreenProps {
  businessMd: string
  meta: GenerationMeta | null
  sessionId: string | null
}

export function ResultScreen({ businessMd, meta, sessionId }: ResultScreenProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-medium text-brand-violet mb-2">
          Votre BUSINESS.md est prêt
        </h2>
        {meta && (
          <p className="text-sm text-ui-text-secondary">
            {meta.lines} lignes, {meta.sections} sections — généré en {meta.generationSeconds}s avec {meta.model}
          </p>
        )}
      </div>

      {/* Document */}
      <BusinessMdDisplay content={businessMd} />

      {/* Email capture */}
      <EmailCapture sessionId={sessionId} />

      {/* Pricing */}
      <div>
        <h2 className="text-xl font-medium text-ui-text-primary mb-2 text-center">
          Activez votre ARS
        </h2>
        <p className="text-sm text-ui-text-secondary mb-6 text-center">
          Vos agents commencent à travailler cette nuit.
        </p>
        <PricingCards />
      </div>

      {/* FAQ */}
      <FAQ />
    </div>
  )
}
