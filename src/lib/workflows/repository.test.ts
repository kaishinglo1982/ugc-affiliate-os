import { describe, expect, it } from "vitest";

import {
  type PersistedWorkflowDefinition,
  type PersistedWorkflowRun,
  type WorkflowPersistenceAdapter,
  WorkflowRepositoryService,
  WorkflowVersionConflictError,
} from "@/lib/workflows/repository";

const definition = {
  key: "ugc-campaign",
  name: "UGC Campaign",
  version: 1,
  status: "DRAFT" as const,
  trigger: "manual",
  steps: [
    {
      key: "research",
      name: "Research",
      type: "AGENT" as const,
      order: 0,
      dependsOn: [],
      config: {},
    },
  ],
  metadata: {},
};

class MemoryAdapter implements WorkflowPersistenceAdapter {
  definitions: PersistedWorkflowDefinition[] = [];
  runs: PersistedWorkflowRun[] = [];

  async findDefinition(input: {
    workspaceId: string;
    key: string;
    version: number;
  }): Promise<PersistedWorkflowDefinition | null> {
    return (
      this.definitions.find(
        (item) =>
          item.workspaceId === input.workspaceId &&
          item.definition.key === input.key &&
          item.definition.version === input.version,
      ) ?? null
    );
  }

  async createDefinition(input: {
    workspaceId: string;
    definition: typeof definition;
    definitionHash: string;
  }): Promise<PersistedWorkflowDefinition> {
    const row: PersistedWorkflowDefinition = {
      id: `workflow-${this.definitions.length + 1}`,
      workspaceId: input.workspaceId,
      definition: input.definition,
      definitionHash: input.definitionHash,
      activatedAt: null,
      supersededAt: null,
    };
    this.definitions.push(row);
    return row;
  }

  async activateDefinition(input: {
    workspaceId: string;
    workflowId: string;
    expectedVersion: number;
    activatedAt: Date;
  }): Promise<PersistedWorkflowDefinition> {
    const row = this.definitions.find(
      (item) =>
        item.workspaceId === input.workspaceId &&
        item.id === input.workflowId &&
        item.definition.version === input.expectedVersion,
    );
    if (!row) throw new Error("not found");
    row.activatedAt = input.activatedAt;
    return row;
  }

  async createRun(input: {
    workspaceId: string;
    workflowId: string;
    workflowVersion: number;
    definitionSnapshot: typeof definition;
    definitionHash: string;
    correlationId: string;
    idempotencyKey: string | null;
  }): Promise<PersistedWorkflowRun> {
    const run: PersistedWorkflowRun = {
      id: `run-${this.runs.length + 1}`,
      ...input,
    };
    this.runs.push(run);
    return run;
  }

  async findRunByIdempotencyKey(input: {
    workspaceId: string;
    idempotencyKey: string;
  }): Promise<PersistedWorkflowRun | null> {
    return (
      this.runs.find(
        (item) =>
          item.workspaceId === input.workspaceId &&
          item.idempotencyKey === input.idempotencyKey,
      ) ?? null
    );
  }
}

describe("WorkflowRepositoryService", () => {
  it("creates one immutable workflow version with a hash", async () => {
    const adapter = new MemoryAdapter();
    const service = new WorkflowRepositoryService(adapter);

    const created = await service.createVersion({
      workspaceId: "workspace-a",
      definition,
    });

    expect(created.definitionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.definition.version).toBe(1);
  });

  it("rejects duplicate workspace/key/version tuples", async () => {
    const adapter = new MemoryAdapter();
    const service = new WorkflowRepositoryService(adapter);

    await service.createVersion({ workspaceId: "workspace-a", definition });

    await expect(
      service.createVersion({ workspaceId: "workspace-a", definition }),
    ).rejects.toBeInstanceOf(WorkflowVersionConflictError);
  });

  it("returns the existing run for a repeated idempotency key", async () => {
    const adapter = new MemoryAdapter();
    const service = new WorkflowRepositoryService(adapter);
    const persisted = await service.createVersion({
      workspaceId: "workspace-a",
      definition,
    });

    const first = await service.startRun({
      workspaceId: "workspace-a",
      definition: persisted,
      idempotencyKey: "request-1",
    });
    const second = await service.startRun({
      workspaceId: "workspace-a",
      definition: persisted,
      idempotencyKey: "request-1",
    });

    expect(second.id).toBe(first.id);
    expect(adapter.runs).toHaveLength(1);
  });

  it("rejects a foreign-workspace workflow definition", async () => {
    const adapter = new MemoryAdapter();
    const service = new WorkflowRepositoryService(adapter);
    const persisted = await service.createVersion({
      workspaceId: "workspace-a",
      definition,
    });

    await expect(
      service.startRun({
        workspaceId: "workspace-b",
        definition: persisted,
      }),
    ).rejects.toThrow("was not found in the workspace");
  });
});
