import 'server-only'
import { OpenClawClient, type OpenClawEvent, type ToolApprovalRequest } from './ws-client'
import { db, toolApprovals, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'

type StreamCallback = (event: OpenClawEvent) => void

interface BusinessSession {
  client: OpenClawClient
  businessId: string
  listeners: Set<StreamCallback>
  pendingApprovals: Map<string, ToolApprovalRequest>
}

/**
 * Singleton that manages one WebSocket connection per business to its OpenClaw container.
 */
class SessionManager {
  private sessions = new Map<string, BusinessSession>()

  /**
   * Get or create a WS session for a business.
   */
  async getSession(businessId: string): Promise<BusinessSession> {
    const existing = this.sessions.get(businessId)
    if (existing?.client.isConnected) return existing

    if (existing) {
      existing.client.disconnect()
      this.sessions.delete(businessId)
    }

    const instance = await db.query.openclawInstances.findFirst({
      where: (o, { eq }) => eq(o.businessId, businessId),
    })

    if (!instance || instance.status !== 'running') {
      throw new Error('OpenClaw instance not running')
    }

    const { orchestrator } = await import('@/lib/orchestrator')
    let deviceIdentity: { deviceId: string; pubKeyB64Url: string; privPem: string } | undefined
    try {
      const raw = await orchestrator.readFile(instance.containerName, '/home/node/.openclaw/multi-device.json')
      deviceIdentity = JSON.parse(raw)
    } catch {
      console.log('[openclaw/ws] no device identity found, connecting without device signing')
    }

    const k3sHost = `${instance.containerName}.workspace-${instance.containerName.replace(/^openclaw-/, '')}.svc.cluster.local:18789`
    const hosts = process.env.ORCHESTRATOR_BACKEND === 'k3s'
      ? [k3sHost]
      : [`${instance.containerName}:18789`, `host.docker.internal:${instance.port}`]

    let client: OpenClawClient | null = null
    let lastError = ''

    for (const host of hosts) {
      try {
        const c = new OpenClawClient(host, instance.gatewayToken, deviceIdentity)
        await c.connect()
        client = c
        break
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    if (!client) {
      throw new Error(`Could not connect to OpenClaw: ${lastError}`)
    }

    const session: BusinessSession = {
      client,
      businessId,
      listeners: new Set(),
      pendingApprovals: new Map(),
    }

    client.on('event', async (event: OpenClawEvent) => {
      if (event.type === 'tool.requested') {
        session.pendingApprovals.set(event.request.id, event.request)

        const inst = await db.query.openclawInstances.findFirst({
          where: (o, { eq }) => eq(o.businessId, businessId),
        })

        if (inst?.autoApprove) {
          try {
            await client!.resolveApproval(event.request.id, 'allow-once', event.request.type)
            session.pendingApprovals.delete(event.request.id)

            await db.insert(toolApprovals).values({
              businessId,
              openclawId: event.request.id,
              toolType: event.request.type,
              command: event.request.command ?? null,
              title: event.request.title ?? null,
              description: event.request.description ?? event.request.command ?? null,
              decision: 'allow-once',
              decidedAt: new Date(),
            })

            for (const cb of session.listeners) {
              cb({ type: 'tool.resolved', id: event.request.id, decision: 'allow-once (auto)' })
            }
          } catch (e) {
            console.error('[openclaw/ws] auto-approve failed:', e)
          }
          return
        }

        await db.insert(toolApprovals).values({
          businessId,
          openclawId: event.request.id,
          toolType: event.request.type,
          command: event.request.command ?? null,
          title: event.request.title ?? null,
          description: event.request.description ?? event.request.command ?? null,
          decision: 'pending',
        })
      }

      for (const cb of session.listeners) {
        cb(event)
      }
    })

    this.sessions.set(businessId, session)
    return session
  }

  async sendMessage(businessId: string, text: string): Promise<void> {
    const session = await this.getSession(businessId)
    await session.client.sendMessage(text)
  }

  async resolveApproval(
    businessId: string,
    openclawId: string,
    decision: 'allow-once' | 'allow-always' | 'deny',
  ): Promise<void> {
    const session = await this.getSession(businessId)
    const request = session.pendingApprovals.get(openclawId)
    const toolType = request?.type ?? 'exec'

    await session.client.resolveApproval(openclawId, decision, toolType)
    session.pendingApprovals.delete(openclawId)

    await db.update(toolApprovals)
      .set({ decision, decidedAt: new Date() })
      .where(eq(toolApprovals.openclawId, openclawId))
  }

  addListener(businessId: string, callback: StreamCallback): () => void {
    const session = this.sessions.get(businessId)
    if (session) {
      session.listeners.add(callback)
      return () => session.listeners.delete(callback)
    }
    return () => {}
  }

  async setAutoApprove(businessId: string, enabled: boolean): Promise<void> {
    await db.update(openclawInstances)
      .set({ autoApprove: enabled, updatedAt: new Date() })
      .where(eq(openclawInstances.businessId, businessId))
  }

  getPendingApprovals(businessId: string): ToolApprovalRequest[] {
    const session = this.sessions.get(businessId)
    if (!session) return []
    return Array.from(session.pendingApprovals.values())
  }

  disconnect(businessId: string) {
    const session = this.sessions.get(businessId)
    if (session) {
      session.client.disconnect()
      this.sessions.delete(businessId)
    }
  }
}

export const sessionManager = new SessionManager()
