"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SCRIPT_STATUS_LABELS } from "@/lib/status-labels";
import {
  regenerateScriptVersionAction,
  duplicateScriptAction,
  changeScriptStatusAction,
  deleteScriptAction,
} from "@/server/actions/scripts";

export interface ScriptVersionData {
  id: string;
  versionNumber: number;
  hook: string;
  problem: string;
  situation: string;
  productIntro: string;
  demonstration: string;
  benefit: string;
  socialProof: string;
  objectionHandling: string;
  cta: string;
  onScreenText: string | null;
  bRollNotes: string | null;
  voiceover: string | null;
  sceneList: Array<{ scene: number; description: string; durationSec: number }>;
  generatedBy: string;
}

export interface ScriptDetailData {
  id: string;
  title: string;
  status: string;
  audience: string | null;
  platform: string | null;
  versions: ScriptVersionData[];
}

const FIELD_LABELS: Array<[keyof ScriptVersionData, string]> = [
  ["hook", "Hook"],
  ["problem", "Problem"],
  ["situation", "Situation"],
  ["productIntro", "Produktvorstellung"],
  ["demonstration", "Demonstration"],
  ["benefit", "Nutzen"],
  ["socialProof", "Social Proof"],
  ["objectionHandling", "Einwandbehandlung"],
  ["cta", "CTA"],
  ["onScreenText", "On-Screen-Text"],
  ["bRollNotes", "B-Roll-Anweisungen"],
  ["voiceover", "Voiceover"],
];

export function ScriptDetailSheet({
  open,
  onOpenChange,
  script,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: ScriptDetailData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!script) return null;

  const version =
    script.versions.find((v) => v.versionNumber === selectedVersion) ?? script.versions[0];

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateScriptVersionAction(script!.id);
      if (result.success) {
        toast.success(`Neue Version ${result.data.versionNumber} erstellt`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateScriptAction(script!.id);
      if (result.success) {
        toast.success("Skript dupliziert");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await changeScriptStatusAction(script!.id, status);
      if (result.success) {
        toast.success(`Status geändert zu "${SCRIPT_STATUS_LABELS[status]}"`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteScriptAction(script!.id);
      if (result.success) {
        toast.success("Skript gelöscht");
        setDeleteOpen(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{script.title}</SheetTitle>
          <SheetDescription>
            {script.audience} · {script.platform}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select value={String(version?.versionNumber)} onValueChange={(v) => setSelectedVersion(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {script.versions.map((v) => (
                <SelectItem key={v.id} value={String(v.versionNumber)}>Version {v.versionNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={script.status} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SCRIPT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isPending}>
            <RefreshCw className="h-4 w-4" /> Neue Variante
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
            <Copy className="h-4 w-4" /> Duplizieren
          </Button>
          <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        </div>

        {version ? (
          <div className="mt-6 space-y-4">
            <Badge variant="outline">Generiert via {version.generatedBy}</Badge>
            {FIELD_LABELS.map(([key, label]) => (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                  {label}
                </p>
                <p className="mt-1 text-sm">{String(version[key] ?? "—")}</p>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                Szenenliste
              </p>
              <ol className="mt-2 space-y-1.5">
                {version.sceneList.map((scene) => (
                  <li key={scene.scene} className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                    <span className="font-mono text-[var(--color-cyan)]">#{scene.scene}</span>{" "}
                    {scene.description} <span className="text-[var(--color-foreground-subtle)]">({scene.durationSec}s)</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </SheetContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Skript löschen?"
        description={`"${script.title}" wird inklusive aller Versionen endgültig gelöscht.`}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </Sheet>
  );
}
