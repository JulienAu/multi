-- Migration B2B light : 1 user → N businesses
-- - Nouvelle table `businesses` avec les colonnes billing qui étaient sur `users`
-- - Ajout `business_id` sur les tables scopées business
-- - Backfill : chaque user existant reçoit 1 business "default"
-- - Drop des colonnes billing de `users` et des `user_id` redondants

-- ─── 1. Nouvelle enum + table businesses ────────────────────────────────────

CREATE TYPE "public"."business_status" AS ENUM('active', 'paused', 'archived');

CREATE TABLE "businesses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "name" varchar(255) NOT NULL,
  "status" "business_status" DEFAULT 'active' NOT NULL,
  "plan" "plan",
  "stripe_subscription_id" varchar(255) UNIQUE,
  "subscription_status" "subscription_status",
  "subscription_current_period_end" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ─── 2. Backfill : 1 business "default" par user existant ───────────────────

INSERT INTO "businesses" (
  "user_id", "name", "plan", "stripe_subscription_id",
  "subscription_status", "subscription_current_period_end",
  "created_at", "updated_at"
)
SELECT
  "id",
  COALESCE("first_name" || E'\'s business', 'Mon business'),
  "plan",
  "stripe_subscription_id",
  "subscription_status",
  "subscription_current_period_end",
  "created_at",
  "updated_at"
FROM "users";

-- ─── 3. Ajout business_id sur les tables scopées (nullable pour backfill) ──

ALTER TABLE "wizard_sessions"    ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "business_docs"      ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "ars"                ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "action_validations" ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "openclaw_instances" ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "conversations"      ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "chat_messages"      ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "tool_approvals"     ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "agent_jobs"         ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "agent_job_runs"     ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "llm_usage"          ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");
ALTER TABLE "analytics_events"   ADD COLUMN "business_id" uuid REFERENCES "businesses"("id");

-- ─── 4. Backfill business_id = business par défaut du user ─────────────────
-- (on prend le premier business créé par user, qui est celui backfillé ci-dessus)

UPDATE "wizard_sessions" ws
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = ws."user_id" ORDER BY b."created_at" LIMIT 1)
 WHERE ws."user_id" IS NOT NULL;

UPDATE "business_docs" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "ars" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "action_validations" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "openclaw_instances" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "conversations" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "chat_messages" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "tool_approvals" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "agent_jobs" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "agent_job_runs" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

UPDATE "llm_usage" t
   SET "business_id" = (SELECT "id" FROM "businesses" b WHERE b."user_id" = t."user_id" ORDER BY b."created_at" LIMIT 1);

-- analytics_events.business_id reste nullable (events anon possibles)

-- ─── 5. NOT NULL sur les business_id obligatoires ──────────────────────────

ALTER TABLE "business_docs"      ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "ars"                ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "action_validations" ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "openclaw_instances" ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "conversations"      ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "chat_messages"      ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "tool_approvals"     ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "agent_jobs"         ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "agent_job_runs"     ALTER COLUMN "business_id" SET NOT NULL;
ALTER TABLE "llm_usage"          ALTER COLUMN "business_id" SET NOT NULL;

-- ─── 6. UNIQUE sur openclaw_instances.business_id (remplace user_id unique) ─

ALTER TABLE "openclaw_instances" DROP CONSTRAINT IF EXISTS "openclaw_instances_user_id_unique";
ALTER TABLE "openclaw_instances" ADD CONSTRAINT "openclaw_instances_business_id_unique" UNIQUE ("business_id");

-- ─── 7. Drop user_id des tables où il devient redondant ────────────────────
-- (garde sur : users, leads, wizard_sessions, action_validations, analytics_events)

ALTER TABLE "business_docs"      DROP COLUMN "user_id";
ALTER TABLE "ars"                DROP COLUMN "user_id";
ALTER TABLE "openclaw_instances" DROP COLUMN "user_id";
ALTER TABLE "conversations"      DROP COLUMN "user_id";
ALTER TABLE "chat_messages"      DROP COLUMN "user_id";
ALTER TABLE "tool_approvals"     DROP COLUMN "user_id";
ALTER TABLE "agent_jobs"         DROP COLUMN "user_id";
ALTER TABLE "agent_job_runs"     DROP COLUMN "user_id";
ALTER TABLE "llm_usage"          DROP COLUMN "user_id";

-- ─── 8. Drop colonnes billing de users (déplacées sur businesses) ──────────

ALTER TABLE "users" DROP COLUMN "plan";
ALTER TABLE "users" DROP COLUMN "stripe_subscription_id";
ALTER TABLE "users" DROP COLUMN "subscription_status";
ALTER TABLE "users" DROP COLUMN "subscription_current_period_end";
