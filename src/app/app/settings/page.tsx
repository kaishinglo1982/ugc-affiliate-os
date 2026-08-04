import type { Metadata } from "next";
import Link from "next/link";
import { BrainCircuit, KeyRound, Plug, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { isLlmProviderConfigured, LLM_PROVIDER_KEYS } from "@/lib/providers/llm/registry";

export const metadata: Metadata = { title: "Einstellungen" };

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
  custom: "Benutzerdefiniert",
};

export default async function SettingsPage() {
  const hfIntegration = await prisma.integration.findUnique({
    where: { providerKey: "huggingface" },
    select: { status: true, credentialId: true },
  });

  const providerStatus: { key: string; label: string; configured: boolean; stored: boolean }[] =
    LLM_PROVIDER_KEYS.map((key) => ({
      key,
      label: PROVIDER_LABELS[key],
      configured: isLlmProviderConfigured(key),
      stored: key === "huggingface" && hfIntegration?.status === "CONNECTED",
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            KI-Provider, Zugangsdaten und Modell-Konfiguration.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/integrations">
            <Plug className="h-4 w-4" /> Integrationen öffnen
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--color-foreground-muted)]" />
            LLM-Provider
          </CardTitle>
          <CardDescription>
            Hinterlegte API-Keys (Umgebungsvariablen) und gespeicherte Zugangsdaten im Überblick.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {providerStatus.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)]">
                    {p.key === "huggingface" ? (
                      <BrainCircuit className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </span>
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
                {p.stored ? (
                  <Badge variant="success">Verbunden</Badge>
                ) : p.configured ? (
                  <Badge variant="primary">Env-Key</Badge>
                ) : (
                  <Badge variant="outline">Aus</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-foreground-muted)]" />
            KI-Modell-Empfehlungen
          </CardTitle>
          <CardDescription>
            HuggingFace als verfügbarer Anbieter einrichten und das passende Modell für UGC-Skripte wählen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-(--container-content) text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            Unter <span className="font-medium text-[var(--color-foreground)]">Integrationen → HuggingFace</span>{" "}
            legst du deinen API-Key ab, wählst ein Modell (Llama 3.1 8B, Qwen 2.5 7B oder Gemma 2 2B) und
            stellst Temperatur, Token-Grenze und Auto-Hook-Vorschläge ein. Alle Keys werden serverseitig
            verschlüsselt gespeichert und nie im Klartext angezeigt.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/app/integrations">
                <Sparkles className="h-4 w-4" /> HuggingFace konfigurieren
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}