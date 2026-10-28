-- Preserve all current plans as monthly by default.
ALTER TABLE "PaymentPlan" ADD COLUMN IF NOT EXISTS "installmentIntervalMonths" INTEGER NOT NULL DEFAULT 1;
