'use client'

import type { AgentMessage as AgentMessageType } from '@/lib/types'

interface AgentMessageProps {
  message: AgentMessageType
}

export function AgentMessage({ message }: AgentMessageProps) {
  return (
    <div className="animate-fade-up">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-violet flex items-center justify-center shrink-0">
          <span className="text-[10px] text-white font-medium">M</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-ui-text-primary leading-relaxed">
            {message.text}
          </p>
          <span className="text-xs text-ui-text-tertiary mt-1 block">
            {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}
