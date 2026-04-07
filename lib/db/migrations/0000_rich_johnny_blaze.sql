CREATE TYPE "public"."action_status" AS ENUM('pending', 'approved', 'modified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ars_status" AS ENUM('generating', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."llm_purpose" AS ENUM('generation', 'light', 'agent', 'fallback');--> statement-breakpoint
CREATE TYPE "public"."openclaw_status" AS ENUM('provisioning', 'running', 'stopped', 'error');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('starter', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."tool_approval_decision" AS ENUM('pending', 'allow-once', 'allow-always', 'deny');--> statement-breakpoint
CREATE TABLE "action_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ars_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"agent_source" varchar(50),
	"output" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"event" varchar(100) NOT NULL,
	"properties" jsonb,
	"device" varchar(20),
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_doc_id" uuid,
	"name" varchar(255) NOT NULL,
	"status" "ars_status" DEFAULT 'active' NOT NULL,
	"autonomy_level" varchar(50),
	"delegated_functions" jsonb,
	"scorecard_data" jsonb,
	"last_nightly_cycle_at" timestamp,
	"next_nightly_cycle_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_doc_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"content" text NOT NULL,
	"version" integer NOT NULL,
	"line_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"line_count" integer,
	"section_count" integer,
	"sector" varchar(100),
	"business_name" varchar(255),
	"generated_by_model" varchar(100),
	"generation_seconds" integer,
	"regenerating_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"session_id" uuid,
	"source" varchar(50) DEFAULT 'wizard_email_capture',
	"sector" varchar(100),
	"business_name" varchar(255),
	"business_md_email_sent_at" timestamp,
	"converted_to_user_id" uuid,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model" varchar(255) NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"estimated_cost_usd" varchar(20),
	"endpoint" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" "plan" NOT NULL,
	"purpose" "llm_purpose" NOT NULL,
	"model" varchar(255) NOT NULL,
	"max_tokens_per_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openclaw_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"container_id" varchar(100),
	"container_name" varchar(100) NOT NULL,
	"port" integer NOT NULL,
	"preview_port" integer,
	"gateway_token" varchar(255) NOT NULL,
	"status" "openclaw_status" DEFAULT 'provisioning' NOT NULL,
	"auto_approve" boolean DEFAULT false NOT NULL,
	"last_error" text,
	"last_health_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "openclaw_instances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tool_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openclaw_id" varchar(255) NOT NULL,
	"tool_type" varchar(20) NOT NULL,
	"command" text,
	"title" text,
	"description" text,
	"decision" "tool_approval_decision" DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"plan" "plan",
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"subscription_status" "subscription_status",
	"subscription_current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "wizard_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"answers" jsonb,
	"last_question_id" varchar(50),
	"completed_at" timestamp,
	"converted_at" timestamp,
	"email_captured_at" timestamp,
	"email" varchar(255),
	"time_to_complete_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_validations" ADD CONSTRAINT "action_validations_ars_id_ars_id_fk" FOREIGN KEY ("ars_id") REFERENCES "public"."ars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_validations" ADD CONSTRAINT "action_validations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_wizard_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."wizard_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ars" ADD CONSTRAINT "ars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ars" ADD CONSTRAINT "ars_business_doc_id_business_docs_id_fk" FOREIGN KEY ("business_doc_id") REFERENCES "public"."business_docs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_doc_versions" ADD CONSTRAINT "business_doc_versions_doc_id_business_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."business_docs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_docs" ADD CONSTRAINT "business_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_docs" ADD CONSTRAINT "business_docs_session_id_wizard_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."wizard_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_session_id_wizard_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."wizard_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_user_id_users_id_fk" FOREIGN KEY ("converted_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openclaw_instances" ADD CONSTRAINT "openclaw_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_approvals" ADD CONSTRAINT "tool_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_sessions" ADD CONSTRAINT "wizard_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;