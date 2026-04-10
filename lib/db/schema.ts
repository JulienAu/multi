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
  previewPort:   integer('preview_port'),
  gatewayToken:  varchar('gateway_token', { length: 255 }).notNull(),
  status:        openclawStatusEnum('status').default('provisioning').notNull(),
  autoApprove:   boolean('auto_approve').default(false).notNull(),
  lastError:     text('last_error'),
  lastHealthAt:  timestamp('last_health_at'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
})

// ─── CONVERSATIONS ──────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').references(() => users.id).notNull(),
  title:      varchar('title', { length: 255 }).notNull(),
  lastMessageAt: timestamp('last_message_at'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
})

// ─── CHAT MESSAGES ──────────────────────────────────────────────────────────

export const chatMessages = pgTable('chat_messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').references(() => users.id).notNull(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  role:           varchar('role', { length: 20 }).notNull(),
  content:        text('content').notNull(),
  metadata:       jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
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

// ─── AGENT JOBS ────────────────────────────────────────────────────────────

export const agentJobStatusEnum = pgEnum('agent_job_status', [
  'active', 'paused', 'archived',
])

export const agentJobs = pgTable('agent_jobs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').references(() => users.id).notNull(),
  openclawCronId:   varchar('openclaw_cron_id', { length: 100 }),
  name:             varchar('name', { length: 255 }).notNull(),
  icon:             varchar('icon', { length: 10 }).default('🤖').notNull(),
  description:      text('description').notNull(),
  schedule:         varchar('schedule', { length: 100 }).notNull(),
  scheduleHuman:    varchar('schedule_human', { length: 255 }),
  timezone:         varchar('timezone', { length: 50 }).default('Europe/Paris').notNull(),
  requiresApproval: boolean('requires_approval').default(true).notNull(),
  status:           agentJobStatusEnum('status').default('active').notNull(),
  templateId:       varchar('template_id', { length: 50 }),
  lastRunAt:        timestamp('last_run_at'),
  nextRunAt:        timestamp('next_run_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
})

export const agentRunStatusEnum = pgEnum('agent_run_status', [
  'running', 'completed', 'failed', 'pending_approval', 'approved', 'rejected',
])

export const agentJobRuns = pgTable('agent_job_runs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  jobId:       uuid('job_id').references(() => agentJobs.id).notNull(),
  userId:      uuid('user_id').references(() => users.id).notNull(),
  status:      agentRunStatusEnum('status').default('running').notNull(),
  output:      text('output'),
  startedAt:   timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── LLM MODEL CONFIG ──────────────────────────────────────────────────────

export const llmPurposeEnum = pgEnum('llm_purpose', [
  'generation', 'light', 'agent', 'fallback',
])

export const modelConfigs = pgTable('model_configs', {
  id:              uuid('id').primaryKey().defaultRandom(),
  plan:            planEnum('plan').notNull(),
  purpose:         llmPurposeEnum('purpose').notNull(),
  model:           varchar('model', { length: 255 }).notNull(),
  maxTokensPerDay: integer('max_tokens_per_day'),
  isActive:        boolean('is_active').default(true).notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
})

// ─── LLM USAGE ─────────────────────────────────────────────────────────────

export const llmUsage = pgTable('llm_usage', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').references(() => users.id).notNull(),
  model:            varchar('model', { length: 255 }).notNull(),
  promptTokens:     integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  estimatedCostUsd: varchar('estimated_cost_usd', { length: 20 }),
  endpoint:         varchar('endpoint', { length: 50 }).notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
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
export type Conversation       = typeof conversations.$inferSelect
export type ChatMessage       = typeof chatMessages.$inferSelect
export type ToolApproval      = typeof toolApprovals.$inferSelect
export type ModelConfig       = typeof modelConfigs.$inferSelect
export type LlmUsage          = typeof llmUsage.$inferSelect
export type AgentJob          = typeof agentJobs.$inferSelect
export type AgentJobRun       = typeof agentJobRuns.$inferSelect
