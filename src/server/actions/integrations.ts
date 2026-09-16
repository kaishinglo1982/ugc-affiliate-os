"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import {
  saveHuggingFaceSettingsSchema,
  disconnectIntegrationSchema,
} from "@/lib/validation/integrations";
import { encryptSecret } from "@/lib/encryption/aes";
import { runMutation } from "@/server/actions/action-helpers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { newRequestId } from "@/types/result";

export async function saveHuggingFaceSettingsAction(
  _prevState: unknown,
  formData: FormData,
) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Nicht authentifiziert." };
  }

  const parsed = saveHuggingFaceSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      error: "Eingabe ungültig.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { apiKey, model, temperature, maxTokens, autoSuggestHooks } = parsed.data;
  const encrypted = apiKey ? encryptSecret(apiKey) : null;

  const integration = await withWorkspaceDb(async (tx) => {
    let current = await tx.integration.findUnique({ where: { providerKey: "huggingface" } });
    if (!current) {
      current = await tx.integration.create({
        data: {
          providerKey: "huggingface",
          displayName: "HuggingFace",
          category: "AI",
          mode: "MOCK",
          status: "DISCONNECTED",
        },
      });
    }

    let credentialId = current.credentialId ?? undefined;
    if (encrypted) {
      if (credentialId) {
        await tx.encryptedCredential.update({
          where: { id: credentialId },
          data: {
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            lastRotatedAt: new Date(),
          },
        });
      } else {
        const credential = await tx.encryptedCredential.create({
          data: {
            label: "HuggingFace API Key",
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        });
        credentialId = credential.id;
      }
    }

    return tx.integration.update({
      where: { id: current.id },
      data: {
        credentialId,
        status: credentialId ? "CONNECTED" : current.status,
        config: { model, temperature, maxTokens, autoSuggestHooks },
      },
    });
  });

  await writeAuditLog({
    action: "integration.update",
    entityType: "Integration",
    entityId: integration.id,
    requestId: newRequestId(),
    actor: user.email,
    metadata: { providerKey: "huggingface" },
  });

  revalidatePath("/app/integrations");
  return { success: true };
}

export async function disconnectIntegrationAction(providerKey: string) {
  const result = await runMutation({
    schema: disconnectIntegrationSchema,
    input: { providerKey },
    auditAction: "integration.disconnect",
    entityType: "Integration",
    handler: async ({ providerKey: key }) =>
      withWorkspaceDb(async (tx) => {
        const integration = await tx.integration.findUnique({ where: { providerKey: key } });
        if (!integration) return { providerKey: key };

        await tx.integration.update({
          where: { id: integration.id },
          data: { credentialId: null, status: "DISCONNECTED" },
        });
        if (integration.credentialId) {
          await tx.encryptedCredential.delete({ where: { id: integration.credentialId } });
        }
        return { providerKey: key };
      }),
    entityId: (output) => output.providerKey,
  });

  revalidatePath("/app/integrations");
  return result;
}
