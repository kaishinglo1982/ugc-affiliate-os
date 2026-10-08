import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api/guard", () => ({ requireApiPermission: vi.fn() }));
vi.mock("@/lib/auth/rbac", () => ({ Permission: { MANAGE_WORKSPACE: "workspace.manage" } }));
vi.mock("@/lib/auth/tenant", () => ({ resolveWorkspaceId: vi.fn().mockResolvedValue("11111111-1111-4111-8111-111111111111") }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", email: "o@example.com" }) }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/encryption/aes", () => ({ encryptSecret: vi.fn(() => ({ cipherText: "c", iv: "i", authTag: "t" })) }));
vi.mock("@/server/actions/action-helpers", () => ({ runMutation: vi.fn() }));
const withWorkspaceTransaction = vi.fn();
vi.mock("@/lib/db/workspace-transaction", () => ({ withWorkspaceTransaction: (...a: unknown[]) => withWorkspaceTransaction(...a) }));

import { requireApiPermission } from "@/lib/api/guard";
import { writeAuditLog } from "@/lib/audit/log";
import { runMutation } from "@/server/actions/action-helpers";
import { saveHuggingFaceSettingsAction, disconnectIntegrationAction } from "../integrations";

function form(): FormData {
  const f = new FormData();
  f.set("apiKey", "hf_secret_value");
  f.set("model", "m");
  f.set("temperature", "0.5");
  f.set("maxTokens", "100");
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("credential actions authorization", () => {
  it("save: unauthenticated caller cannot write credentials", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue({ response: NextResponse.json({}, { status: 401 }) });
    const result = await saveHuggingFaceSettingsAction(null, form());
    expect(result).toEqual({ success: false, error: "Nicht authentifiziert." });
    expect(withWorkspaceTransaction).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("save: caller without workspace.manage is rejected", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue({ response: NextResponse.json({}, { status: 403 }) });
    const result = await saveHuggingFaceSettingsAction(null, form());
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(withWorkspaceTransaction).not.toHaveBeenCalled();
    expect(requireApiPermission).toHaveBeenCalledWith("workspace.manage");
  });

  it("save: authorized caller writes and an audit entry is recorded", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue(null);
    withWorkspaceTransaction.mockResolvedValue(undefined);
    const result = await saveHuggingFaceSettingsAction(null, form());
    expect(result).toEqual({ success: true });
    expect(withWorkspaceTransaction).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "integration.huggingface.save" }));
  });

  it("disconnect: unauthorized caller is rejected before any mutation", async () => {
    vi.mocked(requireApiPermission).mockResolvedValue({ response: NextResponse.json({}, { status: 403 }) });
    const result = await disconnectIntegrationAction("huggingface");
    expect(result.success).toBe(false);
    expect(runMutation).not.toHaveBeenCalled();
  });
});
