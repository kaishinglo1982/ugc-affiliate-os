"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importProductsCsvAction } from "@/server/actions/products";
import type { Result } from "@/types/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Importieren
    </Button>
  );
}

export function CsvImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(importProductsCsvAction, null as Result<{ imported: number }> | null);
  const [fileName, setFileName] = useState<string | null>(null);
  const csvFieldRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    if (csvFieldRef.current) csvFieldRef.current.value = text;
  }

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Produkte per CSV importieren</DialogTitle>
          <DialogDescription>
            Erwartete Spalten: name (erforderlich), category, vendor, price, commissionRate, tags.
            Score-Dimensionen werden mit neutralen Standardwerten (5/10) importiert und können danach
            angepasst werden.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="text-sm" />
          {fileName ? (
            <p className="text-xs text-[var(--color-foreground-muted)]">Ausgewählt: {fileName}</p>
          ) : null}
          <input ref={csvFieldRef} type="hidden" name="csv" />
          {state && !state.success ? (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">
              {state.error}
            </p>
          ) : null}
          {state?.success ? (
            <p className="text-sm text-[var(--color-success)]">
              {state.data.imported} Produkt(e) importiert.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
