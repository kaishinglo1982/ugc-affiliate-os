import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Features",
  description: "Detaillierte Feature-Übersicht des UGC Affiliate Operating Systems.",
};

const TABS = [
  {
    value: "radar",
    label: "Produkt-Radar",
    title: "Transparentes Scoring statt Bauchgefühl",
    points: [
      "10 Bewertungsdimensionen: Nachfrage, Provision, Content-Potenzial, Wettbewerb u.v.m.",
      "Nachvollziehbare Gewichtung — jeder Score zeigt seine Zusammensetzung.",
      "CSV-Import/-Export, Favoriten, Status- und Trendfilter.",
    ],
  },
  {
    value: "scripts",
    label: "Skript-Studio",
    title: "Vom Hook bis zur Szenenliste",
    points: [
      "Lokaler Template-Generator funktioniert ohne jeden API-Key.",
      "Provider-Interface für OpenAI, Anthropic, Google, Mistral, OpenRouter.",
      "Versionierung, Duplizieren, Freigabe- und Archiv-Status.",
    ],
  },
  {
    value: "video",
    label: "Video-Studio",
    title: "Kompletter Job-Lifecycle, auch ohne Provider",
    points: [
      "QUEUED → PROCESSING → REVIEW_REQUIRED/COMPLETED/FAILED/CANCELLED.",
      "Provider-Architektur für Higgsfield, Runway, Kling, Veo, HeyGen, ElevenLabs.",
      "Mock-Provider simuliert den gesamten Ablauf inklusive Fehlerfällen.",
    ],
  },
  {
    value: "publishing",
    label: "Publishing",
    title: "Acht Plattformen, ein Kalender",
    points: [
      "TikTok, Instagram, Facebook, YouTube Shorts, Pinterest, Reddit, X, LinkedIn.",
      "Disclosure-Feld und Affiliate-Link fest im Post-Composer verankert.",
      "Freigabe-Pflicht vor jeder Veröffentlichung — auch im Mock-Modus.",
    ],
  },
  {
    value: "finance",
    label: "Finance",
    title: "Einnahmen, Ausgaben, Rücklagen",
    points: [
      "Deckungsbeitrag je Kampagne, Produkt und Plattform.",
      "Konfigurierbare, klar als Schätzung markierte Steuerrücklage.",
      "Monats- und Quartalsvergleich mit Export.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Feature-Übersicht"
        title="Jedes Modul ist echt nutzbar"
        description="Keine Demo-Screens — jede hier gezeigte Funktion speichert, validiert und protokolliert im geschützten Bereich."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal>
            <Tabs defaultValue="radar">
              <TabsList className="flex-wrap h-auto">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <Card>
                    <CardHeader>
                      <Badge variant="accent" className="mb-2 w-fit">
                        {tab.label}
                      </Badge>
                      <CardTitle className="text-xl">{tab.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {tab.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm text-[var(--color-foreground-muted)]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </Reveal>

          <Reveal delay={0.1} className="mt-16">
            <h2 className="text-2xl font-semibold tracking-tight">Weitere Bausteine</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Command Palette", description: "Jede Kernaktion per Tastatur — Produkt anlegen, Skript erzeugen, Veröffentlichung planen." },
                { title: "Agenten-Zentrale", description: "12 deterministische Agenten mit Logs, Erfolgsquote und manueller Steuerung." },
                { title: "Automationen", description: "Trigger, Bedingungen und Aktionen ohne freie Shell-Ausführung." },
                { title: "API-Tresor", description: "AES-256-GCM-verschlüsselte Zugangsdaten, maskiert, mit Rotation und Audit-Log." },
                { title: "Analytics", description: "Von CTR bis ROAS, mit Filtern über Zeitraum, Plattform, Produkt und Kampagne." },
                { title: "Audit-Log", description: "Jede Statusänderung und Mutation ist nachvollziehbar protokolliert." },
              ].map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
