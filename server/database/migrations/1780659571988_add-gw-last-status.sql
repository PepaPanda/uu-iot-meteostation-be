-- Up Migration

CREATE TYPE "gateway_status" AS ENUM (
  'online',
  'offline',
  'unknown'
);

ALTER TABLE "gateways"
ADD COLUMN "gateway_last_status" "gateway_status" NOT NULL DEFAULT 'unknown';

-- Down Migration

ALTER TABLE "gateways"
DROP COLUMN "gateway_last_status";

DROP TYPE "gateway_status";