import type { Metadata } from "next";
import { listAudit } from "@/server/services/audit";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Audit-Log" };

export default async function AuditPage() {
  const workspaceId = await resolveWorkspaceId();
  const entries = await listAudit(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit-Log</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{entries.length} Einträge</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[var(--color-foreground-subtle)]">
            <tr>
              <th className="px-3 py-2">Zeit</th>
              <th className="px-3 py-2">Aktion</th>
              <th className="px-3 py-2">Entität</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Akteur</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{new Date(e.createdAt).toLocaleString("de-DE")}</td>
                <td className="px-3 py-2"><Badge variant="outline">{e.action}</Badge></td>
                <td className="px-3 py-2">{e.entityType}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.entityId?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2">{e.actor ?? "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
