-- Up Migration

ALTER TABLE "notifications"
ADD COLUMN "notification_created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Down Migration

ALTER TABLE "notifications"
DROP COLUMN "notification_created_at";