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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/status-labels";
import { saveExpenseAction } from "@/server/actions/finance";
import type { Result } from "@/types/result";

interface Option {
  id: string;
  label: string;
}

export interface ExpenseInitial {
  id: string;
  date: string;
  category: string;
  vendor: string | null;
  campaignId: string | null;
  productId: string | null;
  amount: string;
  isRecurring: boolean;
  isTaxRelevant: boolean;
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

export function ExpenseDialog({
  initial,
  products,
  campaigns,
}: {
  initial?: ExpenseInitial;
  products: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = saveExpenseAction.bind(null, initial?.id ?? null);
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
            <Plus className="h-4 w-4" /> Ausgabe erfassen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Ausgabe bearbeiten" : "Ausgabe erfassen"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Datum" htmlFor="date" required error={fieldErrors?.date?.[0]}>
              <Input id="date" name="date" type="date" defaultValue={initial?.date} required />
            </FormField>
            <FormField label="Betrag (EUR)" htmlFor="amount" required error={fieldErrors?.amount?.[0]}>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={initial?.amount} required />
            </FormField>
          </div>
          <FormField label="Kategorie" htmlFor="category" required>
            <Select name="category" defaultValue={initial?.category ?? "OTHER"}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Anbieter" htmlFor="vendor">
            <Input id="vendor" name="vendor" defaultValue={initial?.vendor ?? ""} />
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="isRecurring" name="isRecurring" value="true" defaultChecked={initial?.isRecurring} />
              <Label htmlFor="isRecurring" className="cursor-pointer font-normal">Wiederkehrend</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isTaxRelevant" name="isTaxRelevant" value="true" defaultChecked={initial?.isTaxRelevant ?? true} />
              <Label htmlFor="isTaxRelevant" className="cursor-pointer font-normal">Steuerrelevant</Label>
            </div>
          </div>
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
