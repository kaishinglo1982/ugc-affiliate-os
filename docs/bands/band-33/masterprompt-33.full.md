# CarryOS Universe – Band 33
# Masterprompt: Hausmeisterservice (VOLLSTÄNDIG)

> Band: 33 | Masterprompt: 33.0 | Status: PLANNED | Gruppe: Business Editions II
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

> Hinweis: Branchen-Edition als Plugin/Config auf CarryOS Core. Handwerker Core (Band 24) ist Grundlage. Kein Fork, Tenant-Isolation, Band-10-API-Standard, Audit.

## Kapitel 1 – Architektur

Hausmeister-Edition als registrierte Industry-Edition über Band 16 auf Basis Handwerker Core (Band 24). Störungsmanagement, Rundgänge und Beschwerden laufen über Core Runtime/EventBus/Finance OS.

- Plugin-Manifest `industry.hausmeister` in Band 16 Registry; lädt Objekt-Typen, Störkategorien und Agenten-Rollen.
- Wiederverwendung von Core `Site`/`Ticket`/`Crew`; branchespezifisch nur Extension-Tabellen mit tenantId.
- SLA-gestütztes Störungsmodell: Reaktions-/Behebungszeiten je Kategorie, gekoppelt an Finance OS Vertragsstrafen-Logik.
- Rundgang-/Begehungstouren nutzen Core Scheduler und GeoService, keine eigene Planungs-Engine.

## Kapitel 2 – Datenmodelle

Tenant-isoliert via tenantId. Hausmeisterspezifische Erweiterungen als Extension-Modelle, keine Core-Fork.

- `HausmeisterObject` (Extension Core Site): Liegenschaft, Gebäudeteile, Zuständigkeitsbereiche, Notfallkontakte.
- `IncidentCategory`: Störkategorien (Sanitär, Elektro, Schlüsseldienst, Reinigung) mit SLA-Zeit und Eskalationsstufe.
- `IncidentTicket` (Extension Core Ticket): Priorität, SLA-Deadline, Zugewiesener, Status-Historie, Foto-Referenz.
- `PatrolRound`: geplanter Rundgang mit Checkpunkten, Durchführungsnachweis je Checkpoint.
- `KeyLog`: Schlüsselübergabe/-rückgabe mit Empfänger und Zeitstempel für Haftungsnachweis.

## Kapitel 3 – APIs

Endpunkte im Band-10-Standard (Envelope, withApiContext, Zod, Pfad-Versionierung).

- `POST /api/v1/hausmeister/incidents` – Störung mit Kategorie/Priorität melden (Zod `incidentSchema`).
- `GET /api/v1/hausmeister/incidents/{id}/sla` – SLA-Status und verbleibende Zeit abrufen.
- `POST /api/v1/hausmeister/patrol-rounds` – Rundgang mit Checkpunkten anlegen/erfassen.
- `POST /api/v1/hausmeister/key-logs` – Schlüsselübergabe dokumentieren.
- `GET /api/v1/hausmeister/objects/{id}/dashboard` – Objekt-Status (offene Störungen, Rundgänge).

## Kapitel 4 – Events

Versionierte Events über Core Outbox/Queue. `event.name.v1`, tenantId im Header.

- `hausmeister.incident.created.v1` – Störung gemeldet, triggert SLA-Timer und Disposition.
- `hausmeister.incident.sla-breached.v1` – Reaktionszeit überschritten, Eskalation/Audit.
- `hausmeister.patrol.completed.v1` – Rundgang abgeschlossen, Dokumentation für Objektbetreuer.
- `hausmeister.key.handover.v1` – Schlüsselübergabe, Haftungsnachweis-Event.
- `hausmeister.incident.resolved.v1` – Störung behoben, triggert Kundenzufriedenheits-Check.

## Kapitel 5 – Workflows

Request-Kontext → Validation → Authorization → Service → Repository → Event → Envelope. Idempotent via ExecutionKey.

- Störungsprozess: Meldung → Kategorisierung/SLA → Zuweisung → Behebung → Freigabe → Abschluss.
- Rundgang: Tourenplan → Checkpoint-Erfassung → Abweichung → Maßnahme → Bericht an Objektbetreuer.
- Schlüsselverwaltung: Übergabe → KeyLog → Rückgabe → Inventur, Haftungskette lückenlos.
- Notfall-Eskalation: SLA-Breach → automatische Eskalation an Bereitschaftsdienst.

## Kapitel 6 – Agenten

Agenten/Rollen in Band 11 Runtime, keine eigene Agent-Infrastruktur.

- `HausmeisterDisponent` – weist Störungen und Rundgänge zu, überwacht SLA.
- `StoerungsAgent` – klassifiziert eingehende Störungen und schlägt Kategorie/SLA vor.
- `SLA_WatcherAgent` – überwacht Deadlines, löst Eskalations-Events bei Verzug aus.
- `ObjektbetreuerAgent` – fasst Rundgang- und Störungsberichte je Liegenschaft zusammen.

## Kapitel 7 – UI

Dashboards/Komponenten als Core-Plugin-Views; keine Fachlogik in Client-Komponenten.

- Störungsboard: offene Störungen mit SLA-Live-Timer, Priorität, Zuständigem.
- Rundgang-Map: Checkpunkte je Liegenschaft, Erfüllungsstatus, Abweichungen.
- Schlüssel-Inventur: Übergaben/Rückgaben, aktueller Bestand je Objekt.
- Objekt-Cockpit: Gesamtstatus Liegenschaft (Störungen, Rundgänge, offene Punkte).

## Kapitel 8 – Tests

Unit (Vitest), Integration, Security (Tenant-Isolation). Erfolgs- und Fehlerpfade abdecken.

- Unit: Zod `incidentSchema`, SLA-Berechnung (Reaktions/Behebungszeit), KeyLog-Validierung.
- Integration: Störung → SLA-Timer → Eskalation End-to-End mit Event-Verifikation.
- Security: Cross-Tenant-Zugriff auf `IncidentTicket`/`KeyLog` muss mit 403 scheitern.
- UI: SLA-Timer rendert nur Anzeige, Berechnung serverseitig.

## Kapitel 9 – Security

Authentifizierung über Core (keine zweite), Autorisierung via `requireApiPermission`, Tenant-Isolation, Secrets nie in Code/Logs/Docs.

- Permission `hausmeister:incident:write`, `hausmeister:key:write` über Core RBAC.
- Notfallkontakte und Zugangsdaten (Schließanlagen) als Secrets in Core Vault.
- Externe Hausmeister: Workspace-Scoped Token, kein Core-Admin, zeitlich begrenzt.
- Audit-Log Pflicht für alle KeyLogs und SLA-Breaches (Haftungs-/Nachweispflicht).

## Kapitel 10 – Performance

Indizes auf tenantId, asynchrone Verarbeitung, Caching, p95-Ziele (Core-Vorgaben).

- Composite-Index `(tenantId, objectId, status)` auf `IncidentTicket`.
- SLA-Timer asynchron via Queue/Scheduler, nicht im Request-Pfad.
- Rundgang-Checkpunkte via GeoService-Cache, p95 Ziel < 250ms für Störungsliste.
- KeyLog-Historie paginiert, Index auf `(tenantId, objectId, createdAt)`.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweiten Engines.
7. Tenant-Isolation-Test grün. 8. Band-16 Plugin-Manifest validiert.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
