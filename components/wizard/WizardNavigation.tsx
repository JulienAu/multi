'use client'

import { Button } from '@/components/ui/Button'

interface WizardNavigationProps {
  canGoBack: boolean
  canGoNext: boolean
  isLastQuestion: boolean
  onPrev: () => void
  onNext: () => void
  onGenerate: () => void
}

export function WizardNavigation({
  canGoBack, canGoNext, isLastQuestion,
  onPrev, onNext, onGenerate,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrev}
        disabled={!canGoBack}
      >
        Retour
      </Button>

      {isLastQuestion ? (
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={!canGoNext}
        >
          Générer mon BUSINESS.md
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canGoNext}
        >
          Continuer
        </Button>
      )}
    </div>
  )
}
