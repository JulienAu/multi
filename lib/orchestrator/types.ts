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
  /** Durcissement sécurité (appliqué par Docker ou k3s selon backend). */
  hardening?: WorkspaceHardening
  /** Files to seed into the volume before the container starts (used by k3s). */
  initFiles?: Array<{ path: string; content: string }>
}

export interface WorkspaceHardening {
  /** Drop toutes les capabilities Linux (recommandé : true). */
  dropAllCapabilities?: boolean
  /** Bloque tout gain de privilèges (setuid, etc.). */
  noNewPrivileges?: boolean
  /** Limite le nombre de process (anti fork-bomb). */
  pidsLimit?: number
  /** Force non-root (uid:gid). */
  runAsUser?: string        // ex: "1000:1000"
  /** Read-only rootfs (prévoir des tmpfs pour /tmp si besoin). */
  readOnlyRootfs?: boolean
}

/**
 * Preset hardening recommandé pour les containers user MULTI.
 * L'agent a encore besoin d'écrire dans son volume bind-mounté (/home/node/.openclaw),
 * donc on ne met pas `readOnlyRootfs: true` tant que le volume est explicite.
 */
export const DEFAULT_HARDENING: WorkspaceHardening = {
  dropAllCapabilities: true,
  noNewPrivileges: true,
  pidsLimit: 512,
  runAsUser: '1000:1000',
  readOnlyRootfs: false,
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
  /** Read a file from inside a running workspace. */
  readFile(name: string, filePath: string): Promise<string>
  /** Write a file inside a running workspace. */
  writeFile(name: string, filePath: string, content: string): Promise<void>
}
