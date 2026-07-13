import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung gemäß DSGVO.",
};

export default function DatenschutzPage() {
  return (
    <>
      <MarketingPageHeader title="Datenschutzerklärung" description="Informationen gemäß Art. 13 DSGVO" />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
          <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 text-[var(--color-warning)]">
            Platzhalter-Hinweis: Betreiberangaben und Kontaktdaten in diesem Dokument sind
            editierbare Platzhalter und müssen vor dem Produktivbetrieb ersetzt werden.
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">1. Verantwortlicher</h2>
            <p className="mt-2">
              [Vor- und Nachname / Firmenname], [Anschrift], [Kontakt-E-Mail-Adresse]
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              2. Erhebung und Speicherung personenbezogener Daten
            </h2>
            <p className="mt-2">
              Diese Anwendung ist ein Single-User-System ohne öffentliche Registrierung. Es
              werden folgende Kategorien personenbezogener Daten verarbeitet:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Login-Daten des Betreibers (E-Mail, gehashtes Passwort, Session-Metadaten wie
                IP-Adresse und User-Agent) zur Absicherung des geschützten Bereichs.
              </li>
              <li>
                Angaben aus dem Kontaktformular (Name, E-Mail-Adresse, Nachricht) zur Bearbeitung
                von Anfragen.
              </li>
              <li>
                Technische Server-Logs im Rahmen des laufenden Betriebs (Fehlerdiagnose,
                Missbrauchsprävention).
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              3. Rechtsgrundlage
            </h2>
            <p className="mt-2">
              Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfüllung
              eines Vertrags bzw. vorvertragliche Maßnahmen bei Kontaktanfragen) sowie Art. 6
              Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionsfähigen
              Systembetrieb).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              4. Speicherdauer
            </h2>
            <p className="mt-2">
              Kontaktanfragen werden gespeichert, bis ihr Zweck erfüllt ist und keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen. Session-Daten werden nach Ablauf oder
              Widerruf automatisch ungültig.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              5. Verschlüsselung von Zugangsdaten
            </h2>
            <p className="mt-2">
              Zugangsdaten zu externen Diensten (API-Tresor) werden ausschließlich serverseitig
              mit AES-256-GCM verschlüsselt gespeichert, niemals im Klartext angezeigt und nicht
              an den Client übertragen.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              6. Betroffenenrechte
            </h2>
            <p className="mt-2">
              Es besteht ein Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
              Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung. Anfragen
              können über die im Impressum genannten Kontaktdaten gestellt werden.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              7. Hosting und Server-Log-Dateien
            </h2>
            <p className="mt-2">
              [Hosting-Anbieter und Serverstandort ergänzen, sofern die Anwendung öffentlich
              betrieben wird.]
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
