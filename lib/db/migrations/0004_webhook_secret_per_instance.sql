-- Secret webhook unique par instance OpenClaw.
-- Remplace l'ancien OPENCLAW_WEBHOOK_SECRET partagé entre tous les containers.
-- Le webhook /api/agents/webhook résout businessId depuis ce token (et non
-- depuis le containerName fourni par le client).

ALTER TABLE "openclaw_instances" ADD COLUMN "webhook_secret" varchar(255);

-- Backfill : token aléatoire 32 bytes (hex) pour chaque instance existante.
-- gen_random_bytes nécessite pgcrypto (disponible par défaut sur Neon + Postgres 16).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE "openclaw_instances"
   SET "webhook_secret" = encode(gen_random_bytes(32), 'hex')
 WHERE "webhook_secret" IS NULL;

ALTER TABLE "openclaw_instances" ALTER COLUMN "webhook_secret" SET NOT NULL;
ALTER TABLE "openclaw_instances" ADD CONSTRAINT "openclaw_instances_webhook_secret_unique" UNIQUE ("webhook_secret");
