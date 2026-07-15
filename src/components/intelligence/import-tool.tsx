"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PreviewResult {
  previewToken: string;
  validRows: number;
  invalidRows: number;
  warnings: number;
}

export function ImportTool() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);

  function doPreview() {
    if (!content.trim()) {
      toast.error("Bitte CSV-Inhalt einfügen.");
      return;
    }
    setCommitted(null);
    startTransition(async () => {
      const res = await fetch("/api/products/imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = (await res.json()) as PreviewResult;
        setPreview(data);
        toast.success("Vorschau erstellt.");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Vorschau fehlgeschlagen.");
      }
    });
  }

  function doCommit() {
    if (!preview) return;
    startTransition(async () => {
      const res = await fetch("/api/products/imports/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewToken: preview.previewToken }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { count?: number };
        setCommitted(data.count ?? 0);
        setPreview(null);
        toast.success(`${data.count ?? 0} Zeilen importiert.`);
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Import fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        placeholder={"external_product_id,title,description,product_url,price,currency,commission_rate\n..."}
        className="font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button variant="secondary" disabled={isPending} onClick={doPreview}>
          {isPending && !preview ? "Vorschau…" : "Vorschau"}
        </Button>
        <Button variant="primary" disabled={isPending || !preview} onClick={doCommit}>
          {isPending && preview ? "Importiere…" : "Importieren"}
        </Button>
        {preview ? (
          <span className="self-center text-sm text-[var(--color-foreground-muted)]">
            {preview.validRows} gültig · {preview.invalidRows} ungültig · {preview.warnings} Warnungen
          </span>
        ) : null}
        {committed !== null ? (
          <span className="self-center text-sm text-[var(--color-success)]">{committed} importiert</span>
        ) : null}
      </div>
    </div>
  );
}
