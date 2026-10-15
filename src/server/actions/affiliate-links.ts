"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { runMutation } from "@/server/actions/action-helpers";
import { affiliateLinkSchema, idSchema } from "@/lib/validation/affiliate";
import { buildTrackedUrl, generateShortSlug } from "@/features/affiliate/link-builder";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export async function saveAffiliateLinkAction(
  linkId: string | null,
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

  const raw = Object.fromEntries(formData.entries());
  const parsed = affiliateLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Eingabe ungültig.", requestId, parsed.error.flatten().fieldErrors);
  }

  let deepLink = parsed.data.deepLink || undefined;
  try {
    deepLink = buildTrackedUrl(deepLink || parsed.data.destinationUrl, {
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      utmContent: parsed.data.utmContent,
      utmTerm: parsed.data.utmTerm,
    });
  } catch {
    return fail("Ziel-URL oder Deep Link ist ungültig.", requestId);
  }

  const data = {
    programId: parsed.data.programId,
    productId: parsed.data.productId || null,
    label: parsed.data.label,
    destinationUrl: parsed.data.destinationUrl,
    deepLink,
    platform: parsed.data.platform || null,
    utmSource: parsed.data.utmSource || null,
    utmMedium: parsed.data.utmMedium || null,
    utmCampaign: parsed.data.utmCampaign || null,
    utmContent: parsed.data.utmContent || null,
    utmTerm: parsed.data.utmTerm || null,
  };

  const program = await prisma.affiliateProgram.findFirst({
    where: { id: data.programId, workspaceId },
    select: { id: true },
  });
  if (!program) return fail("Affiliate-Programm nicht gefunden oder kein Zugriff.", requestId);

  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, workspaceId },
      select: { id: true },
    });
    if (!product) return fail("Produkt nicht gefunden oder kein Zugriff.", requestId);
  }

  let link: Awaited<ReturnType<typeof prisma.affiliateLink.findFirstOrThrow>>;
  if (linkId) {
    const updated = await prisma.affiliateLink.updateMany({
      where: { id: linkId, program: { workspaceId } },
      data,
    });
    if (updated.count !== 1) return fail("Affiliate-Link nicht gefunden oder kein Zugriff.", requestId);
    link = await prisma.affiliateLink.findFirstOrThrow({ where: { id: linkId, program: { workspaceId } } });
  } else {
    link = await prisma.affiliateLink.create({
      data: { ...data, shortSlug: generateShortSlug() },
    });
  }

  await writeAuditLog({
    action: linkId ? "affiliate_link.update" : "affiliate_link.create",
    entityType: "AffiliateLink",
    entityId: link.id,
    requestId,
    actor: user.email,
  });

  revalidatePath("/app/affiliate-links");
  return ok({ id: link.id }, requestId);
}

export async function deleteAffiliateLinkAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "affiliate_link.delete",
    entityType: "AffiliateLink",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const deleted = await prisma.affiliateLink.deleteMany({
        where: { id: input.id, program: { workspaceId } },
      });
      if (deleted.count !== 1) throw new Error("AFFILIATE_LINK_NOT_FOUND_IN_WORKSPACE");
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-links");
  return result;
}

const PRIVATE_HOST_PATTERN = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1)/i;

export async function testAffiliateLinkAction(id: string) {
  const result = await runMutation({
    schema: idSchema,
    input: { id },
    auditAction: "affiliate_link.test",
    entityType: "AffiliateLink",
    handler: async (input) => {
      const workspaceId = await resolveWorkspaceId();
      const link = await prisma.affiliateLink.findFirst({
        where: { id: input.id, program: { workspaceId } },
      });
      if (!link) throw new Error("AFFILIATE_LINK_NOT_FOUND_IN_WORKSPACE");
      const target = link.deepLink || link.destinationUrl;
      const url = new URL(target);

      if (PRIVATE_HOST_PATTERN.test(url.hostname)) {
        await prisma.affiliateLink.updateMany({
          where: { id: input.id, program: { workspaceId } },
          data: { lastCheckedAt: new Date(), lastCheckStatus: "BLOCKED" },
        });
        return { id: input.id };
      }

      let status: string;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(target, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "UGC-Affiliate-OS-LinkChecker/1.0" },
        });
        clearTimeout(timeout);
        status = response.ok ? "OK" : `HTTP ${response.status}`;
      } catch {
        status = "UNREACHABLE";
      }

      await prisma.affiliateLink.updateMany({
        where: { id: input.id, program: { workspaceId } },
        data: { lastCheckedAt: new Date(), lastCheckStatus: status },
      });
      return { id: input.id };
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-links");
  return result;
}
