# CarryOS Universe – Band 23
# Masterprompt: Immobilien OS (VOLLSTÄNDIG)

> Band: 23 | Masterprompt: 23.0 | Status: PLANNED | Gruppe: Business Editions I
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Planungs-Masterprompt. Konkrete Implementierung erfolgt bandweise über Swarm/Codex, ohne Core-Fork. Immobilien OS ist eine Edition auf CarryOS Core, distributioniert als Plugin/Preset.

## Kapitel 1 – Architektur

Beschreibt die Schichten, Komponenten und verbindlichen Prinzipien dieses Bandes. Bestehende Systeme werden erweitert, nicht dupliziert. Keine zweite Runtime/Engine/Queue/Finance.

- Edition als Plugin-Preset über Band-16 Factory: Immobilien-Domäne (Bestand, Objekte, Mietverwaltung, Makler) ohne Fork.
- Domänenbereiche: Objektverwaltung (WEG/Eigentümer), Mietverwaltung, Makler-CRM, Besichtigungstermine, Dokumenten-Akte.
- Wiederverwendung: Band 14 Finance (Mieteinnahmen, Hausgeld), Band 13 Growth (Exposés/Leads), Band 11 Agents.
- Geodaten-Integration über vorhandene EventBus-Struktur; kein eigener Map-Server.

## Kapitel 2 – Datenmodelle

Relevante Entitäten (Prisma), durchgehend tenant-isoliert. Kein Modell ohne tenantId-Filter.

- `Property` (Objekt, Adresse, Typ Wohn/Gewerbe, WEG-Einheiten), `Unit` (Wohnung/Einheit mit Fläche/Miete).
- `Tenant` (Mieter mit Mietvertrag, Kaution), `Owner` (Eigentümer/WEG), `Lead` (Makler-Interessent).
- `Viewing` (Besichtigungstermin), `DocumentFile` (Exposé, Mietvertrag, Protokoll), `MaintenanceTicket` (Hausverwaltung).
- Alle Tabellen zwingend `tenantId` + `workspaceId`; Audit über Core-Mixin.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod). Versionierung im Pfad.

- `POST /api/v1/realestate/properties` Objekt mit Adress-Zod anlegen, optional WEG-Einheiten-Bulk.
- `POST /api/v1/realestate/units/{id}/lease` Mietvertrag schließen (Validierung Kaution/Laufzeit).
- `GET /api/v1/realestate/owners/{id}/statement` Hausgeld-/Abrechnungs-Statement via Finance.
- `POST /api/v1/realestate/leads/{id}/viewing` Besichtigung buchen mit Kalender-Konfliktprüfung.

## Kapitel 4 – Events

Versionierte Events über bestehende Outbox/Queue. event.name.v1.

- `realestate.unit.leased.v1` (Mietbeginn → Finance-Mietplan-Provisionierung).
- `realestate.viewing.booked.v1` (Lead-Tracking, Growth-Follow-up-Trigger).
- `realestate.maintenance.opened.v1` (Handwerker-Dispatch via Band 24 Handwerker Core).
- `realestate.owner.statement.due.v1` (Abrechnungs-Erinnerung, Finance-Invoice).

## Kapitel 5 – Workflows

Prozesse: Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Vermietung: Exposé → Lead → Besichtigung → Antrag → Vertrag → Übergabe (Protokoll).
- Hausverwaltung: WEG-Jahresplan → Hausgeld-Abrechnung → Eigentümer-Statement → Inkasso.
- Instandhaltung: Meldung → Triage → Handwerker-Dispatch → Abnahme → Kostenbuchung.
- Makler-Verkauf: Anlage → Matching → Besichtigung → Angebot → Notar-Termin → Provision.

## Kapitel 6 – Agenten

Agenten/Rollen dieses Bandes, registriert in Band 11 Runtime (falls zutreffend).

- `ListingAgent`: erzeugt Exposé-Texte und überträgt Portal-Leads (freier Tier, keine Premium-APIs).
- `MatchingAgent`: gleicht Suchende mit freien Objekten anhand Kriterien ab.
- `RentReminderAgent`: automatische Mahn-/Erinnerungsläufe via Finance OS.
- Rollen: Hausverwalter, Makler, Eigentümer-Viewer, Mieter-Portal (eingeschränkt).

## Kapitel 7 – UI

Betroffene Dashboards/Komponenten. Keine Fachlogik in Client-Komponenten.

- Verwalter-Dashboard: Leerstand, offene Mängel, fällige Abrechnungen, WEG-Übersicht.
- Makler-Board: Lead-Pipeline, Besichtigungstermine, Exposé-Status.
- Mieter-Portal: eigener Vertrag, Meldungen, Zahlungshistorie, Dokumente.
- Karten-View der Objekte via Core-Geo-Package; Charts aus Core-Chart-Package.

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Abdeckung der Erfolgs- und Fehlerpfade.

- Unit: Mietberechnung, Hausgeld-Verteilungsschlüssel, Kaution-Logik, Zod-Exposé-Schema.
- Integration: Leasing-Idempotenz, Besichtigung-Konflikt, Maintenance-Dispatch-Event.
- Security: Mieter sieht nur eigene Unit; Eigentümer nur eigene WEG; Cross-Tenant blockiert.
- Finance-Brücke: Hausgeld-Statement erzeugt korrekte Finance-Buchung ohne Doppelung.

## Kapitel 9 – Security

Authentifizierung (keine zweite), Autorisierung via requireApiPermission, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Mieter-Daten (Persönlichkeitsschutz) nur für zuständige Verwalter, verschlüsseltes Feld für IBAN.
- Dokumenten-Akte mit feingranularem RBAC (Mieter vs. Eigentümer vs. Verwalter).
- Audit-Log für alle Mietvertrags- und Abrechnungsänderungen (Compliance/WEG-Recht).
- Portal-Third-Party-Keys (Immoscout etc.) in Core-Vault, nie im Code/Log.

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele.

- Indizes: `(tenantId, propertyId)`, `(tenantId, unitId)`, `(tenantId, tenantRef)`.
- Abrechnungsläufe asynchron via Queue; Massen-Mahnläufe als Background-Job.
- Objekt-Suche gecached (TTL 15 min) pro Suchkriterium.
- p95 Ziel: Objekt-Liste < 120 ms, WEG-Abrechnung < 3 s bei 200 Einheiten.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
