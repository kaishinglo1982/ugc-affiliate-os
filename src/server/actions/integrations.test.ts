import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  integrationUpsert: vi.fn(),
  integrationUpdate: vi.fn(),
  credentialCreate: vi.fn(),
  credentialUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    integration: {
      upsert: mocks.integrationUpsert,
      update: mocks.integrationUpdate,
      findUnique: vi.fn(),
    },
    encryptedCredential: {
      create: mocks.credentialCreate,
      update: mocks.credentialUpdate,
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { saveHuggingFaceSettingsAction } from "./integrations";

describe("saveHuggingFaceSettingsAction authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed in CORE_BOUND mode because credentials are not workspace-scoped", async () => {
    const previousMode = process.env.CARRYOS_INTEGRATION_MODE;
    process.env.CARRYOS_INTEGRATION_MODE = "CORE_BOUND";
    mocks.getCurrentUser.mockResolvedValue({ id: "authenticated-user" });

    const formData = new FormData();
    formData.set("apiKey", "should-not-be-persisted");
    formData.set("model", "test-model");
    formData.set("temperature", "0.2");
    formData.set("maxTokens", "100");
    formData.set("autoSuggestHooks", "false");

    try {
      await expect(saveHuggingFaceSettingsAction(null, formData)).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining("mandantenübergreifenden Core-Modus gesperrt"),
      });
      expect(mocks.integrationUpsert).not.toHaveBeenCalled();
      expect(mocks.integrationUpdate).not.toHaveBeenCalled();
      expect(mocks.credentialCreate).not.toHaveBeenCalled();
      expect(mocks.credentialUpdate).not.toHaveBeenCalled();
    } finally {
      if (previousMode === undefined) delete process.env.CARRYOS_INTEGRATION_MODE;
      else process.env.CARRYOS_INTEGRATION_MODE = previousMode;
    }
  });

  it("fails closed without a valid session before touching integration or credential data", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("apiKey", "should-not-be-persisted");
    formData.set("model", "test-model");
    formData.set("temperature", "0.2");
    formData.set("maxTokens", "100");
    formData.set("autoSuggestHooks", "false");

    await expect(saveHuggingFaceSettingsAction(null, formData)).resolves.toMatchObject({
      success: false,
      error: "Nicht authentifiziert.",
    });

    expect(mocks.integrationUpsert).not.toHaveBeenCalled();
    expect(mocks.integrationUpdate).not.toHaveBeenCalled();
    expect(mocks.credentialCreate).not.toHaveBeenCalled();
    expect(mocks.credentialUpdate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
