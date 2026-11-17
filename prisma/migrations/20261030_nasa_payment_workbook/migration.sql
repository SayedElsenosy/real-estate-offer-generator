-- Additive migration: NASA payment workbook financial rules.
-- No existing plan values are changed by this migration.
ALTER TABLE "PaymentPlan"
  ADD COLUMN IF NOT EXISTS "discountPct" DECIMAL(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "secondDownPaymentPct" DECIMAL(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "secondDownOffsetMonths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quarterlyEndAtTerm" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "ordinaryInstallmentRebate" DECIMAL(12,2) NOT NULL DEFAULT 0;
