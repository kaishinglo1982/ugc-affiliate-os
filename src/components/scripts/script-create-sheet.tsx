"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Wand2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateScriptAction } from "@/server/actions/scripts";
import { isLlmProviderConfigured, LLM_PROVIDER_KEYS, type LlmProviderKey } from "@/lib/providers/llm/registry";
import type { Result } from "@/types/result";

const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts", "Pinterest", "Facebook", "X", "LinkedIn", "Reddit"];
const TONES = ["Locker", "Professionell", "Humorvoll", "Emotional"];
const HOOK_TYPES = ["Problem-Agitate-Solve", "Frage", "Behauptung", "Vorher-Nachher", "Storytelling"];
const PROVIDER_LABELS: Record<string, string> = {
  template: "Lokales Template (kein API-Key nötig)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
  custom: "Benutzerdefiniert",
};

interface Option {
  id: string;
  label: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      Skript generieren
    </Button>
  );
}

export function ScriptCreateSheet({
  open,
  onOpenChange,
  products,
  campaigns,
  providerAvailability,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Option[];
  campaigns: Option[];
  providerAvailability: Record<LlmProviderKey, boolean>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(generateScriptAction, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>UGC-Skript generieren</SheetTitle>
          <SheetDescription>
            Läuft ohne API-Key über den lokalen Template-Generator. Externe LLM-Provider sind optional.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="mt-6 space-y-4">
          <FormField label="Titel" htmlFor="title" required error={fieldErrors?.title?.[0]}>
            <Input id="title" name="title" placeholder="z. B. Hook-Variante A" required />
          </FormField>
          <FormField label="Produkt" htmlFor="productId">
            <Select name="productId">
              <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Kampagne" htmlFor="campaignId">
            <Select name="campaignId">
              <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Zielgruppe" htmlFor="audience" required error={fieldErrors?.audience?.[0]}>
            <Input id="audience" name="audience" placeholder="z. B. 18-34, gesundheitsbewusst" required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Plattform" htmlFor="platform" required>
              <Select name="platform" defaultValue={PLATFORMS[0]}>
                <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Videolänge (Sek.)" htmlFor="durationSec" required>
              <Input id="durationSec" name="durationSec" type="number" min={5} max={300} defaultValue={30} required />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tonalität" htmlFor="tone" required>
              <Select name="tone" defaultValue={TONES[0]}>
                <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Hook-Typ" htmlFor="hookType" required>
              <Select name="hookType" defaultValue={HOOK_TYPES[0]}>
                <SelectTrigger id="hookType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOOK_TYPES.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="CTA" htmlFor="cta" required error={fieldErrors?.cta?.[0]}>
            <Input id="cta" name="cta" placeholder="z. B. Link in Bio" defaultValue="Link in Bio" required />
          </FormField>
          <FormField label="Provider" htmlFor="provider" hint="Ohne hinterlegten API-Key wird automatisch der lokale Template-Generator verwendet.">
            <Select name="provider" defaultValue="template">
              <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="template">{PROVIDER_LABELS.template}</SelectItem>
                {LLM_PROVIDER_KEYS.map((key) => (
                  <SelectItem key={key} value={key} disabled={!providerAvailability[key]}>
                    {PROVIDER_LABELS[key]} {providerAvailability[key] ? "" : "(kein API-Key hinterlegt)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {state && !state.success && !fieldErrors ? (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          ) : null}
          <SubmitButton />
        </form>
      </SheetContent>
    </Sheet>
  );
}
