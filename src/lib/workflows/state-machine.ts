export const workflowRunStates = [
  "QUEUED",
  "RUNNING",
  "WAITING_FOR_APPROVAL",
  "PAUSED",
  "RETRYING",
  "COMPENSATING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type WorkflowRunState = (typeof workflowRunStates)[number];

export const workflowStepStates = [
  "PENDING",
  "READY",
  "CLAIMED",
  "RUNNING",
  "WAITING_FOR_APPROVAL",
  "RETRYING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
] as const;

export type WorkflowStepState = (typeof workflowStepStates)[number];

const runTransitions: Readonly<Record<WorkflowRunState, readonly WorkflowRunState[]>> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_FOR_APPROVAL", "PAUSED", "RETRYING", "COMPENSATING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["RUNNING", "FAILED", "CANCELLED"],
  PAUSED: ["RUNNING", "CANCELLED"],
  RETRYING: ["RUNNING", "FAILED", "CANCELLED"],
  COMPENSATING: ["FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

const stepTransitions: Readonly<Record<WorkflowStepState, readonly WorkflowStepState[]>> = {
  PENDING: ["READY", "SKIPPED", "CANCELLED"],
  READY: ["CLAIMED", "SKIPPED", "CANCELLED"],
  CLAIMED: ["RUNNING", "READY", "CANCELLED"],
  RUNNING: ["WAITING_FOR_APPROVAL", "RETRYING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_FOR_APPROVAL: ["READY", "FAILED", "CANCELLED"],
  RETRYING: ["READY", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  SKIPPED: [],
};

export class InvalidWorkflowTransitionError extends Error {
  constructor(entity: "run" | "step", from: string, to: string) {
    super(`Invalid workflow ${entity} transition: ${from} -> ${to}.`);
    this.name = "InvalidWorkflowTransitionError";
  }
}

export function assertRunTransition(from: WorkflowRunState, to: WorkflowRunState): void {
  if (!runTransitions[from].includes(to)) {
    throw new InvalidWorkflowTransitionError("run", from, to);
  }
}

export function assertStepTransition(from: WorkflowStepState, to: WorkflowStepState): void {
  if (!stepTransitions[from].includes(to)) {
    throw new InvalidWorkflowTransitionError("step", from, to);
  }
}

export function isTerminalRunState(state: WorkflowRunState): boolean {
  return runTransitions[state].length === 0;
}

export function isTerminalStepState(state: WorkflowStepState): boolean {
  return stepTransitions[state].length === 0;
}
