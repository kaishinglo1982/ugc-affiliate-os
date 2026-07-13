"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, PlayCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createVideoJobAction } from "@/server/actions/videos";
import type { Result } from "@/types/result";

const PROVIDERS = [
  { value: "MOCK", label: "Mock-Provider (empfohlen ohne API-Key)" },
  { value: "HIGGSFIELD", label: "Higgsfield" },
  { value: "RUNWAY", label: "Runway" },
  { value: "KLING", label: "Kling" },
  { value: "VEO", label: "Veo" },
  { value: "HEYGEN", label: "HeyGen" },
  { value: "ELEVENLABS", label: "ElevenLabs (Voice)" },
];
const FORMATS = ["UGC Talking-Head", "Produkt-Demo", "Unboxing", "Testimonial", "Vorher-Nachher"];
const RATIOS = ["9:16", "1:1", "16:9"];

interface Option {
  id: string;
  label: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
      Video-Job starten
    </Button>
  );
}

export function VideoJobForm({ scripts, products, campaigns }: { scripts: Option[]; products: Option[]; campaigns: Option[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(createVideoJobAction, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      router.push(`/app/videos/${state.data.id}`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Job-Konfiguration</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Skript" htmlFor="scriptId">
            <Select name="scriptId">
              <SelectTrigger id="scriptId"><SelectValue placeholder="Kein Skript" /></SelectTrigger>
              <SelectContent>
                {scripts.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Produkt" htmlFor="productId">
            <Select name="productId">
              <SelectTrigger id="productId"><SelectValue placeholder="Kein Produkt" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Kampagne" htmlFor="campaignId">
            <Select name="campaignId">
              <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Provider" htmlFor="provider" required>
            <Select name="provider" defaultValue="MOCK">
              <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Format" htmlFor="format" required error={fieldErrors?.format?.[0]}>
            <Select name="format" defaultValue={FORMATS[0]}>
              <SelectTrigger id="format"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Seitenverhältnis" htmlFor="aspectRatio" required>
            <Select name="aspectRatio" defaultValue={RATIOS[0]}>
              <SelectTrigger id="aspectRatio"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RATIOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Dauer (Sek.)" htmlFor="durationSec" required>
            <Input id="durationSec" name="durationSec" type="number" min={3} max={600} defaultValue={30} required />
          </FormField>
          <FormField label="Sprache" htmlFor="language" required>
            <Select name="language" defaultValue="de">
              <SelectTrigger id="language"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">Englisch</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Stil" htmlFor="style">
            <Input id="style" name="style" placeholder="z. B. natürlich, hell" />
          </FormField>
          <FormField label="Avatar" htmlFor="avatar">
            <Input id="avatar" name="avatar" placeholder="z. B. weiblich, 30er" />
          </FormField>
          <FormField label="Voice" htmlFor="voice">
            <Input id="voice" name="voice" placeholder="z. B. warm, freundlich" />
          </FormField>
          <FormField label="Musik" htmlFor="music">
            <Input id="music" name="music" placeholder="z. B. upbeat" />
          </FormField>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox id="subtitles" name="subtitles" value="true" defaultChecked />
            <Label htmlFor="subtitles" className="cursor-pointer font-normal">Untertitel einblenden</Label>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Mock-Simulation</CardTitle></CardHeader>
          <CardContent>
            <FormField
              label="Ergebnis erzwingen (nur Mock)"
              htmlFor="simulateOutcome"
              hint="Zum Testen des vollständigen Lifecycles inkl. Fehler- und Review-Fällen."
            >
              <Select name="simulateOutcome" defaultValue="success">
                <SelectTrigger id="simulateOutcome"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Erfolgreich abschließen</SelectItem>
                  <SelectItem value="review">Review erforderlich</SelectItem>
                  <SelectItem value="failure">Fehlschlagen (simuliert)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>
        {state && !state.success && !fieldErrors ? (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
        ) : null}
        <SubmitButton />
      </div>
    </form>
  );
}
