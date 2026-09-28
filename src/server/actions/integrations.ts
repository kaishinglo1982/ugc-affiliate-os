"use server";

import { prisma } from "@/lib/db/client";
import {
  saveHuggingFaceSettingsSchema,
  disconnectIntegrationSchema,
} from "@/lib/validation/integrations";
import { encryptSecret } from "@/lib/encryption/aes";
import { runMutation } from "@/server/actions/action-helpers";
import { revalidatePath } from "next/cache";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function saveHuggingFaceSettingsAction(
  _prevState: unknown,
  formData: FormData,
) {
  const parsed = saveHuggingFaceSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      error: "Eingabe ungültig.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { apiKey, model, temperature, maxTokens, autoSuggestHooks } = parsed.data;
  const workspaceId = await resolveWorkspaceId();

  await withWorkspaceTransaction(workspaceId, async (tx) => {
    const integration = await tx.integration.upsert({
      where: { workspaceId_providerKey: { workspaceId, providerKey: "huggingface" } },
      update: {},
      create: {
        workspaceId,
        providerKey: "huggingface",
        displayName: "HuggingFace",
        category: "AI",
        mode: "MOCK",
        status: "DISCONNECTED",
      },
    });

    let credentialId: string | undefined = integration.credentialId ?? undefined;
    if (apiKey) {
      const encrypted = encryptSecret(apiKey);
      if (credentialId) {
        const credential = await tx.encryptedCredential.findFirst({
          where: { id: credentialId, workspaceId },
          select: { id: true },
        });
        if (!credential) throw new Error("INTEGRATION_CREDENTIAL_NOT_FOUND");
        await tx.encryptedCredential.update({
          where: { id: credential.id, workspaceId },
          data: {
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        });
      } else {
        const credential = await tx.encryptedCredential.create({
          data: {
            workspaceId,
            label: "HuggingFace API Key",
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        });
        credentialId = credential.id;
      }
    }

    await tx.integration.update({
      where: { id: integration.id, workspaceId },
      data: {
        credentialId,
        status: credentialId ? "CONNECTED" : integration.status,
        config: { model, temperature, maxTokens, autoSuggestHooks },
      },
    });
  });

  revalidatePath("/app/integrations");
  return { success: true };
}

export async function disconnectIntegrationAction(providerKey: string) {
  return runMutation({
    schema: disconnectIntegrationSchema,
    input: { providerKey },
    auditAction: "integration.disconnect",
    entityType: "Integration",
    handler: async ({ providerKey: key }) => {
      const workspaceId = await resolveWorkspaceId();
      const integration = await prisma.integration.findFirst({ where: { providerKey: key, workspaceId } });
      if (!integration) return { providerKey: key };
      if (integration.credentialId) {
        const credential = await prisma.encryptedCredential.findFirst({
          where: { id: integration.credentialId, workspaceId },
          select: { id: true },
        });
        if (credential) {
          await prisma.encryptedCredential.delete({ where: { id: credential.id, workspaceId } });
        }
      }
      await prisma.integration.update({
        where: { id: integration.id, workspaceId },
        data: { credentialId: null, status: "DISCONNECTED" },
      });
      return { providerKey: key };
    },
    entityId: (output) => output.providerKey,
  });
}
