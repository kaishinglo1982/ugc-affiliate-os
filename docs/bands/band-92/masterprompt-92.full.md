# CarryOS Universe – Band 92
# Masterprompt: CLI (VOLLSTÄNDIG)

> Band: 92 | Masterprompt: 92.0 | Status: PLANNED | Gruppe: Developer Platform
> Abhängigkeit: Band 10–16 (Core), keine Core-Fork

## Kapitel 1 – Architektur

- CarryOS CLI ist ein Node-basiertes Kommandozeilenwerkzeug (`@carryos/cli`) als Workspace-Paket, das ausschließlich über die Band-10-API spricht – keine eigene Runtime, kein Core-Fork.
- Kommando-Struktur nach `oclif`/Subcommand-Pattern: `carry <group> <action> [flags]`, Plugins registrieren eigene Command-Gruppen via `registerCommand()`.
- Gemeinsamer `CoreClient` nutzt das Band-91-SDK für Transport, Auth (Token-Store in OS-Keychain), Tenant-Context und Retry.
- Config-Layer (`~/.carryos/config.json` + `.env.carryos`) hält tenantId, baseUrl, aktives Workspace-Profil; nie Secrets im Klartext-Log.
- Erweiterbarkeit: Branchen-Editionen liefern CLI-Plugins, die sich an die bestehende Command-Registry hängen, ohne CLI neu zu bauen.

## Kapitel 2 – Datenmodelle

- CLI-Config-Modell validiert per Zod: `{ profiles: Profile[], activeProfile, telemetryOptOut }`, jedes `Profile` trägt `tenantId`.
- Output-Modelle: `CliResult<T>` (table/json/yaml-Formatter) spiegeln Band-10-Envelope wider, Fehler als `CliError` mit Code+Message.
- Lokale Job-/Run-State-Modelle für Long-running Commands (`carry workflow run`) mit Resume-fähigkeit via ExecutionKey.
- Audit-Log-Modell für lokal ausgeführte Mutations (wer/wann/welcher Tenant) zur späteren Sync-Prüfung.
- Plugin-Manifest-Modell (`plugin.json` mit `commands[]`, `band`, `version`) zur Validierung geladener Erweiterungen.

## Kapitel 3 – APIs

- Alle CLI-Befehle mappen 1:1 auf Band-10-Endpunkte (Version im Pfad, Envelope). Beispiel: `carry lead list` → `GET /api/v1/leads`.
- Interaktive Prompts (Inquirer) validieren Eingaben lokal per Zod, bevor sie als Mutation an Band-10 gesendet werden.
- Flags `--json`, `--quiet`, `--tenant` steuern Output-Format und Tenant-Override; `--dry-run` simuliert Mutation ohne Write.
- Idempotente Mutations: CLI sendet `ExecutionKey` (Hash aus Befehl+Args+Tenant+Timestamp-Fenster), dedupliziert bei `409`.
- Bulk-Commands (`carry import csv`) nutzen SDK-Batch-API, zeigen Fortschritt (ProgressBar) und resumable Checkpoints.

## Kapitel 4 – Events

- `carry events watch` subskribiert versionierte Events via SSE-Client des SDK; Ausgabe gefiltert nach `event.name.v1` und Tenant.
- CLI emittiert keine Events selbst, sondern ruft Band-10-Event-Ingest auf – keine zweite EventBus-Architektur.
- Lokaler Event-Replay für Offline-Befehle: CLI puffert Outbox-Cursor und sync bei Reconnect (`carry sync`).
- Webhook-Prüfung: `carry webhook verify <payload> <sig>` validiert HMAC über Band-10-Secret, für CI-Integrationen.
- `event.skipped`-Fälle (Schema-Bruch) werden im CLI als Warnung mit Audit-Hinweis ausgegeben, nicht silently ignoriert.

## Kapitel 5 – Workflows

- `carry workflow run <def>` startet Band-9/Band-11-Prozesse über SDK; `--watch` pollt/streamt `WorkflowState`.
- Idempotenz: CLI erzeugt deterministischen `executionKey` aus Tenant+Workflow+Input-Hash, `--resume` nutzt gespeicherten Key.
- `carry workflow logs <id>` zeigt Audit-Trail-Phasen; `carry workflow cancel <id>` ruft Abbruch-Endpoint (Tenant-gesichert).
- Fehlerpfade: `WorkflowFailed` wird als strukturierter `CliError` gemappt mit Retry-Hinweis; kein verlorener State.
- Branchen-Workflow-Definitionen werden als deklarative YAML referenziert, nicht in CLI-Code eingebrannt.

## Kapitel 6 – Agenten

- `carry agent run <role> --prompt` ist dünner Proxy auf Band-11 Agent Runtime via SDK; keine eigene Agent-Engine im CLI.
- Agent-Context wird serverseitig mit Tenant-Scope angereichert; CLI übergibt nur Prompt+Referenz-IDs, keine System-Prompts lokal.
- Streaming-Antworten werden live ausgegeben (TTY-aware), Abbruch via Ctrl-C mit sauberem `AbortController`-Cleanup.
- `carry agent roles` listet verfügbare Rollen aus Band-11-Config; CLI nur Consumer, keine Registrierung eigener Rollen.
- Tool-Resultate werden als validierte, farbcodierte Tabellen ausgegeben (`ToolResult<T>` Schema-Check im SDK).

## Kapitel 7 – UI

- CLI-UI ist Terminal-UI (TUI): Tabellen, Prompts, Spinners; keine Web-UI-Fachlogik im CLI selbst.
- Output-Renderer unterstützen `table | json | yaml`; CI-Modus (`--json`) liefert parsebare Envelope ohne ANSI.
- Interaktive Wizards (`carry init`) führen Tenant-Onboarding ohne Geschäftsregeln – Regeln liegen in Band-10-Services.
- Fehler-Screens nutzen konsistente `CliError`-Darstellung; Success-State zeigt Links zum Web-Dashboard (Band-spezifisch).
- Keine Secrets in Terminal-Output (Token werden maskiert), Clipboard-Integration nur für nicht-sensitive URLs.

## Kapitel 8 – Tests

- Unit (Vitest): Command-Parser, Config-Zod-Validierung, Formatter (table/json/yaml Roundtrip), ExecutionKey-Determinismus.
- Integration: CLI gegen Band-10-Mock-API (Envelope), Tenant-Isolation pro Test via separater Profile-Instanz.
- E2E: `carry login` → `carry lead list --json` gegen Test-Tenant, Assert Envelope-Struktur und tenantId-Filter.
- Security-Tests: Secret-Leak-Test (Token nie in stdout/stderr/logfile), Tenant-Override-Block bei fehlendem Recht.
- Plugin-Tests: geladene Plugins dürfen keine Core-Commands überschreiben (Architektur-Regel "keine zweite Engine").

## Kapitel 9 – Security

- Auth ausschließlich über Band-10-Token-Store; Token in OS-Keychain/Secure-Storage, niemals plaintext in Config-Datei.
- Autorisierung: CLI fordert `requireApiPermission`-Scopes; fehlende Rechte → `403` CliError, kein Silent-Fallback.
- Tenant-Isolation: jeder Befehl zwingt `tenantId` (Profil oder `--tenant`); Befehle ohne Scope werden verweigert.
- Secrets/API-Keys nur via env/Keychain; CLI loggt niemals Token, Webhook-Secrets oder Prompt-Inhalte.
- Release-Signing (npm provenance) + `npm audit` im CI; CLI warnt bei unsignierten/unklaren Plugin-Quellen.

## Kapitel 10 – Performance

- Cold-Start < 300 ms durch Lazy-Load von Command-Gruppen; nur Core-Parser im Hauptbundle.
- Parallel-Fetch für Listenbefehle mit Paging (SDK-Cursor), p95 CLI→Gateway-Antwort < 150 ms exkl. Render.
- Bulk-Import nutzt Batch-API (bis 50/Request), Checkpointing verhindert Neustart bei Abbruch (Resume < 1 s Overhead).
- Lokales Caching von `carry agent roles`/`carry config` mit TTL 5 min, ETag-basiert, reduziert Repeat-Calls.
- Output-Streaming bei großen JSON-Dumps ohne vollständiges In-Memory-Parsing (Stream-Parser), RAM < 80 MB auch bei 100k Rows.

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün (Vitest). 5. Integration/E2E-Tests grün. 6. Architekturtests: keine zweiten Engines/Runtimes.
7. Tenant-Isolation-Test grün. 8. Secret-Leak-Test grün (kein Token in Output).

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
