'use client'

import type { Question } from '@/lib/types'
import { getPlaceholder } from '@/lib/questions'
import { SelectAnswer } from './answers/SelectAnswer'
import { TextAnswer } from './answers/TextAnswer'
import { TextareaAnswer } from './answers/TextareaAnswer'
import { TagsAnswer } from './answers/TagsAnswer'

interface WizardQuestionProps {
  question: Question
  answer: string | string[] | undefined
  sector: string | undefined
  onAnswer: (value: string | string[]) => void
  onAutoAdvance: () => void
}

export function WizardQuestion({ question, answer, sector, onAnswer, onAutoAdvance }: WizardQuestionProps) {
  const handleSelectChange = (value: string) => {
    onAnswer(value)
    // Auto-advance on select
    setTimeout(onAutoAdvance, 300)
  }

  // Placeholder dynamique selon le secteur, fallback sur le placeholder statique
  const placeholder = getPlaceholder(question.id, sector) ?? question.placeholder

  return (
    <div className="animate-fade-up">
      <div className="mb-1 text-xs text-brand-violet font-medium tracking-wide">
        {question.phase} — {question.num}
      </div>
      <h2 className="text-xl font-medium text-ui-text-primary mb-1">
        {question.title}
      </h2>
      <p className="text-sm text-ui-text-secondary mb-6">
        {question.subtitle}
      </p>

      {question.type === 'select' && (
        <SelectAnswer
          options={question.options!}
          value={answer as string | undefined}
          onChange={handleSelectChange}
        />
      )}

      {question.type === 'text' && (
        <TextAnswer
          value={answer as string | undefined}
          placeholder={placeholder}
          onChange={onAnswer}
        />
      )}

      {question.type === 'textarea' && (
        <TextareaAnswer
          value={answer as string | undefined}
          placeholder={placeholder}
          onChange={onAnswer}
        />
      )}

      {question.type === 'tags' && (
        <TagsAnswer
          options={question.options!}
          value={answer as string[] | undefined}
          onChange={onAnswer}
        />
      )}
    </div>
  )
}
