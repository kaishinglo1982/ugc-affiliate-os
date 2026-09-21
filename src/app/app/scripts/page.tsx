import type { Metadata } from "next";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { listScripts } from "@/server/services/scripts";
import { listProductsForSelect } from "@/server/services/affiliate";
import { LLM_PROVIDER_KEYS, isLlmProviderConfigured, type LlmProviderKey } from "@/lib/providers/llm/registry";
import { ScriptsPageClient } from "@/components/scripts/scripts-page-client";
import type { ScriptRow } from "@/components/scripts/scripts-table";
import type { ScriptDetailData } from "@/components/scripts/script-detail-sheet";

export const metadata: Metadata = { title: "UGC-Skriptgenerator" };

export default async function ScriptsPage() {
  const [scripts, products] = await Promise.all([
    listScripts(),
    listProductsForSelect(),
  ]);

  const workspaceData = await withWorkspaceDb(async (tx) => {
    const [campaigns, fullScripts] = await Promise.all([
      tx.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      tx.script.findMany({
        where: { id: { in: scripts.map((script) => script.id) } },
        include: { versions: { orderBy: { versionNumber: "desc" } } },
      }),
    ]);
    return { campaigns, fullScripts };
  });

  const rows: ScriptRow[] = scripts.map((s) => ({
    id: s.id,
    title: s.title,
    productName: s.product?.name ?? null,
    campaignName: s.campaign?.name ?? null,
    platform: s.platform,
    status: s.status,
    versionCount: s._count.versions,
  }));

  const scriptDetails: Record<string, ScriptDetailData> = {};
  for (const full of workspaceData.fullScripts) {
    scriptDetails[full.id] = {
      id: full.id,
      title: full.title,
      status: full.status,
      audience: full.audience,
      platform: full.platform,
      versions: full.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        hook: v.hook,
        problem: v.problem,
        situation: v.situation,
        productIntro: v.productIntro,
        demonstration: v.demonstration,
        benefit: v.benefit,
        socialProof: v.socialProof,
        objectionHandling: v.objectionHandling,
        cta: v.cta,
        onScreenText: v.onScreenText,
        bRollNotes: v.bRollNotes,
        voiceover: v.voiceover,
        sceneList: v.sceneList as unknown as ScriptDetailData["versions"][number]["sceneList"],
        generatedBy: v.generatedBy,
      })),
    };
  }

  const providerAvailability = LLM_PROVIDER_KEYS.reduce(
    (acc, key) => {
      acc[key] = isLlmProviderConfigured(key);
      return acc;
    },
    {} as Record<LlmProviderKey, boolean>,
  );

  return (
    <ScriptsPageClient
      scripts={rows}
      scriptDetails={scriptDetails}
      products={products.map((p) => ({ id: p.id, label: p.name }))}
      campaigns={workspaceData.campaigns.map((c) => ({ id: c.id, label: c.name }))}
      providerAvailability={providerAvailability}
    />
  );
}
