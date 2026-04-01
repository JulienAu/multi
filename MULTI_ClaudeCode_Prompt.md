# MULTI — Prompt de développement production
# Version : 2.0 — 31 mars 2026
# Destinataire : Claude Code
# Supervisé par : Julien (Chief Research)
# Objectif : architecture production, buildable, scalable

---

## VISION PRODUIT (contexte obligatoire)

MULTI est une plateforme de "Generative Business". Un utilisateur répond à 12 questions
sur son activité → MULTI génère un BUSINESS.md (document stratégique) via LLM →
l'utilisateur souscrit → des agents IA opèrent son business 24h/24.

**L'utilisateur devient "l'Architecte" — il pilote, il ne travaille plus dans le business.**

---

## STACK TECHNIQUE CIBLE (production)

| Couche | Choix | Raison |
|---|---|---|
| Framework | Next.js 14 App Router | SSR, API routes, layout système |
| Styling | Tailwind CSS | Design system cohérent |
| Police | Geist (next/font) | Lisible et élégante |
| ORM | Drizzle ORM | Léger, type-safe, serverless-friendly |
| Base de données | Neon PostgreSQL | Serverless, scale auto |
| Auth | Clerk | Google + email + magic link |
| LLM | OpenRouter | Accès multi-modèles (claude-sonnet, claude-opus, etc.) |
| Email | Postmark | Délivrabilité, transactionnel + marketing |
| Paiements | Stripe + Stripe Connect | Plans SaaS + payouts futurs |
| Analytics | PostHog | Event tracking complet |
| Storage | Cloudflare R2 | Coût-efficace, S3-compatible |
| Monitoring | Sentry + Langfuse | Erreurs app + traces LLM |
| Déploiement | Vercel | Speed, intégration Next.js native |

**Note importante sur le LLM :** tout appel LLM passe par OpenRouter.
OpenRouter est le point d'entrée unique pour tous les modèles.
Pour la génération de BUSINESS.md, le modèle cible est `anthropic/claude-sonnet-4-5`.
Cela permet de switcher de modèle (claude-opus, gpt-4o, etc.) sans changer le code.

---

## ARCHITECTURE DES FICHIERS (complète)

```
multi/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                        # Landing page (wizard)
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (dashboard)/                    # Routes protégées
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── business-md/page.tsx
│   │   ├── scorecard/page.tsx
│   │   └── agents/page.tsx
│   └── api/
│       ├── wizard/
│       │   ├── session/route.ts        # POST — créer session
│       │   ├── answer/route.ts         # POST — sauvegarder réponse
│       │   ├── complete/route.ts       # POST — générer BUSINESS.md
│       │   └── save-email/route.ts     # POST — capturer lead
│       ├── business-md/
│       │   ├── route.ts                # GET — récupérer
│       │   └── [id]/route.ts           # PUT — mettre à jour
│       ├── stripe/
│       │   ├── checkout/route.ts       # POST — créer session checkout
│       │   └── webhook/route.ts        # POST — webhook Stripe
│       └── analytics/route.ts          # POST — events analytics
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Accordion.tsx
│   │   └── ProgressBar.tsx
│   ├── wizard/
│   │   ├── Wizard.tsx
│   │   ├── WizardQuestion.tsx
│   │   ├── WizardNavigation.tsx
│   │   ├── GenerationScreen.tsx
│   │   └── answers/
│   │       ├── SelectAnswer.tsx
│   │       ├── TextAnswer.tsx
│   │       ├── TextareaAnswer.tsx
│   │       └── TagsAnswer.tsx
│   ├── agent/
│   │   ├── AgentSidebar.tsx
│   │   ├── AgentMessage.tsx
│   │   └── BusinessMdPreview.tsx
│   ├── result/
│   │   ├── ResultScreen.tsx
│   │   ├── BusinessMdDisplay.tsx
│   │   ├── PricingCards.tsx
│   │   └── EmailCapture.tsx
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx
│   │   ├── NavSidebar.tsx
│   │   ├── MetricCard.tsx
│   │   └── AgentBriefing.tsx
│   ├── providers/
│   │   └── PostHogProvider.tsx
│   ├── Header.tsx
│   └── FAQ.tsx
│
├── lib/
│   ├── db/
│   │   ├── index.ts                    # Client Drizzle + Neon
│   │   ├── schema.ts                   # Schéma complet
│   │   └── migrations/
│   ├── llm/
│   │   ├── client.ts                   # Client OpenRouter (fetch natif)
│   │   ├── generateBusinessMd.ts       # Génération BUSINESS.md
│   │   └── prompts.ts                  # Templates de prompts
│   ├── stripe/
│   │   ├── client.ts
│   │   └── plans.ts
│   ├── postmark/
│   │   └── client.ts
│   ├── posthog/
│   │   └── client.ts
│   ├── questions.ts
│   ├── agentMessages.ts
│   └── types.ts
│
├── hooks/
│   ├── useWizard.ts
│   ├── useAgentMessages.ts
│   └── useAnalytics.ts
│
├── middleware.ts
├── drizzle.config.ts
├── tailwind.config.ts
└── .env.local
```

---

## ÉTAPE 0 — INITIALISATION

```bash
npx create-next-app@latest multi --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd multi

npm install \
  @clerk/nextjs \
  drizzle-orm \
  @neondatabase/serverless \
  drizzle-kit \
  stripe \
  @postmark/postmark \
  posthog-js \
  posthog-node \
  zod \
  geist

npm install -D dotenv-cli

npm run dev   # vérifier que tout démarre sans erreur
```

---

## ÉTAPE 1 — VARIABLES D'ENVIRONNEMENT (.env.local)

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# OpenRouter (LLM principal — accès à tous les modèles dont Claude)
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
# Modèle par défaut pour la génération de BUSINESS.md
LLM_MODEL_GENERATION="anthropic/claude-sonnet-4-5"
# Modèle économique pour les tâches légères
LLM_MODEL_LIGHT="anthropic/claude-haiku-4-5"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_BUSINESS_PRICE_ID="price_..."

# Postmark
POSTMARK_SERVER_TOKEN="..."
POSTMARK_FROM_EMAIL="noreply@multi.app"

# PostHog
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## ÉTAPE 2 — DESIGN SYSTEM (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          violet:          '#534AB7',
          'violet-light':  '#EEEDFE',
          'violet-dark':   '#3D3690',
          green:           '#1D9E75',
          'green-light':   '#E1F5EE',
          'green-dark':    '#085041',
        },
        ui: {
          bg:              '#FFFFFF',
          'bg-secondary':  '#F8F8F6',
          'bg-tertiary':   '#F2F2F0',
          border:          '#E8E8E6',
          'border-strong': '#D0D0CC',
          'text-primary':  '#0A0A0A',
          'text-secondary':'#6B6B6B',
          'text-tertiary': '#A8A8A8',
        },
        status: {
          success: '#1D9E75',
          warning: '#F59E0B',
          error:   '#EF4444',
          info:    '#534AB7',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        'xs':  ['11px', { lineHeight: '1.4' }],
        'sm':  ['12px', { lineHeight: '1.5' }],
        'base':['13px', { lineHeight: '1.6' }],
        'md':  ['14px', { lineHeight: '1.6' }],
        'lg':  ['16px', { lineHeight: '1.5' }],
        'xl':  ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1.1' }],
        '4xl': ['36px', { lineHeight: '1.0' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        // Jamais 600 ou 700 — design minimaliste
      },
      borderWidth: {
        DEFAULT: '0.5px',
        '1': '1px',
      },
      animation: {
        'typing':    'typing 1.2s ease-in-out infinite',
        'fade-up':   'fadeUp 0.3s ease-out',
        'slide-in':  'slideIn 0.2s ease-out',
        'slide-out': 'slideOut 0.2s ease-out',
      },
      keyframes: {
        typing: {
          '0%, 100%': { opacity: '0.3' },
          '50%':      { opacity: '0.8' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideOut: {
          '0%':   { transform: 'translateX(0)',    opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## ÉTAPE 3 — SCHÉMA BASE DE DONNÉES (lib/db/schema.ts)

```typescript
import {
  pgTable, text, timestamp, boolean, integer,
  jsonb, uuid, varchar, pgEnum,
} from 'drizzle-orm/pg-core'

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['starter', 'pro', 'business'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'canceled', 'past_due', 'trialing', 'incomplete',
])
export const arsStatusEnum = pgEnum('ars_status', [
  'generating', 'active', 'paused', 'archived',
])

// ─── USERS ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:                          uuid('id').primaryKey().defaultRandom(),
  clerkId:                     varchar('clerk_id', { length: 255 }).unique().notNull(),
  email:                       varchar('email', { length: 255 }).unique().notNull(),
  firstName:                   varchar('first_name', { length: 100 }),
  lastName:                    varchar('last_name', { length: 100 }),
  plan:                        planEnum('plan'),
  stripeCustomerId:            varchar('stripe_customer_id', { length: 255 }).unique(),
  stripeSubscriptionId:        varchar('stripe_subscription_id', { length: 255 }).unique(),
  subscriptionStatus:          subscriptionStatusEnum('subscription_status'),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end'),
  createdAt:                   timestamp('created_at').defaultNow().notNull(),
  updatedAt:                   timestamp('updated_at').defaultNow().notNull(),
})

// ─── WIZARD SESSIONS ────────────────────────────────────────────────────────

export const wizardSessions = pgTable('wizard_sessions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  userId:                  uuid('user_id').references(() => users.id),
  answers:                 jsonb('answers').$type<Record<string, string | string[]>>(),
  lastQuestionId:          varchar('last_question_id', { length: 50 }),
  completedAt:             timestamp('completed_at'),
  convertedAt:             timestamp('converted_at'),
  emailCapturedAt:         timestamp('email_captured_at'),
  email:                   varchar('email', { length: 255 }),
  timeToCompleteSeconds:   integer('time_to_complete_seconds'),
  createdAt:               timestamp('created_at').defaultNow().notNull(),
  updatedAt:               timestamp('updated_at').defaultNow().notNull(),
})

// ─── BUSINESS DOCS ──────────────────────────────────────────────────────────

export const businessDocs = pgTable('business_docs', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  userId:              uuid('user_id').references(() => users.id).notNull(),
  sessionId:           uuid('session_id').references(() => wizardSessions.id),
  content:             text('content').notNull(),
  version:             integer('version').default(1).notNull(),
  lineCount:           integer('line_count'),
  sectionCount:        integer('section_count'),
  sector:              varchar('sector', { length: 100 }),
  businessName:        varchar('business_name', { length: 255 }),
  generatedByModel:    varchar('generated_by_model', { length: 100 }),
  generationSeconds:   integer('generation_seconds'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
})

// ─── ARS ────────────────────────────────────────────────────────────────────

export const ars = pgTable('ars', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  userId:                uuid('user_id').references(() => users.id).notNull(),
  businessDocId:         uuid('business_doc_id').references(() => businessDocs.id),
  name:                  varchar('name', { length: 255 }).notNull(),
  status:                arsStatusEnum('status').default('active').notNull(),
  autonomyLevel:         varchar('autonomy_level', { length: 50 }),
  delegatedFunctions:    jsonb('delegated_functions').$type<string[]>(),
  scorecardData:         jsonb('scorecard_data'),
  lastNightlyCycleAt:    timestamp('last_nightly_cycle_at'),
  nextNightlyCycleAt:    timestamp('next_nightly_cycle_at'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
})

// ─── LEADS ──────────────────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  email:                 varchar('email', { length: 255 }).notNull(),
  sessionId:             uuid('session_id').references(() => wizardSessions.id),
  source:                varchar('source', { length: 50 }).default('wizard_email_capture'),
  sector:                varchar('sector', { length: 100 }),
  businessName:          varchar('business_name', { length: 255 }),
  businessMdEmailSentAt: timestamp('business_md_email_sent_at'),
  convertedToUserId:     uuid('converted_to_user_id').references(() => users.id),
  convertedAt:           timestamp('converted_at'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
})

// ─── ANALYTICS EVENTS ───────────────────────────────────────────────────────

export const analyticsEvents = pgTable('analytics_events', {
  id:         uuid('id').primaryKey().defaultRandom(),
  sessionId:  uuid('session_id').references(() => wizardSessions.id),
  userId:     uuid('user_id').references(() => users.id),
  event:      varchar('event', { length: 100 }).notNull(),
  properties: jsonb('properties').$type<Record<string, unknown>>(),
  device:     varchar('device', { length: 20 }),
  source:     varchar('source', { length: 255 }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
})

// ─── INFER TYPES ────────────────────────────────────────────────────────────

export type User            = typeof users.$inferSelect
export type NewUser         = typeof users.$inferInsert
export type WizardSession   = typeof wizardSessions.$inferSelect
export type NewWizardSession= typeof wizardSessions.$inferInsert
export type BusinessDoc     = typeof businessDocs.$inferSelect
export type NewBusinessDoc  = typeof businessDocs.$inferInsert
export type Ars             = typeof ars.$inferSelect
export type Lead            = typeof leads.$inferSelect
export type AnalyticsEvent  = typeof analyticsEvents.$inferSelect
```

---

## ÉTAPE 4 — CLIENT DB (lib/db/index.ts)

```typescript
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
export * from './schema'
```

---

## ÉTAPE 5 — CONFIG DRIZZLE (drizzle.config.ts)

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
```

Ajouter dans `package.json` :
```json
{
  "scripts": {
    "db:push":     "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:studio":   "drizzle-kit studio"
  }
}
```

```bash
npm run db:push    # applique le schéma en dev
```

---

## ÉTAPE 6 — MIDDLEWARE AUTH (middleware.ts)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/business-md(.*)',
  '/scorecard(.*)',
  '/agents(.*)',
  '/api/business-md(.*)',
  '/api/stripe/checkout(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
```

---

## ÉTAPE 7 — LAYOUT RACINE (app/layout.tsx)

```tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'MULTI — Construisez votre machine à revenus',
  description: 'Répondez à 12 questions. MULTI déploie votre équipe d\'agents IA. Votre business tourne 24h/24, 7j/7.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://multi.app'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="bg-ui-bg text-ui-text-primary antialiased">
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

---

## ÉTAPE 8 — TYPES PARTAGÉS (lib/types.ts)

```typescript
export type QuestionType = 'select' | 'text' | 'textarea' | 'tags'

export type QuestionPhase =
  | 'TOI'
  | 'VOTRE OFFRE'
  | 'VOTRE ACQUISITION'
  | 'VOTRE ARS'
  | 'VOTRE AMBITION'

export interface Question {
  id: string
  phase: QuestionPhase
  num: string
  title: string
  subtitle: string
  type: QuestionType
  options?: string[]
  placeholder?: string
  required: boolean
  agentTrigger: boolean
}

export type WizardAnswers = Record<string, string | string[]>

export type WizardStep = 'wizard' | 'generating' | 'result'

export interface WizardState {
  step: WizardStep
  sessionId: string | null
  currentQuestionIndex: number
  answers: WizardAnswers
  generatedBusinessMd: string | null
  generationMeta: GenerationMeta | null
  isLoading: boolean
  error: string | null
}

export interface GenerationMeta {
  lines: number
  sections: number
  generationSeconds: number
  model: string
}

export type AgentMessageType = 'standard' | 'contextual' | 'insight'

export interface AgentMessage {
  id: string
  text: string
  type: AgentMessageType
  timestamp: Date
}

export interface PricingPlan {
  id: 'starter' | 'pro' | 'business'
  name: string
  price: number
  priceLabel: string
  features: string[]
  recommended: boolean
  stripePriceId: string
  arsCount: number
  tasksPerDay: number | 'unlimited'
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface GenerateResponse {
  businessMd: string
  lines: number
  sections: number
  generationSeconds: number
  model: string
}
```

---

## ÉTAPE 9 — CLIENT OPENROUTER (lib/llm/client.ts)

```typescript
// OpenRouter est l'unique point d'entrée pour tous les LLMs.
// Il est compatible avec l'API OpenAI — on utilise fetch natif pour rester léger.

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is required')
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  max_tokens?: number
  temperature?: number
}

export interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callLLM(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  const response = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://multi.app',
      'X-Title': 'MULTI — Generative Business Platform',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${error}`)
  }

  return response.json()
}

// Modèles disponibles via OpenRouter
export const MODELS = {
  // Génération BUSINESS.md (puissant, raisonnement fort)
  GENERATION:   process.env.LLM_MODEL_GENERATION || 'anthropic/claude-sonnet-4-5',
  // Tâches légères (rapide et économique)
  LIGHT:        process.env.LLM_MODEL_LIGHT || 'anthropic/claude-haiku-4-5',
  // Fallback si les modèles Anthropic sont indisponibles
  FALLBACK:     'openai/gpt-4o-mini',
} as const
```

---

## ÉTAPE 10 — GÉNÉRATION BUSINESS.MD (lib/llm/generateBusinessMd.ts)

```typescript
import { callLLM, MODELS } from './client'
import type { WizardAnswers } from '@/lib/types'

export async function generateBusinessMd(
  answers: WizardAnswers
): Promise<{ content: string; model: string }> {
  const model = MODELS.GENERATION

  const response = await callLLM({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildPrompt(answers),
      },
    ],
  })

  const content = response.choices[0]?.message?.content ?? ''
  return { content, model: response.model }
}

function buildPrompt(answers: WizardAnswers): string {
  const sector   = answers.sector as string
  const name     = answers.name as string
  const location = answers.location as string
  const offer    = answers.offer as string
  const customer = answers.customer as string
  const revenue  = answers.revenue as string
  const channels = Array.isArray(answers.channels)
    ? (answers.channels as string[]).join(', ')
    : (answers.channels as string)
  const delegate = Array.isArray(answers.delegate)
    ? (answers.delegate as string[]).join(', ')
    : (answers.delegate as string)
  const keep     = answers.keep as string
  const goal     = answers.goal as string
  const tone     = answers.tone as string
  const autonomy = answers.autonomy as string

  return `Tu es un expert en stratégie business et en systèmes d'agents IA (ARS — Agentic Revenue Systems).
Tu dois générer un BUSINESS.md complet et hautement personnalisé pour un entrepreneur.
Ce document sera la source de vérité unique pour tous les agents IA qui opèreront son business.

## Informations de l'entrepreneur

- Secteur : ${sector}
- Nom de l'activité : ${name}
- Localisation : ${location}
- Offre exacte : ${offer}
- Client idéal : ${customer}
- Revenus actuels : ${revenue}
- Canaux d'acquisition actuels : ${channels}
- Fonctions à déléguer à l'ARS : ${delegate}
- Ce que l'Architecte garde en main : ${keep}
- Objectif revenu à 12 mois : ${goal}
- Ton de la marque : ${tone}
- Niveau d'autonomie souhaité : ${autonomy}

## Instructions de génération

Génère un document markdown structuré avec ces 10 sections.
Sois TRÈS concret, spécifique, adapté au secteur "${sector}" à "${location}".
Pas de généralités — des actions, des noms, des chiffres, des exemples réels.

## 1. IDENTITÉ BUSINESS
Nom, secteur, localisation, positionnement en une phrase percutante, ce que nous ne sommes PAS.

## 2. VALUE — L'OFFRE
Proposition de valeur détaillée, carte produit avec prix et marges estimées, jobs-to-be-done (fonctionnels, sociaux, émotionnels), douleurs adressées, gains inattendus.

## 3. ACQUISITION — COMMENT TROUVER DES CLIENTS
Tableau des canaux (statut, priorité, responsable), stratégie 90 jours en 3 phases (semaine 1-4, 5-8, 9-12), métriques cibles chiffrées.

## 4. LEVERAGE — COMMENT CONVERTIR
Process de vente étape par étape, 5+ objections avec réponses, pricing et seuils.

## 5. UPTAKE — COMMENT LIVRER LA VALEUR
Opérations humaines (avec horaires), opérations agents (liste exhaustive), standards de qualité mesurables.

## 6. ENHANCEMENT — COMMENT S'AMÉLIORER EN CONTINU
4-5 hypothèses à tester avec métriques, cycle nocturne 2h du matin, axes d'amélioration.

## 7. CIBLES PRIORITAIRES
Tier 1 grandes cibles (tableau : nom, secteur, effectif, distance, statut), Tier 2 secondaires, approche en 5 étapes.

## 8. CONTRAINTES ET LIMITES
Budget max, 7+ actions JAMAIS autorisées, escalades obligatoires, conformité RGPD.

## 9. CALENDRIER MARKETING
Événements récurrents et saisonniers avec actions marketing associées.

## 10. VOIX ET TON DE LA MARQUE
Personnalité, 4 exemples OUI et 4 NON, langue, instructions visuelles.

## Format
- Commence par "# BUSINESS.md — ${name}"
- Tableaux markdown pour les données tabulaires
- 250 à 350 lignes au total
- Spécifique à "${location}" — citer des entreprises, quartiers, lieux réels
- Pas de conclusion — c'est un document opérationnel`
}
```

---

## ÉTAPE 11 — LES 12 QUESTIONS (lib/questions.ts)

```typescript
import type { Question } from './types'

export const QUESTIONS: Question[] = [
  {
    id: 'sector', phase: 'TOI', num: '01',
    title: 'Dans quel secteur est votre activité ?',
    subtitle: 'Choisissez le plus proche. On affinera ensuite.',
    type: 'select',
    options: [
      'Restaurant / Food', 'E-commerce', 'Consulting / Coaching',
      'Services locaux (artisan, immobilier...)', 'SaaS / Produit digital',
      'Contenu / Média', 'Freelance / Indépendant', 'Autre',
    ],
    required: true, agentTrigger: true,
  },
  {
    id: 'name', phase: 'TOI', num: '02',
    title: 'Comment s\'appelle votre activité ?',
    subtitle: 'Le nom que vos clients voient.',
    type: 'text', placeholder: 'Ex: Premium Sushi, Studio Clara, DataPilot...',
    required: true, agentTrigger: false,
  },
  {
    id: 'location', phase: 'TOI', num: '03',
    title: 'Où êtes-vous basé ?',
    subtitle: 'Adresse ou ville. Important pour le ciblage et le SEO local.',
    type: 'text', placeholder: 'Ex: 400 av. Roumanille, Sophia Antipolis',
    required: true, agentTrigger: true,
  },
  {
    id: 'offer', phase: 'VOTRE OFFRE', num: '04',
    title: 'Qu\'est-ce que vous vendez exactement ?',
    subtitle: 'Décrivez votre offre en 1-2 phrases. Produits, services, prix moyen.',
    type: 'textarea', placeholder: 'Ex: Des plateaux sushi premium livrés aux entreprises. Panier moyen 18€.',
    required: true, agentTrigger: false,
  },
  {
    id: 'customer', phase: 'VOTRE OFFRE', num: '05',
    title: 'Qui est votre client idéal ?',
    subtitle: 'Pas « tout le monde ». La personne précise qui paie.',
    type: 'textarea', placeholder: 'Ex: Salariés des entreprises tech, 25-45 ans, déjeuner premium au bureau.',
    required: true, agentTrigger: false,
  },
  {
    id: 'revenue', phase: 'VOTRE OFFRE', num: '06',
    title: 'Quel est votre revenu mensuel actuel ?',
    subtitle: 'Pas de jugement. C\'est pour calibrer votre ARS.',
    type: 'select',
    options: [
      'Pas encore de revenus', 'Moins de 1 000€/mois', '1 000 — 5 000€/mois',
      '5 000 — 15 000€/mois', '15 000 — 50 000€/mois', 'Plus de 50 000€/mois',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'channels', phase: 'VOTRE ACQUISITION', num: '07',
    title: 'Comment vos clients vous trouvent aujourd\'hui ?',
    subtitle: 'Sélectionnez tous les canaux actifs.',
    type: 'tags',
    options: [
      'Bouche-à-oreille', 'Google / SEO', 'Réseaux sociaux', 'Publicité payante',
      'Prospection directe', 'Plateformes (Uber, Deliveroo...)',
      'Marchés / événements', 'Aucun pour le moment',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'delegate', phase: 'VOTRE ACQUISITION', num: '08',
    title: 'Que voulez-vous que votre ARS gère ?',
    subtitle: 'Sélectionnez tout ce que vous voulez déléguer aux agents.',
    type: 'tags',
    options: [
      'Site web', 'Réseaux sociaux', 'Publicité Google/Meta', 'Prospection clients',
      'Emails marketing', 'Support client', 'Fidélisation',
      'Standard téléphonique', 'Facturation', 'Reporting',
    ],
    required: true, agentTrigger: true,
  },
  {
    id: 'keep', phase: 'VOTRE ARS', num: '09',
    title: 'Que gardez-vous en main ?',
    subtitle: 'Ce que vous, l\'Architecte, continuez de faire.',
    type: 'textarea', placeholder: 'Ex: La cuisine et les stocks. Les relations clés.',
    required: true, agentTrigger: false,
  },
  {
    id: 'goal', phase: 'VOTRE AMBITION', num: '10',
    title: 'Quel est votre objectif de revenu mensuel à 12 mois ?',
    subtitle: 'L\'objectif que votre ARS doit vous aider à atteindre.',
    type: 'select',
    options: [
      '2 000 — 5 000€/mois', '5 000 — 10 000€/mois', '10 000 — 30 000€/mois',
      '30 000 — 100 000€/mois', 'Plus de 100 000€/mois',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'tone', phase: 'VOTRE AMBITION', num: '11',
    title: 'Comment votre marque parle à ses clients ?',
    subtitle: 'Le ton que vos agents adopteront dans toutes les communications.',
    type: 'select',
    options: [
      'Pro et sobre — on inspire confiance',
      'Chaleureux et accessible — on est un ami expert',
      'Direct et décalé — on assume notre différence',
      'Premium et exclusif — on sélectionne nos mots',
    ],
    required: true, agentTrigger: false,
  },
  {
    id: 'autonomy', phase: 'VOTRE AMBITION', num: '12',
    title: 'Quel niveau d\'autonomie pour votre ARS ?',
    subtitle: 'Vous pourrez ajuster à tout moment.',
    type: 'select',
    options: [
      'Prudent — il me demande avant chaque action importante',
      'Équilibré — il agit seul sauf pour les dépenses et contacts clients',
      'Autonome — il gère, je supervise chaque matin',
      'Full auto — il opère 24/7, je regarde les résultats',
    ],
    required: true, agentTrigger: false,
  },
]
```

---

## ÉTAPE 12 — MESSAGES AGENT (lib/agentMessages.ts)

```typescript
import type { WizardAnswers } from './types'

export const INITIAL_MESSAGE =
  "Bonjour ! Je suis votre futur agent MULTI. Pendant que vous répondez aux 12 questions, je prépare déjà votre stratégie. Commençons."

export const SECTOR_MESSAGES: Record<string, string> = {
  'Restaurant / Food': "Restaurant — excellente verticale. Je vais préparer vos skill files marketing restauration, votre séquence de prospection B2B, et votre calendrier saisonnier.",
  'E-commerce': "E-commerce — je connais bien. Je vais analyser votre marché, préparer vos séquences d'acquisition, et configurer le tracking de conversion.",
  'Consulting / Coaching': "Consulting — parfait. Je vais préparer votre stratégie de positionnement, vos séquences LinkedIn, et votre pipeline de prospection B2B.",
  'Services locaux (artisan, immobilier...)': "Services locaux — gros potentiel. Je vais travailler votre SEO local, vos avis Google, et votre prospection de quartier.",
  'SaaS / Produit digital': "SaaS — mon terrain de jeu. Je vais configurer votre acquisition digitale, votre onboarding, et vos boucles de rétention.",
  'Contenu / Média': "Contenu — intéressant. Je vais préparer votre stratégie de distribution multi-plateforme et vos mécanismes de monétisation.",
  'Freelance / Indépendant': "Freelance — je vais vous aider à passer de la vente de temps à la vente de systèmes. C'est exactement ce pour quoi MULTI est conçu.",
  'Autre': "Secteur original — j'adore. Dites-m'en plus et je m'adapte.",
}

export function getLocationMessage(location: string): string {
  const loc = location.toLowerCase()
  const matchers: [string[], string][] = [
    [['sophia', 'antipolis', 'biot', 'valbonne'],
     "Sophia Antipolis — excellent marché tech. 8 entreprises de +500 salariés dans un rayon de 5 km. Je les ajouterai à votre plan de prospection."],
    [['paris', '75'], "Paris — marché dense. Je vais identifier vos arrondissements prioritaires et zones de chalandise."],
    [['lyon', '69'],  "Lyon — belle dynamique économique. Je cartographie les zones d'activité et entreprises clés."],
    [['marseille', '13'], "Marseille — marché en forte croissance. J'analyse votre zone et identifie les opportunités."],
    [['bordeaux', '33'], "Bordeaux — écosystème dynamique. Je prépare votre stratégie locale."],
    [['toulouse', '31'], "Toulouse — hub tech et aérospatial. Je vais identifier vos cibles B2B prioritaires."],
    [['nantes', '44'],   "Nantes — marché attractif en croissance. Je cartographie les opportunités de votre zone."],
    [['lille', '59'],    "Lille — carrefour économique franco-belge. Excellent potentiel B2B que j'analyse."],
  ]
  for (const [keywords, message] of matchers) {
    if (keywords.some(kw => loc.includes(kw))) return message
  }
  return "Je note votre localisation. Je vais analyser votre zone de chalandise et identifier les opportunités locales."
}

export function getDelegateMessage(delegated: string[]): string {
  const count = delegated.length
  const agents: string[] = []
  if (delegated.some(d => ['Réseaux sociaux', 'Publicité Google/Meta', 'Prospection clients', 'Emails marketing', 'Fidélisation'].includes(d)))
    agents.push('un agent Marketing')
  if (delegated.some(d => ['Site web', 'Facturation', 'Reporting'].includes(d)))
    agents.push('un agent Engineering')
  if (delegated.some(d => ['Support client', 'Standard téléphonique'].includes(d)))
    agents.push('un agent Support')

  const agentList = agents.length === 0 ? 'les agents nécessaires'
    : agents.length === 1 ? agents[0]
    : agents.slice(0, -1).join(', ') + ' et ' + agents[agents.length - 1]

  return `${count} fonction${count > 1 ? 's' : ''} déléguée${count > 1 ? 's' : ''}. Je vais configurer ${agentList}. Votre premier cycle nocturne démarrera cette nuit à 2h.`
}

export function getAgentMessage(
  questionId: string,
  answer: string | string[],
  _answers: WizardAnswers
): string | null {
  switch (questionId) {
    case 'sector':   return SECTOR_MESSAGES[answer as string] ?? SECTOR_MESSAGES['Autre']
    case 'location': return getLocationMessage(answer as string)
    case 'delegate': return getDelegateMessage(Array.isArray(answer) ? answer : [answer])
    default:         return null
  }
}
```

---

## ÉTAPE 13 — HOOK WIZARD (hooks/useWizard.ts)

```typescript
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { QUESTIONS } from '@/lib/questions'
import type { WizardState, WizardAnswers } from '@/lib/types'

const INITIAL_STATE: WizardState = {
  step: 'wizard',
  sessionId: null,
  currentQuestionIndex: 0,
  answers: {},
  generatedBusinessMd: null,
  generationMeta: null,
  isLoading: false,
  error: null,
}

export function useWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const startTimeRef = useRef<number | null>(null)

  // Créer la session au montage
  useEffect(() => {
    fetch('/api/wizard/session', { method: 'POST' })
      .then(r => r.json())
      .then(({ sessionId }) => {
        startTimeRef.current = Date.now()
        setState(s => ({ ...s, sessionId }))
      })
      .catch(console.error)
  }, [])

  const setAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setState(s => ({
      ...s,
      answers: { ...s.answers, [questionId]: answer },
    }))
    // Persister en arrière-plan
    setState(s => {
      if (s.sessionId) {
        fetch('/api/wizard/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: s.sessionId, questionId, answer }),
        }).catch(console.error)
      }
      return s
    })
  }, [])

  const goToNext = useCallback(() => {
    setState(s => s.currentQuestionIndex < QUESTIONS.length - 1
      ? { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 }
      : s
    )
  }, [])

  const goToPrev = useCallback(() => {
    setState(s => s.currentQuestionIndex > 0
      ? { ...s, currentQuestionIndex: s.currentQuestionIndex - 1 }
      : s
    )
  }, [])

  const generate = useCallback(async () => {
    setState(s => ({ ...s, step: 'generating', isLoading: true, error: null }))
    const MIN_MS = 3500
    const t0 = Date.now()

    try {
      const sessionId = state.sessionId
      const res = await fetch('/api/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()

      const remaining = Math.max(0, MIN_MS - (Date.now() - t0))
      await new Promise(r => setTimeout(r, remaining))

      setState(s => ({
        ...s,
        step: 'result',
        isLoading: false,
        generatedBusinessMd: data.businessMd,
        generationMeta: {
          lines: data.lines,
          sections: data.sections,
          generationSeconds: data.generationSeconds,
          model: data.model,
        },
      }))
    } catch {
      setState(s => ({
        ...s, step: 'wizard', isLoading: false,
        error: 'La génération a échoué. Réessayez.',
      }))
    }
  }, [state.sessionId])

  const currentQuestion = QUESTIONS[state.currentQuestionIndex]
  const currentAnswer   = currentQuestion ? state.answers[currentQuestion.id] : undefined
  const isAnswered      = Boolean(
    currentAnswer && (Array.isArray(currentAnswer)
      ? currentAnswer.length > 0
      : (currentAnswer as string).trim().length > 0)
  )
  const isLastQuestion  = state.currentQuestionIndex === QUESTIONS.length - 1
  const completedIndices = QUESTIONS
    .map((q, i) => state.answers[q.id] !== undefined ? i : null)
    .filter((i): i is number => i !== null)

  return {
    state, currentQuestion, currentAnswer,
    isAnswered, isLastQuestion, completedIndices,
    setAnswer, goToNext, goToPrev, generate,
  }
}
```

---

## ÉTAPE 14 — ROUTES API

### POST /api/wizard/session

```typescript
// app/api/wizard/session/route.ts
import { NextResponse } from 'next/server'
import { db, wizardSessions } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

export async function POST() {
  try {
    const { userId: clerkId } = await auth()
    let userId: string | null = null
    if (clerkId) {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, clerkId),
      })
      userId = user?.id ?? null
    }
    const [session] = await db
      .insert(wizardSessions)
      .values({ userId })
      .returning({ id: wizardSessions.id })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('[wizard/session]', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
```

### POST /api/wizard/answer

```typescript
// app/api/wizard/answer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db, wizardSessions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  sessionId:  z.string().uuid(),
  questionId: z.string(),
  answer:     z.union([z.string(), z.array(z.string())]),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, body.sessionId),
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const updatedAnswers = { ...(session.answers ?? {}), [body.questionId]: body.answer }
    await db.update(wizardSessions)
      .set({ answers: updatedAnswers, lastQuestionId: body.questionId, updatedAt: new Date() })
      .where(eq(wizardSessions.id, body.sessionId))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 })
    console.error('[wizard/answer]', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
}
```

### POST /api/wizard/complete

```typescript
// app/api/wizard/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db, wizardSessions, businessDocs } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { generateBusinessMd } from '@/lib/llm/generateBusinessMd'
import { z } from 'zod'

const schema = z.object({ sessionId: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    })
    if (!session?.answers) {
      return NextResponse.json({ error: 'Session not found or incomplete' }, { status: 404 })
    }

    const t0 = Date.now()
    const { content, model } = await generateBusinessMd(session.answers)
    const generationSeconds = Math.round((Date.now() - t0) / 1000)
    const lines    = content.split('\n').length
    const sections = (content.match(/^## /gm) || []).length

    await db.update(wizardSessions)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(eq(wizardSessions.id, sessionId))

    // Si connecté, persister en DB
    const { userId: clerkId } = await auth()
    if (clerkId) {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, clerkId),
      })
      if (user) {
        await db.insert(businessDocs).values({
          userId: user.id, sessionId, content, lineCount: lines,
          sectionCount: sections, sector: session.answers.sector as string,
          businessName: session.answers.name as string,
          generatedByModel: model, generationSeconds,
        })
      }
    }

    return NextResponse.json({ businessMd: content, lines, sections, generationSeconds, model })
  } catch (error) {
    console.error('[wizard/complete]', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

### POST /api/wizard/save-email

```typescript
// app/api/wizard/save-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db, leads, wizardSessions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  sessionId: z.string().uuid(),
  email:     z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const { sessionId, email } = schema.parse(await req.json())
    const session = await db.query.wizardSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    })

    await db.insert(leads).values({
      email, sessionId,
      sector:       session?.answers?.sector as string,
      businessName: session?.answers?.name   as string,
    })
    await db.update(wizardSessions)
      .set({ email, emailCapturedAt: new Date() })
      .where(eq(wizardSessions.id, sessionId))

    // TODO: envoyer le BUSINESS.md par email via Postmark
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 })
    console.error('[wizard/save-email]', error)
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
  }
}
```

---

## ÉTAPE 15 — PLANS TARIFAIRES (lib/stripe/plans.ts)

```typescript
import type { PricingPlan } from '@/lib/types'

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter', name: 'STARTER', price: 79, priceLabel: '79€/mois',
    arsCount: 1, tasksPerDay: 20, recommended: false,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    features: ['1 ARS', '20 tâches/jour', 'Templates généralistes', 'Support communauté'],
  },
  {
    id: 'pro', name: 'PRO', price: 199, priceLabel: '199€/mois',
    arsCount: 1, tasksPerDay: 50, recommended: true,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    features: [
      '1 ARS', '50 tâches/jour', 'Templates sectoriels (5 verticales)',
      'Quality gates avancés', 'LLMs premium', 'Onboarding guidé 7 jours',
      'Support prioritaire',
    ],
  },
  {
    id: 'business', name: 'BUSINESS', price: 499, priceLabel: '499€/mois',
    arsCount: 3, tasksPerDay: 'unlimited', recommended: false,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? '',
    features: [
      '3 ARS', 'Tâches illimitées', 'Templates custom',
      'Quality gates custom', 'Coaching mensuel',
    ],
  },
]
```

---

## ÉTAPE 16 — WEBHOOK STRIPE (app/api/stripe/webhook/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const getPlan = (priceId: string) => {
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID)  return 'starter' as const
    if (priceId === process.env.STRIPE_PRO_PRICE_ID)      return 'pro' as const
    if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business' as const
    return null
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const plan = getPlan(sub.items.data[0]?.price.id)
      await db.update(users).set({
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status as any,
        plan: plan ?? undefined,
        subscriptionCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
        updatedAt: new Date(),
      }).where(eq(users.stripeCustomerId, sub.customer as string))
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(users).set({
        subscriptionStatus: 'canceled', plan: undefined, updatedAt: new Date(),
      }).where(eq(users.stripeSubscriptionId, sub.id))
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## ORDRE D'IMPLÉMENTATION

### Lot 1 — Infrastructure (J1)
1. `create-next-app` + toutes les dépendances
2. `tailwind.config.ts` avec le design system complet
3. `.env.local` avec toutes les clés (vraies ou placeholder)
4. `lib/db/schema.ts` + `lib/db/index.ts` + `drizzle.config.ts`
5. `npm run db:push` pour créer les tables
6. `middleware.ts` Clerk
7. `lib/types.ts`
8. `app/layout.tsx` avec Clerk + PostHog
9. ✅ Test : `npm run dev` sans erreur, `npm run db:studio` montre les tables

### Lot 2 — Wizard UI (J2-J3)
1. `lib/questions.ts` + `lib/agentMessages.ts`
2. Composants UI de base : `Button`, `Input`, `Textarea`, `ProgressBar`
3. `hooks/useWizard.ts`
4. `components/wizard/answers/` : 4 types
5. `components/wizard/Wizard.tsx` + `WizardQuestion.tsx` + `WizardNavigation.tsx`
6. `components/Header.tsx`
7. `app/page.tsx` assemblant tout
8. ✅ Test : naviguer les 12 questions, auto-advance sur select, raccourcis clavier

### Lot 3 — Persistance + Agent (J3-J4)
1. Routes API : `/session`, `/answer`
2. Intégration persistance dans `useWizard`
3. `components/agent/AgentSidebar.tsx` + `AgentMessage.tsx`
4. `components/agent/BusinessMdPreview.tsx`
5. ✅ Test : vérifier en DB (Drizzle Studio) que les réponses sont sauvegardées

### Lot 4 — Génération + Résultat (J4-J6)
1. `lib/llm/client.ts` (OpenRouter) + `lib/llm/generateBusinessMd.ts`
2. Route `/api/wizard/complete`
3. `components/wizard/GenerationScreen.tsx`
4. `components/result/ResultScreen.tsx` + `BusinessMdDisplay.tsx`
5. `lib/stripe/plans.ts` + `components/result/PricingCards.tsx`
6. `components/result/EmailCapture.tsx` + route `/save-email`
7. `components/FAQ.tsx`
8. ✅ Test : compléter wizard → voir BUSINESS.md généré par Claude via OpenRouter

### Lot 5 — Auth + Dashboard (J6-J8)
1. Pages Clerk sign-in / sign-up
2. Route `/api/stripe/checkout` + webhook
3. `app/(dashboard)/layout.tsx` (layout 3 colonnes)
4. `app/(dashboard)/dashboard/page.tsx` (version minimale)
5. `app/(dashboard)/business-md/page.tsx`
6. ✅ Test : créer compte → souscrire en mode test Stripe → accéder au dashboard

---

## RÈGLES ABSOLUES POUR CLAUDE CODE

1. **OpenRouter est le seul client LLM.** Ne jamais instancier `@anthropic-ai/sdk`
   directement. Tout passe par `lib/llm/client.ts` qui appelle OpenRouter.
   Le modèle `anthropic/claude-sonnet-4-5` est accessible via OpenRouter.

2. **Zod sur toutes les entrées API.** Chaque route valide son body avec Zod avant
   tout accès DB. Retourner 400 avec les erreurs de validation, jamais 500.

3. **Pas de `any` TypeScript.** Utiliser uniquement les types de `lib/types.ts`.
   Ajouter les types manquants dans ce fichier avant de les utiliser.

4. **Try/catch systématique.** Chaque appel async est protégé. Les erreurs sont
   loggées avec `console.error('[endpoint]', error)` et remontent en 500.

5. **Le wizard fonctionne sans compte.** Auth optionnelle pendant le wizard.
   `userId` est nullable dans `wizardSessions`. Le compte est créé à la souscription.

6. **Variables d'environnement vérifiées.** Dans chaque fichier client (`lib/llm/`,
   `lib/db/`, `lib/stripe/`), vérifier que les variables requises existent au
   chargement du module.

7. **Mobile-first.** CSS mobile par défaut, desktop avec `md:` et `lg:`.

8. **Commits après chaque composant.** Format : `feat(wizard): add SelectAnswer component`

---

*Document de référence pour le développement production MULTI — v2.0*
*Tout appel LLM passe par OpenRouter avec le modèle anthropic/claude-sonnet-4-5.*
*Architecture scalable, production-ready, buildable.*
*Modifications structurelles validées par Julien (Chief Research).*
