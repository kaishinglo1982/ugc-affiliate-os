import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Produktrecherche",
  description: "Wie Produkt-Radar, Scoring und Trendanalyse zusammenspielen.",
};

const DIMENSIONS = [
  { name: "Nachfrage", weight: "16 %" },
  { name: "Content-Potenzial", weight: "14 %" },
  { name: "Provision", weight: "12 %" },
  { name: "Problemlösungsstärke", weight: "12 %" },
  { name: "Visuelle Demonstrierbarkeit", weight: "10 %" },
  { name: "Trenddynamik", weight: "10 %" },
  { name: "Wettbewerb (invertiert)", weight: "8 %" },
  { name: "Plattform-Fit", weight: "8 %" },
  { name: "Retourenrisiko (invertiert)", weight: "5 %" },
  { name: "Compliance-Risiko (invertiert)", weight: "5 %" },
];

export default function ProductResearchPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Produkt-Radar"
        title="Scoring, das seine eigene Logik zeigt"
        description="Kein Black-Box-Score: Jede Bewertung im Produkt-Radar lässt sich bis auf die einzelne Dimension zurückverfolgen."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-(--container-content) gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <h2 className="text-2xl font-semibold">Wie der Gesamtscore entsteht</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              Jedes Produkt wird in zehn Dimensionen von 0–10 bewertet. Risiko- und
              Wettbewerbs-Dimensionen werden invertiert gewichtet, damit ein höherer Rohwert den
              Gesamtscore korrekt senkt statt erhöht. Das Ergebnis ist ein 0–100-Score mit
              vollständig nachvollziehbarer Aufschlüsselung im Produkt-Radar.
            </p>
            <div className="mt-6 space-y-2">
              {DIMENSIONS.map((dim) => (
                <div
                  key={dim.name}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm"
                >
                  <span>{dim.name}</span>
                  <span className="font-mono text-[var(--color-cyan)]">{dim.weight}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trendanalyse</CardTitle>
                <CardDescription>
                  Jedes Produkt trägt einen Trendstatus: Emerging, Growing, Stable, Declining oder
                  Saturated — als Frühwarnsystem gegen zu spätes Skalieren.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risikoklassifizierung</CardTitle>
                <CardDescription>
                  Low/Medium/High-Risiko fließt separat in Kampagnenentscheidungen ein — unabhängig
                  vom Gesamtscore, damit riskante Top-Scorer nicht übersehen werden.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardContent className="pt-5 text-sm text-[var(--color-foreground-muted)]">
                CSV-Import und -Export machen den Produkt-Radar kompatibel mit externer Recherche
                — Score-Neuberechnung erfolgt automatisch nach jedem Import.
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  );
}
