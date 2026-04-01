'use client'

export default function AgentsPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-medium text-ui-text-primary mb-1">Agents</h1>
      <p className="text-sm text-ui-text-secondary mb-6">
        Vos agents IA et leurs missions
      </p>

      <div className="rounded-lg border border-ui-border bg-ui-bg-secondary p-6 text-center">
        <p className="text-sm text-ui-text-secondary">
          Activez un plan pour deployer vos agents. Ils commenceront a operer des le premier cycle nocturne.
        </p>
      </div>
    </div>
  )
}
