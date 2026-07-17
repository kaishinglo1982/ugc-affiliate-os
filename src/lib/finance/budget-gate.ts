import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

export type BudgetPeriod = "daily" | "weekly" | "monthly";
export type BudgetPolicyAction = "alert" | "block";
export type CostReservationStatus = "RESERVED" | "CONSUMED" | "RELEASED" | "EXPIRED";

export class BudgetPolicyNotFoundError extends Error {
  constructor(policyId: string) {
    super(`Budget policy ${policyId} not found or disabled.`);
    this.name = "BudgetPolicyNotFoundError";
  }
}

export class UnsupportedBudgetPeriodError extends Error {
  constructor(period: string) {
    super(`Budget period "${period}" is not supported. Use "daily", "weekly", or "monthly".`);
    this.name = "UnsupportedBudgetPeriodError";
  }
}

export class BudgetExceededError extends Error {
  constructor(
    public readonly policyId: string,
    public readonly limitAmount: number,
    public readonly projectedAmount: number,
  ) {
    super(
      `Budget policy ${policyId} would be exceeded: projected ${projectedAmount} > limit ${limitAmount}.`,
    );
    this.name = "BudgetExceededError";
  }
}

export class CostReservationNotFoundError extends Error {
  constructor(reservationId: string) {
    super(`Cost reservation ${reservationId} not found.`);
    this.name = "CostReservationNotFoundError";
  }
}

export class CostReservationNotReservedError extends Error {
  constructor(reservationId: string, status: string) {
    super(`Cost reservation ${reservationId} is "${status}", not "RESERVED".`);
    this.name = "CostReservationNotReservedError";
  }
}

export interface CostReservationRecord {
  id: string;
  workspaceId: string;
  policyId: string;
  ownerType: string;
  ownerId: string;
  amount: number;
  currency: string;
  status: CostReservationStatus;
  expiresAt: Date | null;
}

export interface ReserveBudgetInput {
  workspaceId: string;
  policyId: string;
  ownerType: string;
  ownerId: string;
  amount: number;
  ttlMs?: number;
  now?: Date;
}

export interface ReserveBudgetResult {
  reservation: CostReservationRecord;
  /** True once the period's reserved+consumed total reaches the policy's alert threshold. */
  overThreshold: boolean;
}

export interface ConsumeReservationInput {
  workspaceId: string;
  reservationId: string;
  /** Reconciled actual cost; defaults to the reserved amount when omitted. */
  actualAmount?: number;
  now?: Date;
}

export interface ReleaseReservationInput {
  workspaceId: string;
  reservationId: string;
  now?: Date;
}

function periodWindow(period: string, now: Date): { start: Date; end: Date } {
  if (period === "daily") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (period === "weekly") {
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (period === "monthly") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }
  throw new UnsupportedBudgetPeriodError(period);
}

/**
 * Atomic preflight/reserve/consume/release for `BudgetPolicy` /
 * `CostReservation`. Closes the gap recorded in
 * docs/phase-10/10.1-existing-state-inventory.md: "Budget enforcement |
 * Policy/reservation data exists | Atomic preflight/reserve/consume/release
 * service not proven | 10.7". No second budget model is introduced.
 */
export class PostgresBudgetGateService {
  constructor(private readonly pool: Pool) {}

  async reserve(input: ReserveBudgetInput): Promise<ReserveBudgetResult> {
    const now = input.now ?? new Date();
    return inTransaction(this.pool, async (client) => {
      // Serialize preflight-check + reservation-insert per (workspace, policy)
      // so concurrent reservations cannot both pass the same limit check.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `budget:${input.workspaceId}:${input.policyId}`,
      ]);

      const policyResult = await client.query<{
        id: string;
        limitAmount: string;
        currency: string;
        period: string;
        alertThresholdPct: number;
        action: BudgetPolicyAction;
      }>(
        `SELECT "id", "limitAmount"::TEXT, "currency", "period", "alertThresholdPct", "action"
         FROM "BudgetPolicy" WHERE "id" = $1 AND "workspaceId" = $2 AND "enabled" = TRUE`,
        [input.policyId, input.workspaceId],
      );
      const policy = policyResult.rows[0];
      if (!policy) throw new BudgetPolicyNotFoundError(input.policyId);

      const { start, end } = periodWindow(policy.period, now);
      const limitAmount = Number(policy.limitAmount);

      const consumedResult = await client.query<{ total: string | null }>(
        `SELECT SUM("amount")::TEXT AS total FROM "CostReservation"
         WHERE "workspaceId" = $1 AND "policyId" = $2
           AND "status" IN ('RESERVED', 'CONSUMED')
           AND "createdAt" >= $3 AND "createdAt" < $4`,
        [input.workspaceId, input.policyId, start, end],
      );
      const alreadyCommitted = Number(consumedResult.rows[0]?.total ?? 0);
      const projected = alreadyCommitted + input.amount;
      const overThreshold = limitAmount > 0 && (projected / limitAmount) * 100 >= policy.alertThresholdPct;

      if (projected > limitAmount && policy.action === "block") {
        throw new BudgetExceededError(input.policyId, limitAmount, projected);
      }

      const reservationId = randomUUID();
      const expiresAt = input.ttlMs !== undefined ? new Date(now.getTime() + input.ttlMs) : null;
      await client.query(
        `INSERT INTO "CostReservation"
           ("id", "workspaceId", "policyId", "ownerType", "ownerId", "amount", "currency", "status", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'RESERVED', $8, $9, $9)`,
        [
          reservationId,
          input.workspaceId,
          input.policyId,
          input.ownerType,
          input.ownerId,
          input.amount,
          policy.currency,
          expiresAt,
          now,
        ],
      );

      return {
        overThreshold,
        reservation: {
          id: reservationId,
          workspaceId: input.workspaceId,
          policyId: input.policyId,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          amount: input.amount,
          currency: policy.currency,
          status: "RESERVED",
          expiresAt,
        },
      };
    });
  }

  async consume(input: ConsumeReservationInput): Promise<CostReservationRecord> {
    const now = input.now ?? new Date();
    return inTransaction(this.pool, async (client) => {
      const found = await client.query<{
        id: string;
        workspaceId: string;
        policyId: string;
        ownerType: string;
        ownerId: string;
        amount: string;
        currency: string;
        status: CostReservationStatus;
        expiresAt: Date | null;
      }>(
        `SELECT "id", "workspaceId", "policyId", "ownerType", "ownerId", "amount"::TEXT, "currency", "status", "expiresAt"
         FROM "CostReservation" WHERE "id" = $1 AND "workspaceId" = $2 FOR UPDATE`,
        [input.reservationId, input.workspaceId],
      );
      const row = found.rows[0];
      if (!row) throw new CostReservationNotFoundError(input.reservationId);
      if (row.status !== "RESERVED") throw new CostReservationNotReservedError(input.reservationId, row.status);

      const finalAmount = input.actualAmount ?? Number(row.amount);
      await client.query(
        `UPDATE "CostReservation"
         SET "status" = 'CONSUMED', "amount" = $3, "updatedAt" = $4
         WHERE "id" = $1 AND "workspaceId" = $2`,
        [input.reservationId, input.workspaceId, finalAmount, now],
      );

      return {
        id: row.id,
        workspaceId: row.workspaceId,
        policyId: row.policyId,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        amount: finalAmount,
        currency: row.currency,
        status: "CONSUMED",
        expiresAt: row.expiresAt,
      };
    });
  }

  async release(input: ReleaseReservationInput): Promise<CostReservationRecord> {
    const now = input.now ?? new Date();
    const result = await this.pool.query<{
      id: string;
      workspaceId: string;
      policyId: string;
      ownerType: string;
      ownerId: string;
      amount: string;
      currency: string;
      expiresAt: Date | null;
    }>(
      `UPDATE "CostReservation"
       SET "status" = 'RELEASED', "updatedAt" = $3
       WHERE "id" = $1 AND "workspaceId" = $2 AND "status" = 'RESERVED'
       RETURNING "id", "workspaceId", "policyId", "ownerType", "ownerId", "amount"::TEXT, "currency", "expiresAt"`,
      [input.reservationId, input.workspaceId, now],
    );
    const row = result.rows[0];
    if (!row) {
      const existing = await this.pool.query<{ status: CostReservationStatus }>(
        `SELECT "status" FROM "CostReservation" WHERE "id" = $1 AND "workspaceId" = $2`,
        [input.reservationId, input.workspaceId],
      );
      if (!existing.rows[0]) throw new CostReservationNotFoundError(input.reservationId);
      throw new CostReservationNotReservedError(input.reservationId, existing.rows[0].status);
    }
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      policyId: row.policyId,
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      amount: Number(row.amount),
      currency: row.currency,
      status: "RELEASED",
      expiresAt: row.expiresAt,
    };
  }

  async releaseExpired(input: { workspaceId: string; now?: Date }): Promise<number> {
    const now = input.now ?? new Date();
    const result = await this.pool.query(
      `UPDATE "CostReservation"
       SET "status" = 'EXPIRED', "updatedAt" = $2
       WHERE "workspaceId" = $1 AND "status" = 'RESERVED' AND "expiresAt" IS NOT NULL AND "expiresAt" <= $2`,
      [input.workspaceId, now],
    );
    return result.rowCount ?? 0;
  }
}

async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
