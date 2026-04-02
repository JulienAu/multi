import { OpenClawClient, type OpenClawEvent, type ToolApprovalRequest } from './ws-client'
import { db, toolApprovals, chatMessages, openclawInstances } from '@/lib/db'
import { eq } from 'drizzle-orm'

type StreamCallback = (event: OpenClawEvent) => void

interface UserSession {
  client: OpenClawClient
  userId: string
  listeners: Set<StreamCallback>
  pendingApprovals: Map<string, ToolApprovalRequest>
}

/**
 * Singleton that manages one WebSocket connection per user to their OpenClaw container.
 */
class SessionManager {
  private sessions = new Map<string, UserSession>()

  /**
   * Get or create a WS session for a user.
   */
  async getSession(userId: string): Promise<UserSession> {
    const existing = this.sessions.get(userId)
    if (existing?.client.isConnected) return existing

    // Clean up old session
    if (existing) {
      existing.client.disconnect()
      this.sessions.delete(userId)
    }

    // Get instance info
    const instance = await db.query.openclawInstances.findFirst({
      where: (o, { eq }) => eq(o.userId, userId),
    })

    if (!instance || instance.status !== 'running') {
      throw new Error('OpenClaw instance not running')
    }

    // Try container name first (inside Docker network), fallback to localhost
    const hosts = [
      `${instance.containerName}:18789`,
      `host.docker.internal:${instance.port}`,
    ]

    let client: OpenClawClient | null = null
    let lastError = ''

    for (const host of hosts) {
      try {
        const c = new OpenClawClient(host, instance.gatewayToken)
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

    const session: UserSession = {
      client,
      userId,
      listeners: new Set(),
      pendingApprovals: new Map(),
    }

    // Handle all events from OpenClaw
    client.on('event', async (event: OpenClawEvent) => {
      // Tool approval handling
      if (event.type === 'tool.requested') {
        session.pendingApprovals.set(event.request.id, event.request)

        // Check auto-approve setting
        const inst = await db.query.openclawInstances.findFirst({
          where: (o, { eq }) => eq(o.userId, userId),
        })

        if (inst?.autoApprove) {
          // Auto-approve
          try {
            await client!.resolveApproval(event.request.id, 'allow-once', event.request.type)
            session.pendingApprovals.delete(event.request.id)

            // Save auto-approved record
            await db.insert(toolApprovals).values({
              userId,
              openclawId: event.request.id,
              toolType: event.request.type,
              command: event.request.command ?? null,
              title: event.request.title ?? null,
              description: event.request.description ?? event.request.command ?? null,
              decision: 'allow-once',
              decidedAt: new Date(),
            })

            // Notify listeners that tool was auto-approved
            for (const cb of session.listeners) {
              cb({ type: 'tool.resolved', id: event.request.id, decision: 'allow-once (auto)' })
            }
          } catch (e) {
            console.error('[openclaw/ws] auto-approve failed:', e)
          }
          return
        }

        // Save pending approval in DB
        await db.insert(toolApprovals).values({
          userId,
          openclawId: event.request.id,
          toolType: event.request.type,
          command: event.request.command ?? null,
          title: event.request.title ?? null,
          description: event.request.description ?? event.request.command ?? null,
          decision: 'pending',
        })
      }

      // Forward all events to listeners (SSE streams)
      for (const cb of session.listeners) {
        cb(event)
      }
    })

    this.sessions.set(userId, session)
    return session
  }

  /**
   * Send a message to the user's agent.
   */
  async sendMessage(userId: string, text: string): Promise<void> {
    const session = await this.getSession(userId)
    await session.client.sendMessage(text)
  }

  /**
   * Resolve a tool approval.
   */
  async resolveApproval(
    userId: string,
    openclawId: string,
    decision: 'allow-once' | 'allow-always' | 'deny',
  ): Promise<void> {
    const session = await this.getSession(userId)
    const request = session.pendingApprovals.get(openclawId)
    const toolType = request?.type ?? 'exec'

    await session.client.resolveApproval(openclawId, decision, toolType)
    session.pendingApprovals.delete(openclawId)

    // Update DB
    await db.update(toolApprovals)
      .set({ decision, decidedAt: new Date() })
      .where(eq(toolApprovals.openclawId, openclawId))
  }

  /**
   * Add a stream listener for a user's events.
   */
  addListener(userId: string, callback: StreamCallback): () => void {
    const session = this.sessions.get(userId)
    if (session) {
      session.listeners.add(callback)
      return () => session.listeners.delete(callback)
    }
    return () => {}
  }

  /**
   * Toggle auto-approve for a user.
   */
  async setAutoApprove(userId: string, enabled: boolean): Promise<void> {
    await db.update(openclawInstances)
      .set({ autoApprove: enabled, updatedAt: new Date() })
      .where(eq(openclawInstances.userId, userId))
  }

  /**
   * Get pending approvals for a user.
   */
  getPendingApprovals(userId: string): ToolApprovalRequest[] {
    const session = this.sessions.get(userId)
    if (!session) return []
    return Array.from(session.pendingApprovals.values())
  }

  /**
   * Disconnect a user's session.
   */
  disconnect(userId: string) {
    const session = this.sessions.get(userId)
    if (session) {
      session.client.disconnect()
      this.sessions.delete(userId)
    }
  }
}

// Singleton
export const sessionManager = new SessionManager()
