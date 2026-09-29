"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import { affiliateProgramSchema, idSchema } from "@/lib/validation/affiliate";
import { encryptSecret } from "@/lib/encryption/aes";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function saveAffiliateProgramAction(
  programId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  const workspaceId = await resolveWorkspaceId();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = affiliateProgramSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  let credentialId: string | undefined;
  if (parsed.data.apiKey) {
    const encrypted = encryptSecret(parsed.data.apiKey);
    const credential = await prisma.encryptedCredential.create({
      data: {
        label: `${parsed.data.provider} API Key`,
        cipherText: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        workspaceId,
      },
    });
    credentialId = credential.id;
  }

  const data = {
    provider: parsed.data.provider,
    customName: parsed.data.customName || null,
    trackingId: parsed.data.trackingId || null,
    notes: parsed.data.notes || null,
    mode: "LIVE" as const,
    ...(credentialId ? { credentialId, status: "CONNECTED" } : {}),
  };

  let program;
  if (programId) {
    const existing = await prisma.affiliateProgram.findFirst({ where: { id: programId, workspaceId } });
    if (!existing) return fail("Affiliate-Programm nicht gefunden.", requestId);
    program = await prisma.affiliateProgram.update({ where: { id: existing.id, workspaceId }, data });
  } else {
    program = await prisma.affiliateProgram.create({
      data: { ...data, workspaceId, status: credentialId ? "CONNECTED" : "DISCONNECTED" },
    });
  }

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
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.affiliateProgram.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND");
      await prisma.affiliateProgram.delete({ where: { id: existing.id, workspaceId } });
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
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const existing = await prisma.affiliateProgram.findFirst({ where: { id: input.id, workspaceId } });
      if (!existing) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND");
      return prisma.affiliateProgram.update({
        where: { id: existing.id, workspaceId },
        data: { status: "DISCONNECTED", credentialId: null },
      });
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-programs");
  return result;
}
