-- Additive, non-destructive migration. Preserve original deliveryDate for audit/backward compatibility.
ALTER TABLE "PaymentPlan" ADD COLUMN IF NOT EXISTS "deliveryMonths" INTEGER;
-- Backfill legacy calendar delivery dates once using the current calendar
-- month so existing Cairo Plaza / Aqmar configurations retain an approximate
-- planned delivery offset until updated by an administrator.
UPDATE "PaymentPlan"
SET "deliveryMonths" = LEAST(months - 1, GREATEST(2,
  ((EXTRACT(YEAR FROM age("deliveryDate"::date, CURRENT_DATE)) * 12) +
    EXTRACT(MONTH FROM age("deliveryDate"::date, CURRENT_DATE)))::integer
))
WHERE "deliveryMonths" IS NULL
  AND "deliveryCollectionEnabled" = TRUE
  AND  "deliveryDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}
  AND months > 2;

  AND months > 2;
