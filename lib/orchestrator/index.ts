import type { Orchestrator } from './types'
import { dockerOrchestrator } from './docker'

/**
 * Singleton orchestrator.
 * Swap backend via `ORCHESTRATOR_BACKEND` env (defaults to 'docker').
 * k3s backend will be wired once the cluster is up (item 3).
 */
function resolveOrchestrator(): Orchestrator {
  const backend = process.env.ORCHESTRATOR_BACKEND ?? 'docker'
  switch (backend) {
    case 'docker':
      return dockerOrchestrator
    case 'k3s':
      throw new Error('k3s orchestrator not implemented yet — waiting on cluster setup (item 3)')
    default:
      throw new Error(`Unknown ORCHESTRATOR_BACKEND: ${backend}`)
  }
}

export const orchestrator: Orchestrator = resolveOrchestrator()
export type { Orchestrator, WorkspaceSpec } from './types'
