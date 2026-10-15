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
  if (!user) return fail("Nicht authentifiziert.", requestId);

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch {
    return fail("Workspace-Kontext konnte nicht sicher bestimmt werden.", requestId);
  }

  const parsed = affiliateProgramSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  if (programId) {
    const existing = await prisma.affiliateProgram.findFirst({
      where: { id: programId, workspaceId },
      select: { id: true },
    });
    if (!existing) return fail("Affiliate-Programm nicht gefunden oder kein Zugriff.", requestId);
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
    ...(credentialId ? { credentialId, status: "CONNECTED" } : {}),
  };

  let program: Awaited<ReturnType<typeof prisma.affiliateProgram.findFirstOrThrow>>;
  if (programId) {
    const updated = await prisma.affiliateProgram.updateMany({
      where: { id: programId, workspaceId },
      data,
    });
    if (updated.count !== 1) return fail("Affiliate-Programm nicht gefunden oder kein Zugriff.", requestId);
    program = await prisma.affiliateProgram.findFirstOrThrow({ where: { id: programId, workspaceId } });
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
      const deleted = await prisma.affiliateProgram.deleteMany({
        where: { id: input.id, workspaceId },
      });
      if (deleted.count !== 1) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND_IN_WORKSPACE");
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
      const updated = await prisma.affiliateProgram.updateMany({
        where: { id: input.id, workspaceId },
        data: { status: "DISCONNECTED", credentialId: null },
      });
      if (updated.count !== 1) throw new Error("AFFILIATE_PROGRAM_NOT_FOUND_IN_WORKSPACE");
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-programs");
  return result;
}
