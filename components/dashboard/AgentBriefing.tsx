interface AgentBriefingProps {
  briefing: string | null
  arsName: string | null
  arsStatus: string | null
  plan: string | null
}

export function AgentBriefing({ briefing, arsName, arsStatus, plan }: AgentBriefingProps) {
  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg-secondary h-full flex flex-col">
      <div className="px-4 py-3 border-b border-ui-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-violet flex items-center justify-center text-white text-xs font-medium">
          M
        </div>
        <div>
          <p className="text-sm font-medium text-ui-text-primary">Agent CEO</p>
          <p className="text-[10px] text-brand-green">En ligne</p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {arsName && (
          <div className="mb-3 p-2 rounded-md bg-ui-bg-tertiary">
            <p className="text-[10px] text-ui-text-tertiary uppercase tracking-wider mb-0.5">ARS actif</p>
            <p className="text-sm font-medium text-ui-text-primary">{arsName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${arsStatus === 'active' ? 'bg-brand-green animate-pulse' : 'bg-ui-text-tertiary'}`} />
              <span className="text-[10px] text-ui-text-secondary capitalize">{arsStatus ?? 'inactif'}</span>
              {plan && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-violet-light text-brand-violet font-medium uppercase ml-auto">
                  {plan}
                </span>
              )}
            </div>
          </div>
        )}

        {briefing ? (
          <div className="space-y-2">
            <p className="text-[10px] text-ui-text-tertiary uppercase tracking-wider">Briefing du matin</p>
            <div className="rounded-lg bg-ui-bg p-3 border border-ui-border">
              <p className="text-xs text-ui-text-primary leading-relaxed whitespace-pre-wrap">{briefing}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-xs text-ui-text-tertiary">
              Le briefing sera disponible apres le premier cycle nocturne.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
