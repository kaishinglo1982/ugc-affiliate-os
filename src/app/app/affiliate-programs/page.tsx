import type { Metadata } from "next";
import { listAffiliatePrograms } from "@/server/services/affiliate";
import { ProgramsTable, type ProgramRow } from "@/components/affiliate/programs-table";
import { ProgramDialog } from "@/components/affiliate/program-dialog";

export const metadata: Metadata = { title: "Affiliate-Programme" };

export default async function AffiliateProgramsPage() {
  const programs = await listAffiliatePrograms();

  const rows: ProgramRow[] = programs.map((p) => ({
    id: p.id,
    provider: p.provider,
    customName: p.customName,
    trackingId: p.trackingId,
    notes: p.notes,
    mode: p.mode,
    status: p.status,
    hasCredential: Boolean(p.credential),
    linkCount: p._count.links,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliate-Programme</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {rows.length} Programm{rows.length === 1 ? "" : "e"} · Zugangsdaten serverseitig verschlüsselt.
          </p>
        </div>
        <ProgramDialog />
      </div>
      <ProgramsTable programs={rows} />
    </div>
  );
}
