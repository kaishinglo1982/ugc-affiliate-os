"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AFFILIATE_PROVIDER_LABELS } from "@/lib/status-labels";
import { saveAffiliateProgramAction } from "@/server/actions/affiliate-programs";
import type { Result } from "@/types/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Speichern
    </Button>
  );
}

export interface ProgramDialogInitial {
  id: string;
  provider: string;
  customName: string | null;
  trackingId: string | null;
  notes: string | null;
}

export function ProgramDialog({ initial }: { initial?: ProgramDialogInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = saveAffiliateProgramAction.bind(null, initial?.id ?? null);
  const [state, formAction] = useActionState(action, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="sm">Bearbeiten</Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Programm anlegen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Programm bearbeiten" : "Affiliate-Programm anlegen"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Anbieter" htmlFor="provider" required>
            <Select name="provider" defaultValue={initial?.provider ?? "AMAZON_ASSOCIATES"}>
              <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AFFILIATE_PROVIDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Eigener Name (optional)" htmlFor="customName">
            <Input id="customName" name="customName" defaultValue={initial?.customName ?? ""} />
          </FormField>
          <FormField label="Tracking-ID" htmlFor="trackingId" hint="z. B. dein Amazon Associates Tag">
            <Input id="trackingId" name="trackingId" defaultValue={initial?.trackingId ?? ""} />
          </FormField>
          <FormField
            label="API-Key / Zugangsdaten (optional)"
            htmlFor="apiKey"
            hint="Wird serverseitig AES-256-GCM-verschlüsselt gespeichert, nie im Klartext zurückgegeben."
          >
            <Input id="apiKey" name="apiKey" type="password" autoComplete="off" placeholder={initial ? "Unverändert lassen" : ""} />
          </FormField>
          <FormField label="Notizen" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
          </FormField>
          {state && !state.success && !fieldErrors ? (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
