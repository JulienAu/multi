-- ARS Coach: tables pour le coach conversationnel du livre ARS.
-- Sessions anonymes (pré-activation) puis liées à un email (activation).

CREATE TABLE "ars_coach_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255),
  "message_count" integer NOT NULL DEFAULT 0,
  "quadrant" varchar(50),
  "level" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ars_coach_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL REFERENCES "ars_coach_sessions"("id"),
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Permettre aux futurs utilisateurs ARS Coach de migrer vers MULTI sans password initial.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
