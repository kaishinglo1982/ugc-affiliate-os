import { describe, expect, it } from "vitest";

import {
  createWorkflowRunSnapshot,
  parseAndValidateWorkflowDefinition,
  validateWorkflowGraph,
  workflowDefinitionSchema,
  WorkflowDefinitionValidationError,
} from "@/lib/workflows/validation";

const validWorkflow = {
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
    {
      key: "approval",
      name: "Approve product",
      type: "APPROVAL" as const,
      order: 1,
      dependsOn: ["research"],
      config: { resourceType: "product" },
    },
  ],
  metadata: {},
};

describe("workflowDefinitionSchema", () => {
  it("parses a valid versioned definition", () => {
    expect(workflowDefinitionSchema.parse(validWorkflow)).toEqual(validWorkflow);
  });

  it("rejects non-positive versions", () => {
    expect(() =>
      workflowDefinitionSchema.parse({ ...validWorkflow, version: 0 }),
    ).toThrow();
  });
});

describe("validateWorkflowGraph", () => {
  it("accepts a valid acyclic graph", () => {
    expect(validateWorkflowGraph(validWorkflow)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects unknown dependencies", () => {
    const workflow = {
      ...validWorkflow,
      steps: [
        {
          ...validWorkflow.steps[0],
          dependsOn: ["missing"],
        },
      ],
    };

    expect(validateWorkflowGraph(workflow).issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_DEPENDENCY" }),
    );
  });

  it("rejects cycles", () => {
    const workflow = {
      ...validWorkflow,
      steps: [
        { ...validWorkflow.steps[0], dependsOn: ["approval"] },
        { ...validWorkflow.steps[1], dependsOn: ["research"] },
      ],
    };

    expect(validateWorkflowGraph(workflow).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CYCLIC_DEPENDENCY" }),
      ]),
    );
  });

  it("requires approval resource configuration", () => {
    const workflow = {
      ...validWorkflow,
      steps: [{ ...validWorkflow.steps[1], config: {} }],
    };

    expect(validateWorkflowGraph(workflow).issues).toContainEqual(
      expect.objectContaining({ code: "INVALID_APPROVAL_STEP" }),
    );
  });
});

describe("parseAndValidateWorkflowDefinition", () => {
  it("throws a typed error for semantic failures", () => {
    const invalidWorkflow = {
      ...validWorkflow,
      steps: [
        { ...validWorkflow.steps[0], dependsOn: ["research"] },
      ],
    };

    expect(() => parseAndValidateWorkflowDefinition(invalidWorkflow)).toThrow(
      WorkflowDefinitionValidationError,
    );
  });
});

describe("createWorkflowRunSnapshot", () => {
  it("clones and freezes the root definition", () => {
    const snapshot = createWorkflowRunSnapshot(validWorkflow);

    expect(snapshot).not.toBe(validWorkflow);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot).toEqual(validWorkflow);
  });
});
