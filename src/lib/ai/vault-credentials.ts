import { z } from "zod";

export const AiCredentialRecordSchema = z.object({
  workspaceId: z.string().min(1),
  providerId: z.string().min(1),
  cipherText: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  disabledAt: z.date().nullable().default(null),
});

export type AiCredentialRecord = z.infer<typeof AiCredentialRecordSchema>;

export interface AiCredentialStore {
  find(workspaceId: string, providerId: string): Promise<AiCredentialRecord | null>;
}

export interface AiSecretDecryptor {
  decrypt(payload: Pick<AiCredentialRecord, "cipherText" | "iv" | "authTag">): string;
}

export class AiCredentialIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiCredentialIsolationError";
  }
}

export class WorkspaceAiSecretResolver {
  constructor(
    private readonly store: AiCredentialStore,
    private readonly decryptor: AiSecretDecryptor,
  ) {}

  async resolve(workspaceId: string, providerId: string): Promise<string | null> {
    if (!workspaceId || !providerId) {
      throw new AiCredentialIsolationError("Workspace and provider are required");
    }

    const record = await this.store.find(workspaceId, providerId);
    if (!record || record.disabledAt) {
      return null;
    }

    const parsed = AiCredentialRecordSchema.parse(record);
    if (parsed.workspaceId !== workspaceId || parsed.providerId !== providerId) {
      throw new AiCredentialIsolationError("Credential scope mismatch");
    }

    return this.decryptor.decrypt({
      cipherText: parsed.cipherText,
      iv: parsed.iv,
      authTag: parsed.authTag,
    });
  }
}
