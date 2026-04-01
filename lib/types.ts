export type QuestionType = 'select' | 'text' | 'textarea' | 'tags'

export type QuestionPhase =
  | 'TOI'
  | 'VOTRE OFFRE'
  | 'VOTRE ACQUISITION'
  | 'VOTRE ARS'
  | 'VOTRE AMBITION'

export interface Question {
  id: string
  phase: QuestionPhase
  num: string
  title: string
  subtitle: string
  type: QuestionType
  options?: string[]
  placeholder?: string
  required: boolean
  agentTrigger: boolean
}

export type WizardAnswers = Record<string, string | string[]>

export type WizardStep = 'wizard' | 'generating' | 'result'

export interface WizardState {
  step: WizardStep
  sessionId: string | null
  currentQuestionIndex: number
  answers: WizardAnswers
  generatedBusinessMd: string | null
  generationMeta: GenerationMeta | null
  isLoading: boolean
  error: string | null
}

export interface GenerationMeta {
  lines: number
  sections: number
  generationSeconds: number
  model: string
}

export type AgentMessageType = 'standard' | 'contextual' | 'insight'

export interface AgentMessage {
  id: string
  text: string
  type: AgentMessageType
  timestamp: Date
}

export interface PricingPlan {
  id: 'starter' | 'pro' | 'business'
  name: string
  price: number
  priceLabel: string
  features: string[]
  recommended: boolean
  stripePriceId: string
  arsCount: number
  tasksPerDay: number | 'unlimited'
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface GenerateResponse {
  businessMd: string
  lines: number
  sections: number
  generationSeconds: number
  model: string
}
