import type { Metadata } from "next";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { VideoJobForm } from "@/components/videos/video-job-form";
import { listProductsForSelect } from "@/server/services/affiliate";

export const metadata: Metadata = { title: "Neuer Videoauftrag" };

export default async function NewVideoJobPage() {
  const [workspaceData, products] = await Promise.all([
    withWorkspaceDb(async (tx) => {
      const [scripts, campaigns] = await Promise.all([
        tx.script.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
        tx.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ]);
      return { scripts, campaigns };
    }),
    listProductsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Videoauftrag starten</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Ohne Provider-Zugangsdaten läuft der Job über den lokalen Mock-Provider — inklusive
          Fortschritt, Fehlerfällen und Ergebnis.
        </p>
      </div>
      <VideoJobForm
        scripts={workspaceData.scripts.map((s) => ({ id: s.id, label: s.title }))}
        products={products.map((p) => ({ id: p.id, label: p.name }))}
        campaigns={workspaceData.campaigns.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
