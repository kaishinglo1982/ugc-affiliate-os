import { createHash, randomUUID } from "node:crypto";

import {
  createWorkflowRunSnapshot,
  parseAndValidateWorkflowDefinition,
  type WorkflowDefinitionInput,
} from "@/lib/workflows/validation";

export interface PersistedWorkflowDefinition {
  id: string;
  workspaceId: string;
  definition: WorkflowDefinitionInput;
  definitionHash: string;
  activatedAt: Date | null;
  supersededAt: Date | null;
}

export interface PersistedWorkflowRun {
  id: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  definitionSnapshot: WorkflowDefinitionInput;
  definitionHash: string;
  correlationId: string;
  idempotencyKey: string | null;
}

export interface WorkflowPersistenceAdapter {
  findDefinition(input: {
    workspaceId: string;
    key: string;
    version: number;
  }): Promise<PersistedWorkflowDefinition | null>;

  createDefinition(input: {
    workspaceId: string;
    definition: WorkflowDefinitionInput;
    definitionHash: string;
  }): Promise<PersistedWorkflowDefinition>;

  activateDefinition(input: {
    workspaceId: string;
    workflowId: string;
    expectedVersion: number;
    activatedAt: Date;
  }): Promise<PersistedWorkflowDefinition>;

  createRun(input: {
    workspaceId: string;
    workflowId: string;
    workflowVersion: number;
    definitionSnapshot: WorkflowDefinitionInput;
    definitionHash: string;
    correlationId: string;
    idempotencyKey: string | null;
  }): Promise<PersistedWorkflowRun>;

  findRunByIdempotencyKey(input: {
    workspaceId: string;
    idempotencyKey: string;
  }): Promise<PersistedWorkflowRun | null>;
}

export class WorkflowVersionConflictError extends Error {
  constructor(key: string, version: number) {
    super(`Workflow ${key} version ${version} already exists.`);
    this.name = "WorkflowVersionConflictError";
  }
}

export class WorkflowDefinitionNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow definition ${workflowId} was not found in the workspace.`);
    this.name = "WorkflowDefinitionNotFoundError";
  }
}

export function hashWorkflowDefinition(
  definition: WorkflowDefinitionInput,
): string {
  return createHash("sha256")
    .update(JSON.stringify(definition))
    .digest("hex");
}

export class WorkflowRepositoryService {
  constructor(private readonly adapter: WorkflowPersistenceAdapter) {}

  async createVersion(input: {
    workspaceId: string;
    definition: unknown;
  }): Promise<PersistedWorkflowDefinition> {
    const definition = parseAndValidateWorkflowDefinition(input.definition);
    const existing = await this.adapter.findDefinition({
      workspaceId: input.workspaceId,
      key: definition.key,
      version: definition.version,
    });

    if (existing) {
      throw new WorkflowVersionConflictError(
        definition.key,
        definition.version,
      );
    }

    return this.adapter.createDefinition({
      workspaceId: input.workspaceId,
      definition,
      definitionHash: hashWorkflowDefinition(definition),
    });
  }

  async activateVersion(input: {
    workspaceId: string;
    workflowId: string;
    expectedVersion: number;
    now?: Date;
  }): Promise<PersistedWorkflowDefinition> {
    return this.adapter.activateDefinition({
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      expectedVersion: input.expectedVersion,
      activatedAt: input.now ?? new Date(),
    });
  }

  async startRun(input: {
    workspaceId: string;
    definition: PersistedWorkflowDefinition;
    idempotencyKey?: string;
    correlationId?: string;
  }): Promise<PersistedWorkflowRun> {
    if (input.definition.workspaceId !== input.workspaceId) {
      throw new WorkflowDefinitionNotFoundError(input.definition.id);
    }

    if (input.idempotencyKey) {
      const existing = await this.adapter.findRunByIdempotencyKey({
        workspaceId: input.workspaceId,
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) return existing;
    }

    const snapshot = createWorkflowRunSnapshot(input.definition.definition);

    return this.adapter.createRun({
      workspaceId: input.workspaceId,
      workflowId: input.definition.id,
      workflowVersion: input.definition.definition.version,
      definitionSnapshot: snapshot,
      definitionHash: input.definition.definitionHash,
      correlationId: input.correlationId ?? randomUUID(),
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }
}
