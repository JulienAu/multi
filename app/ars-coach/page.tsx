import type { Metadata } from 'next'
import { ArsCoachChat } from '@/components/ars-coach/ArsCoachChat'

export const metadata: Metadata = {
  title: 'ARS Coach — Votre coach IA pour construire votre Capital Agentique',
  description: 'Agent compagnon du livre Agentic Revenue Systems. Coaching personnalisé pour passer de Spectateur à Architecte.',
}

export default function ArsCoachPage() {
  return <ArsCoachChat />
}
