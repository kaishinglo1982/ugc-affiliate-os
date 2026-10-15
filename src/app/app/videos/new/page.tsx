import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { listCampaigns } from "@/server/services/campaigns";
import { VideoJobForm } from "@/components/videos/video-job-form";
import { listProductsForSelect } from "@/server/services/affiliate";

export const metadata: Metadata = { title: "Neuer Videoauftrag" };

export default async function NewVideoJobPage() {
  const [scripts, products, campaigns] = await Promise.all([
    prisma.script.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    listProductsForSelect(),
    listCampaigns(),
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
        scripts={scripts.map((s) => ({ id: s.id, label: s.title }))}
        products={products.map((p) => ({ id: p.id, label: p.name }))}
        campaigns={campaigns.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
