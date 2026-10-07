"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { runMutation } from "@/server/actions/action-helpers";
import { affiliateProgramSchema, idSchema } from "@/lib/validation/affiliate";
import { encryptSecret } from "@/lib/encryption/aes";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

export async function saveAffiliateProgramAction(programId: string | null, _prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>> {
  const requestId = newRequestId(); const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);
  const parsed = affiliateProgramSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  const workspaceId = await resolveWorkspaceId();
  let credentialId: string | undefined;
  if (parsed.data.apiKey) {
    const encrypted = encryptSecret(parsed.data.apiKey);
    const credential = await withWorkspaceTransaction(workspaceId, (tx) => tx.encryptedCredential.create({ data: {
      label: `${parsed.data.provider} API Key`, cipherText: encrypted.cipherText, iv: encrypted.iv, authTag: encrypted.authTag,
    }}));
    credentialId = credential.id;
  }
  const data = {
    provider: parsed.data.provider, customName: parsed.data.customName || null, trackingId: parsed.data.trackingId || null,
    notes: parsed.data.notes || null, mode: "MOCK" as const, ...(credentialId ? { credentialId, status: "CONNECTED" } : {}),
  };
  const program = await withWorkspaceTransaction(workspaceId, (tx) => programId
    ? tx.affiliateProgram.update({ where: { id: programId }, data })
    : tx.affiliateProgram.create({ data: { ...data, status: credentialId ? "CONNECTED" : "DISCONNECTED" } }));
  await writeAuditLog({ action: programId ? "affiliate_program.update" : "affiliate_program.create", entityType: "AffiliateProgram", entityId: program.id, requestId, actor: user.email });
  revalidatePath("/app/affiliate-programs"); return ok({ id: program.id }, requestId);
}

export async function deleteAffiliateProgramAction(id: string) {
  const workspaceId = await resolveWorkspaceId();
  const result = await runMutation({ schema: idSchema, input: { id }, auditAction: "affiliate_program.delete", entityType: "AffiliateProgram",
    handler: async (input) => withWorkspaceTransaction(workspaceId, async (tx) => { await tx.affiliateProgram.delete({ where: { id: input.id } }); return { id: input.id }; }),
    entityId: (output) => output.id });
  revalidatePath("/app/affiliate-programs"); return result;
}

export async function disconnectAffiliateProgramAction(id: string) {
  const workspaceId = await resolveWorkspaceId();
  const result = await runMutation({ schema: idSchema, input: { id }, auditAction: "integration.disconnect", entityType: "AffiliateProgram",
    handler: async (input) => withWorkspaceTransaction(workspaceId, (tx) => tx.affiliateProgram.update({
      where: { id: input.id }, data: { status: "DISCONNECTED", credentialId: null },
    })),
    entityId: (output) => output.id });
  revalidatePath("/app/affiliate-programs"); return result;
}
