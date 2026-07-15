# Band 10 – Masterprompt 10.0, Teil 4: Authentifizierung & Autorisierung

## 4.1 Authentifizierung

- Bestehende Auth-Lösung erweitern, **keine zweite**.
- Tokens werden serverseitig verifiziert (nie vom Client vertrauen).
- `tenantId`, `userId` werden aus dem verifizierten Token abgeleitet.
- Abgelaufene/ungültige Tokens → `401` mit `UNAUTHORIZED`.

## 4.2 Autorisierung

- Jede Route deklariert benötigte Permission via `withApiContext(permission)`.
- `requireApiPermission` (in `guard.ts`) prüft das Permission-Flag.
- Fehlendes Permission → `403` mit `FORBIDDEN`.

## 4.3 Permissions-Modell

- Permissions sind Strings: `resource:action` (z.B. `experiment:create`).
- Rollen bündeln Permissions (kein Freetext-Role-Check in Routen).
- Tenant-Scoping ist implizit: Permission gilt nur innerhalb des eigenen Tenant.

## 4.4 Tenant-Isolation (kritisch)

- `tenantId` kommt aus dem Token-Kontext, nie aus dem Body/Query.
- Jede DB-Query enthält den Tenant-Filter.
- Cross-Tenant-Zugriff ist ein Security-Verstoß → `403`/`404` (kein `401`,
  um Existenz nicht preiszugeben).

## 4.5 Workspace-Isolation

- `workspaceId` ist optional, aber wenn vorhanden, muss die Route den Zugriff
  auf den Workspace des Tenant beschränken.
- Kein Zugriff über Workspace-Grenzen hinweg.

## 4.6 Service-to-Service

- Interne Worker/Queue-Aufrufe nutzen `WORKER_SECRET` (siehe deploy-roadmap).
- `WORKER_SECRET` darf nie im Client, in Logs oder in Docs erscheinen.

## 4.7 Token-Lebenszyklus

- Access-Token kurzlebig (<= 15 min).
- Refresh über bestehenden Flow, kein neuer Auth-Mechanismus.

## 4.8 Rate Limiting

- Öffentliche/authentifizierte Endpunkte erhalten ein Budget.
- Überschreitung → `429` mit `Retry-After`.
- Counter über In-Memory oder Redis mit TTL (kein synchrones DB-Lock).

## 4.9 Audit

- Kritische Aktionen (Permission-Wechsel, Finance, Tenant-Daten) erzeugen
  einen `ApiAuditLog`-Eintrag (siehe Teil 5 / Datenmodelle).
- Audit schreibt niemals Secrets oder vollständige sensitive Payloads.
