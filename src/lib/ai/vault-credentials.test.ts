import { describe, expect, it } from "vitest";

import {
  AiCredentialIsolationError,
  type AiCredentialRecord,
  WorkspaceAiSecretResolver,
} from "@/lib/ai/vault-credentials";

const credential: AiCredentialRecord = {
  workspaceId: "workspace-a",
  providerId: "openrouter",
  cipherText: "cipher",
  iv: "iv",
  authTag: "tag",
  disabledAt: null,
};

describe("WorkspaceAiSecretResolver", () => {
  it("resolves only a credential returned for the requested scope", async () => {
    const resolver = new WorkspaceAiSecretResolver(
      { find: async () => credential },
      { decrypt: () => "resolved-secret" },
    );

    await expect(resolver.resolve("workspace-a", "openrouter")).resolves.toBe("resolved-secret");
  });

  it("rejects a cross-workspace record before decryption", async () => {
    let decryptions = 0;
    const resolver = new WorkspaceAiSecretResolver(
      { find: async () => credential },
      {
        decrypt: () => {
          decryptions += 1;
          return "must-not-be-returned";
        },
      },
    );

    await expect(resolver.resolve("workspace-b", "openrouter")).rejects.toBeInstanceOf(
      AiCredentialIsolationError,
    );
    expect(decryptions).toBe(0);
  });

  it("returns null for disabled credentials", async () => {
    const resolver = new WorkspaceAiSecretResolver(
      { find: async () => ({ ...credential, disabledAt: new Date() }) },
      { decrypt: () => "must-not-be-returned" },
    );

    await expect(resolver.resolve("workspace-a", "openrouter")).resolves.toBeNull();
  });
});
