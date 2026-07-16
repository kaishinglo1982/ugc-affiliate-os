import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

import { NoAgentCapacityError, PostgresAgentCapacityRouter } from "@/lib/agents/postgres-capacity-router";

const connectionString = process.env.DATABASE_URL_TEST;
const describeDb = connectionString ? describe : describe.skip;

describeDb("PostgresAgentCapacityRouter", () => {
  const pool = new Pool({ connectionString });
  const workspaceId = randomUUID();
  const agentId = randomUUID();
  const router = new PostgresAgentCapacityRouter(pool);

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "AgentCapabilityRegistration" (
         "id", "workspaceId", "agentKey", "version", "enabled", "health",
         "capabilities", "allowedToolKeys", "providerKeys", "currentLoad",
         "maxConcurrency", "estimatedCostPerTask", "averageLatencyMs",
         "successRate", "priority"
       ) VALUES ($1, $2, 'content-agent', 1, TRUE, 'ONLINE', $3::jsonb,
         ARRAY['script.write'], ARRAY['openrouter'], 0, 1, 0, 50, 1, 10)`,
      [agentId, workspaceId, JSON.stringify([{ key: "content.script", version: 1, tools: ["script.write"], inputSchemaVersion: "1", outputSchemaVersion: "1" }])],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "AgentCapacityReservation" WHERE "workspaceId" = $1`, [workspaceId]);
    await pool.query(`DELETE FROM "AgentCapabilityRegistration" WHERE "workspaceId" = $1`, [workspaceId]);
    await pool.end();
  });

  it("prevents concurrent overbooking", async () => {
    const request = {
      workspaceId,
      capabilityKey: "content.script",
      requiredToolKeys: ["script.write"],
      requiredProviderKeys: ["openrouter"],
    };

    const results = await Promise.allSettled([
      router.reserve({ request, workflowStepRunId: randomUUID(), ttlMs: 60_000 }),
      router.reserve({ request, workflowStepRunId: randomUUID(), ttlMs: 60_000 }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(NoAgentCapacityError);
    }
  });

  it("returns the same active reservation for the same step", async () => {
    await pool.query(`DELETE FROM "AgentCapacityReservation" WHERE "workspaceId" = $1`, [workspaceId]);
    await pool.query(`UPDATE "AgentCapabilityRegistration" SET "currentLoad" = 0 WHERE "id" = $1`, [agentId]);
    const stepId = randomUUID();
    const request = { workspaceId, capabilityKey: "content.script" };

    const first = await router.reserve({ request, workflowStepRunId: stepId, ttlMs: 60_000 });
    const second = await router.reserve({ request, workflowStepRunId: stepId, ttlMs: 60_000 });

    expect(second.reservationToken).toBe(first.reservationToken);
  });

  it("releases capacity exactly once", async () => {
    await pool.query(`DELETE FROM "AgentCapacityReservation" WHERE "workspaceId" = $1`, [workspaceId]);
    await pool.query(`UPDATE "AgentCapabilityRegistration" SET "currentLoad" = 0 WHERE "id" = $1`, [agentId]);
    const reservation = await router.reserve({
      request: { workspaceId, capabilityKey: "content.script" },
      workflowStepRunId: randomUUID(),
      ttlMs: 60_000,
    });

    expect(await router.release({ workspaceId, reservationToken: reservation.reservationToken })).toBe(true);
    expect(await router.release({ workspaceId, reservationToken: reservation.reservationToken })).toBe(false);

    const load = await pool.query<{ currentLoad: number }>(
      `SELECT "currentLoad" FROM "AgentCapabilityRegistration" WHERE "id" = $1`,
      [agentId],
    );
    expect(load.rows[0]?.currentLoad).toBe(0);
  });

  it("expires reservations and restores capacity", async () => {
    await pool.query(`DELETE FROM "AgentCapacityReservation" WHERE "workspaceId" = $1`, [workspaceId]);
    await pool.query(`UPDATE "AgentCapabilityRegistration" SET "currentLoad" = 0 WHERE "id" = $1`, [agentId]);
    const now = new Date("2026-07-17T00:00:00.000Z");
    await router.reserve({
      request: { workspaceId, capabilityKey: "content.script" },
      workflowStepRunId: randomUUID(),
      ttlMs: 1_000,
      now,
    });

    expect(await router.releaseExpired({ workspaceId, now: new Date(now.getTime() + 2_000) })).toBe(1);
    const load = await pool.query<{ currentLoad: number }>(
      `SELECT "currentLoad" FROM "AgentCapabilityRegistration" WHERE "id" = $1`,
      [agentId],
    );
    expect(load.rows[0]?.currentLoad).toBe(0);
  });
});
