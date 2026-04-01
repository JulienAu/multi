'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  'Analyse de vos réponses...',
  'Construction du profil business...',
  'Génération de la stratégie d\'acquisition...',
  'Rédaction du BUSINESS.md...',
  'Finalisation du document...',
]

export function GenerationScreen() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev))
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-brand-violet animate-typing" />
        <span className="w-2 h-2 rounded-full bg-brand-violet animate-typing [animation-delay:0.2s]" />
        <span className="w-2 h-2 rounded-full bg-brand-violet animate-typing [animation-delay:0.4s]" />
      </div>

      <div className="text-center">
        <p className="text-md font-medium text-ui-text-primary mb-2">
          Génération en cours
        </p>
        <p className="text-sm text-ui-text-secondary animate-fade-up" key={stepIndex}>
          {STEPS[stepIndex]}
        </p>
      </div>

      <div className="w-48 h-1 rounded-full bg-ui-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-violet transition-all duration-[2500ms] ease-linear"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
