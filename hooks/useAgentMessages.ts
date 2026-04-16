'use client'

import { useState, useCallback, useRef } from 'react'
import { INITIAL_MESSAGE, getAgentMessage } from '@/lib/agentMessages'
import type { AgentMessage, WizardAnswers } from '@/lib/types'

export function useAgentMessages() {
  const idCounter = useRef(1)
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '0',
      text: INITIAL_MESSAGE,
      type: 'standard',
      timestamp: new Date(),
    },
  ])

  const questionMessageIds = useRef<Map<string, string>>(new Map())

  const onAnswer = useCallback((questionId: string, answer: string | string[], answers: WizardAnswers) => {
    const text = getAgentMessage(questionId, answer, answers)
    if (!text) return

    const existingId = questionMessageIds.current.get(questionId)
    if (existingId) {
      // Mettre à jour le message existant (ex: tags cliqués plusieurs fois)
      setMessages(prev => prev.map(m => m.id === existingId ? { ...m, text } : m))
    } else {
      const id = String(idCounter.current++)
      questionMessageIds.current.set(questionId, id)
      setMessages(prev => [
        ...prev,
        { id, text, type: 'contextual', timestamp: new Date() },
      ])
    }
  }, [])

  return { messages, onAnswer }
}
