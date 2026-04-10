CREATE TYPE "public"."agent_job_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed', 'pending_approval', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "agent_job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"output" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openclaw_cron_id" varchar(100),
	"name" varchar(255) NOT NULL,
	"icon" varchar(10) DEFAULT '🤖' NOT NULL,
	"description" text NOT NULL,
	"schedule" varchar(100) NOT NULL,
	"schedule_human" varchar(255),
	"timezone" varchar(50) DEFAULT 'Europe/Paris' NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"status" "agent_job_status" DEFAULT 'active' NOT NULL,
	"template_id" varchar(50),
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_job_runs" ADD CONSTRAINT "agent_job_runs_job_id_agent_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_job_runs" ADD CONSTRAINT "agent_job_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;