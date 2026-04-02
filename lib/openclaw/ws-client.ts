import 'server-only'
import WebSocket from 'ws'
import crypto from 'crypto'
import { EventEmitter } from 'events'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

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

interface DeviceIdentity {
  deviceId: string
  pubKeyB64Url: string
  privPem: string
}

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null
  private token: string
  private host: string
  private device: DeviceIdentity | null
  private reqId = 1
  private connected = false
  private pendingResolvers = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  constructor(host: string, token: string, device?: DeviceIdentity) {
    super()
    this.host = host
    this.token = token
    this.device = device ?? null
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 30_000)

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
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      const nonce = (msg.payload as Record<string, unknown>).nonce as string
      this.sendConnectWithDevice(nonce)
      return
    }

    if (msg.type === 'res' && (msg.payload as Record<string, unknown>)?.type === 'hello-ok') {
      this.connected = true
      const auth = (msg.payload as Record<string, unknown>).auth as Record<string, unknown> | undefined
      console.log(`[openclaw/ws] connected, scopes: ${JSON.stringify(auth?.scopes)}`)
      this.emit('event', { type: 'connected' } as OpenClawEvent)
      onConnected?.()
      return
    }

    if (msg.type === 'res' && msg.ok === false && !this.connected) {
      const error = (msg.error as Record<string, string>)?.message ?? 'Connection refused'
      console.log(`[openclaw/ws] connect failed: ${error}`)
      this.emit('event', { type: 'error', error } as OpenClawEvent)
      return
    }

    if (msg.type === 'res' && msg.id) {
      const resolver = this.pendingResolvers.get(msg.id as string)
      if (resolver) {
        this.pendingResolvers.delete(msg.id as string)
        if (msg.ok) resolver.resolve(msg.payload)
        else resolver.reject(new Error((msg.error as Record<string, string>)?.message ?? 'Request failed'))
      }
      return
    }

    if (msg.type === 'event') this.handleEvent(msg)
  }

  private sendConnectWithDevice(nonce: string) {
    const scopes = ['operator.read', 'operator.write', 'operator.approvals']

    const connectParams: Record<string, unknown> = {
      minProtocol: 3,
      maxProtocol: 3,
      client: { id: 'cli', version: '1.0.0', platform: 'linux', mode: 'cli' },
      role: 'operator',
      scopes,
      auth: { token: this.token },
    }

    // If we have device identity, sign the payload for full operator access
    if (this.device) {
      const signedAtMs = Date.now()
      const payload = [
        'v3', this.device.deviceId, 'cli', 'cli', 'operator',
        scopes.join(','), String(signedAtMs), this.token, nonce,
        'linux', '',
      ].join('|')

      const privKey = crypto.createPrivateKey(this.device.privPem)
      const sig = crypto.sign(null, Buffer.from(payload, 'utf8'), privKey)

      connectParams.device = {
        id: this.device.deviceId,
        publicKey: this.device.pubKeyB64Url,
        signature: base64UrlEncode(sig),
        signedAt: signedAtMs,
        nonce,
      }
    }

    this.sendFrame({
      type: 'req',
      id: String(this.reqId++),
      method: 'connect',
      params: connectParams,
    })
  }

  private handleEvent(msg: Record<string, unknown>) {
    const event = msg.event as string
    const payload = msg.payload as Record<string, unknown>

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

    if (event === 'chat' || event === 'agent.message') {
      const state = payload.state as string
      const message = payload.message as Record<string, unknown> | undefined

      // Extract text content from message.content (can be string or content blocks array)
      const extractText = (raw: unknown): string => {
        if (typeof raw === 'string') return raw
        if (Array.isArray(raw)) {
          return raw.map((block: unknown) => {
            if (typeof block === 'string') return block
            if (typeof block === 'object' && block !== null) {
              const b = block as Record<string, unknown>
              if (b.type === 'text' && typeof b.text === 'string') return b.text
            }
            return ''
          }).join('')
        }
        return ''
      }

      if (state === 'delta') {
        // For deltas, use message.content as the incremental chunk
        const content = extractText(message?.content)
        if (content) {
          this.emit('event', { type: 'chat.delta', data: { runId: payload.runId as string, content } } as OpenClawEvent)
        }
      } else if (state === 'final') {
        // For final, extract full accumulated content
        const content = extractText(message?.content)
        this.emit('event', { type: 'chat.final', content } as OpenClawEvent)
      } else if (state === 'error') {
        this.emit('event', { type: 'chat.error', error: (payload.errorMessage as string) ?? 'Agent error' } as OpenClawEvent)
      }
      return
    }

    if (event === 'agent.output' || event === 'exec.output') {
      const text = (payload.text as string) ?? (payload.output as string) ?? ''
      if (text) {
        this.emit('event', { type: 'chat.delta', data: { content: text } } as OpenClawEvent)
      }
    }
  }

  async sendMessage(text: string, sessionKey = 'main'): Promise<void> {
    const id = String(this.reqId++)
    const crypto = await import('crypto')
    return this.sendRequest(id, 'chat.send', {
      message: text,
      sessionKey,
      idempotencyKey: crypto.randomUUID(),
    })
  }

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
      this.pendingResolvers.set(id, { resolve: () => resolve(), reject })
      this.sendFrame({ type: 'req', id, method, params })
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
    if (this.ws) { this.ws.close(); this.ws = null; this.connected = false }
  }

  get isConnected() { return this.connected }
}
