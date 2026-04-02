import WebSocket from 'ws'
import { EventEmitter } from 'events'

export type ToolApprovalRequest = {
  id: string
  type: 'exec' | 'plugin'
  command?: string
  cwd?: string
  toolName?: string
  title?: string
  description?: string
  agentId: string
  sessionKey: string
  timeoutMs: number
}

export type ChatDelta = {
  runId?: string
  content: string
}

export type OpenClawEvent =
  | { type: 'connected' }
  | { type: 'chat.delta'; data: ChatDelta }
  | { type: 'chat.final'; content: string }
  | { type: 'chat.error'; error: string }
  | { type: 'tool.requested'; request: ToolApprovalRequest }
  | { type: 'tool.resolved'; id: string; decision: string }
  | { type: 'error'; error: string }
  | { type: 'disconnected' }

/**
 * Persistent WebSocket client for an OpenClaw gateway.
 * Handles: connect handshake, chat.send, streaming, tool approvals.
 */
export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null
  private token: string
  private host: string
  private reqId = 1
  private connected = false
  private pendingResolvers = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  constructor(host: string, token: string) {
    super()
    this.host = host
    this.token = token
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 30_000)

      this.ws = new WebSocket(`ws://${this.host}`)

      this.ws.on('error', (err) => {
        clearTimeout(timeout)
        this.emit('event', { type: 'error', error: err.message } as OpenClawEvent)
        reject(err)
      })

      this.ws.on('close', () => {
        this.connected = false
        this.emit('event', { type: 'disconnected' } as OpenClawEvent)
      })

      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())
        this.handleMessage(msg, () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    })
  }

  private handleMessage(msg: Record<string, unknown>, onConnected?: () => void) {
    // Challenge → send connect
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      this.sendFrame({
        type: 'req',
        id: String(this.reqId++),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'multi-dashboard',
            version: '1.0.0',
            platform: 'linux',
            mode: 'operator',
          },
          role: 'operator',
          scopes: ['operator.read', 'operator.write', 'operator.approvals', 'operator.admin'],
          auth: { token: this.token },
        },
      })
      return
    }

    // Connect response
    if (msg.type === 'res' && (msg.payload as Record<string, unknown>)?.type === 'hello-ok') {
      this.connected = true
      this.emit('event', { type: 'connected' } as OpenClawEvent)
      onConnected?.()
      return
    }

    // Connect error
    if (msg.type === 'res' && msg.ok === false && !this.connected) {
      const error = (msg.error as Record<string, string>)?.message ?? 'Connection refused'
      this.emit('event', { type: 'error', error } as OpenClawEvent)
      return
    }

    // Response to our requests
    if (msg.type === 'res' && msg.id) {
      const resolver = this.pendingResolvers.get(msg.id as string)
      if (resolver) {
        this.pendingResolvers.delete(msg.id as string)
        if (msg.ok) {
          resolver.resolve(msg.payload)
        } else {
          resolver.reject(new Error((msg.error as Record<string, string>)?.message ?? 'Request failed'))
        }
      }
      return
    }

    // Events
    if (msg.type === 'event') {
      this.handleEvent(msg)
    }
  }

  private handleEvent(msg: Record<string, unknown>) {
    const event = msg.event as string
    const payload = msg.payload as Record<string, unknown>

    // Tool approval requests
    if (event === 'exec.approval.requested') {
      const plan = payload.systemRunPlan as Record<string, string> | undefined
      this.emit('event', {
        type: 'tool.requested',
        request: {
          id: payload.id as string,
          type: 'exec',
          command: plan?.rawCommand ?? (payload.command as string) ?? '',
          cwd: payload.cwd as string,
          agentId: payload.agentId as string,
          sessionKey: payload.sessionKey as string,
          timeoutMs: (payload.timeoutMs as number) ?? 15000,
        },
      } as OpenClawEvent)
      return
    }

    if (event === 'plugin.approval.requested') {
      this.emit('event', {
        type: 'tool.requested',
        request: {
          id: payload.id as string,
          type: 'plugin',
          toolName: payload.toolName as string,
          title: payload.title as string,
          description: payload.description as string,
          agentId: payload.agentId as string,
          sessionKey: payload.sessionKey as string,
          timeoutMs: (payload.timeoutMs as number) ?? 30000,
        },
      } as OpenClawEvent)
      return
    }

    if (event === 'exec.approval.resolved' || event === 'plugin.approval.resolved') {
      this.emit('event', {
        type: 'tool.resolved',
        id: payload.id as string,
        decision: payload.decision as string,
      } as OpenClawEvent)
      return
    }

    // Chat content events — OpenClaw streams via 'agent.message' or 'chat' events
    if (event === 'chat' || event === 'agent.message') {
      const state = payload.state as string
      const message = payload.message as Record<string, unknown> | undefined
      const content = (message?.content as string) ?? ''

      if (state === 'delta' && content) {
        this.emit('event', { type: 'chat.delta', data: { runId: payload.runId as string, content } } as OpenClawEvent)
      } else if (state === 'final') {
        this.emit('event', { type: 'chat.final', content } as OpenClawEvent)
      } else if (state === 'error') {
        this.emit('event', { type: 'chat.error', error: (payload.errorMessage as string) ?? 'Agent error' } as OpenClawEvent)
      }
      return
    }

    // Log output events (agent is writing to console, running commands, etc.)
    if (event === 'agent.output' || event === 'exec.output') {
      const text = (payload.text as string) ?? (payload.output as string) ?? ''
      if (text) {
        this.emit('event', { type: 'chat.delta', data: { content: text } } as OpenClawEvent)
      }
    }
  }

  /**
   * Send a chat message. Returns immediately; listen for events.
   */
  async sendMessage(text: string, sessionKey = 'main'): Promise<void> {
    const id = String(this.reqId++)
    return this.sendRequest(id, 'chat.send', { text, sessionKey })
  }

  /**
   * Approve or deny a tool call.
   */
  async resolveApproval(
    approvalId: string,
    decision: 'allow-once' | 'allow-always' | 'deny',
    toolType: 'exec' | 'plugin' = 'exec',
  ): Promise<void> {
    const id = String(this.reqId++)
    const method = toolType === 'exec' ? 'exec.approval.resolve' : 'plugin.approval.resolve'
    return this.sendRequest(id, method, { id: approvalId, decision })
  }

  private sendRequest(id: string, method: string, params: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pendingResolvers.set(id, {
        resolve: () => resolve(),
        reject,
      })
      this.sendFrame({ type: 'req', id, method, params })

      // Timeout
      setTimeout(() => {
        if (this.pendingResolvers.has(id)) {
          this.pendingResolvers.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30_000)
    })
  }

  private sendFrame(frame: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    this.ws.send(JSON.stringify(frame))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connected = false
    }
  }

  get isConnected() {
    return this.connected
  }
}
