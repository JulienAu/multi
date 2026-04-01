'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { QUESTIONS } from '@/lib/questions'
import type { WizardState, WizardAnswers } from '@/lib/types'

const INITIAL_STATE: WizardState = {
  step: 'wizard',
  sessionId: null,
  currentQuestionIndex: 0,
  answers: {},
  generatedBusinessMd: null,
  generationMeta: null,
  isLoading: false,
  error: null,
}

export function useWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const startTimeRef = useRef<number | null>(null)

  // Créer la session au montage
  useEffect(() => {
    fetch('/api/wizard/session', { method: 'POST' })
      .then(r => r.json())
      .then(({ sessionId }) => {
        startTimeRef.current = Date.now()
        setState(s => ({ ...s, sessionId }))
      })
      .catch(console.error)
  }, [])

  const setAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setState(s => ({
      ...s,
      answers: { ...s.answers, [questionId]: answer },
    }))
    // Persister en arrière-plan
    setState(s => {
      if (s.sessionId) {
        fetch('/api/wizard/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: s.sessionId, questionId, answer }),
        }).catch(console.error)
      }
      return s
    })
  }, [])

  const goToNext = useCallback(() => {
    setState(s => s.currentQuestionIndex < QUESTIONS.length - 1
      ? { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 }
      : s
    )
  }, [])

  const goToPrev = useCallback(() => {
    setState(s => s.currentQuestionIndex > 0
      ? { ...s, currentQuestionIndex: s.currentQuestionIndex - 1 }
      : s
    )
  }, [])

  const generate = useCallback(async () => {
    setState(s => ({ ...s, step: 'generating', isLoading: true, error: null }))
    const MIN_MS = 3500
    const t0 = Date.now()

    try {
      const sessionId = state.sessionId
      const res = await fetch('/api/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()

      const remaining = Math.max(0, MIN_MS - (Date.now() - t0))
      await new Promise(r => setTimeout(r, remaining))

      setState(s => ({
        ...s,
        step: 'result',
        isLoading: false,
        generatedBusinessMd: data.businessMd,
        generationMeta: {
          lines: data.lines,
          sections: data.sections,
          generationSeconds: data.generationSeconds,
          model: data.model,
        },
      }))
    } catch {
      setState(s => ({
        ...s, step: 'wizard', isLoading: false,
        error: 'La génération a échoué. Réessayez.',
      }))
    }
  }, [state.sessionId])

  const currentQuestion = QUESTIONS[state.currentQuestionIndex]
  const currentAnswer   = currentQuestion ? state.answers[currentQuestion.id] : undefined
  const isAnswered      = Boolean(
    currentAnswer && (Array.isArray(currentAnswer)
      ? currentAnswer.length > 0
      : (currentAnswer as string).trim().length > 0)
  )
  const isLastQuestion  = state.currentQuestionIndex === QUESTIONS.length - 1
  const completedIndices = QUESTIONS
    .map((q, i) => state.answers[q.id] !== undefined ? i : null)
    .filter((i): i is number => i !== null)

  return {
    state, currentQuestion, currentAnswer,
    isAnswered, isLastQuestion, completedIndices,
    setAnswer, goToNext, goToPrev, generate,
  }
}
