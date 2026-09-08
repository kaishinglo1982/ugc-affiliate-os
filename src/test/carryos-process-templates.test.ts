import { describe, expect, it } from "vitest";
import {
  UGC_AFFILIATE_PROCESS_TEMPLATES,
  getUgcAffiliateProcessTemplate,
  validateUgcAffiliateProcessTemplates,
} from "@/features/carryos/process-templates";

describe("UGC Affiliate OS CarryOS process templates", () => {
  it("registers the canonical UGC/Affiliate process set", () => {
    expect(UGC_AFFILIATE_PROCESS_TEMPLATES).toHaveLength(7);
    expect(UGC_AFFILIATE_PROCESS_TEMPLATES.every((template) => template.pluginId === "ugc-affiliate-os")).toBe(true);
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
