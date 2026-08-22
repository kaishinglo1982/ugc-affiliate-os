"use server";

import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import {
  saveHuggingFaceSettingsSchema,
  disconnectIntegrationSchema,
} from "@/lib/validation/integrations";
import { encryptSecret } from "@/lib/encryption/aes";
import { runMutation } from "@/server/actions/action-helpers";
import { revalidatePath } from "next/cache";

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

  const workspaceId = await resolveWorkspaceId();
  const { apiKey, model, temperature, maxTokens, autoSuggestHooks } = parsed.data;

  let integration = await prisma.integration.findFirst({
    where: { providerKey: "huggingface", workspaceId },
  });
  if (!integration) {
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        providerKey: "huggingface",
        displayName: "HuggingFace",
        category: "AI",
        mode: "MOCK",
        status: "DISCONNECTED",
      },
    });
  }

  let credentialId: string | undefined = integration.credentialId ?? undefined;
  if (apiKey) {
    const encrypted = encryptSecret(apiKey);
    const existingCredential = credentialId
      ? await prisma.encryptedCredential.findFirst({
          where: { id: credentialId, workspaceId },
          select: { id: true },
        })
      : null;

    if (existingCredential) {
      await prisma.encryptedCredential.update({
        where: { id: existingCredential.id },
        data: {
          cipherText: encrypted.cipherText,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
        },
      });
    } else {
      const credential = await prisma.encryptedCredential.create({
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

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      credentialId,
      status: credentialId ? "CONNECTED" : integration.status,
      config: { model, temperature, maxTokens, autoSuggestHooks },
    },
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
    handler: async ({ providerKey: key }, _user, workspaceId) => {
      const integration = await prisma.integration.findFirst({
        where: { providerKey: key, workspaceId },
      });
      if (!integration) return { providerKey: key };
      if (integration.credentialId) {
        await prisma.encryptedCredential.deleteMany({
          where: { id: integration.credentialId, workspaceId },
        });
      }
      await prisma.integration.update({
        where: { id: integration.id },
        data: { credentialId: null, status: "DISCONNECTED" },
      });
      return { providerKey: key };
    },
    entityId: (output) => output.providerKey,
  });
}
