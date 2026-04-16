import type { Orchestrator } from './types'
import { dockerOrchestrator } from './docker'
import { k3sOrchestrator } from './k3s'

function resolveOrchestrator(): Orchestrator {
  const backend = process.env.ORCHESTRATOR_BACKEND ?? 'docker'
  switch (backend) {
    case 'docker':
      return dockerOrchestrator
    case 'k3s':
      return k3sOrchestrator
    default:
      throw new Error(`Unknown ORCHESTRATOR_BACKEND: ${backend}`)
  }
}

export const orchestrator: Orchestrator = resolveOrchestrator()
export type { Orchestrator, WorkspaceSpec } from './types'
