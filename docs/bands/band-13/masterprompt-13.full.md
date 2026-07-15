# CarryOS Universe – Band 13
# Masterprompt: Growth and Publishing (VOLLSTÄNDIG)

> Band: 13
> Masterprompt: 13.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 12 (Content), Band 11 (Agents)
> Ziel: Publishing-Worker, Distributionskanäle, Scheduling, Recommendations, Analytics-Optimierung.

---

## Kapitel 1 – Architektur

Bestehende `src/lib/recommendation` und `src/lib/analytics` erweitern.
Publishing über bestehende Worker/Queue. Keine zweite Publishing-Engine.

---

## Kapitel 2 – Datenmodelle

- `PublishJob` (tenantId, contentId, channel, scheduledAt, status)
- `Channel` (tenantId, type, credentialsRef)
- `Recommendation` (tenantId, itemId, score, features)

---

## Kapitel 3 – APIs

- `POST /api/v1/publishing/jobs` (nutzt bestehende `publishing/*`)
- `POST /api/v1/recommendations` (nutzt bestehende `recommendations/*`)
- `GET /api/v1/analytics/optimize`

---

## Kapitel 4 – Events

- `publish.job.queued.v1`
- `publish.job.completed.v1`
- `recommendation.computed.v1`

---

## Kapitel 5 – Workflows

Content (Band 12) → Publish-Job (Scheduler/Worker) → Kanal → Recommendation-
Loop → Analytics → Optimierung. Idempotent via ExecutionKey.

---

## Kapitel 6 – Agenten

Publishing-Agent und Recommendation-Agent registered in Band 11 Runtime.

---

## Kapitel 7 – UI

Publishing-Kalender, Kanal-Config, Recommendation-Dashboard.

---

## Kapitel 8 – Tests

- Unit: Recommendation-Scoring, Scheduling-Logik
- Integration: Publish-Job über Worker
- Security: Tenant-Isolation der Kanäle/Recommendations

---

## Kapitel 9 – Security

- Channel-Credentials verschlüsselt (kein Plaintext)
- Tenant-Isolation über Publish/Recommendation
- Keine ungeprüften externen API-Zugriffe

---

## Kapitel 10 – Performance

- Publishing asynchron (Worker)
- Recommendation-Berechnung gecached pro Tenant

---

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün.
6. Architekturtests: keine zweite Publishing/Recommendation-Engine.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
