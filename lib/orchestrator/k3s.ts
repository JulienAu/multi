import type { Orchestrator, WorkspaceSpec } from './types'

const DATA_MOUNT = '/home/node/.openclaw'

let cachedToken: string | null = null

async function k8sApi(path: string, options: RequestInit = {}): Promise<Response> {
  const { readFile } = await import('fs/promises')
  const host = process.env.KUBERNETES_SERVICE_HOST
  const port = process.env.KUBERNETES_SERVICE_PORT || '443'
  if (!cachedToken) {
    cachedToken = await readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf-8')
  }
  // NODE_EXTRA_CA_CERTS=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt is set in the pod env
  const res = await fetch(`https://${host}:${port}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cachedToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  return res
}

async function k8sApply<T>(path: string, body: unknown): Promise<T> {
  // Try create, fall back to replace on conflict
  let res = await k8sApi(path, { method: 'POST', body: JSON.stringify(body) })
  if (res.status === 409) {
    const name = (body as { metadata?: { name?: string } }).metadata?.name
    res = await k8sApi(`${path}/${name}`, { method: 'PUT', body: JSON.stringify(body) })
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`k8s ${path}: ${res.status} ${text}`)
  }
  return res.json() as T
}

async function k8sDelete(path: string): Promise<void> {
  const res = await k8sApi(path, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`k8s DELETE ${path}: ${res.status} ${text}`)
  }
}

function nsName(workspaceName: string): string {
  return `workspace-${workspaceName.replace(/^openclaw-/, '')}`
}

function podName(workspaceName: string): string {
  return workspaceName
}

async function waitForPod(ns: string, labelSelector: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await k8sApi(`/api/v1/namespaces/${ns}/pods?labelSelector=${encodeURIComponent(labelSelector)}`)
    const data = await res.json() as { items: Array<{ metadata: { name: string }; status: { phase: string; containerStatuses?: Array<{ ready: boolean }> } }> }
    const pod = data.items?.[0]
    if (pod?.status?.containerStatuses?.every(c => c.ready)) {
      return pod.metadata.name
    }
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error(`Pod not ready after ${timeoutMs}ms`)
}

async function getRunningPodName(ns: string, appLabel: string): Promise<string> {
  const res = await k8sApi(`/api/v1/namespaces/${ns}/pods?labelSelector=${encodeURIComponent(`app=${appLabel}`)}`)
  const data = await res.json() as { items: Array<{ metadata: { name: string }; status: { phase: string } }> }
  const pod = data.items?.find(p => p.status.phase === 'Running')
  if (!pod) throw new Error(`No running pod for app=${appLabel} in ${ns}`)
  return pod.metadata.name
}

export const k3sOrchestrator: Orchestrator = {
  async create(spec: WorkspaceSpec) {
    const ns = nsName(spec.name)
    const app = podName(spec.name)

    // 1. Namespace
    await k8sApply('/api/v1/namespaces', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: ns,
        labels: { 'tier': 'workspace', 'kubernetes.io/metadata.name': ns },
      },
    })

    // 2. ConfigMap with seed files
    const configMapData: Record<string, string> = {}
    for (const f of spec.initFiles ?? []) {
      const key = f.path.replace(/\//g, '__')
      configMapData[key] = f.content
    }
    if (Object.keys(configMapData).length > 0) {
      await k8sApply(`/api/v1/namespaces/${ns}/configmaps`, {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'seed-files', namespace: ns },
        data: configMapData,
      })
    }

    // 3. PVC
    await k8sApply(`/api/v1/namespaces/${ns}/persistentvolumeclaims`, {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: { name: 'openclaw-data', namespace: ns },
      spec: {
        accessModes: ['ReadWriteOnce'],
        storageClassName: 'local-path',
        resources: { requests: { storage: '2Gi' } },
      },
    })

    // 4. Deployment
    const memoryMi = spec.memory ? `${parseInt(spec.memory) * 1024}Mi` : '1024Mi'
    const cpuMillis = spec.cpus ? `${parseInt(spec.cpus) * 1000}m` : '1000m'

    const initContainers: unknown[] = []
    if (Object.keys(configMapData).length > 0) {
      const copyCommands = Object.entries(configMapData).map(([key]) => {
        const destPath = key.replace(/__/g, '/')
        return `mkdir -p "$(dirname "${DATA_MOUNT}/${destPath}")" && cp "/seed/${key}" "${DATA_MOUNT}/${destPath}"`
      })
      copyCommands.push(`chown -R 1000:1000 ${DATA_MOUNT}`)
      initContainers.push({
        name: 'seed',
        image: 'alpine:3',
        command: ['sh', '-c', copyCommands.join(' && ')],
        volumeMounts: [
          { name: 'data', mountPath: DATA_MOUNT },
          { name: 'seed-files', mountPath: '/seed' },
        ],
      })
    }

    await k8sApply(`/apis/apps/v1/namespaces/${ns}/deployments`, {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: app, namespace: ns },
      spec: {
        replicas: 1,
        strategy: { type: 'Recreate' },
        selector: { matchLabels: { app } },
        template: {
          metadata: { labels: { app } },
          spec: {
            nodeSelector: { 'tier': 'workspace' },
            initContainers,
            containers: [{
              name: 'openclaw',
              image: spec.image,
              ports: spec.ports.map(p => ({ containerPort: p.container })),
              resources: {
                requests: { cpu: '250m', memory: '256Mi' },
                limits: { cpu: cpuMillis, memory: memoryMi },
              },
              volumeMounts: [{ name: 'data', mountPath: DATA_MOUNT }],
              securityContext: {
                allowPrivilegeEscalation: !(spec.hardening?.noNewPrivileges),
                ...(spec.hardening?.dropAllCapabilities && { capabilities: { drop: ['ALL'] } }),
              },
            }],
            volumes: [
              { name: 'data', persistentVolumeClaim: { claimName: 'openclaw-data' } },
              ...(Object.keys(configMapData).length > 0
                ? [{ name: 'seed-files', configMap: { name: 'seed-files' } }]
                : []),
            ],
          },
        },
      },
    })

    // 5. Service
    await k8sApply(`/api/v1/namespaces/${ns}/services`, {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: app, namespace: ns },
      spec: {
        selector: { app },
        ports: spec.ports.map((p, i) => ({
          name: `port-${i}`,
          port: p.container,
          targetPort: p.container,
        })),
      },
    })

    // 6. Wait for pod ready
    const actualPod = await waitForPod(ns, `app=${app}`)
    return { id: actualPod }
  },

  async remove(name: string) {
    const ns = nsName(name)
    await k8sDelete(`/api/v1/namespaces/${ns}`)
  },

  async restart(name: string) {
    const ns = nsName(name)
    const app = podName(name)
    // Delete pods → Deployment recreates them
    const res = await k8sApi(`/api/v1/namespaces/${ns}/pods?labelSelector=${encodeURIComponent(`app=${app}`)}`)
    const data = await res.json() as { items: Array<{ metadata: { name: string } }> }
    for (const pod of data.items ?? []) {
      await k8sDelete(`/api/v1/namespaces/${ns}/pods/${pod.metadata.name}`)
    }
    await waitForPod(ns, `app=${app}`)
  },

  async exec(name: string, cmd: string[]) {
    const ns = nsName(name)
    const app = podName(name)
    const actualPod = await getRunningPodName(ns, app)

    // k8s exec via websocket is complex; use kubectl exec via subprocess
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    const kubectlPath = process.env.KUBECTL_PATH || 'kubectl'
    const { stdout, stderr } = await execFileAsync(
      kubectlPath,
      ['-n', ns, 'exec', actualPod, '-c', 'openclaw', '--', ...cmd],
      { timeout: 120_000 },
    )
    return (stdout || stderr || '').trim()
  },

  async logs(name: string, tailLines: number) {
    const ns = nsName(name)
    const app = podName(name)
    const actualPod = await getRunningPodName(ns, app)
    const res = await k8sApi(`/api/v1/namespaces/${ns}/pods/${actualPod}/log?tailLines=${tailLines}&container=openclaw`)
    return res.text()
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fixOwnership(_hostPath: string, _uidGid: string) {
    // No-op: init container handles ownership
  },

  async readFile(name: string, filePath: string) {
    return k3sOrchestrator.exec(name, ['cat', filePath])
  },

  async writeFile(name: string, filePath: string, content: string) {
    // Use sh -c with heredoc to write file content
    const escaped = content.replace(/'/g, "'\\''")
    await k3sOrchestrator.exec(name, ['sh', '-c', `mkdir -p "$(dirname '${filePath}')" && cat > '${filePath}' << 'MULTI_EOF'\n${escaped}\nMULTI_EOF`])
  },
}
