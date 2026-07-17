import { describe, expect, it } from "vitest";

import {
  assertRunTransition,
  assertStepTransition,
  InvalidWorkflowTransitionError,
  isTerminalRunState,
  isTerminalStepState,
} from "@/lib/workflows/state-machine";

describe("workflow run state machine", () => {
  it("allows queued runs to start", () => {
    expect(() => assertRunTransition("QUEUED", "RUNNING")).not.toThrow();
  });

  it("rejects transition out of a terminal state", () => {
    expect(() => assertRunTransition("COMPLETED", "RUNNING")).toThrow(
      InvalidWorkflowTransitionError,
    );
  });

  it("identifies terminal run states", () => {
    expect(isTerminalRunState("FAILED")).toBe(true);
    expect(isTerminalRunState("RUNNING")).toBe(false);
  });
});

describe("workflow step state machine", () => {
  it("supports the worker execution path", () => {
    expect(() => assertStepTransition("READY", "CLAIMED")).not.toThrow();
    expect(() => assertStepTransition("CLAIMED", "RUNNING")).not.toThrow();
    expect(() => assertStepTransition("RUNNING", "COMPLETED")).not.toThrow();
  });

  it("rejects duplicate execution after completion", () => {
    expect(() => assertStepTransition("COMPLETED", "RUNNING")).toThrow(
      InvalidWorkflowTransitionError,
    );
  });

  it("identifies skipped steps as terminal", () => {
    expect(isTerminalStepState("SKIPPED")).toBe(true);
  });
});
