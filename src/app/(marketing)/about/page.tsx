import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description: "Persönliches Projekt, Vision und Systemidee des UGC Affiliate Operating Systems.",
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Über das Projekt"
        title="Ein persönliches Betriebssystem, kein SaaS-Produkt"
        description="Gebaut für einen einzelnen Betreiber, der UGC-Affiliate-Marketing ernsthaft und strukturiert betreibt."
      />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <Reveal>
            <h2 className="text-xl font-semibold">Die Ausgangslage</h2>
            <p className="mt-2 text-[var(--color-foreground-muted)]">
              Affiliate-Marketing mit UGC-Content bedeutet in der Praxis: Dutzende Tabs,
              Spreadsheets und Einzel-Tools für Produktrecherche, Skripte, Video-Rendering,
              Veröffentlichung und Buchhaltung. Dieses Projekt bündelt den gesamten Workflow in
              einem Dashboard, ohne die Kontrolle über einzelne Schritte zu verlieren.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-xl font-semibold">Die Systemidee</h2>
            <p className="mt-2 text-[var(--color-foreground-muted)]">
              Statt eines generischen Multi-Tenant-SaaS-Produkts ist dies bewusst ein
              Single-User-System: kein Team-Management, keine Registrierung, keine geteilten
              Workspaces. Die Architektur ist trotzdem sauber modular aufgebaut — Produkte,
              Kampagnen, Skripte, Videos, Publishing, Finance und Automationen sind eigenständige
              Module mit klaren Schnittstellen, sodass sich das System bei Bedarf erweitern lässt.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-xl font-semibold">Externe Provider ohne Zwang</h2>
            <p className="mt-2 text-[var(--color-foreground-muted)]">
              Jede externe Integration — von Video-Rendering bis Social-Publishing — funktioniert
              zuerst über einen realistischen Mock-Provider. Das System bleibt vom ersten Tag an
              vollständig nutzbar, echte Zugangsdaten werden erst ergänzt, wenn sie tatsächlich
              gebraucht werden.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <h2 className="text-xl font-semibold">Verantwortung bleibt beim Betreiber</h2>
            <p className="mt-2 text-[var(--color-foreground-muted)]">
              Veröffentlichungen erfordern immer eine explizite Freigabe. Finanz- und
              Steuerzahlen sind als unverbindliche Schätzung gekennzeichnet. Agenten arbeiten
              deterministisch und erstellen keine fremden Plattformkonten oder automatischen
              Veröffentlichungen ohne Zustimmung.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
