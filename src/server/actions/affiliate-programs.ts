"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { runMutation } from "@/server/actions/action-helpers";
import { affiliateProgramSchema, idSchema } from "@/lib/validation/affiliate";
import { encryptSecret } from "@/lib/encryption/aes";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

export async function saveAffiliateProgramAction(
  programId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = affiliateProgramSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  const encrypted = parsed.data.apiKey ? encryptSecret(parsed.data.apiKey) : null;

  const program = await withWorkspaceDb(async (tx) => {
    const existing = programId
      ? await tx.affiliateProgram.findUnique({
          where: { id: programId },
          select: { id: true, credentialId: true },
        })
      : null;
    if (programId && !existing) return null;

    let credentialId = existing?.credentialId ?? undefined;
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
            label: `${parsed.data.provider} API Key`,
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        });
        credentialId = credential.id;
      }
    }

    const data = {
      provider: parsed.data.provider,
      customName: parsed.data.customName || null,
      trackingId: parsed.data.trackingId || null,
      notes: parsed.data.notes || null,
      mode: "MOCK" as const,
      ...(credentialId ? { credentialId, status: "CONNECTED" } : {}),
    };

    return existing
      ? tx.affiliateProgram.update({ where: { id: existing.id }, data })
      : tx.affiliateProgram.create({
          data: { ...data, status: credentialId ? "CONNECTED" : "DISCONNECTED" },
        });
  });

  if (!program) return fail("Affiliate-Programm nicht gefunden.", requestId);

  await writeAuditLog({
    action: programId ? "affiliate_program.update" : "affiliate_program.create",
    entityType: "AffiliateProgram",
    entityId: program.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/affiliate-programs");
  return ok({ id: program.id }, requestId);
}

export async function deleteAffiliateProgramAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "affiliate_program.delete",
    entityType: "AffiliateProgram",
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        const program = await tx.affiliateProgram.findUnique({
          where: { id: input.id },
          select: { id: true, credentialId: true },
        });
        if (!program) throw new Error("AFFILIATE_PROGRAM_NOT_VISIBLE");

        await tx.affiliateProgram.delete({ where: { id: program.id } });
        if (program.credentialId) {
          await tx.encryptedCredential.delete({ where: { id: program.credentialId } });
        }
        return { id: input.id };
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-programs");
  return result;
}

export async function disconnectAffiliateProgramAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "integration.disconnect",
    entityType: "AffiliateProgram",
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        const program = await tx.affiliateProgram.findUnique({
          where: { id: input.id },
          select: { id: true, credentialId: true },
        });
        if (!program) throw new Error("AFFILIATE_PROGRAM_NOT_VISIBLE");

        const updated = await tx.affiliateProgram.update({
          where: { id: program.id },
          data: { status: "DISCONNECTED", credentialId: null },
        });
        if (program.credentialId) {
          await tx.encryptedCredential.delete({ where: { id: program.credentialId } });
        }
        return updated;
      }),
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-programs");
  return result;
}
