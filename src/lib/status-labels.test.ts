import { describe, it, expect } from "vitest";
import {
  CONTENT_BRIEF_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_RUN_STATUS_LABELS,
  AGENT_TOOL_RISK_LABELS,
  AGENT_MEMORY_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
  COST_RESERVATION_STATUS_LABELS,
  BUDGET_PERIOD_LABELS,
} from "@/lib/status-labels";

describe("status-labels (badge mappings)", () => {
  it("maps known enum values to German labels", () => {
    expect(CONTENT_BRIEF_STATUS_LABELS.DRAFT).toBe("Entwurf");
    expect(WORKFLOW_STATUS_LABELS.ACTIVE).toBe("Aktiv");
    expect(WORKFLOW_RUN_STATUS_LABELS.FAILED).toBe("Fehlgeschlagen");
    expect(AGENT_TOOL_RISK_LABELS.HIGH).toBe("Hoch");
    expect(APPROVAL_STATUS_LABELS.PENDING).toBe("Offen");
    expect(COST_RESERVATION_STATUS_LABELS.RESERVED).toBe("Reserviert");
    expect(BUDGET_PERIOD_LABELS.monthly).toBe("Monatlich");
  });

  it("covers all agent memory types", () => {
    expect(Object.keys(AGENT_MEMORY_TYPE_LABELS).sort()).toEqual(["CONTEXT", "FACT", "PREFERENCE"]);
  });

  it("returns undefined for unknown keys (forcing fallback in UI)", () => {
    expect(CONTENT_BRIEF_STATUS_LABELS.UNKNOWN_STATUS).toBeUndefined();
    expect(WORKFLOW_RUN_STATUS_LABELS.ZZZ).toBeUndefined();
  });
});
