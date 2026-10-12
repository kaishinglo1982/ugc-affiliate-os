"use server";

import { prisma } from "@/lib/db/client";
import {
  saveHuggingFaceSettingsSchema,
  disconnectIntegrationSchema,
} from "@/lib/validation/integrations";
import { encryptSecret } from "@/lib/encryption/aes";
import { runMutation } from "@/server/actions/action-helpers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { revalidatePath } from "next/cache";

export async function saveHuggingFaceSettingsAction(
  _prevState: unknown,
  formData: FormData,
) {
  // Server Actions are callable directly; do not rely on the UI or proxy
  // middleware to authenticate credential writes.
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

  const integration = await prisma.integration.upsert({
    where: { providerKey: "huggingface" },
    update: {},
    create: {
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
      await prisma.encryptedCredential.update({
        where: { id: credentialId },
        data: {
          cipherText: encrypted.cipherText,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
        },
      });
    } else {
      const credential = await prisma.encryptedCredential.create({
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

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      credentialId: credentialId,
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
    handler: async ({ providerKey: key }) => {
      const integration = await prisma.integration.findUnique({ where: { providerKey: key } });
      if (!integration) return { providerKey: key };
      if (integration.credentialId) {
        await prisma.encryptedCredential.delete({ where: { id: integration.credentialId } });
      }
      await prisma.integration.update({
        where: { providerKey: key },
        data: { credentialId: null, status: "DISCONNECTED" },
      });
      return { providerKey: key };
    },
    entityId: (output) => output.providerKey,
  });
}
