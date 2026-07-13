"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/finance/format";
import { saveTaxSettingAction } from "@/server/actions/finance";
import type { Result } from "@/types/result";

export interface TaxReserveData {
  provisionalProfit: number;
  generalReserve: number;
  tradeTaxReserve: number;
  incomeTaxReserve: number;
  totalReserve: number;
  netAfterReserve: number;
}

export interface TaxSettingInitial {
  reserveRatePercent: string;
  vatRatePercent: string;
  vatEnabled: boolean;
  tradeTaxReservePercent: string;
  incomeTaxReservePercent: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Einstellungen speichern
    </Button>
  );
}

export function TaxReservePanel({ reserve, setting }: { reserve: TaxReserveData; setting: TaxSettingInitial }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveTaxSettingAction, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
            Steuerrücklage — unverbindliche Schätzung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-foreground-subtle)]">
            Reine Planungshilfe auf Basis der hinterlegten Prozentsätze — keine Steuerberatung und nicht rechtsverbindlich.
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Vorläufiger Gewinn</dt><dd className="tabular-nums font-medium">{formatEuro(reserve.provisionalProfit)}</dd></div>
            <div className="flex justify-between text-[var(--color-foreground-muted)]"><dt>Allgemeine Rücklage</dt><dd className="tabular-nums">{formatEuro(reserve.generalReserve)}</dd></div>
            <div className="flex justify-between text-[var(--color-foreground-muted)]"><dt>Gewerbesteuer-Rücklage</dt><dd className="tabular-nums">{formatEuro(reserve.tradeTaxReserve)}</dd></div>
            <div className="flex justify-between text-[var(--color-foreground-muted)]"><dt>Einkommensteuer-Rücklage</dt><dd className="tabular-nums">{formatEuro(reserve.incomeTaxReserve)}</dd></div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold"><dt>Rücklage gesamt</dt><dd className="tabular-nums">{formatEuro(reserve.totalReserve)}</dd></div>
            <div className="flex justify-between font-semibold text-[var(--color-success)]"><dt>Verbleibend nach Rücklage</dt><dd className="tabular-nums">{formatEuro(reserve.netAfterReserve)}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rücklage-Einstellungen</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <FormField label="Allgemeine Rücklage (%)" htmlFor="reserveRatePercent" error={fieldErrors?.reserveRatePercent?.[0]}>
              <Input id="reserveRatePercent" name="reserveRatePercent" type="number" step="0.1" min="0" max="100" defaultValue={setting.reserveRatePercent} required />
            </FormField>
            <FormField label="Gewerbesteuer-Rücklage (%)" htmlFor="tradeTaxReservePercent">
              <Input id="tradeTaxReservePercent" name="tradeTaxReservePercent" type="number" step="0.1" min="0" max="100" defaultValue={setting.tradeTaxReservePercent} required />
            </FormField>
            <FormField label="Einkommensteuer-Rücklage (%)" htmlFor="incomeTaxReservePercent">
              <Input id="incomeTaxReservePercent" name="incomeTaxReservePercent" type="number" step="0.1" min="0" max="100" defaultValue={setting.incomeTaxReservePercent} required />
            </FormField>
            <FormField label="USt.-Satz (%)" htmlFor="vatRatePercent" hint="Nur relevant, falls umsatzsteuerpflichtig.">
              <Input id="vatRatePercent" name="vatRatePercent" type="number" step="0.1" min="0" max="100" defaultValue={setting.vatRatePercent} required />
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox id="vatEnabled" name="vatEnabled" value="true" defaultChecked={setting.vatEnabled} />
              <Label htmlFor="vatEnabled" className="cursor-pointer font-normal">Umsatzsteuerpflichtig (kein Kleinunternehmer)</Label>
            </div>
            {state && !state.success && !fieldErrors ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
            ) : null}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
