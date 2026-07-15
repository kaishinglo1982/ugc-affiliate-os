# Band 10 – Masterprompt 10.0, Teil 1: Vision & Architektur

## 1.1 Vision

CarryOS ist eine modulare, mandantenfähige Enterprise-Plattform. Band 10
etabliert den verbindlichen Backend-Standard, auf dem alle Module,
Brancheneditionen und Plugins aufbauen. Ziel ist eine einzige, konsistente
API-Oberfläche über das gesamte Ökosystem, unabhängig davon, welches Modul,
welche Edition oder welches Plugin gerade angesprochen wird.

## 1.2 Strategische Prinzipien

- **Ein Standard, keine Inseln.** Jede Route folgt demselben Envelope,
  derselben Validierung, derselben Autorisierung.
- **Erweiterung vor Duplikation.** Bestehende `src/lib/api/*` werden
  erweitert, niemals kopiert.
- **Sicherheit by Design.** Tenant-Isolation und Autorisierung sind kein
  optionaler Aufsatz, sondern Teil des Request-Kontexts.
- **Auditierbarkeit.** Jede kritische Änderung erzeugt ein versioniertes
  Event und einen Audit-Eintrag.
- **Maschinenlesbarkeit.** Jede Route ist OpenAPI-dokumentiert.

## 1.3 Architektur-Schichten

```
Client
  → Route Handler            (Orchestrierung, Kontext, Envelope)
    → Validation             (Zod, parseBody)
    → Authorization          (guard.ts: requireApiPermission)
    → Service Layer          (Fachlogik, src/server/services)
      → Repository Layer     (Datenzugriff, src/server/repositories)
        → Database           (Prisma, tenant-gefiltert)
```

Regel: Fachlogik ausschließlich in der Service Layer. Route Handler dürfen
nur Orchestrierung, Envelope-Aufbau und Kontext-Auflösung enthalten.

## 1.4 Request-Kontext (serverseitig abgeleitet)

| Feld | Quelle | Darf vom Client kommen? |
| ---- | ------ | ----------------------- |
| tenantId | verifiziertes Token | nein |
| workspaceId | Kontext/Token | nein |
| userId | verifiziertes Token | nein |
| correlationId | Tracing-Middleware | nein (Header optional) |
| requestId | Response-Envelope | nein |

Diese Werte werden niemals ungeprüft aus dem Body übernommen.

## 1.5 Verbotene Parallelstrukturen

- Keine zweite Authentifizierung
- Keine zweite Agent Runtime
- Keine zweite Workflow Engine
- Keine zweite EventBus-/Queue-Architektur
- Keine zweite Finance Engine

## 1.6 Bestehende Artefakte (Ist-Zustand, nicht neu erfinden)

- `src/lib/api/guard.ts` — `requireApiPermission`, Token-Handling
- `src/lib/api/response.ts` — Envelope (`ok`, `created`, `fail`, ...)
- `src/lib/api/validate.ts` — Zod-Helper (`parseBody`, `uuidSchema`, ...)
- `src/lib/api/route-context.ts` — `withApiContext(permission)`
- `src/lib/api/index.ts` — Barrel-Export

## 1.7 Abhängigkeiten

Band 10 ist der Einstiegsband. Er hat keine Upstream-Abhängigkeit, aber alle
späteren Bänder (11–16) hängen von seinem Standard ab.

## 1.8 Nicht-Ziele

- Keine Fachlogik (gehört in die Fachmodule/Bänder 12–14).
- Keine neue Agenten-Laufzeit (Band 11).
- Keine neue Finance-Engine (Band 14).
