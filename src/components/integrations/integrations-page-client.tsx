"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  Lightbulb,
  Plug,
  PlugZap,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  saveHuggingFaceSettingsAction,
  disconnectIntegrationAction,
} from "@/server/actions/integrations";
import {
  HUGGINGFACE_TIPS,
  type HuggingFaceConfig,
  type HuggingFaceModel,
} from "@/lib/providers/llm/huggingface";

const toneStyles = {
  violet: {
    border: "border-[var(--color-primary)]/40",
    glow: "shadow-[var(--shadow-glow-violet)]",
    text: "text-[var(--color-violet-soft)]",
    chip: "bg-[var(--color-primary)]/10 text-[var(--color-violet-soft)]",
  },
  cyan: {
    border: "border-[var(--color-accent)]/40",
    glow: "shadow-[var(--shadow-glow-cyan)]",
    text: "text-[var(--color-cyan)]",
    chip: "bg-[var(--color-accent)]/10 text-[var(--color-cyan)]",
  },
  orange: {
    border: "border-[var(--color-warning)]/40",
    glow: "shadow-[var(--shadow-sm)]",
    text: "text-[var(--color-warning)]",
    chip: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  },
};

function ModelCard({
  model,
  selected,
  onSelect,
  index,
}: {
  model: HuggingFaceModel;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const tone = toneStyles[model.tone];
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(model.examplePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full cursor-pointer rounded-lg border p-5 text-left transition-all duration-[var(--motion-duration-base)]",
        selected
          ? cn(tone.border, tone.glow, "bg-[var(--color-surface-raised)]")
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
              tone.chip,
            )}
          >
            {index + 1}
          </span>
          <span className="text-sm font-semibold">{model.name}</span>
        </div>
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
            selected
              ? cn("border-[var(--color-primary)] bg-[var(--color-primary)] text-white")
              : "border-[var(--color-border-strong)] text-transparent",
          )}
        >
          <Check className="h-3 w-3" />
        </span>
      </div>

      <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">{model.strengths}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tone.chip)}>
          {model.useCase}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-foreground-subtle)]">
          {model.modelId}
        </span>
      </div>

      <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-foreground-muted)]">
            <Sparkles className="h-3.5 w-3.5" /> Beispiel-Prompt
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copyPrompt();
            }}
            className="flex cursor-pointer items-center gap-1 text-xs text-[var(--color-foreground-subtle)] transition-colors hover:text-[var(--color-foreground)]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
          {model.examplePrompt}
        </p>
      </div>

      <p className="mt-3 text-xs text-[var(--color-foreground-subtle)]">{model.note}</p>
    </button>
  );
}

function SaveButton({ connected }: { connected: boolean }) {
  return (
    <Button type="submit">
      {connected ? <PlugZap className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
      {connected ? "Einstellungen speichern" : "API-Key verbinden"}
    </Button>
  );
}

function HuggingFaceSection({
  models,
  initialConfig,
  initialStatus,
  maskedKey,
}: {
  models: HuggingFaceModel[];
  initialConfig: HuggingFaceConfig;
  initialStatus: string;
  maskedKey: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState(saveHuggingFaceSettingsAction, null);
  const fieldErrors = state && "fieldErrors" in state && state.fieldErrors ? state.fieldErrors : undefined;
  const connected = initialStatus === "CONNECTED" || Boolean(maskedKey);

  const [selectedModel, setSelectedModel] = useState(
    models.find((m) => m.modelId === initialConfig.model) ?? models[0],
  );
  const [autoSuggest, setAutoSuggest] = useState(initialConfig.autoSuggestHooks);
  const activeModel = useMemo(
    () => models.find((m) => m.modelId === selectedModel.modelId) ?? models[0],
    [selectedModel, models],
  );

  const disconnect = () => {
    startTransition(async () => {
      await disconnectIntegrationAction("huggingface");
      router.refresh();
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-2 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-violet-soft)]">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="flex items-center gap-2">
                HuggingFace
                <Badge variant={connected ? "success" : "outline"}>
                  {connected ? "Verbunden" : "Nicht verbunden"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Serverless Inference für den UGC-Skript-Generator · Keys werden AES-256-GCM-verschlüsselt gespeichert.
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <Button variant="ghost" size="sm" onClick={disconnect} disabled={pending}>
              <RotateCcw className="h-4 w-4" /> Trennen
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <Tabs defaultValue="setup" className="px-5 pt-4">
        <TabsList>
          <TabsTrigger value="setup">
            <KeyRound className="mr-1.5 h-4 w-4" /> Verbinden
          </TabsTrigger>
          <TabsTrigger value="models">
            <Wand2 className="mr-1.5 h-4 w-4" /> Modell wählen
          </TabsTrigger>
          <TabsTrigger value="tips">
            <Lightbulb className="mr-1.5 h-4 w-4" /> Tipps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="pb-5">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="model" value={selectedModel.modelId} />
            <input type="hidden" name="autoSuggestHooks" value={autoSuggest ? "on" : "off"} />
            <FormField
              label="HuggingFace API-Key"
              htmlFor="hf-api-key"
              hint={
                maskedKey
                  ? `Hinterlegt: ${maskedKey} – leer lassen, um den Key zu behalten.`
                  : "Erstellt unter huggingface.co → Settings → Access Tokens (Beginnt mit hf_)."
              }
              error={fieldErrors?.apiKey?.[0]}
            >
              <Input
                id="hf-api-key"
                name="apiKey"
                type="password"
                autoComplete="off"
                placeholder={maskedKey ? "Unverändert lassen" : "hf_…"}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Temperatur"
                htmlFor="hf-temperature"
                hint="0 = deterministisch, 1 = kreativ. Empfehlung für UGC: 0.7"
                error={fieldErrors?.temperature?.[0]}
              >
                <Input
                  id="hf-temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  defaultValue={initialConfig.temperature}
                />
              </FormField>
              <FormField
                label="Max. Tokens"
                htmlFor="hf-max-tokens"
                hint="Obergrenze pro Antwort. 1024 deckt ein komplettes Skript ab."
                error={fieldErrors?.maxTokens?.[0]}
              >
                <Input
                  id="hf-max-tokens"
                  name="maxTokens"
                  type="number"
                  min="16"
                  max="32768"
                  defaultValue={initialConfig.maxTokens}
                />
              </FormField>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4">
              <div>
                <div className="text-sm font-medium">Auto-Hook-Vorschläge</div>
                <div className="text-sm text-[var(--color-foreground-subtle)]">
                  Beim Skript-Erstellen automatisch 3 Hook-Varianten vorschlagen.
                </div>
              </div>
              <Switch checked={autoSuggest} onCheckedChange={setAutoSuggest} />
            </div>
            {state && !state.success ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                {state.error ?? "Speichern fehlgeschlagen."}
              </p>
            ) : null}
            <SaveButton connected={connected} />
          </form>
        </TabsContent>

        <TabsContent value="models" className="pb-5">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Wähle das Modell für Skript-Generierung – Klick auf eine Karte übernimmt die Auswahl und zeigt
              einen passenden Beispiel-Prompt.
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              {models.map((m, i) => (
                <ModelCard
                  key={m.modelId}
                  model={m}
                  index={i}
                  selected={selectedModel.modelId === m.modelId}
                  onSelect={() => setSelectedModel(m)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] px-4 py-3 text-sm text-[var(--color-foreground-muted)]">
              <Sparkles className={cn("h-4 w-4", toneStyles[activeModel.tone].text)} />
              Aktives Modell: <span className="font-medium text-[var(--color-foreground)]">{activeModel.name}</span>
              <ChevronRight className="h-4 w-4" />
              <span>gilt für alle neuen Skripte.</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tips" className="pb-5">
          <Accordion type="single" collapsible className="w-full">
            {HUGGINGFACE_TIPS.map((tip, i) => (
              <AccordionItem key={i} value={`tip-${i}`}>
                <AccordionTrigger>{tip.title}</AccordionTrigger>
                <AccordionContent>{tip.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>

      <CardFooter className="border-t border-[var(--color-border)] bg-[var(--color-surface-overlay)]/50">
        <div className="flex w-full flex-col gap-1.5 text-xs text-[var(--color-foreground-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hinweis: Solange kein Key hinterlegt ist, nutzt das Script Studio den kostenlosen lokalen
            Template-Generator.
          </span>
          <span className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Schlüssel bleiben serverseitig
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

export function IntegrationsPageClient({
  huggingFace,
  models,
}: {
  huggingFace: {
    status: string;
    maskedKey: string | null;
    config: HuggingFaceConfig;
    lastSyncAt: Date | null;
  };
  models: HuggingFaceModel[];
}) {
  void huggingFace.lastSyncAt;
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-foreground-muted)]">
        Weitere Provider (Affiliate, Social, Video) folgen – HuggingFace ist der erste konfigurierbare
        KI-Anbieter.
      </p>
      <HuggingFaceSection
        models={models}
        initialConfig={huggingFace.config}
        initialStatus={huggingFace.status}
        maskedKey={huggingFace.maskedKey}
      />
    </div>
  );
}
