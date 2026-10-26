# Automation, Agents, MCP & API Architecture

## Ziel

Die Plattform erweitert UGC, Affiliate, Creator Revenue und Clipping um eine zentrale Automatisierungsplattform. Workflows müssen manuell, teilautomatisch oder vollautomatisch ausgeführt werden können. Bestehende Funktionen bleiben erhalten; vor Implementierung wird der Bestand auditiert.

## Ausführungsmodi

- **Manuell:** Agent erstellt Vorschläge, Nutzer startet Aktionen.
- **Teilautomatisch:** Workflow läuft bis zu einer konfigurierten Freigabe und wartet.
- **Vollautomatisch:** erlaubte Workflows laufen über Trigger oder Zeitplan, mit Budgets, Stop-Regeln, Logs und Benachrichtigungen.

Jeder Workflow enthält Trigger, Version, Eingaben, Schritte, Bedingungen, Agent-/Tool-Aufrufe, Freigaben, Timeout, Retry-Regeln, Kostenlimit, Idempotency-Key und Audit-Log. Workflows sind pausierbar, abbrechbar und wiederaufnehmbar. Wiederholungen dürfen keine doppelten Posts, Nachrichten, Jobs oder Zahlungen erzeugen.

## Agenten-Registry

Agenten erhalten eine definierte Rolle, strukturierte Ein-/Ausgaben, erlaubte Tools, Berechtigungen, Kostenlimit und Version. Der Orchestrator delegiert Aufgaben und führt Ergebnisse zusammen.

1. **Orchestrator:** plant Schritte, delegiert und verfolgt Status.
2. **Research Agent:** Trends, Produkte, Marken und Quellen.
3. **Strategy Agent:** Zielgruppen, Kampagnen und Content-Winkel.
4. **Script Agent:** Hooks, Skripte, Captions, CTAs und Varianten.
5. **Clipping Agent:** Transkripte, Zeitmarken und Clip-Kandidaten.
6. **QA/Policy Agent:** Fakten, Format, Markenrichtlinien, Rechte und Disclosure.
7. **Affiliate Agent:** Tracking-Links, UTM, Partnerdaten und Offenlegung.
8. **UGC Campaign Agent:** Briefings, Bewerbungen, Deliverables und Fristen.
9. **Analytics Agent:** Klicks, Conversions und Erlösquellen.
10. **Integration Agent:** MCP/API-Verbindungen, Health und Schemafehler.
11. **Dev Agent:** Codeanalyse, Tests und Pull Requests.
12. **Safety/Cost Agent:** Rechte, Datenzugriff, Limits und Kosten.

Agenten dürfen Berechtigungen nicht selbst erweitern. Tool-Ausgaben und externe Webseiten sind nicht vertrauenswürdige Daten. Jeder Lauf protokolliert Quellen, Tools, Ergebnis, Unsicherheit, Dauer und Kosten.

## Durchgängige Workflows

- **Trend → Content:** Recherche → Quellenbewertung → Idee → Skript → QA → Freigabe → Export.
- **Video → Clips:** Rechtebestätigung → Upload/Quelle → Transkription → Clip-Kandidaten → QA → Freigabe → Render → Exportpaket.
- **Affiliate:** Produktdaten → Provisions-/Richtliniencheck → Tracking-Link → Disclosure → Content → Freigabe → Veröffentlichung oder Export.
- **UGC:** Briefing → Creator-Vorschläge → Outreach-Entwurf → Freigabe → Deliverables → Abnahme und Rechte-Dokumentation.
- **Revenue:** offizielle API/CSV → Normalisierung → Dublettencheck → confirmed/pending/estimated getrennt → Report.
- **DevOps:** Logs → Fehleranalyse → Branch/PR → CI-Tests → Review; kein ungeprüfter automatischer Produktions-Merge.

## MCP

Die Plattform benötigt sowohl einen **MCP-Client** für konfigurierte externe MCP-Server als auch einen **MCP-Server** für eigene Plattformfunktionen.

Eigene MCP-Tools können beispielsweise Kampagnen lesen, Content-Entwürfe erzeugen, Clip-Jobs starten und Reports abrufen. Eine Tool-Registry dokumentiert Schema, Beschreibung, Risikoklasse, benötigte Scopes, Timeout und Kostenklasse. Verbindungen erhalten Capability Discovery, Health-Status, sichere Authentifizierung und nachvollziehbare Fehler.

MCP-Server und Tools sind nicht automatisch vertrauenswürdig. Schreibende, externe oder kostenpflichtige Aktionen brauchen explizite Rechte und je nach Risiko eine Freigabe. Server-URLs müssen gegen SSRF und unzulässige interne Ziele geschützt werden.

## API und Webhooks

- Versionierte REST API unter `/api/v1`, dokumentiert mit OpenAPI.
- API-Schlüssel serverseitig nur gehasht speichern, beim Erstellen einmal anzeigen, widerrufbar und Scope-begrenzt.
- OAuth für externe Konten, sofern der jeweilige Anbieter dies offiziell unterstützt.
- Webhooks mit Signaturprüfung, Zeitstempel, Replay-Schutz, Retry und Dead-Letter-Queue.
- Rate-Limits, Pagination, Idempotency-Key und einheitliches Fehlerformat.
- Ereignisse: `workflow.started/completed/failed`, `clip.ready`, `campaign.updated`, `revenue.imported`.

## Connector-SDK

Ein einheitliches Adapter-System soll diese Kategorien unterstützen, sofern offizielle APIs, MCP-Server oder genehmigte Connectoren existieren:

- LLM- und Agenten-Provider
- MCP-Server und Tool-Provider
- Recherche/Suche
- YouTube- und Video-Metadaten
- Video-Rendering und Dateispeicher
- Affiliate-Netzwerke und Produktkataloge
- Creator-/Social-Plattformen
- Analytics und Tracking
- CRM, Tabellen, Projektmanagement und Benachrichtigungen
- GitHub, CI/CD und Deployment
- E-Mail und Messaging

Es gibt keinen universellen Zugriff auf interne Agenten jeder Drittanbieter-App. Die Plattform zeigt je Anbieter tatsächlich verfügbare Aktionen, Scopes, Limits, Kosten, Datenstandort und Integrationsstatus. Fehlende Fähigkeiten werden als nicht verfügbar markiert, nicht vorgetäuscht.

## Sicherheits- und Freigabematrix

| Aktion | Standard |
|---|---|
| Recherche, Zusammenfassung, Entwurf | automatisch innerhalb von Limits |
| Lokale Clip-Kandidaten und Vorschau | automatisch |
| Cloud-Upload oder externe Datenübertragung | Zustimmung oder gespeicherte Richtlinie |
| Veröffentlichung, Outreach, Massen-Nachrichten | Freigabe oder ausdrücklich aktivierter Workflow |
| Vertrag, Kauf, Zahlung, Auszahlung, Kontoänderung | starke Authentifizierung und explizite Bestätigung |
| Codeänderung | Branch/PR und CI; kein ungeprüfter Produktions-Merge |
| Löschen, Rechteänderung, Secret-Zugriff | minimale Rechte, Audit-Log, Bestätigung |

Gastmodus bleibt für öffentliche Recherche, lokale Entwürfe und begrenzte Werkzeuge offen. Dauerhafte Zeitpläne, private Integrationen, Secrets und serverseitige Hintergrundläufe benötigen einen geschützten Workspace. Ein temporärer Gast-Workflow kann getestet werden, aber nicht dauerhaft ohne gültige Persistenz weiterlaufen.

## Zusätzliche Implementierungsphasen

### Phase 6 — Workflow Engine
Workflow-Schema, Trigger, Step-Runner, Zustände, Retry/Timeout, Pause/Cancel und Audit-Events. Zuerst manuell und teilautomatisch, danach kontrollierte Vollautomatik. Abnahme: Ein Content-Workflow läuft reproduzierbar und kann pausiert/wiederaufgenommen werden.

### Phase 7 — Agenten-Runtime
Agenten-Registry, Provider-Abstraktion, Tool-Allowlist, strukturierte Ergebnisse und Kostenlimits. Abnahme: Ein Auftrag ruft mehrere spezialisierte Agenten auf; alle Tool-Aufrufe sind nachvollziehbar und testbar.

### Phase 8 — MCP + API
MCP-Client/Server, Connector-SDK, API-Key-Verwaltung, OAuth-Scopes, OpenAPI und signierte Webhooks. Abnahme: Ein externer MCP-Client kann eine erlaubte Lesefunktion aufrufen und einen erlaubten Job mit Audit-Log starten.

### Phase 9 — Integrationen und autonome Abläufe
Priorisierte offizielle Integrationen, Zeitpläne, Event-Trigger, Quota-/Kostenüberwachung, Benachrichtigungen und Fehler-Warteschlange. Abnahme: Ein zeitgesteuerter Workflow stoppt bei Budgetüberschreitung und erzeugt keine doppelten externen Aktionen.

Die Dauer dieser Phasen wird erst nach Repository-Audit und Prüfung konkreter Anbieter seriös geschätzt.
