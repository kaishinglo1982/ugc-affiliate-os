import { describe, expect, it } from "vitest";
import {
  UGC_AFFILIATE_PROCESS_TEMPLATES,
  getUgcAffiliateProcessTemplate,
  validateUgcAffiliateProcessTemplates,
} from "@/features/carryos/process-templates";
import {
  UGC_AFFILIATE_WORKFLOW_MANIFESTS,
  validateUgcAffiliateWorkflowManifests,
} from "@/features/carryos/workflow-manifests";

describe("UGC Affiliate OS CarryOS process templates", () => {
  it("registers the canonical UGC/Affiliate process set", () => {
    expect(UGC_AFFILIATE_PROCESS_TEMPLATES).toHaveLength(7);
    expect(UGC_AFFILIATE_PROCESS_TEMPLATES.every((template) => template.pluginId === "ugc-affiliate-os")).toBe(true);
  });

  it("registers one canonical workflow for every process", () => {
    expect(() => validateUgcAffiliateWorkflowManifests()).not.toThrow();
    expect(UGC_AFFILIATE_WORKFLOW_MANIFESTS).toHaveLength(UGC_AFFILIATE_PROCESS_TEMPLATES.length);
    const workflowKeys = new Set(UGC_AFFILIATE_WORKFLOW_MANIFESTS.map((workflow) => workflow.key));
    for (const template of UGC_AFFILIATE_PROCESS_TEMPLATES) {
      const refs = new Set(template.steps.map((step) => step.workflowRef));
      expect(refs.size).toBe(1);
      const workflowRef = [...refs][0];
      expect(typeof workflowRef).toBe("string");
      expect(workflowKeys.has(workflowRef as string)).toBe(true);
    }
  });

  it("keeps high-risk and external side-effect steps behind approval", () => {
    expect(() => validateUgcAffiliateProcessTemplates()).not.toThrow();
    for (const template of UGC_AFFILIATE_PROCESS_TEMPLATES) {
      for (const step of template.steps) {
        if (step.risk === "high" || step.risk === "critical" || step.externalSideEffect) {
          expect(step.humanApprovalRequired).toBe(true);
        }
      }
    }
  });

  it("contains the affiliate integrity process", () => {
    const template = getUgcAffiliateProcessTemplate("ugc.affiliate-integrity");
    expect(template?.outcomeKeys).toContain("affiliate.link_health");
    expect(template?.steps.some((step) => step.connectorRefs.includes("affiliate-network"))).toBe(true);
  });

  it("does not use a Fashion-specific plugin identity", () => {
    expect(
      UGC_AFFILIATE_PROCESS_TEMPLATES.some((template) => template.pluginId.toLowerCase().includes("fashion")),
    ).toBe(false);
  });
});
