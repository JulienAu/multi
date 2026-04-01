'use client'

import { useEffect, useCallback } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { useAgentMessages } from '@/hooks/useAgentMessages'
import { QUESTIONS } from '@/lib/questions'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AgentSidebar } from '@/components/agent/AgentSidebar'
import { GenerationScreen } from './GenerationScreen'
import { ResultScreen } from '@/components/result/ResultScreen'
import { WizardQuestion } from './WizardQuestion'
import { WizardNavigation } from './WizardNavigation'

export function Wizard() {
  const {
    state, currentQuestion, currentAnswer,
    isAnswered, isLastQuestion,
    setAnswer, goToNext, goToPrev, generate,
  } = useWizard()

  const { messages, onAnswer: onAgentAnswer } = useAgentMessages()

  const handleAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswer(questionId, value)
    onAgentAnswer(questionId, value, { ...state.answers, [questionId]: value })
  }, [setAnswer, onAgentAnswer, state.answers])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isAnswered) {
      e.preventDefault()
      if (isLastQuestion) {
        generate()
      } else {
        goToNext()
      }
    }
  }, [isAnswered, isLastQuestion, goToNext, generate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (state.step === 'generating') {
    return (
      <div className="flex">
        <div className="flex-1">
          <GenerationScreen />
        </div>
        <AgentSidebar messages={messages} />
      </div>
    )
  }

  if (state.step === 'result' && state.generatedBusinessMd) {
    return (
      <div className="flex">
        <div className="flex-1">
          <ResultScreen
            businessMd={state.generatedBusinessMd}
            meta={state.generationMeta}
            sessionId={state.sessionId}
          />
        </div>
        <AgentSidebar messages={messages} />
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="flex">
      <div className="flex-1 max-w-lg mx-auto py-12 px-4">
        {state.currentQuestionIndex === 0 && !currentAnswer && (
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-brand-violet tracking-widest uppercase mb-3">MULTI</p>
            <h1 className="text-3xl font-medium text-ui-text-primary leading-tight mb-4">
              Construisez votre machine<br />a revenus en 5 minutes.
            </h1>
            <p className="text-sm text-ui-text-secondary max-w-sm mx-auto mb-3">
              Repondez a 12 questions. MULTI deploie votre equipe d'agents IA.<br />
              Votre business tourne 24h/24, 7j/7.
            </p>
            <p className="text-xs text-ui-text-tertiary">
              Gratuit pour commencer · Aucune competence technique requise
            </p>
          </div>
        )}

        <ProgressBar
          current={state.currentQuestionIndex + 1}
          total={QUESTIONS.length}
        />

        <div className="mt-8">
          <WizardQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            answer={currentAnswer}
            sector={state.answers.sector as string | undefined}
            onAnswer={(v) => handleAnswer(currentQuestion.id, v)}
            onAutoAdvance={goToNext}
          />
        </div>

        <WizardNavigation
          canGoBack={state.currentQuestionIndex > 0}
          canGoNext={isAnswered}
          isLastQuestion={isLastQuestion}
          onPrev={goToPrev}
          onNext={goToNext}
          onGenerate={generate}
        />

        {state.error && (
          <p className="mt-4 text-sm text-status-error text-center">
            {state.error}
          </p>
        )}
      </div>

      <AgentSidebar messages={messages} />
    </div>
  )
}
