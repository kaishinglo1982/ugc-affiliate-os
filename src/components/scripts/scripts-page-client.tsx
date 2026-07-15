"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptsTable, type ScriptRow } from "@/components/scripts/scripts-table";
import { ScriptCreateSheet } from "@/components/scripts/script-create-sheet";
import { ScriptDetailSheet, type ScriptDetailData } from "@/components/scripts/script-detail-sheet";
import type { LlmProviderKey } from "@/lib/providers/llm/registry";

interface Option {
  id: string;
  label: string;
}

export function ScriptsPageClient({
  scripts,
  scriptDetails,
  products,
  campaigns,
  providerAvailability,
}: {
  scripts: ScriptRow[];
  scriptDetails: Record<string, ScriptDetailData>;
  products: Option[];
  campaigns: Option[];
  providerAvailability: Record<LlmProviderKey, boolean>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreateOpen(true);
      router.replace("/app/scripts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">UGC-Skriptgenerator</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {scripts.length} Skript{scripts.length === 1 ? "" : "e"} · lokaler Template-Generator ohne API-Key.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Skript erstellen
        </Button>
      </div>

      <ScriptsTable scripts={scripts} onOpen={setDetailId} />

      <ScriptCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={products}
        campaigns={campaigns}
        providerAvailability={providerAvailability}
      />
      <ScriptDetailSheet
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        script={detailId ? (scriptDetails[detailId] ?? null) : null}
      />
    </div>
  );
}
