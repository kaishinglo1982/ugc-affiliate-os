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
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AFFILIATE_PROVIDER_LABELS } from "@/lib/status-labels";
import { saveAffiliateLinkAction } from "@/server/actions/affiliate-links";
import type { Result } from "@/types/result";

interface Option {
  id: string;
  label: string;
}

export interface LinkDialogInitial {
  id: string;
  programId: string;
  productId: string | null;
  label: string;
  destinationUrl: string;
  platform: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
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

export function LinkDialog({
  programs,
  products,
  initial,
}: {
  programs: Array<Option & { provider: string }>;
  products: Option[];
  initial?: LinkDialogInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = saveAffiliateLinkAction.bind(null, initial?.id ?? null);
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
            <Plus className="h-4 w-4" /> Link erstellen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Link bearbeiten" : "Affiliate-Link erstellen"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <FormField label="Bezeichnung" htmlFor="label" required error={fieldErrors?.label?.[0]}>
            <Input id="label" name="label" defaultValue={initial?.label} required />
          </FormField>
          <FormField label="Programm" htmlFor="programId" required error={fieldErrors?.programId?.[0]}>
            <Select name="programId" defaultValue={initial?.programId}>
              <SelectTrigger id="programId"><SelectValue placeholder="Programm wählen" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label || AFFILIATE_PROVIDER_LABELS[p.provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Produkt (optional)" htmlFor="productId">
            <Select name="productId" defaultValue={initial?.productId ?? undefined}>
              <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Ziel-URL" htmlFor="destinationUrl" required error={fieldErrors?.destinationUrl?.[0]}>
            <Input id="destinationUrl" name="destinationUrl" type="url" defaultValue={initial?.destinationUrl} required />
          </FormField>
          <FormField label="Plattform" htmlFor="platform">
            <Input id="platform" name="platform" defaultValue={initial?.platform ?? ""} placeholder="z. B. TikTok" />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="utm_source" htmlFor="utmSource">
              <Input id="utmSource" name="utmSource" defaultValue={initial?.utmSource ?? ""} />
            </FormField>
            <FormField label="utm_medium" htmlFor="utmMedium">
              <Input id="utmMedium" name="utmMedium" defaultValue={initial?.utmMedium ?? ""} />
            </FormField>
            <FormField label="utm_campaign" htmlFor="utmCampaign">
              <Input id="utmCampaign" name="utmCampaign" defaultValue={initial?.utmCampaign ?? ""} />
            </FormField>
          </div>
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
