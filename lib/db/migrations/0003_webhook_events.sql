-- Idempotency table for webhooks (Stripe, OpenClaw, ...)

CREATE TABLE "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(50) NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "webhook_events_provider_external_idx"
  ON "webhook_events" ("provider", "external_id");
