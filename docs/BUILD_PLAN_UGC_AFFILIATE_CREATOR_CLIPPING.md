# Build-Plan: UGC + Affiliate + Creator Revenue + Clipping (Login-frei)

**Status:** Planung  
**Ziel:** Eine webbasierte Creator-Plattform, die UGC-Kampagnen, Affiliate-Produkte, Creator-Einnahmen und Short-Form-Clipping in einem Workflow vereint. Besucher können Kernfunktionen ohne Konto ausprobieren. Ein Konto ist nur nötig, wenn dauerhaft persönliche Daten, externe Konten oder Auszahlungen verwaltet werden.

## 1. Produktvision

Ein Creator öffnet die App und kann sofort:
1. Affiliate-Produkte und UGC-Briefings entdecken;
2. Content-Ideen, Hooks, Skripte und Veröffentlichungspläne erstellen;
3. rechtmäßig nutzbare Langvideos in kurze Clips schneiden;
4. Clips mit Captions, Hook, CTA und Plattformformat vorbereiten;
5. Kampagnen, Links, Views, Klicks und Einnahmen an einem Ort auswerten;
6. später freiwillig einen Workspace speichern oder externe Konten verbinden.

**Leitprinzip:** Guest-first statt Login-wall. Ohne Konto nutzbare Werkzeuge speichern standardmäßig lokal oder temporär. Keine stillschweigende dauerhafte Cloud-Speicherung.

## 2. Zielgruppen und Kernjobs

- **UGC-Creator:** Briefings finden, Angebote beantworten, Videos liefern und Vergütung verfolgen.
- **Affiliate-Creator:** Produkte recherchieren, Tracking-Links organisieren und Klicks/Provisionen verstehen.
- **Clipper:** autorisierte Langvideos in mehrere Shorts/Reels/TikToks umwandeln und Varianten testen.
- **Brands/Agenturen:** Briefings veröffentlichen, Creator auswählen, Assets abnehmen und Kampagnen messen.

## 3. MVP-Scope

### P0 — Sofort nutzbarer Guest-Modus
- Landingpage mit „Ohne Konto starten“.
- Guest-Dashboard: Discover, Create, Clip Studio, Revenue Preview.
- UGC-Briefing- und Produktkarten mit Filtern; Demo-Daten klar kennzeichnen.
- Hook-/Skript-Generator mit editierbaren Vorlagen, CTA-Generator und Content-Kalender.
- Affiliate-Link-Builder: Ziel-URL, Kampagnenname, UTM-Parameter und Copy-Button.
- Clipping: Datei auswählen, Zeitbereiche setzen, 9:16/1:1/16:9 wählen, Untertitel bearbeiten und Export starten.
- Browser-lokale Entwürfe mit Hinweis auf mögliche Datenverluste beim Löschen des Browser-Speichers.
- Responsive UI, Tastaturbedienung sowie Lade-, Fehler- und Leerezustände.

### P1 — Funktionaler Creator-Workflow
- Projekte optional per Magic Link oder Passkey speichern; kein Passwort-Zwang.
- UGC-Pipeline: entdeckt → beworben → angenommen → in Produktion → eingereicht → freigegeben → bezahlt.
- Asset-Bibliothek mit Versionen, Nutzungsrechten, Freigabestatus und Ablaufdatum.
- Clip-Queue mit Batch-Verarbeitung, Fortschritt, Retry, Export und Plattform-Presets.
- Revenue-Dashboard mit getrennten Kennzahlen: bestätigt, ausstehend, geschätzt und ausgezahlt.
- CSV-/Report-Import; Kennzahlen immer mit Quelle und Aktualisierungszeitpunkt.

### P2 — Integrationen und Monetarisierung
- Offizielle APIs/Partnerfeeds für Affiliate-Netzwerke und Produktkataloge.
- OAuth-Verbindungen nur, wenn API und Berechtigungen es zulassen.
- Creator-/Brand-Workspace, Teamrollen und Freigaben.
- Kampagnen-Marktplatz, Angebotsannahme und Vertrags-/Briefing-Vorlagen.
- Zahlungsanbieter für Auszahlungen erst nach KYC-, Steuer- und Compliance-Prüfung.
- Abos oder nutzungsbasierte Credits für Rendering, KI-Generierung und Teamfunktionen.

## 4. Login-freie Architektur

**Ohne Konto:** öffentliche Recherche, Demo-Daten, Ideen/Skripte, manuelle Link-Erstellung und einfache Clip-Bearbeitung/Export innerhalb technischer Limits.

**Nicht dauerhaft ohne Konto:** geräteübergreifende Synchronisierung, private Teamdaten, geheime API-Schlüssel, verifizierte Einnahmen, Verträge und Auszahlungen.

**Guest-Sicherheit:**
- zufällige, kurzlebige Guest-ID mit Rate-Limits und Missbrauchsschutz;
- Entwürfe standardmäßig im Browser; explizite Zustimmung vor Cloud-Upload;
- Uploads mit Größen-/Dauerlimits, MIME-Prüfung, Malware-Scan und Löschfrist;
- keine API-Schlüssel oder OAuth-Tokens im Browser-Storage;
- private Daten erst nach explizitem Speichern/Verbinden serverseitig persistieren;
- spätere Kontoübernahme von Guest-Projekten nur nach verifizierter Zustimmung.

Login-frei bedeutet nicht sicherheitsfrei: Admin-, Billing-, Partner-API- und Auszahlungsaktionen müssen authentifiziert und autorisiert sein.

## 5. Clipping: technische Umsetzung

1. Quelle prüfen: Upload oder URL; nur Material verarbeiten, für das Nutzer Rechte besitzen.
2. Medien-Metadaten lesen und Keyframes/Audio analysieren.
3. Clip-Kandidaten anhand von Szenenwechseln, Speech-to-Text, Pausen, Themen oder manuellen Zeitmarken vorschlagen.
4. Ausschnitt, Seitenverhältnis, Crop/Face Tracking, Captions, Titel und CTA bearbeiten.
5. Render-Job in Queue legen; Worker verarbeitet mit FFmpeg oder austauschbarem Media-Provider.
6. Vorschau anzeigen; Exportdatei zeitlich begrenzt speichern und anschließend löschen.
7. Job-Status, Kosten/Limit und Fehler transparent anzeigen.

**Wichtig:** Plattform-Downloads, Musik, Gesichter und fremdes Videomaterial nur im Rahmen der Plattformregeln, Lizenzen und Rechte. Kein Umgehen von DRM oder Zugriffsbeschränkungen. Im MVP zunächst Upload + manuelle Zeitmarken + Untertitel; KI-Szenenerkennung später.

## 6. Empfohlener Stack

Das vorhandene Repository ist eine Next.js-Anwendung mit PostgreSQL und Worker-Jobs. Bestehenden Stack weiterverwenden, kein paralleles zweites Backend einführen.

- Frontend: Next.js App Router, TypeScript und vorhandenes UI-System.
- API: bestehende Route-Handler/Service-Layer, Zod-Validierung und konsistente Fehlerantworten.
- Datenbank: PostgreSQL + Prisma; Guest-Projekte erhalten zufällige IDs und Ablaufzeiten.
- Jobs: bestehende Worker erweitern; dedizierte Queue für lange Render-Jobs (z. B. Redis/BullMQ), falls nötig.
- Medien: lokaler Speicher in Entwicklung, S3-kompatibler Objektspeicher in Produktion; signierte URLs.
- Video: FFmpeg-Worker; Speech-to-Text/LLM optional hinter Provider-Abstraktionen.
- Observability: strukturierte Logs, Job-Metriken, Fehlertracking und Health Checks.
- Tests: Vitest für Services, Playwright für Guest-Flows, API- und Rechte-Tests.

Vor Implementierung bestehende Prisma-Modelle, Routes, UI-Komponenten und Worker-Patterns prüfen und erweitern, statt Duplikate anzulegen.

## 7. Datenmodell — erste Entitäten

- GuestWorkspace: id, createdAt, expiresAt, optional claimedByUserId
- Project: owner/guest reference, title, status, settings
- ContentDraft: projectId, hook, script, CTA, platform, version
- MediaAsset: projectId, storageKey, checksum, duration, rightsAttestedAt, expiresAt
- ClipJob: assetId, ranges, preset, status, progress, errorCode, outputAssetId
- Campaign: brandId, brief, deliverables, budgetRange, usageRights, deadline, status
- CreatorApplication: campaignId, creatorId/guestContact, status, submittedAt
- AffiliateLink: destinationUrl, trackingParams, network, disclosureText
- RevenueEvent: source, externalReference, amount, currency, status, occurredAt, importedAt
- AuditEvent: actor, action, target, timestamp, minimal metadata

Geldwerte als Decimal speichern; Währung, Herkunft, Status und Zeitstempel verpflichtend führen. Geschätzte Kennzahlen niemals als bestätigte Umsätze darstellen.

## 8. API-/Service-Bereiche

- GET /api/discover/* — öffentliche bzw. Demo-Kataloge
- POST /api/guest/projects — kurzlebiges Guest-Projekt
- POST /api/content/generate — Skript-/Hook-Entwurf mit Limits
- POST /api/media/upload — signierter Upload, Rechtebestätigung und Limits
- POST /api/clips/jobs und GET /api/clips/jobs/:id — Render-Queue und Status
- POST /api/affiliate/links — Tracking-Link erstellen
- POST /api/revenue/import — CSV-Import mit Validierung und Duplikatprüfung
- POST /api/workspaces/claim — freiwillige Guest-Projektübernahme nach Verifizierung

Diese Routen sind Vorschläge, keine Behauptung, dass sie bereits existieren. Bestehende API-Konventionen haben Vorrang.

## 9. Umsetzungsphasen und Abnahmekriterien

### Phase 0 — Bestandsaufnahme (1–2 Tage)
- Seiten, Prisma-Schema, Auth-Middleware, Worker und Tests inventarisieren.
- Feature-Matrix „vorhanden / teilweise / fehlt“ erstellen.
- Architekturentscheidungen und Migrationsrisiken dokumentieren.

**Fertig, wenn:** kein bestehendes Feature versehentlich ersetzt wird und Integrationspunkte feststehen.

### Phase 1 — Guest-first UX (3–5 Tage)
- Navigation und Dashboard ohne Login erreichbar machen.
- Guest-Daten und Demo-Daten klar trennen.
- Content-Tools und Link-Builder nutzbar machen.
- Mobile-/Desktop-Zustände und Fehlerfälle implementieren.

**Fertig, wenn:** ein neuer Nutzer ohne Konto eine Idee erstellt, bearbeitet und kopiert/exportiert bekommt.

### Phase 2 — Clip Studio MVP (4–8 Tage)
- Upload, Medienvalidierung, Zeitmarken, Untertitel und Format-Presets.
- Hintergrundjobs, Fortschritt, Retry, sichere Dateiablage und automatische Löschung.
- Testclips für Portrait, Landscape, fehlendes Audio und ungültige Dateien.

**Fertig, wenn:** ein berechtigtes Testvideo zuverlässig zu einem exportierbaren Clip wird und Fehler verständlich bleiben.

### Phase 3 — UGC + Affiliate + Revenue (4–7 Tage)
- Kampagnen-Pipeline, Linkverwaltung, CSV-Import und Revenue-Status.
- Demo-Daten markieren; reale Datenquellen nachvollziehbar ausweisen.
- Dubletten-, Währungs- und Zeitzonenfälle testen.

**Fertig, wenn:** eine Kampagne durch den Workflow verfolgt und Einnahmen nach Quelle/Status getrennt angezeigt werden.

### Phase 4 — Persistenz und Integrationen (5–10 Tage)
- Optionales Magic-Link-/Passkey-Speichern, Guest-Claim und Rollen.
- Erste rechtlich/technisch verfügbare Partnerintegration.
- Secrets-Verschlüsselung, Token-Rotation und Berechtigungsprüfung.

**Fertig, wenn:** Nutzer ohne Login starten und sich bei Bedarf sicher anmelden/verbinden können.

### Phase 5 — Hardening und Launch (3–5 Tage)
- Rate-Limits, CSRF/Origin-Prüfung, Upload-Schutz, Retention und Datenschutz.
- Accessibility, Performance, Logging, Backups, Restore-Test und Deploy-Runbook.
- CI: typecheck, lint, unit tests, build, E2E und Migrationstest.

**Fertig, wenn:** Pflichtchecks grün sind, Datenlöschung geprüft ist und ein Rollback möglich ist.

Zeitangaben sind grobe Schätzungen für einen Entwickler mit bestehender Codebasis; Integrationen, API-Freigaben und Video-Infrastruktur können den Umfang ändern.

## 10. Tests und Definition of Done

- Kernablauf funktioniert im Inkognito-Fenster ohne Login.
- Kein stiller Cloud-Upload; Einwilligung und Löschfrist werden angezeigt.
- Guest-Daten sind nicht über erratbare IDs anderer Gäste lesbar.
- Render-Jobs überstehen Worker-Neustarts oder schlagen kontrolliert fehl.
- Revenue-Karten unterscheiden Demo, geschätzt, bestätigt, ausstehend und ausgezahlt.
- Affiliate-Links enthalten erforderliche Disclosure-/Werbekennzeichnung.
- UGC-Kampagnen haben klare Nutzungsrechte, Deliverables und Fristen.
- Typecheck, Lint, Unit Tests, Build und E2E sind erfolgreich.

## 11. Produktmetriken

- Aktivierung: Anteil der Gäste, die in der ersten Sitzung ein Skript oder einen Clip exportieren.
- Zeit bis zum ersten Ergebnis.
- Clip-Render-Erfolgsrate und mediane Renderzeit.
- Wiederkehrende Nutzung innerhalb von 7 Tagen.
- Klickrate auf Affiliate-Links und bestätigte Provisionen, sofern Daten verfügbar.
- UGC-Bewerbung → Annahme → Lieferung → Freigabe.
- Kosten pro erfolgreichem Export und Missbrauchsrate.

## 12. Risiken und Entscheidungen

- Partner-APIs: Daten und Monetarisierung nur im Umfang offizieller APIs/Verträge.
- Clipping-Rechte: Rechtebestätigung sowie Melde- und Löschprozess bereitstellen.
- Plattformmetriken: API-Zugriff kann eingeschränkt sein; CSV/Manuellimport als Fallback.
- Guest-Missbrauch: Limits, Ablaufzeiten und ggf. CAPTCHA bei verdächtigem Traffic.
- Renderkosten: Dauer-/Auflösungsgrenzen, Queue und transparente Kontingente.
- Recht/Steuern: Werbekennzeichnung, DSGVO, Impressum, Aufbewahrung und Auszahlungsanforderungen vor Launch prüfen.

## 13. Nächste konkrete Schritte

1. Phase-0-Audit auf dem aktuellen master ausführen.
2. Feature-Matrix und fehlende Tests dokumentieren.
3. Guest-first Navigation und Speicherregeln als erste vertikale Scheibe umsetzen.
4. Danach Clip Studio MVP mit einem End-to-End-Testvideo bauen.
5. Erst nach funktionierendem Clip-Export externe Plattform-/Partnerintegrationen hinzufügen.
