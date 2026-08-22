"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
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

  const workspaceId = await resolveWorkspaceId();
  let existingId: string | null = null;
  if (programId) {
    const existing = await prisma.affiliateProgram.findFirst({
      where: { id: programId, workspaceId },
      select: { id: true },
    });
    if (!existing) return fail("Affiliate-Programm nicht gefunden.", requestId);
    existingId = existing.id;
  }

  let credentialId: string | undefined;
  if (parsed.data.apiKey) {
    const encrypted = encryptSecret(parsed.data.apiKey);
    const credential = await prisma.encryptedCredential.create({
      data: {
        workspaceId,
        label: `${parsed.data.provider} API Key`,
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });
    credentialId = credential.id;
  }

  const data = {
    provider: parsed.data.provider,
    customName: parsed.data.customName || null,
    trackingId: parsed.data.trackingId || null,
    notes: parsed.data.notes || null,
    mode: "MOCK" as const,
    ...(credentialId ? { credentialId, status: "CONNECTED" as const } : {}),
  };

  const program = existingId
    ? await prisma.affiliateProgram.update({ where: { id: existingId }, data })
    : await prisma.affiliateProgram.create({
        data: {
          workspaceId,
          ...data,
          status: credentialId ? "CONNECTED" : "DISCONNECTED",
        },
      });

  await writeAuditLog({
    action: programId ? "affiliate_program.update" : "affiliate_program.create",
    entityType: "AffiliateProgram",
    entityId: program.id,
    requestId,
    actor: user.email,
    workspaceId,
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
    handler: async (input, _user, workspaceId) => {
      const deleted = await prisma.affiliateProgram.deleteMany({
        where: { id: input.id, workspaceId },
      });
      if (deleted.count !== 1) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND");
      return { id: input.id };
    },
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
    handler: async (input, _user, workspaceId) => {
      const program = await prisma.affiliateProgram.findFirst({
        where: { id: input.id, workspaceId },
        select: { id: true },
      });
      if (!program) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND");
      return prisma.affiliateProgram.update({
        where: { id: program.id },
        data: { status: "DISCONNECTED", credentialId: null },
      });
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-programs");
  return result;
}
