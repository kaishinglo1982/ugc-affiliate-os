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
import { REVENUE_STATUS_LABELS } from "@/lib/status-labels";
import { saveRevenueAction } from "@/server/actions/finance";
import type { Result } from "@/types/result";

interface Option {
  id: string;
  label: string;
}

export interface RevenueInitial {
  id: string;
  date: string;
  programId: string | null;
  productId: string | null;
  campaignId: string | null;
  platform: string | null;
  grossAmount: string;
  status: string;
  reference: string | null;
  notes: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Speichern
    </Button>
  );
}

export function RevenueDialog({
  initial,
  programs,
  products,
  campaigns,
}: {
  initial?: RevenueInitial;
  programs: Option[];
  products: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = saveRevenueAction.bind(null, initial?.id ?? null);
  const [state, formAction] = useActionState(action, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
            <Plus className="h-4 w-4" /> Einnahme erfassen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Einnahme bearbeiten" : "Einnahme erfassen"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Datum" htmlFor="date" required error={fieldErrors?.date?.[0]}>
              <Input id="date" name="date" type="date" defaultValue={initial?.date} required />
            </FormField>
            <FormField label="Betrag (EUR)" htmlFor="grossAmount" required error={fieldErrors?.grossAmount?.[0]}>
              <Input id="grossAmount" name="grossAmount" type="number" step="0.01" min="0" defaultValue={initial?.grossAmount} required />
            </FormField>
          </div>
          <FormField label="Status" htmlFor="status" required>
            <Select name="status" defaultValue={initial?.status ?? "PENDING"}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REVENUE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Affiliate-Programm" htmlFor="programId">
            <Select name="programId" defaultValue={initial?.programId ?? undefined}>
              <SelectTrigger id="programId"><SelectValue placeholder="Kein Programm" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Produkt" htmlFor="productId">
              <Select name="productId" defaultValue={initial?.productId ?? undefined}>
                <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Kampagne" htmlFor="campaignId">
              <Select name="campaignId" defaultValue={initial?.campaignId ?? undefined}>
                <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Plattform" htmlFor="platform" hint="z. B. TikTok, Instagram, YouTube">
            <Input id="platform" name="platform" defaultValue={initial?.platform ?? ""} />
          </FormField>
          <FormField label="Referenz" htmlFor="reference" hint="z. B. Transaktions-/Auszahlungs-ID">
            <Input id="reference" name="reference" defaultValue={initial?.reference ?? ""} />
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
