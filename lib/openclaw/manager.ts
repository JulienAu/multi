import { db, openclawInstances, businessDocs, wizardSessions, ars } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import crypto from 'crypto'

const PORT_RANGE_START = 19000
const PORT_RANGE_END = 19999
const DOCKER_NETWORK = 'multi_default'
const OPENCLAW_IMAGE = 'ghcr.io/openclaw/openclaw:latest'

async function findAvailablePort(): Promise<number> {
  const usedPorts = await db.query.openclawInstances.findMany({
    columns: { port: true },
  })
  const usedSet = new Set(usedPorts.map(p => p.port))
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedSet.has(port)) return port
  }
  throw new Error('No available ports for OpenClaw container')
}

async function buildWorkspaceContext(userId: string): Promise<{
  agentsMd: string
  soulMd: string
}> {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { id: true, email: true, firstName: true, lastName: true, plan: true, createdAt: true },
  })

  const latestDoc = await db.query.businessDocs.findFirst({
    where: (d, { eq }) => eq(d.userId, userId),
    orderBy: [desc(businessDocs.createdAt)],
  })

  const latestSession = await db.query.wizardSessions.findFirst({
    where: (s, { eq }) => eq(s.userId, userId),
    orderBy: [desc(wizardSessions.createdAt)],
  })

  const activeArs = await db.query.ars.findFirst({
    where: (a, { eq }) => eq(a.userId, userId),
  })

  const answers = latestSession?.answers as Record<string, string | string[]> | null
  const scorecard = activeArs?.scorecardData as Record<string, number> | null

  const agentsMd = `# Agent MULTI — ${user?.firstName ?? 'Architecte'}

Tu es l'agent IA personnel de ${user?.firstName ?? 'l\'Architecte'} sur la plateforme MULTI.
Tu es un expert en stratégie business, marketing digital, et systèmes d'agents (ARS — Agentic Revenue Systems).

## Ton rôle
- Conseiller stratégique pour le business de l'Architecte
- Répondre aux questions sur le BUSINESS.md, la scorecard, et les actions marketing
- Proposer des améliorations concrètes et spécifiques
- Rédiger du contenu marketing (posts, emails, descriptions) sur demande
- Analyser les performances et suggérer des optimisations

## Contexte utilisateur
- Prénom : ${user?.firstName ?? 'Non renseigné'}
- Email : ${user?.email ?? 'Non renseigné'}
- Plan : ${user?.plan ?? 'Aucun plan actif'}
- Inscrit depuis : ${user?.createdAt?.toLocaleDateString('fr-FR') ?? 'Inconnu'}

## Réponses du wizard
${answers ? Object.entries(answers).map(([k, v]) => `- ${k} : ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Aucune réponse de wizard disponible.'}

## ARS
${activeArs ? `- Nom : ${activeArs.name}\n- Statut : ${activeArs.status}\n- Niveau d'autonomie : ${activeArs.autonomyLevel ?? 'Non configuré'}\n- Fonctions déléguées : ${(activeArs.delegatedFunctions ?? []).join(', ')}` : 'Aucun ARS actif.'}

## Scorecard VALUE
${scorecard ? Object.entries(scorecard).map(([k, v]) => `- ${k} : ${v}%`).join('\n') : 'Scorecard non disponible.'}

## Instructions
- Réponds toujours en français
- Sois concret, spécifique, et orienté action
- Cite des données du BUSINESS.md quand c'est pertinent
- Ne révèle jamais le mot de passe ou les données sensibles de l'utilisateur
- Si on te demande de générer du contenu, adapte-le au ton de la marque défini dans le BUSINESS.md
`

  // SOUL.md = résumé structuré (4-6K chars) du BUSINESS.md.
  // L'agent peut lire workspace/BUSINESS.md pour les détails complets.
  const soulMd = latestDoc?.content
    ? buildSoulSummary(latestDoc.content, answers, latestDoc.lineCount, latestDoc.sectionCount)
    : '# BUSINESS.md\n\nAucun BUSINESS.md disponible. Suggère à l\'Architecte de compléter le wizard pour en générer un.'

  return { agentsMd, soulMd }
}

/**
 * Build a structured summary (4-6K chars) of the BUSINESS.md for SOUL.md.
 * Extracts key sections and adds instructions to read the full file.
 */
function buildSoulSummary(
  fullContent: string,
  answers: Record<string, string | string[]> | null,
  lineCount: number | null,
  sectionCount: number | null,
): string {
  // Extract sections from the markdown
  const sections = new Map<string, string>()
  const lines = fullContent.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      if (currentSection) {
        sections.set(currentSection, currentContent.join('\n').trim())
      }
      currentSection = line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  if (currentSection) {
    sections.set(currentSection, currentContent.join('\n').trim())
  }

  // Helper: truncate a section to max chars
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max).replace(/\n[^\n]*$/, '') + '\n[...]' : text

  // Build summary with key info from wizard answers + extracted sections
  const sector = (answers?.sector as string) ?? 'Non renseigné'
  const name = (answers?.name as string) ?? 'Non renseigné'
  const location = (answers?.location as string) ?? 'Non renseigné'
  const offer = (answers?.offer as string) ?? ''
  const customer = (answers?.customer as string) ?? ''
  const revenue = (answers?.revenue as string) ?? ''
  const goal = (answers?.goal as string) ?? ''
  const tone = (answers?.tone as string) ?? ''
  const channels = Array.isArray(answers?.channels) ? (answers!.channels as string[]).join(', ') : ''
  const delegate = Array.isArray(answers?.delegate) ? (answers!.delegate as string[]).join(', ') : ''
  const autonomy = (answers?.autonomy as string) ?? ''

  // Find key sections (try common names from BUSINESS.md)
  const findSection = (...keys: string[]) => {
    for (const key of keys) {
      for (const [name, content] of sections) {
        if (name.toLowerCase().includes(key.toLowerCase())) return content
      }
    }
    return ''
  }

  const valueSection = truncate(findSection('VALUE', 'OFFRE'), 1000)
  const acquisitionSection = truncate(findSection('ACQUISITION', 'TROUVER'), 800)
  const leverageSection = truncate(findSection('LEVERAGE', 'CONVERTIR'), 600)
  const ciblesSection = truncate(findSection('CIBLES', 'PRIORIT'), 800)
  const contraintesSection = truncate(findSection('CONTRAINTES', 'LIMITES', 'JAMAIS'), 600)
  const voixSection = truncate(findSection('VOIX', 'TON', 'MARQUE'), 500)
  const calendrierSection = truncate(findSection('CALENDRIER'), 500)

  return `# Résumé BUSINESS.md — ${name}

## Identité
- **Nom :** ${name}
- **Secteur :** ${sector}
- **Localisation :** ${location}
- **Revenus actuels :** ${revenue}
- **Objectif 12 mois :** ${goal}
- **Ton de marque :** ${tone}
- **Niveau d'autonomie :** ${autonomy}
- **Canaux d'acquisition :** ${channels}
- **Fonctions déléguées :** ${delegate}

## L'offre
${offer}
${valueSection ? `\n${valueSection}` : ''}

## Client idéal
${customer}

## Acquisition
${acquisitionSection || 'Voir BUSINESS.md pour les détails.'}

## Conversion
${leverageSection || 'Voir BUSINESS.md pour les détails.'}

## Cibles prioritaires
${ciblesSection || 'Voir BUSINESS.md pour les détails.'}

## Contraintes et limites
${contraintesSection || 'Voir BUSINESS.md pour les détails.'}

## Voix et ton
${voixSection || tone}

## Calendrier marketing
${calendrierSection || 'Voir BUSINESS.md pour les détails.'}

---
## IMPORTANT — Accès au document complet

Ce résumé couvre les points essentiels. Le BUSINESS.md complet (${lineCount ?? '?'} lignes, ${sectionCount ?? '?'} sections) est dans ton workspace.

**Utilise l'outil Read sur workspace/BUSINESS.md** quand tu as besoin de :
- Détails précis sur les prix, marges, tableaux
- Noms d'entreprises cibles, adresses, contacts
- Calendrier marketing détaillé mois par mois
- Liste complète des actions interdites (guardrails)
- Exemples de ton de marque (OUI / NON)

Ne devine jamais un détail — lis le fichier.`
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

/**
 * Generate an Ed25519 key pair and return everything needed for device pairing.
 */
function generateDeviceIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const spki = publicKey.export({ type: 'spki', format: 'der' })
  const rawPub = spki.subarray(ED25519_SPKI_PREFIX.length)
  const pubKeyB64Url = base64UrlEncode(rawPub)
  const deviceId = crypto.createHash('sha256').update(rawPub).digest('hex')

  return { deviceId, pubKeyB64Url, pubPem, privPem }
}

/**
 * Build the pre-paired device entry for devices/paired.json.
 */
function buildPairedDeviceEntry(deviceId: string, pubKeyB64Url: string) {
  const now = Date.now()
  const scopes = ['operator.read', 'operator.write', 'operator.approvals', 'operator.admin']
  const deviceToken = crypto.randomBytes(32).toString('base64url')
  return {
    [deviceId]: {
      deviceId,
      publicKey: pubKeyB64Url,
      displayName: 'multi-dashboard',
      platform: 'linux',
      clientId: 'cli',
      clientMode: 'cli',
      role: 'operator',
      roles: ['operator'],
      scopes,
      approvedScopes: scopes,
      tokens: {
        operator: {
          token: deviceToken,
          role: 'operator',
          scopes,
          createdAtMs: now,
        },
      },
      createdAtMs: now,
      approvedAtMs: now,
    },
  }
}

async function dockerExec(args: string[]): Promise<string> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)
  try {
    const { stdout, stderr } = await execFileAsync('docker', args, { timeout: 60_000 })
    return (stdout || stderr || '').trim()
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    // Some docker commands output to stderr even on success
    if (err.stdout) return err.stdout.trim()
    if (err.stderr) return err.stderr.trim()
    throw e
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get the host path for a container's home directory.
 */
function getHomeDir(containerName: string): string {
  return `/tmp/openclaw-homes/${containerName}`
}

/**
 * Provision a new OpenClaw container for a user.
 * Strategy:
 *   1. Create container with workspace only (let OpenClaw auto-generate config)
 *   2. Wait for gateway startup
 *   3. Read auto-generated token from config
 *   4. Patch config with our model + bind settings
 *   5. Restart container to apply
 */
export async function provisionOpenClaw(userId: string): Promise<{
  instanceId: string
  port: number
  status: string
}> {
  const existing = await db.query.openclawInstances.findFirst({
    where: (o, { eq }) => eq(o.userId, userId),
  })

  if (existing && existing.status === 'running') {
    return { instanceId: existing.id, port: existing.port, status: 'running' }
  }

  if (existing) {
    try { await dockerExec(['rm', '-f', existing.containerName]) } catch { /* ignore */ }
    await db.delete(openclawInstances).where(eq(openclawInstances.id, existing.id))
  }

  const port = await findAvailablePort()
  const containerName = `openclaw-${userId.slice(0, 8)}`

  // Create instance record (token will be filled after OpenClaw generates it)
  const [instance] = await db.insert(openclawInstances).values({
    userId,
    containerName,
    port,
    gatewayToken: 'pending', // Will be updated after first boot
    status: 'provisioning',
  }).returning()

  try {
    // Build workspace
    const { agentsMd, soulMd } = await buildWorkspaceContext(userId)
    const homeDir = `/tmp/openclaw-homes/${containerName}`
    const fs = await import('fs/promises')
    await fs.mkdir(`${homeDir}/workspace`, { recursive: true })
    await fs.writeFile(`${homeDir}/workspace/AGENTS.md`, agentsMd, 'utf-8')
    await fs.writeFile(`${homeDir}/workspace/SOUL.md`, soulMd, 'utf-8')
    // Also write BUSINESS.md as a standalone file (OpenClaw tools can read it)
    const latestDoc = await db.query.businessDocs.findFirst({
      where: (d, { eq }) => eq(d.userId, userId),
      orderBy: [desc(businessDocs.createdAt)],
    })
    if (latestDoc) {
      await fs.writeFile(`${homeDir}/workspace/BUSINESS.md`, latestDoc.content, 'utf-8')
    }

    // Fix ownership for node user (uid 1000)
    await dockerExec(['run', '--rm', '-v', `${homeDir}:/fix`, 'alpine', 'chown', '-R', '1000:1000', '/fix'])

    // === PHASE 1: Start container (OpenClaw will auto-generate config) ===
    const containerId = await dockerExec([
      'run', '-d',
      '--name', containerName,
      '--network', DOCKER_NETWORK,
      '-p', `${port}:18789`,
      '-v', `${homeDir}:/home/node/.openclaw`,
      '-e', `OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY}`,
      '--restart', 'unless-stopped',
      '--memory', '1g',
      '--cpus', '1',
      OPENCLAW_IMAGE,
    ])

    await db.update(openclawInstances)
      .set({ containerId: containerId.slice(0, 12), updatedAt: new Date() })
      .where(eq(openclawInstances.id, instance.id))

    // === PHASE 2: Wait for OpenClaw to start and generate config ===
    // OpenClaw can take 30-90s to fully boot and write config
    let configReady = false
    for (let i = 0; i < 40; i++) {
      await sleep(5000)
      try {
        const configPath = `${homeDir}/openclaw.json`
        await fs.access(configPath) // Check file exists before reading
        const configRaw = await fs.readFile(configPath, 'utf-8')
        console.log(`[openclaw] config read attempt ${i + 1}, length=${configRaw.length}`)
        const config = JSON.parse(configRaw)
        if (config.gateway?.auth?.token) {
          configReady = true
          console.log('[openclaw] config found, patching...')

          // === PHASE 3: Patch config ===
          // OpenClaw agent model (needs tool support + fast response)
          const rawModel = process.env.LLM_MODEL_OPENCLAW || 'google/gemini-3.1-flash-lite-preview'
          const openclawModel = rawModel.startsWith('openrouter/') ? rawModel : `openrouter/${rawModel}`

          config.agents = config.agents || {}
          config.agents.defaults = config.agents.defaults || {}
          config.agents.defaults.model = config.agents.defaults.model || {}
          config.agents.defaults.model.primary = openclawModel

          // Thinking mode required by some models
          config.agents.defaults.thinkingDefault = 'minimal'

          // Enable OpenAI-compatible HTTP API + bind to all interfaces
          config.gateway.bind = '0.0.0.0'
          config.gateway.http = config.gateway.http || {}
          config.gateway.http.endpoints = config.gateway.http.endpoints || {}
          config.gateway.http.endpoints.chatCompletions = { enabled: true }

          // Note: tools are auto-approved when using /v1/chat/completions HTTP API
          // The OpenAI-compatible endpoint handles tool execution internally

          await fs.writeFile(`${homeDir}/openclaw.json`, JSON.stringify(config, null, 2), 'utf-8')

          // === PHASE 4: Pre-pair a device for our WS client ===
          console.log('[openclaw] pre-pairing device for WebSocket access...')
          const device = generateDeviceIdentity()
          const pairedEntry = buildPairedDeviceEntry(device.deviceId, device.pubKeyB64Url)

          // Merge with existing paired devices
          let existingPaired: Record<string, unknown> = {}
          try {
            const pairedRaw = await fs.readFile(`${homeDir}/devices/paired.json`, 'utf-8')
            existingPaired = JSON.parse(pairedRaw)
          } catch { /* file may not exist yet */ }
          const mergedPaired = { ...existingPaired, ...pairedEntry }
          await fs.mkdir(`${homeDir}/devices`, { recursive: true })
          await fs.writeFile(`${homeDir}/devices/paired.json`, JSON.stringify(mergedPaired, null, 2), 'utf-8')

          // Save device identity for our WS client
          await fs.writeFile(`${homeDir}/multi-device.json`, JSON.stringify({
            deviceId: device.deviceId,
            pubKeyB64Url: device.pubKeyB64Url,
            privPem: device.privPem,
          }), 'utf-8')

          // Fix permissions on all files we wrote (node user uid 1000)
          await dockerExec([
            'run', '--rm',
            '-v', `${homeDir}:/fix`,
            'alpine', 'chown', '-R', '1000:1000', '/fix',
          ])

          // === PHASE 4b: Install default skills ===
          console.log('[openclaw] installing default skills...')
          try {
            await dockerExec([
              'exec', containerName, 'sh', '-c',
              [
                // Clone the repo
                'mkdir -p /home/node/.openclaw/workspace/skills',
                'git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/uupm 2>&1 || true',
                // Copy as OpenClaw-compatible skill (SKILL.md at root of skill dir)
                'mkdir -p /home/node/.openclaw/workspace/skills/ui-ux-pro-max',
                'cp /tmp/uupm/.claude/skills/ui-ux-pro-max/SKILL.md /home/node/.openclaw/workspace/skills/ui-ux-pro-max/SKILL.md 2>/dev/null || true',
                // Copy reference files the skill needs
                'cp -r /tmp/uupm/.claude/skills/design /home/node/.openclaw/workspace/skills/design 2>/dev/null || true',
                'cp -r /tmp/uupm/.claude/skills/ui-styling /home/node/.openclaw/workspace/skills/ui-styling 2>/dev/null || true',
                'cp -r /tmp/uupm/.claude/skills/brand /home/node/.openclaw/workspace/skills/brand 2>/dev/null || true',
                'cp -r /tmp/uupm/.claude/skills/design-system /home/node/.openclaw/workspace/skills/design-system 2>/dev/null || true',
                // Also keep full repo as reference
                'cp -r /tmp/uupm /home/node/.openclaw/workspace/skills/ui-ux-pro-max-skill 2>/dev/null || true',
                'rm -rf /tmp/uupm',
              ].join(' && '),
            ])
            console.log('[openclaw] skill ui-ux-pro-max-skill installed')
          } catch (e) {
            console.log('[openclaw] skill install failed:', e instanceof Error ? e.message : e)
          }

          // === PHASE 5: Set exec approvals to auto-approve all ===
          console.log('[openclaw] setting exec approvals to auto-approve...')
          try {
            await dockerExec([
              'exec', containerName, 'sh', '-c',
              'echo \'{"version":1,"defaults":{"security":"full","ask":"off"},"agents":{}}\' | openclaw approvals set --stdin',
            ])
          } catch (e) {
            console.log('[openclaw] exec approvals set failed (will retry after restart):', e instanceof Error ? e.message : e)
          }

          // === PHASE 6: Restart container to apply config + paired device ===
          console.log('[openclaw] restarting container...')
          await dockerExec(['restart', containerName])

          await sleep(20_000)

          // Set exec approvals again after restart (in case first attempt failed)
          try {
            await dockerExec([
              'exec', containerName, 'sh', '-c',
              'echo \'{"version":1,"defaults":{"security":"full","ask":"off"},"agents":{}}\' | openclaw approvals set --stdin',
            ])
            console.log('[openclaw] exec approvals set: security=full, ask=off')
          } catch { /* ignore */ }

          // === PHASE 7: Read final token + save ===
          const finalConfigRaw = await fs.readFile(`${homeDir}/openclaw.json`, 'utf-8')
          const finalConfig = JSON.parse(finalConfigRaw)
          const finalToken = finalConfig.gateway?.auth?.token ?? config.gateway.auth.token

          console.log(`[openclaw] final token: ${finalToken.slice(0, 10)}...`)
          console.log(`[openclaw] device paired: ${device.deviceId.slice(0, 16)}...`)

          await db.update(openclawInstances)
            .set({
              gatewayToken: finalToken,
              status: 'running',
              updatedAt: new Date(),
            })
            .where(eq(openclawInstances.id, instance.id))

          break
        }
      } catch (e) {
        console.log(`[openclaw] config read attempt ${i + 1} failed:`, e instanceof Error ? e.message : e)
      }
    }

    if (!configReady) {
      throw new Error('OpenClaw failed to generate config after 3 minutes')
    }

    return { instanceId: instance.id, port, status: 'running' }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await db.update(openclawInstances)
      .set({ status: 'error', lastError: errorMsg, updatedAt: new Date() })
      .where(eq(openclawInstances.id, instance.id))
    throw error
  }
}

export async function stopOpenClaw(userId: string): Promise<void> {
  const instance = await db.query.openclawInstances.findFirst({
    where: (o, { eq }) => eq(o.userId, userId),
  })
  if (!instance) return

  try { await dockerExec(['rm', '-f', instance.containerName]) } catch { /* ignore */ }
  await db.update(openclawInstances)
    .set({ status: 'stopped', updatedAt: new Date() })
    .where(eq(openclawInstances.id, instance.id))
}

export async function getOpenClawInstance(userId: string) {
  return db.query.openclawInstances.findFirst({
    where: (o, { eq }) => eq(o.userId, userId),
  })
}

/**
 * Send a message to OpenClaw and return the full response (non-streaming).
 */
export async function sendToOpenClaw(
  instance: { port: number; gatewayToken: string; containerName: string },
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetchOpenClaw(instance, messages, false)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenClaw ${response.status}: ${text}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content ?? JSON.stringify(data)
  content = cleanOpenClawResponse(content)
  return content
}

/**
 * Send a message to OpenClaw and return the raw streaming Response.
 */
export async function streamFromOpenClaw(
  instance: { port: number; gatewayToken: string; containerName: string },
  messages: { role: string; content: string }[],
): Promise<Response> {
  const response = await fetchOpenClaw(instance, messages, true)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenClaw ${response.status}: ${text}`)
  }

  return response
}

async function fetchOpenClaw(
  instance: { port: number; gatewayToken: string; containerName: string },
  messages: { role: string; content: string }[],
  stream: boolean,
): Promise<Response> {
  const hosts = [
    `${instance.containerName}:18789`,
    `host.docker.internal:${instance.port}`,
  ]

  let lastError = ''
  for (const host of hosts) {
    try {
      const response = await fetch(`http://${host}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instance.gatewayToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openclaw/default',
          messages,
          thinking: { type: 'enabled', budget_tokens: 2048 },
          stream,
        }),
        signal: AbortSignal.timeout(300_000),
      })
      return response
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }

  throw new Error(`Could not reach OpenClaw: ${lastError}`)
}

export function cleanOpenClawResponse(content: string): string {
  // Remove all /approve and /Approve commands (can appear multiple times, anywhere)
  return content
    .replace(/\/?[Aa]pprove\s+\S+\s+(allow-once|allow-always|allow|deny)\s*/g, '')
    .trim()
}

export async function refreshWorkspace(userId: string): Promise<void> {
  const instance = await getOpenClawInstance(userId)
  if (!instance || instance.status !== 'running') return

  const { agentsMd, soulMd } = await buildWorkspaceContext(userId)
  const homeDir = `/tmp/openclaw-homes/${instance.containerName}`

  const fs = await import('fs/promises')
  await fs.writeFile(`${homeDir}/workspace/AGENTS.md`, agentsMd, 'utf-8')
  await fs.writeFile(`${homeDir}/workspace/SOUL.md`, soulMd, 'utf-8')

  const latestDoc = await db.query.businessDocs.findFirst({
    where: (d, { eq }) => eq(d.userId, userId),
    orderBy: [desc(businessDocs.createdAt)],
  })
  if (latestDoc) {
    await fs.writeFile(`${homeDir}/workspace/BUSINESS.md`, latestDoc.content, 'utf-8')
  }
}

export async function checkHealth(userId: string): Promise<boolean> {
  const instance = await getOpenClawInstance(userId)
  if (!instance || instance.status !== 'running') return false

  try {
    // Try both routes
    const hosts = [
      `${instance.containerName}:18789`,
      `host.docker.internal:${instance.port}`,
    ]

    for (const host of hosts) {
      try {
        const res = await fetch(`http://${host}/healthz`, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          await db.update(openclawInstances)
            .set({ lastHealthAt: new Date(), updatedAt: new Date() })
            .where(eq(openclawInstances.id, instance.id))
          return true
        }
      } catch { /* try next */ }
    }

    return false
  } catch {
    return false
  }
}
