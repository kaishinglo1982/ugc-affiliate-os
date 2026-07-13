import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Nutzungsbedingungen des UGC Affiliate Operating Systems.",
};

export default function NutzungsbedingungenPage() {
  return (
    <>
      <MarketingPageHeader title="Nutzungsbedingungen" description="Stand: [Datum ergänzen]" />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
          <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-[var(--color-warning)]">
            Platzhalter-Hinweis: Betreiberangaben in diesem Dokument sind editierbare Platzhalter
            und müssen vor dem Produktivbetrieb ersetzt werden.
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">1. Geltungsbereich</h2>
            <p className="mt-2">
              Diese Nutzungsbedingungen gelten für die Nutzung des UGC Affiliate Operating
              Systems durch [Vor- und Nachname / Firmenname] als alleinigen Betreiber. Die
              Anwendung ist ein Single-User-System ohne öffentliche Registrierung.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              2. Charakter des Systems
            </h2>
            <p className="mt-2">
              Das System unterstützt Recherche-, Content- und Buchhaltungsprozesse im
              Affiliate-Marketing. Ohne hinterlegte Zugangsdaten laufen externe Integrationen im
              Mock-Modus und lösen keine echten Kosten oder Veröffentlichungen aus.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              3. Keine Rechts- oder Steuerberatung
            </h2>
            <p className="mt-2">
              Finanz- und Steuerübersichten im System sind unverbindliche Schätzungen zur
              persönlichen Planung und stellen keine rechtliche oder steuerliche Beratung dar.
              Für verbindliche Auskünfte ist eine entsprechend qualifizierte Fachperson zu
              konsultieren.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              4. Pflichten bei der Veröffentlichung von Content
            </h2>
            <p className="mt-2">
              Für die Einhaltung von Werbekennzeichnungspflichten (z. B. Disclosure-Hinweise bei
              Affiliate-Links) sowie plattformspezifischer Richtlinien ist der Betreiber
              eigenverantwortlich zuständig. Das System stellt entsprechende Felder bereit,
              übernimmt jedoch keine rechtliche Prüfung einzelner Inhalte.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              5. Externe Dienste
            </h2>
            <p className="mt-2">
              Bei Aktivierung externer Provider (Affiliate-Netzwerke, Video-, AI- oder
              Social-Media-Dienste) gelten zusätzlich deren jeweilige Nutzungsbedingungen. Der
              Betreiber ist für die Einhaltung dieser Bedingungen selbst verantwortlich.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              6. Änderungen
            </h2>
            <p className="mt-2">
              Diese Nutzungsbedingungen können angepasst werden, um Änderungen am
              Funktionsumfang des Systems widerzuspiegeln.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
