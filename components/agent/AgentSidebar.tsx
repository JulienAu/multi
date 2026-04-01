'use client'

import { useEffect, useRef } from 'react'
import type { AgentMessage as AgentMessageType } from '@/lib/types'
import { AgentMessage } from './AgentMessage'

interface AgentSidebarProps {
  messages: AgentMessageType[]
}

export function AgentSidebar({ messages }: AgentSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <aside className="hidden lg:flex flex-col w-80 border-l border-ui-border bg-ui-bg-secondary h-screen sticky top-0">
      <div className="px-4 py-3 border-b border-ui-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-typing" />
          <span className="text-sm font-medium text-ui-text-primary">Agent MULTI</span>
        </div>
        <p className="text-xs text-ui-text-tertiary mt-0.5">
          Analyse en cours...
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <AgentMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </aside>
  )
}
