import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { VideoJobForm } from "@/components/videos/video-job-form";
import { listProductsForSelect } from "@/server/services/affiliate";
import { resolveWorkspaceId } from "@/lib/auth/tenant";

export const metadata: Metadata = { title: "Neuer Videoauftrag" };

export default async function NewVideoJobPage() {
  const workspaceId = await resolveWorkspaceId();
  const [scripts, products, campaigns] = await Promise.all([
    prisma.script.findMany({ where: { workspaceId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    listProductsForSelect(),
    prisma.campaign.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
