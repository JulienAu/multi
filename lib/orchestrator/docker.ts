import type { Orchestrator, WorkspaceSpec } from './types'

async function dockerExec(args: string[]): Promise<string> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)
  try {
    const { stdout, stderr } = await execFileAsync('docker', args, { timeout: 60_000 })
    return (stdout || stderr || '').trim()
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    if (err.stdout) return err.stdout.trim()
    if (err.stderr) return err.stderr.trim()
    throw e
  }
}

export const dockerOrchestrator: Orchestrator = {
  async create(spec: WorkspaceSpec) {
    const args: string[] = ['run', '-d', '--name', spec.name]
    if (spec.network) args.push('--network', spec.network)
    for (const p of spec.ports) args.push('-p', `${p.host}:${p.container}`)
    for (const v of spec.volumes) args.push('-v', `${v.hostPath}:${v.containerPath}`)
    for (const [k, value] of Object.entries(spec.env ?? {})) args.push('-e', `${k}=${value}`)
    if (spec.memory) args.push('--memory', spec.memory)
    if (spec.cpus) args.push('--cpus', spec.cpus)
    if (spec.restartPolicy) args.push('--restart', spec.restartPolicy)
    args.push(spec.image)
    const id = await dockerExec(args)
    return { id: id.slice(0, 12) }
  },

  async remove(name: string) {
    try {
      await dockerExec(['rm', '-f', name])
    } catch {
      /* idempotent */
    }
  },

  async restart(name: string) {
    await dockerExec(['restart', name])
  },

  async exec(name: string, cmd: string[]) {
    return dockerExec(['exec', name, ...cmd])
  },

  async logs(name: string, tailLines: number) {
    try {
      return await dockerExec(['logs', '--tail', String(tailLines), name])
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string }
      return err.stderr ?? err.stdout ?? ''
    }
  },

  async fixOwnership(hostPath: string, uidGid: string) {
    await dockerExec(['run', '--rm', '-v', `${hostPath}:/fix`, 'alpine', 'chown', '-R', uidGid, '/fix'])
  },
}
