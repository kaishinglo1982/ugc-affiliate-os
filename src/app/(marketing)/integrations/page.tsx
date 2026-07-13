import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Integrationen",
  description: "Kategorien, Status und geplante Provider aller Integrationen im System.",
};

const CATEGORIES: Array<{
  name: string;
  description: string;
  providers: Array<{ name: string; status: "mock" | "geplant" }>;
}> = [
  {
    name: "Affiliate",
    description: "Netzwerke für Provisionen, Tracking und Deep Links.",
    providers: [
      { name: "Amazon Associates", status: "mock" },
      { name: "eBay Partner Network", status: "mock" },
      { name: "Awin", status: "mock" },
      { name: "CJ Affiliate", status: "mock" },
      { name: "Impact", status: "geplant" },
      { name: "Rakuten Advertising", status: "geplant" },
      { name: "ShareASale", status: "mock" },
      { name: "Digistore24", status: "mock" },
      { name: "Adcell", status: "geplant" },
    ],
  },
  {
    name: "Video",
    description: "Rendering-Provider für UGC-Videos, Avatare und Voice.",
    providers: [
      { name: "Higgsfield", status: "mock" },
      { name: "Runway", status: "geplant" },
      { name: "Kling", status: "geplant" },
      { name: "Veo", status: "geplant" },
      { name: "HeyGen", status: "geplant" },
      { name: "ElevenLabs", status: "mock" },
    ],
  },
  {
    name: "AI",
    description: "LLM-Anbieter für Skript- und Textgenerierung.",
    providers: [
      { name: "OpenAI", status: "geplant" },
      { name: "Anthropic", status: "geplant" },
      { name: "Google AI", status: "geplant" },
      { name: "Mistral", status: "geplant" },
      { name: "OpenRouter", status: "geplant" },
    ],
  },
  {
    name: "Social Media",
    description: "Plattformen für Planung und Veröffentlichung.",
    providers: [
      { name: "TikTok", status: "mock" },
      { name: "Instagram", status: "mock" },
      { name: "Facebook", status: "mock" },
      { name: "YouTube Shorts", status: "mock" },
      { name: "Pinterest", status: "mock" },
      { name: "Reddit", status: "mock" },
      { name: "X", status: "mock" },
      { name: "LinkedIn", status: "mock" },
    ],
  },
  {
    name: "Analytics",
    description: "Interne Auswertung aus Kampagnen-, Klick- und Umsatzdaten.",
    providers: [{ name: "Internes Analytics-Modul", status: "mock" }],
  },
  {
    name: "Finance",
    description: "Einnahmen-, Ausgaben- und Steuerrücklagen-Tracking.",
    providers: [{ name: "Internes Finance-Modul", status: "mock" }],
  },
  {
    name: "Storage",
    description: "Medienablage für Skripte, Videos und Assets.",
    providers: [
      { name: "Lokaler Dev-Speicher", status: "mock" },
      { name: "S3-kompatibler Speicher", status: "geplant" },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Integrationsübersicht"
        title="Sieben Kategorien, klarer Status"
        description="Jede Integration läuft im Live-, Sandbox- oder Mock-Modus — sichtbar markiert, nie verschleiert."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content) space-y-10">
          {CATEGORIES.map((category, index) => (
            <Reveal key={category.name} delay={index * 0.02}>
              <div className="mb-3">
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <p className="text-sm text-[var(--color-foreground-muted)]">{category.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.providers.map((provider) => (
                  <Card key={provider.name}>
                    <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-4">
                      <CardTitle className="text-sm font-medium">{provider.name}</CardTitle>
                      <Badge variant={provider.status === "mock" ? "accent" : "outline"}>
                        {provider.status === "mock" ? "Mock verfügbar" : "Geplant"}
                      </Badge>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </Reveal>
          ))}
          <Reveal>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-foreground-muted)]">
              „Mock verfügbar“ bedeutet: Der komplette Workflow funktioniert lokal, ohne echte
              API-Kosten oder externe Veröffentlichungen. Zugangsdaten für Live-Betrieb werden
              ausschließlich serverseitig im API-Tresor hinterlegt.
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
