"use server";

import { revalidatePath } from "next/cache";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { runMutation } from "@/server/actions/action-helpers";
import { affiliateLinkSchema, idSchema } from "@/lib/validation/affiliate";
import { buildTrackedUrl, generateShortSlug } from "@/features/affiliate/link-builder";
import { ok, fail, newRequestId, type Result } from "@/types/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { writeAuditLog } from "@/lib/audit/log";

export async function saveAffiliateLinkAction(
  linkId: string | null,
  _prevState: Result<{ id: string }> | null,
  formData: FormData,
): Promise<Result<{ id: string }>> {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return fail("Nicht authentifiziert.", requestId);

  const parsed = affiliateLinkSchema.safeParse(Object.fromEntries(formData.entries()));
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

  const link = await withWorkspaceDb(async (tx) => {
    if (linkId) {
      const visible = await tx.affiliateLink.findUnique({ where: { id: linkId }, select: { id: true } });
      if (!visible) return null;
      return tx.affiliateLink.update({ where: { id: linkId }, data });
    }
    return tx.affiliateLink.create({
      data: { ...data, shortSlug: generateShortSlug() },
    });
  });

  if (!link) return fail("Affiliate-Link nicht gefunden.", requestId);

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
    handler: async (input) =>
      withWorkspaceDb(async (tx) => {
        await tx.affiliateLink.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
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
      const link = await withWorkspaceDb((tx) =>
        tx.affiliateLink.findUnique({
          where: { id: input.id },
          select: { id: true, deepLink: true, destinationUrl: true },
        }),
      );
      if (!link) throw new Error("AFFILIATE_LINK_NOT_VISIBLE");

      const target = link.deepLink || link.destinationUrl;
      const url = new URL(target);

      if (PRIVATE_HOST_PATTERN.test(url.hostname)) {
        return withWorkspaceDb((tx) =>
          tx.affiliateLink.update({
            where: { id: input.id },
            data: { lastCheckedAt: new Date(), lastCheckStatus: "BLOCKED" },
          }),
        );
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

      return withWorkspaceDb((tx) =>
        tx.affiliateLink.update({
          where: { id: input.id },
          data: { lastCheckedAt: new Date(), lastCheckStatus: status },
        }),
      );
    },
    entityId: (output) => output.id,
  });
  revalidatePath("/app/affiliate-links");
  return result;
}
