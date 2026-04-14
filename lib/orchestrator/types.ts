/**
 * Container orchestration abstraction.
 * Backend can be swapped (Docker today, k3s demain) via ORCHESTRATOR_BACKEND env.
 */

export interface WorkspaceSpec {
  name: string
  image: string
  ports: Array<{ host: number; container: number }>
  volumes: Array<{ hostPath: string; containerPath: string }>
  env?: Record<string, string>
  network?: string
  memory?: string          // ex: "1g"
  cpus?: string            // ex: "1"
  restartPolicy?: 'no' | 'always' | 'unless-stopped'
}

export interface Orchestrator {
  /** Create + start a workspace. Returns backend-specific short id. */
  create(spec: WorkspaceSpec): Promise<{ id: string }>
  /** Idempotent force-remove. */
  remove(name: string): Promise<void>
  /** Restart a workspace. */
  restart(name: string): Promise<void>
  /** Execute a command inside a workspace. Returns combined stdout/stderr. */
  exec(name: string, cmd: string[]): Promise<string>
  /** Tail logs. */
  logs(name: string, tailLines: number): Promise<string>
  /** Fix file ownership on a host path (for the node uid 1000 on bind-mounted volumes). */
  fixOwnership(hostPath: string, uidGid: string): Promise<void>
}
