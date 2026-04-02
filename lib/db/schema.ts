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
  email:                       varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:                varchar('password_hash', { length: 255 }).notNull(),
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
  regeneratingAt:      timestamp('regenerating_at'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
})

// ─── BUSINESS DOC VERSIONS ──────────────────────────────────────────────────

export const businessDocVersions = pgTable('business_doc_versions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  docId:      uuid('doc_id').references(() => businessDocs.id).notNull(),
  content:    text('content').notNull(),
  version:    integer('version').notNull(),
  lineCount:  integer('line_count'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
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

// ─── ACTION VALIDATIONS ────────────────────────────────────────────────────

export const actionStatusEnum = pgEnum('action_status', [
  'pending', 'approved', 'modified', 'rejected',
])

export const actionValidations = pgTable('action_validations', {
  id:          uuid('id').primaryKey().defaultRandom(),
  arsId:       uuid('ars_id').references(() => ars.id).notNull(),
  userId:      uuid('user_id').references(() => users.id).notNull(),
  actionType:  varchar('action_type', { length: 100 }).notNull(),
  description: text('description').notNull(),
  status:      actionStatusEnum('status').default('pending').notNull(),
  agentSource: varchar('agent_source', { length: 50 }),
  output:      text('output'),
  decidedAt:   timestamp('decided_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── OPENCLAW INSTANCES ─────────────────────────────────────────────────────

export const openclawStatusEnum = pgEnum('openclaw_status', [
  'provisioning', 'running', 'stopped', 'error',
])

export const openclawInstances = pgTable('openclaw_instances', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').references(() => users.id).notNull().unique(),
  containerId:   varchar('container_id', { length: 100 }),
  containerName: varchar('container_name', { length: 100 }).notNull(),
  port:          integer('port').notNull(),
  gatewayToken:  varchar('gateway_token', { length: 255 }).notNull(),
  status:        openclawStatusEnum('status').default('provisioning').notNull(),
  autoApprove:   boolean('auto_approve').default(false).notNull(),
  lastError:     text('last_error'),
  lastHealthAt:  timestamp('last_health_at'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
})

// ─── CHAT MESSAGES ──────────────────────────────────────────────────────────

export const chatMessages = pgTable('chat_messages', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').references(() => users.id).notNull(),
  role:       varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'tool'
  content:    text('content').notNull(),
  metadata:   jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
})

// ─── TOOL APPROVALS ─────────────────────────────────────────────────────────

export const toolApprovalEnum = pgEnum('tool_approval_decision', [
  'pending', 'allow-once', 'allow-always', 'deny',
])

export const toolApprovals = pgTable('tool_approvals', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').references(() => users.id).notNull(),
  openclawId:    varchar('openclaw_id', { length: 255 }).notNull(), // approval ID from OpenClaw
  toolType:      varchar('tool_type', { length: 20 }).notNull(), // 'exec' | 'plugin'
  command:       text('command'),
  title:         text('title'),
  description:   text('description'),
  decision:      toolApprovalEnum('decision').default('pending').notNull(),
  decidedAt:     timestamp('decided_at'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
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
export type AnalyticsEvent    = typeof analyticsEvents.$inferSelect
export type ActionValidation  = typeof actionValidations.$inferSelect
export type OpenclawInstance  = typeof openclawInstances.$inferSelect
export type ChatMessage       = typeof chatMessages.$inferSelect
export type ToolApproval      = typeof toolApprovals.$inferSelect
