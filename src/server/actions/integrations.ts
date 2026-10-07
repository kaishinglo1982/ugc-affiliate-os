"use server";

import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { saveHuggingFaceSettingsSchema, disconnectIntegrationSchema } from "@/lib/validation/integrations";
import { encryptSecret } from "@/lib/encryption/aes";
import { runMutation } from "@/server/actions/action-helpers";
import { revalidatePath } from "next/cache";

export async function saveHuggingFaceSettingsAction(_prevState: unknown, formData: FormData) {
  const parsed = saveHuggingFaceSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: "Eingabe ungültig.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const { apiKey, model, temperature, maxTokens, autoSuggestHooks } = parsed.data;
  const workspaceId = await resolveWorkspaceId();

  await withWorkspaceTransaction(workspaceId, async (tx) => {
    const integration = await tx.integration.upsert({
      where: { providerKey: "huggingface" }, update: {},
      create: { providerKey: "huggingface", displayName: "HuggingFace", category: "AI", mode: "MOCK", status: "DISCONNECTED" },
    });
    let credentialId: string | undefined = integration.credentialId ?? undefined;
    if (apiKey) {
      const encrypted = encryptSecret(apiKey);
      if (credentialId) {
        await tx.encryptedCredential.update({ where: { id: credentialId }, data: { cipherText: encrypted.cipherText, iv: encrypted.iv, authTag: encrypted.authTag } });
      } else {
        const credential = await tx.encryptedCredential.create({ data: { label: "HuggingFace API Key", cipherText: encrypted.cipherText, iv: encrypted.iv, authTag: encrypted.authTag } });
        credentialId = credential.id;
      }
    }
    await tx.integration.update({
      where: { id: integration.id },
      data: { credentialId, status: credentialId ? "CONNECTED" : integration.status, config: { model, temperature, maxTokens, autoSuggestHooks } },
    });
  });
  revalidatePath("/app/integrations"); return { success: true };
}

export async function disconnectIntegrationAction(providerKey: string) {
  const workspaceId = await resolveWorkspaceId();
  return runMutation({
    schema: disconnectIntegrationSchema, input: { providerKey }, auditAction: "integration.disconnect", entityType: "Integration",
    handler: async ({ providerKey: key }) => withWorkspaceTransaction(workspaceId, async (tx) => {
      const integration = await tx.integration.findUnique({ where: { providerKey: key } });
      if (!integration) return { providerKey: key };
      if (integration.credentialId) await tx.encryptedCredential.delete({ where: { id: integration.credentialId } });
      await tx.integration.update({ where: { providerKey: key }, data: { credentialId: null, status: "DISCONNECTED" } });
      return { providerKey: key };
    }),
    entityId: (output) => output.providerKey,
  });
}
