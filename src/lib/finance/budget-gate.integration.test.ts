import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  BudgetExceededError,
  BudgetPolicyNotFoundError,
  CostReservationNotFoundError,
  CostReservationNotReservedError,
  PostgresBudgetGateService,
  UnsupportedBudgetPeriodError,
} from "@/lib/finance/budget-gate";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("PostgresBudgetGateService", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const gate = new PostgresBudgetGateService(pool);

  let workspaceId = "";

  async function createPolicy(input: {
    limitAmount: number;
    action?: "alert" | "block";
    period?: string;
    alertThresholdPct?: number;
    enabled?: boolean;
  }): Promise<string> {
    const policyId = randomUUID();
    await pool.query(
      `INSERT INTO "BudgetPolicy"
        ("id", "workspaceId", "name", "limitAmount", "period", "alertThresholdPct", "action", "enabled", "updatedAt")
       VALUES ($1, $2, 'phase-10-7-test', $3, $4, $5, $6, $7, NOW())`,
      [
        policyId,
        workspaceId,
        input.limitAmount,
        input.period ?? "monthly",
        input.alertThresholdPct ?? 80,
        input.action ?? "block",
        input.enabled ?? true,
      ],
    );
    return policyId;
  }

  beforeEach(() => {
    workspaceId = randomUUID();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("reserves within the limit", async () => {
    const policyId = await createPolicy({ limitAmount: 100 });
    const { reservation, overThreshold } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "workflow_step",
      ownerId: randomUUID(),
      amount: 10,
    });
    expect(reservation.status).toBe("RESERVED");
    expect(overThreshold).toBe(false);
  });

  it("flags overThreshold once the alert threshold is crossed without blocking", async () => {
    const policyId = await createPolicy({ limitAmount: 100, alertThresholdPct: 50, action: "alert" });
    const { overThreshold } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "workflow_step",
      ownerId: randomUUID(),
      amount: 60,
    });
    expect(overThreshold).toBe(true);
  });

  it("blocks a reservation that would exceed the limit when action is block", async () => {
    const policyId = await createPolicy({ limitAmount: 100, action: "block" });
    await gate.reserve({ workspaceId, policyId, ownerType: "workflow_step", ownerId: randomUUID(), amount: 90 });

    await expect(
      gate.reserve({ workspaceId, policyId, ownerType: "workflow_step", ownerId: randomUUID(), amount: 20 }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("allows an over-limit reservation when action is alert", async () => {
    const policyId = await createPolicy({ limitAmount: 100, action: "alert" });
    await gate.reserve({ workspaceId, policyId, ownerType: "workflow_step", ownerId: randomUUID(), amount: 90 });

    const { reservation, overThreshold } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "workflow_step",
      ownerId: randomUUID(),
      amount: 20,
    });
    expect(reservation.status).toBe("RESERVED");
    expect(overThreshold).toBe(true);
  });

  it("denies reservations against an unknown or disabled policy", async () => {
    await expect(
      gate.reserve({ workspaceId, policyId: randomUUID(), ownerType: "x", ownerId: "y", amount: 1 }),
    ).rejects.toBeInstanceOf(BudgetPolicyNotFoundError);

    const disabledPolicyId = await createPolicy({ limitAmount: 100, enabled: false });
    await expect(
      gate.reserve({ workspaceId, policyId: disabledPolicyId, ownerType: "x", ownerId: "y", amount: 1 }),
    ).rejects.toBeInstanceOf(BudgetPolicyNotFoundError);
  });

  it("rejects unsupported budget periods", async () => {
    const policyId = await createPolicy({ limitAmount: 100, period: "yearly" });
    await expect(
      gate.reserve({ workspaceId, policyId, ownerType: "x", ownerId: "y", amount: 1 }),
    ).rejects.toBeInstanceOf(UnsupportedBudgetPeriodError);
  });

  it("prevents concurrent reservations from jointly exceeding a blocking limit", async () => {
    const policyId = await createPolicy({ limitAmount: 100, action: "block" });
    const results = await Promise.allSettled([
      gate.reserve({ workspaceId, policyId, ownerType: "x", ownerId: randomUUID(), amount: 60 }),
      gate.reserve({ workspaceId, policyId, ownerType: "x", ownerId: randomUUID(), amount: 60 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected && (rejected as PromiseRejectedResult).reason).toBeInstanceOf(BudgetExceededError);
  });

  it("consumes a reservation and reconciles the actual amount", async () => {
    const policyId = await createPolicy({ limitAmount: 100 });
    const { reservation } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "x",
      ownerId: randomUUID(),
      amount: 10,
    });

    const consumed = await gate.consume({ workspaceId, reservationId: reservation.id, actualAmount: 12.5 });
    expect(consumed.status).toBe("CONSUMED");
    expect(consumed.amount).toBe(12.5);

    await expect(gate.consume({ workspaceId, reservationId: reservation.id })).rejects.toBeInstanceOf(
      CostReservationNotReservedError,
    );
  });

  it("releases a reservation and refuses to release it twice", async () => {
    const policyId = await createPolicy({ limitAmount: 100 });
    const { reservation } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "x",
      ownerId: randomUUID(),
      amount: 10,
    });

    const released = await gate.release({ workspaceId, reservationId: reservation.id });
    expect(released.status).toBe("RELEASED");

    await expect(gate.release({ workspaceId, reservationId: reservation.id })).rejects.toBeInstanceOf(
      CostReservationNotReservedError,
    );
  });

  it("raises a not-found error for an unknown reservation", async () => {
    await expect(gate.release({ workspaceId, reservationId: randomUUID() })).rejects.toBeInstanceOf(
      CostReservationNotFoundError,
    );
  });

  it("sweeps expired reservations", async () => {
    const policyId = await createPolicy({ limitAmount: 100 });
    const { reservation } = await gate.reserve({
      workspaceId,
      policyId,
      ownerType: "x",
      ownerId: randomUUID(),
      amount: 10,
      ttlMs: 1_000,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    const swept = await gate.releaseExpired({ workspaceId, now: new Date("2026-01-01T00:01:00.000Z") });
    expect(swept).toBeGreaterThanOrEqual(1);

    const row = await pool.query(`SELECT "status" FROM "CostReservation" WHERE "id" = $1`, [reservation.id]);
    expect(row.rows[0].status).toBe("EXPIRED");
  });
});
