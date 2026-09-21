import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresWorkflowPersistenceAdapter } from "@/lib/workflows/postgres-adapter";
import {
  WorkflowDefinitionNotFoundError,
  WorkflowRepositoryService,
} from "@/lib/workflows/repository";

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PostgresWorkflowPersistenceAdapter", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const workflowKey = `phase-10-2-${randomUUID()}`;
  const adapter = new PostgresWorkflowPersistenceAdapter(pool);
  const service = new WorkflowRepositoryService(adapter);

  function definition(name: string) {
    return {
      key: workflowKey,
      name,
      version: 1,
      status: "DRAFT" as const,
      trigger: "manual",
      steps: [
        {
          key: "research",
          name: "Research",
          type: "AGENT" as const,
          order: 0,
          dependsOn: [] as string[],
          config: {},
        },
        {
          key: "approval",
          name: "Approval",
          type: "APPROVAL" as const,
          order: 1,
          dependsOn: ["research"],
          config: { resourceType: "product" },
        },
      ],
      metadata: { source: "integration-test" },
    };
  }

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    for (const workspaceId of [workspaceA, workspaceB]) {
      await pool.query(
        `DELETE FROM "WorkflowRun" WHERE "workspaceId" = $1`,
        [workspaceId],
      );
      await pool.query(
        `DELETE FROM "WorkflowDefinition" WHERE "workspaceId" = $1`,
        [workspaceId],
      );
    }
    await pool.end();
  });

  it("creates, activates and starts an immutable versioned workflow run", async () => {
    const created = await service.createVersion({
      workspaceId: workspaceA,
      definition: definition("Phase 10.2 integration workflow"),
    });

    const activated = await service.activateVersion({
      workspaceId: workspaceA,
      workflowId: created.id,
      expectedVersion: 1,
    });
    expect(activated.definition.status).toBe("ACTIVE");
    expect(activated.activatedAt).toBeInstanceOf(Date);

    const firstRun = await service.startRun({
      workspaceId: workspaceA,
      definition: activated,
      idempotencyKey: "same-request",
      correlationId: randomUUID(),
    });
    const replay = await service.startRun({
      workspaceId: workspaceA,
      definition: activated,
      idempotencyKey: "same-request",
      correlationId: randomUUID(),
    });

    expect(replay.id).toBe(firstRun.id);
    expect(firstRun.workflowVersion).toBe(1);
    expect(firstRun.definitionSnapshot).toEqual(activated.definition);
    expect(firstRun.definitionHash).toBe(activated.definitionHash);
  });

  it("keeps reads, activation and idempotent runs isolated across two real workspaces", async () => {
    const definitionA = await adapter.findDefinition({
      workspaceId: workspaceA,
      key: workflowKey,
      version: 1,
    });
    expect(definitionA?.workspaceId).toBe(workspaceA);

    const definitionB = await service.createVersion({
      workspaceId: workspaceB,
      definition: definition("Workspace B workflow"),
    });
    expect(definitionB.workspaceId).toBe(workspaceB);
    expect(definitionB.id).not.toBe(definitionA?.id);

    const readA = await adapter.findDefinition({
      workspaceId: workspaceA,
      key: workflowKey,
      version: 1,
    });
    const readB = await adapter.findDefinition({
      workspaceId: workspaceB,
      key: workflowKey,
      version: 1,
    });
    expect(readA?.id).toBe(definitionA?.id);
    expect(readB?.id).toBe(definitionB.id);

    await expect(
      service.activateVersion({
        workspaceId: workspaceB,
        workflowId: definitionA!.id,
        expectedVersion: 1,
      }),
    ).rejects.toThrow("Workflow activation version conflict");

    await expect(
      service.startRun({
        workspaceId: workspaceB,
        definition: definitionA!,
        idempotencyKey: "cross-workspace-denied",
      }),
    ).rejects.toBeInstanceOf(WorkflowDefinitionNotFoundError);

    const activatedB = await service.activateVersion({
      workspaceId: workspaceB,
      workflowId: definitionB.id,
      expectedVersion: 1,
    });
    const runB = await service.startRun({
      workspaceId: workspaceB,
      definition: activatedB,
      idempotencyKey: "same-request",
      correlationId: randomUUID(),
    });

    const runA = await adapter.findRunByIdempotencyKey({
      workspaceId: workspaceA,
      idempotencyKey: "same-request",
    });
    const persistedRunB = await adapter.findRunByIdempotencyKey({
      workspaceId: workspaceB,
      idempotencyKey: "same-request",
    });
    expect(runA?.workspaceId).toBe(workspaceA);
    expect(persistedRunB?.id).toBe(runB.id);
    expect(persistedRunB?.workspaceId).toBe(workspaceB);
    expect(persistedRunB?.id).not.toBe(runA?.id);
  });
});
