-- No legacy architectural data is deleted. NULL identifies untrusted pre-DWG floor shapes.
ALTER TABLE "FloorPlan" ADD COLUMN IF NOT EXISTS "sourceFileSha256" VARCHAR(64);
