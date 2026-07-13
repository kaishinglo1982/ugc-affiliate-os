import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <>
      <MarketingPageHeader title="Impressum" description="Angaben gemäß § 5 TMG" />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-invert mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
          <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-[var(--color-warning)]">
            Platzhalter-Hinweis: Die folgenden Angaben sind editierbare Platzhalter. Vor dem
            Produktivbetrieb müssen sie durch die tatsächlichen Betreiberangaben ersetzt werden.
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Angaben gemäß § 5 TMG
            </h2>
            <p className="mt-2">
              [Vor- und Nachname / Firmenname]
              <br />
              [Straße und Hausnummer]
              <br />
              [Postleitzahl und Ort]
              <br />
              [Land]
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Kontakt</h2>
            <p className="mt-2">
              Telefon: [Telefonnummer]
              <br />
              E-Mail: [Kontakt-E-Mail-Adresse]
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Umsatzsteuer-Identifikationsnummer
            </h2>
            <p className="mt-2">
              [Umsatzsteuer-ID gemäß § 27a UStG, falls vorhanden — sonst Abschnitt entfernen]
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="mt-2">[Name und Anschrift wie oben]</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Streitschlichtung
            </h2>
            <p className="mt-2">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
              bereit. Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen,
              sofern dies nicht gesetzlich vorgeschrieben ist. [Bei Bedarf anpassen.]
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
