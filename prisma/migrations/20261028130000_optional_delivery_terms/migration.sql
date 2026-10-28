-- Additional payment plan settings; existing plans remain unchanged.
ALTER TABLE "PaymentPlan"
  ADD COLUMN IF NOT EXISTS "deliveryDate" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "deliveryCollectionEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "deliveryCollectionPct" DECIMAL(7,4) NOT NULL DEFAULT 0;
