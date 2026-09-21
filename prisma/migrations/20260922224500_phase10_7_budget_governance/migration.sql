-- Phase 10.7: idempotent budget reservation.
ALTER TABLE "CostReservation"
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "CostReservation"
SET "idempotencyKey" = "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "CostReservation"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "CostReservation_workspaceId_idempotencyKey_key"
  ON "CostReservation"("workspaceId","idempotencyKey");
