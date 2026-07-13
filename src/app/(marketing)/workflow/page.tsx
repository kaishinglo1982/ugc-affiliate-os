import type { Metadata } from "next";
import {
  BadgeCheck,
  ClipboardCheck,
  Coins,
  FileVideo,
  Import,
  Link2,
  Radar,
  Rocket,
  ScanSearch,
  Send,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Workflow",
  description: "Der vollständige Ablauf vom Produktfund bis zur Skalierung des Gewinners.",
};

const STEPS = [
  { icon: ScanSearch, title: "1. Produkt finden", description: "Produkt-Radar durchsucht Kategorien, Tags und Anbieter nach vielversprechenden Kandidaten." },
  { icon: Radar, title: "2. Produkt bewerten", description: "Zehn Dimensionen fließen in einen transparenten Gesamtscore — inklusive Compliance- und Retourenrisiko." },
  { icon: Link2, title: "3. Affiliate-Link hinterlegen", description: "Programm zuordnen, UTM-Parameter setzen, Deep Link und Kurzlink speichern." },
  { icon: Wand2, title: "4. Skript erzeugen", description: "Hook, Problem, Demonstration, CTA — als Struktur, lokal generiert oder per LLM-Provider." },
  { icon: FileVideo, title: "5. Video generieren", description: "Skript, Format, Avatar und Voice auswählen; der Job durchläuft QUEUED bis COMPLETED." },
  { icon: ClipboardCheck, title: "6. Content freigeben", description: "Review-Schritt vor jeder Veröffentlichung — keine automatische Publikation ohne Freigabe." },
  { icon: Send, title: "7. Veröffentlichung planen", description: "Plattform, Konto und Zeitpunkt im Kalender festlegen, Caption und Disclosure prüfen." },
  { icon: Import, title: "8. Ergebnisse importieren", description: "Klicks, Views und Conversions den richtigen Kampagnen und Produkten zuordnen." },
  { icon: Coins, title: "9. Umsatz & Kosten analysieren", description: "Deckungsbeitrag je Kampagne, Produkt und Plattform in Echtzeit berechnen." },
  { icon: TrendingUp, title: "10. Gewinner skalieren", description: "Budget, Content-Volumen und Agenten-Fokus auf die stärksten Performer verschieben." },
];

export default function WorkflowPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="End-to-End-Workflow"
        title="Vom ersten Produktfund bis zur Skalierung"
        description="Jeder Schritt ist ein eigenständiges, funktionierendes Modul — verbunden über eine gemeinsame Datenbank."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <ol className="relative space-y-8 border-l border-[var(--color-border)] pl-8">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.03} as="li">
                <span className="absolute -left-[calc(2rem+1px)] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
                  <step.icon className="h-4 w-4 text-[var(--color-primary)]" />
                </span>
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">{step.description}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={0.1} className="mt-12 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <BadgeCheck className="h-6 w-6 shrink-0 text-[var(--color-success)]" />
            <p className="text-sm text-[var(--color-foreground-muted)]">
              <span className="font-medium text-[var(--color-foreground)]">Kein Schritt ist optional simuliert:</span>{" "}
              Status-Übergänge, Freigaben und Audit-Log-Einträge laufen bei jedem Durchlauf mit —
              auch im Mock-Modus.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-6 flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <Rocket className="h-6 w-6 shrink-0 text-[var(--color-cyan)]" />
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Agenten und Automationen können einzelne Schritte deterministisch vorbereiten —
              die finale Veröffentlichung bleibt immer freigabepflichtig.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
