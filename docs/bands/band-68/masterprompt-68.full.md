# CarryOS Universe – Band 68
# Masterprompt: Integrationen (VOLLSTÄNDIG)

> Band: 68 | Masterprompt: 68.0 | Status: PLANNED | Gruppe: Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- Integrationen verbinden CarryOS mit externen Systemen (CRM, ERP, E-Mail, Calendar, Webhooks) über deklarative Connector-Specs (`integrationConnector`), die über bestehende Core-Service-Registry und EventBus gebunden werden – keine zweite Integration-Engine.
- Connector definieren Auth-Type (OAuth2/API-Key/Webhook), Endpoint-Mapping, Rate-Limit und Tenant-Credential-Vault-Ref.
- Sync-Orchestrierung nutzt Band 9 Workflows; eingehende Webhooks laufen über Band 10 API-Standard.
- Credentials liegen ausschließlich im verschlüsselten Tenant-Vault; Connector-Code sieht niemals Plaintext-Secrets.

## Kapitel 2 – Datenmodelle

- `IntegrationConnector`: connectorId, type, authType, endpointMap, rateLimit, requiredScopes[].
- `IntegrationBinding`: tenantId, connectorId, status, vaultRef, config (Zod), lastSyncAt.
- `IntegrationCredential`: tenantId, bindingId, vaultRef (encrypted), expiresAt (niemals Plaintext).
- `IntegrationSyncLog`: tenantId, bindingId, direction, status, recordsProcessed, errorRef.

## Kapitel 3 – APIs

- `GET /api/v1/integrations/connectors` – Katalog verfügbarer Connectors (Public-lesbar).
- `POST /api/v1/integrations/:id/bind` – Binding im Tenant + Vault-Ref (Band-10-Envelope).
- `POST /api/v1/integrations/:id/webhook` – eingehender Webhook-Endpoint (signatur-verifiziert).
- `POST /api/v1/integrations/:id/sync` – manueller Sync-Trigger via Band 9.

## Kapitel 4 – Events

- `integration.bound.v1`, `integration.webhook_received.v1`, `integration.sync_completed.v1`, `integration.auth_expired.v1`.
- Sync-Daten fließen als versionierte Domain-Events in bestehende Outbox; keine Doppel-Pipeline.
- Alle Events mit `tenantId`, `bindingId`, `connectorId`, `actorId`; schema-versioniert.

## Kapitel 5 – Workflows

- Bind-Flow: Connector-Select → OAuth-Flow/Vault-Store → Scope-Check → Band 9 Registration → ExecutionKey → ACTIVE.
- Webhook-Flow: Signatur-Verify → tenantResolve → Event-Map → Band 10 Handler → Envelope-Response.
- Sync-Flow: Band 9 Workflow → Rate-Limit-aware Pull/Push → Transform → Persist → `integration.sync_completed.v1`.

## Kapitel 6 – Agenten

- `IntegrationHealthAgent` (Band 11): überwacht Auth-Expiry, Rate-Limit-Verletzungen, Sync-Fehler.
- `ConnectorAdapterAgent`: mappt externe Payloads auf CarryOS-Schemas (Zod-Transform).
- `WebhookSecurityAgent`: verifiziert Signaturen, erkennt Replay/Spoofing.

## Kapitel 7 – UI

- Integration-Katalog: Connector-Karten, Auth-Type-Badge, "Connect"-Button.
- Binding-Wizard: OAuth-Popup / Key-Input, Scope-Consent, Live-Status.
- Sync-Monitor: letzte Sync, Records, Fehler, Webhook-Log pro Tenant.

## Kapitel 8 – Tests

- Vitest-Unit: Payload-Transform (Zod), Signatur-Verify, Rate-Limit-Logic, Vault-Ref-Roundtrip.
- Integration: Bind→Webhook→Sync Roundtrip; Tenant A Binding isoliert von Tenant B.
- Security-Test: gefälschte Webhook-Signatur → 401 + `integration.webhook_rejected.v1`.

## Kapitel 9 – Security

- Credentials ausschließlich verschlüsselt im Tenant-Vault; niemals Plaintext, niemals in Logs/Prompts/Docs.
- Webhooks signaturpflichtig (HMAC/Ed25519), Replay-Schutz via nonce/timestamp.
- requireApiPermission auf Bind/Sync; Audit aller Bindings und Auth-Erneuerungen.

## Kapitel 10 – Performance

- Webhook-Verify < 10ms (p95); Sync via Band 9 asynchron, p95 Pull < 2s bei 10k Records (Chunked).
- Vault-Lookup gecached (TTL 60s, invalidiert bei Auth-Event); Indizes auf (tenantId, bindingId).
- Rate-Limit-Token-Bucket pro Connector, kein Blocking im Request-Pfad.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün. 6. Architekturtests: keine zweite Integration-Engine.

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
