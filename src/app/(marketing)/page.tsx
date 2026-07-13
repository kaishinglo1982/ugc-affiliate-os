import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Coins,
  Layers,
  LineChart,
  Link2,
  PlayCircle,
  Radar,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { HeroCanvas } from "@/components/three/hero-canvas";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Persönliches Betriebssystem für UGC-Affiliate-Content",
  description:
    "Vom Produktfund über UGC-Skripte und Video-Automation bis zu Multi-Plattform-Publishing, Analytics und Finance — ein Dashboard für den gesamten Affiliate-Workflow.",
};

const WORKFLOW_STEPS = [
  { title: "Produkt finden", description: "Produkt-Radar mit transparentem Scoring." },
  { title: "Produkt bewerten", description: "10-dimensionale Bewertung, ein Gesamtscore." },
  { title: "Affiliate-Link hinterlegen", description: "UTM-Builder & Deep Links pro Programm." },
  { title: "Skript erzeugen", description: "Lokaler Template-Generator oder LLM-Provider." },
  { title: "Video generieren", description: "Provider-Architektur mit Mock-Lifecycle." },
  { title: "Content freigeben", description: "Review-Schritt vor jeder Veröffentlichung." },
  { title: "Veröffentlichung planen", description: "Kalender über acht Plattformen hinweg." },
  { title: "Ergebnisse importieren", description: "Klicks, Views und Conversions einordnen." },
  { title: "Umsatz & Kosten analysieren", description: "Deckungsbeitrag je Kampagne/Produkt." },
  { title: "Gewinner skalieren", description: "Budget und Content auf Top-Performer verlagern." },
];

const FAQ_ITEMS = [
  {
    q: "Ist das eine Multi-User-SaaS-Plattform?",
    a: "Nein. Das System ist bewusst für einen einzelnen Betreiber gebaut — keine Registrierung, kein Team-Management. Die Architektur ist aber so sauber getrennt, dass Multi-Tenancy später ergänzt werden könnte.",
  },
  {
    q: "Was passiert ohne echte API-Keys?",
    a: "Jede externe Integration hat einen realistischen Mock-Modus. Video-Jobs durchlaufen den kompletten Lifecycle lokal, Veröffentlichungen werden simuliert, und die Oberfläche zeigt immer klar an, ob eine Integration im Live-, Sandbox- oder Mock-Modus läuft.",
  },
  {
    q: "Wie werden API-Zugangsdaten gespeichert?",
    a: "Ausschließlich serverseitig, AES-256-GCM-verschlüsselt, maskiert angezeigt und nie im Client-Bundle oder in Logs. Jede Rotation erzeugt einen Audit-Log-Eintrag.",
  },
  {
    q: "Sind die Finanz- und Steuerzahlen verbindlich?",
    a: "Nein. Die Steuerübersicht ist eine konfigurierbare, unverbindliche Schätzung zur Rücklagenplanung — keine Steuerberatung.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-grid-fade px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-(--container-content) items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Badge variant="primary" className="mb-4">
              <Sparkles className="h-3 w-3" /> Single-User Operating System
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-5xl">
              Ein Betriebssystem für dein gesamtes UGC-Affiliate-Geschäft
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--color-foreground-muted)]">
              Produktrecherche, UGC-Skripte, Video-Automation, Multi-Plattform-Publishing,
              Analytics und Finance — an einem Ort, mit echten Workflows statt Demo-Buttons.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/app/dashboard">
                  Dashboard öffnen <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/workflow">
                  <PlayCircle className="h-4 w-4" /> Workflow ansehen
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroCanvas />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal>
            <div className="glass-panel rounded-xl p-4 shadow-[var(--shadow-lg)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Monatsumsatz", value: "€ 4.180", tone: "text-[var(--color-cyan)]" },
                  { label: "Aktive Kampagnen", value: "6", tone: "text-[var(--color-violet-soft)]" },
                  { label: "Conversion Rate", value: "3,4 %", tone: "text-[var(--color-orange)]" },
                  { label: "Video-Jobs abgeschlossen", value: "128", tone: "text-[var(--color-success)]" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-[var(--color-surface)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                      {stat.label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-[var(--color-foreground-subtle)]">
                Beispielhafte Dashboard-Vorschau — echte Werte stammen aus deiner Datenbank.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8" id="features">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Sechs Systeme, ein Workflow</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              Jeder Bereich ist ein voll funktionsfähiges Modul mit echter Datenbankanbindung —
              keine statischen Vorschauen.
            </p>
          </Reveal>
          <StaggerList className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Radar,
                title: "Produktrecherche",
                description:
                  "Produkt-Radar mit zehn Scoring-Dimensionen, Trend- und Risikobewertung, CSV-Import/-Export.",
                href: "/product-research",
              },
              {
                icon: Wand2,
                title: "UGC-Erstellung",
                description:
                  "Skript-Studio mit lokalem Template-Generator und Provider-Interface für LLM-Anbieter.",
                href: "/video-automation",
              },
              {
                icon: Send,
                title: "Multi-Platform-Publishing",
                description:
                  "Planung über TikTok, Instagram, YouTube Shorts, Pinterest, Reddit, X, LinkedIn und Facebook.",
                href: "/workflow",
              },
              {
                icon: LineChart,
                title: "Analytics",
                description:
                  "Von Impressions bis ROAS — Plattform-, Produkt- und Kampagnenvergleich mit reagierenden Filtern.",
                href: "/features",
              },
              {
                icon: Coins,
                title: "Finance",
                description:
                  "Einnahmen, Ausgaben, Deckungsbeitrag und eine unverbindliche Steuerrücklagen-Schätzung.",
                href: "/features",
              },
              {
                icon: Bot,
                title: "Agenten & Automationen",
                description:
                  "Zwölf deterministische Agenten und ein Automation-Builder — Veröffentlichung immer mit Freigabe.",
                href: "/features",
              },
            ].map((feature) => (
              <StaggerItem key={feature.title}>
                <Card className="group h-full transition-shadow hover:shadow-[var(--shadow-glow-violet)]">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-violet-soft)]">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={feature.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Mehr erfahren <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6 lg:px-8" id="workflow">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Der komplette Workflow</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              Zehn Schritte vom ersten Produktfund bis zur Skalierung des Gewinners.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.03}>
                <div className="h-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <span className="text-xs font-mono text-[var(--color-cyan)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8">
            <Button variant="outline" asChild>
              <Link href="/workflow">
                Vollständigen Workflow ansehen <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Integrationen mit klarem Status</h2>
            <p className="mt-3 text-[var(--color-foreground-muted)]">
              Jede Integration zeigt sichtbar, ob sie im Live-, Sandbox- oder Mock-Modus läuft.
            </p>
          </Reveal>
          <StaggerList className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              "Amazon Associates",
              "Digistore24",
              "Awin",
              "ShareASale",
              "Higgsfield",
              "ElevenLabs",
              "OpenAI",
              "Anthropic",
              "TikTok",
              "Instagram",
              "YouTube Shorts",
              "Pinterest",
            ].map((name) => (
              <StaggerItem key={name}>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-foreground-subtle)]" />
                  <span className="text-sm">{name}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/integrations">
                Alle Integrationen ansehen <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-(--container-content)">
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Häufige Fragen</h2>
          </Reveal>
          <Reveal>
            <Accordion type="single" collapsible className="max-w-3xl">
              {FAQ_ITEMS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-raised)] p-10 text-center shadow-[var(--shadow-lg)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-violet-soft)]">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bereit für dein persönliches Operations-Dashboard?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--color-foreground-muted)]">
            Alle Module sind produktiv nutzbar — mit lokalen Mock-Providern, wo noch keine
            externen Zugangsdaten hinterlegt sind.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/app/dashboard">
                Dashboard öffnen <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                <Link2 className="h-4 w-4" /> Kontakt aufnehmen
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
