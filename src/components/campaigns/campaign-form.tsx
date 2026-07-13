"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/status-labels";
import type { Result } from "@/types/result";

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube Shorts", "Pinterest", "Reddit", "X", "LinkedIn"];

interface Option {
  id: string;
  label: string;
}

export interface CampaignFormInitial {
  id?: string;
  name: string;
  productId?: string | null;
  affiliateLinkId?: string | null;
  audience?: string | null;
  targetPlatforms?: string[];
  contentGoal?: string | null;
  budget?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  notes?: string | null;
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

export function CampaignForm({
  action,
  initial,
  products,
  links,
  submitLabel,
}: {
  action: (
    prevState: Result<{ id: string }> | null,
    formData: FormData,
  ) => Promise<Result<{ id: string }>>;
  initial?: CampaignFormInitial;
  products: Option[];
  links: Option[];
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      router.push(`/app/campaigns/${state.data.id}`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kampagnendetails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]} className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </FormField>
          <FormField label="Produkt" htmlFor="productId">
            <Select name="productId" defaultValue={initial?.productId ?? undefined}>
              <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Affiliate-Link" htmlFor="affiliateLinkId">
            <Select name="affiliateLinkId" defaultValue={initial?.affiliateLinkId ?? undefined}>
              <SelectTrigger id="affiliateLinkId"><SelectValue placeholder="Kein Link" /></SelectTrigger>
              <SelectContent>
                {links.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Budget (€)" htmlFor="budget">
            <Input id="budget" name="budget" type="number" step="0.01" min={0} defaultValue={initial?.budget ?? ""} />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <Select name="status" defaultValue={initial?.status ?? "DRAFT"}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Start" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" defaultValue={initial?.startDate ?? ""} />
          </FormField>
          <FormField label="Ende" htmlFor="endDate">
            <Input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} />
          </FormField>
          <FormField label="Zielgruppe" htmlFor="audience" className="sm:col-span-2">
            <Textarea id="audience" name="audience" rows={2} defaultValue={initial?.audience ?? ""} />
          </FormField>
          <FormField label="Content-Ziel" htmlFor="contentGoal" className="sm:col-span-2">
            <Textarea id="contentGoal" name="contentGoal" rows={2} defaultValue={initial?.contentGoal ?? ""} />
          </FormField>
          <div className="sm:col-span-2">
            <Label>Zielplattformen</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    name="targetPlatforms"
                    value={platform}
                    defaultChecked={initial?.targetPlatforms?.includes(platform)}
                  />
                  <Label htmlFor={`platform-${platform}`} className="cursor-pointer text-sm font-normal">
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <FormField label="Notizen" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {state && !state.success && !fieldErrors ? (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
        ) : null}
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
