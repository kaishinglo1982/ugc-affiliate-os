"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeProductScore, DIMENSION_LABELS, type ScoreDimensions } from "@/features/products/scoring";
import { PRODUCT_STATUS_LABELS, TREND_STATUS_LABELS, RISK_LABELS } from "@/lib/status-labels";
import type { Result } from "@/types/result";

const DEFAULT_DIMENSIONS: ScoreDimensions = {
  demand: 5,
  commission: 5,
  contentPotential: 5,
  competition: 5,
  problemSolvingPower: 5,
  visualDemonstrability: 5,
  platformFit: 5,
  trendMomentum: 5,
  returnRisk: 5,
  complianceRisk: 5,
};

export interface ProductFormValues {
  id?: string;
  name: string;
  description?: string | null;
  vendor?: string | null;
  category?: string | null;
  tags?: string[];
  targetUrl?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  commissionRate?: number | null;
  audience?: string | null;
  problemSolved?: string | null;
  notes?: string | null;
  status: string;
  trend: string;
  risk: string;
  isFavorite?: boolean;
  dimensions?: ScoreDimensions;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function ProductForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (
    prevState: Result<{ id: string }> | null,
    formData: FormData,
  ) => Promise<Result<{ id: string }>>;
  initialValues?: ProductFormValues;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const [dimensions, setDimensions] = useState<ScoreDimensions>(
    initialValues?.dimensions ?? DEFAULT_DIMENSIONS,
  );

  const scoreResult = useMemo(() => computeProductScore(dimensions), [dimensions]);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      router.push(`/app/products/${state.data.id}`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grunddaten</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]} className="sm:col-span-2">
              <Input id="name" name="name" defaultValue={initialValues?.name} required />
            </FormField>
            <FormField label="Anbieter" htmlFor="vendor">
              <Input id="vendor" name="vendor" defaultValue={initialValues?.vendor ?? ""} />
            </FormField>
            <FormField label="Kategorie" htmlFor="category">
              <Input id="category" name="category" defaultValue={initialValues?.category ?? ""} />
            </FormField>
            <FormField label="Ziel-URL" htmlFor="targetUrl" error={fieldErrors?.targetUrl?.[0]}>
              <Input id="targetUrl" name="targetUrl" type="url" defaultValue={initialValues?.targetUrl ?? ""} />
            </FormField>
            <FormField label="Bild-URL" htmlFor="imageUrl" error={fieldErrors?.imageUrl?.[0]}>
              <Input id="imageUrl" name="imageUrl" type="url" defaultValue={initialValues?.imageUrl ?? ""} />
            </FormField>
            <FormField label="Preis (€)" htmlFor="price">
              <Input id="price" name="price" type="number" step="0.01" min={0} defaultValue={initialValues?.price ?? ""} />
            </FormField>
            <FormField label="Provision (%)" htmlFor="commissionRate">
              <Input
                id="commissionRate"
                name="commissionRate"
                type="number"
                step="0.01"
                min={0}
                max={100}
                defaultValue={initialValues?.commissionRate ?? ""}
              />
            </FormField>
            <FormField label="Tags (kommagetrennt)" htmlFor="tags" className="sm:col-span-2">
              <Input id="tags" name="tags" defaultValue={initialValues?.tags?.join(", ") ?? ""} />
            </FormField>
            <FormField label="Beschreibung" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" name="description" rows={3} defaultValue={initialValues?.description ?? ""} />
            </FormField>
            <FormField label="Zielgruppe" htmlFor="audience" className="sm:col-span-2">
              <Textarea id="audience" name="audience" rows={2} defaultValue={initialValues?.audience ?? ""} />
            </FormField>
            <FormField label="Gelöstes Problem" htmlFor="problemSolved" className="sm:col-span-2">
              <Textarea id="problemSolved" name="problemSolved" rows={2} defaultValue={initialValues?.problemSolved ?? ""} />
            </FormField>
            <FormField label="Notizen" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" name="notes" rows={2} defaultValue={initialValues?.notes ?? ""} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status &amp; Klassifizierung</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Status" htmlFor="status">
              <Select name="status" defaultValue={initialValues?.status ?? "DISCOVERED"}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Trend" htmlFor="trend">
              <Select name="trend" defaultValue={initialValues?.trend ?? "STABLE"}>
                <SelectTrigger id="trend"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TREND_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Risiko" htmlFor="risk">
              <Select name="risk" defaultValue={initialValues?.risk ?? "MEDIUM"}>
                <SelectTrigger id="risk"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="isFavorite" name="isFavorite" value="true" defaultChecked={initialValues?.isFavorite} />
              <Label htmlFor="isFavorite" className="cursor-pointer font-normal">
                Als Favorit markieren
              </Label>
            </div>
          </CardContent>
        </Card>

        {state && !state.success && !fieldErrors ? (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            {state.error}
          </p>
        ) : null}

        <SubmitButton label={submitLabel} />
      </div>

      <div className="space-y-4">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Scoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="text-sm">Live-Gesamtscore</span>
              <span className="text-xl font-semibold tabular-nums">{scoreResult.totalScore}/100</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(dimensions) as Array<keyof ScoreDimensions>).map((dim) => (
                <div key={dim}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <label htmlFor={`dim-${dim}`}>{DIMENSION_LABELS[dim]}</label>
                    <span className="tabular-nums text-[var(--color-foreground-muted)]">{dimensions[dim]}</span>
                  </div>
                  <input
                    id={`dim-${dim}`}
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={dimensions[dim]}
                    onChange={(e) =>
                      setDimensions((prev) => ({ ...prev, [dim]: Number(e.target.value) }))
                    }
                    className="w-full accent-[var(--color-primary)]"
                  />
                </div>
              ))}
            </div>
            <input type="hidden" name="dimensions" value={JSON.stringify(dimensions)} />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
