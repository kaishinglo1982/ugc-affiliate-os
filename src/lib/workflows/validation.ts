import { z } from "zod";

export const workflowStepTypeSchema = z.enum([
  "AGENT",
  "TOOL",
  "APPROVAL",
  "CONDITION",
]);

export const workflowStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

export const workflowStepSchema = z
  .object({
    key: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    type: workflowStepTypeSchema,
    order: z.number().int().nonnegative(),
    dependsOn: z.array(z.string().min(1)).default([]),
    config: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const workflowDefinitionSchema = z
  .object({
    key: z.string().min(1).max(120),
    name: z.string().min(1).max(200),
    description: z.string().max(2_000).optional(),
    version: z.number().int().positive(),
    status: workflowStatusSchema.default("DRAFT"),
    trigger: z.string().min(1).max(100).default("manual"),
    scheduleCron: z.string().min(1).max(120).optional(),
    steps: z.array(workflowStepSchema).min(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowStepInput = z.infer<typeof workflowStepSchema>;

export type WorkflowValidationIssueCode =
  | "DUPLICATE_STEP_KEY"
  | "DUPLICATE_STEP_ORDER"
  | "UNKNOWN_DEPENDENCY"
  | "SELF_DEPENDENCY"
  | "CYCLIC_DEPENDENCY"
  | "INVALID_APPROVAL_STEP"
  | "INVALID_CONDITION_STEP";

export interface WorkflowValidationIssue {
  code: WorkflowValidationIssueCode;
  message: string;
  stepKey?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

function findCycles(steps: WorkflowStepInput[]): string[] {
  const dependencies = new Map(
    steps.map((step) => [step.key, step.dependsOn] as const),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();

  const visit = (key: string): void => {
    if (visited.has(key)) return;
    if (visiting.has(key)) {
      cyclic.add(key);
      return;
    }

    visiting.add(key);
    for (const dependency of dependencies.get(key) ?? []) {
      if (!dependencies.has(dependency)) continue;
      if (visiting.has(dependency)) {
        cyclic.add(key);
        cyclic.add(dependency);
        continue;
      }
      visit(dependency);
      if (cyclic.has(dependency)) cyclic.add(key);
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const step of steps) visit(step.key);
  return [...cyclic].sort();
}

export function validateWorkflowGraph(
  workflow: WorkflowDefinitionInput,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const keyCounts = new Map<string, number>();
  const orderCounts = new Map<number, number>();
  const knownKeys = new Set(workflow.steps.map((step) => step.key));

  for (const step of workflow.steps) {
    keyCounts.set(step.key, (keyCounts.get(step.key) ?? 0) + 1);
    orderCounts.set(step.order, (orderCounts.get(step.order) ?? 0) + 1);

    for (const dependency of step.dependsOn) {
      if (!knownKeys.has(dependency)) {
        issues.push({
          code: "UNKNOWN_DEPENDENCY",
          stepKey: step.key,
          message: `Step ${step.key} depends on unknown step ${dependency}.`,
        });
      }
      if (dependency === step.key) {
        issues.push({
          code: "SELF_DEPENDENCY",
          stepKey: step.key,
          message: `Step ${step.key} cannot depend on itself.`,
        });
      }
    }

    if (step.type === "APPROVAL" && step.config["resourceType"] === undefined) {
      issues.push({
        code: "INVALID_APPROVAL_STEP",
        stepKey: step.key,
        message: `Approval step ${step.key} requires config.resourceType.`,
      });
    }

    if (step.type === "CONDITION" && step.config["expression"] === undefined) {
      issues.push({
        code: "INVALID_CONDITION_STEP",
        stepKey: step.key,
        message: `Condition step ${step.key} requires config.expression.`,
      });
    }
  }

  for (const [key, count] of keyCounts) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_STEP_KEY",
        stepKey: key,
        message: `Step key ${key} occurs ${count} times.`,
      });
    }
  }

  for (const [order, count] of orderCounts) {
    if (count > 1) {
      issues.push({
        code: "DUPLICATE_STEP_ORDER",
        message: `Step order ${order} occurs ${count} times.`,
      });
    }
  }

  for (const stepKey of findCycles(workflow.steps)) {
    issues.push({
      code: "CYCLIC_DEPENDENCY",
      stepKey,
      message: `Step ${stepKey} participates in a dependency cycle.`,
    });
  }

  return { valid: issues.length === 0, issues };
}

export function parseAndValidateWorkflowDefinition(
  input: unknown,
): WorkflowDefinitionInput {
  const parsed = workflowDefinitionSchema.parse(input);
  const result = validateWorkflowGraph(parsed);

  if (!result.valid) {
    throw new WorkflowDefinitionValidationError(result.issues);
  }

  return parsed;
}

export class WorkflowDefinitionValidationError extends Error {
  readonly issues: WorkflowValidationIssue[];

  constructor(issues: WorkflowValidationIssue[]) {
    super("Workflow definition failed semantic validation.");
    this.name = "WorkflowDefinitionValidationError";
    this.issues = issues;
  }
}

export function createWorkflowRunSnapshot(
  workflow: WorkflowDefinitionInput,
): Readonly<WorkflowDefinitionInput> {
  return Object.freeze(structuredClone(workflow));
}
