# CarryOS Universe – Band 11
# Masterprompt: Agentic Operating System (VOLLSTÄNDIG)

> Band: 11
> Masterprompt: 11.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 10 (API Governance)
> Ziel: Einheitliche Agenten-Laufzeit, Lifecycle, Capabilities, Execution, Memory, Observability.

---

## Kapitel 1 – Architektur

### 1.1 Prinzip

Bestehende Agenten-Laufzeit erweitern, keine zweite Agent Runtime. Basis:
`src/server/services/agents.ts`. Bestehende Workflow Engine, EventBus und
Queue werden wiederverwendet.

### 1.2 Komponenten

- Agent Registry (in `agents.ts`)
- Capability Registry (abgeleitet aus Agent-Metadaten)
- Execution Runtime (nutzt bestehende Worker/Queue)
- Agent Memory (tenant-isoliert über Repository-Schicht)
- Observability (in `src/lib/observability`)

### 1.3 Verbotene Parallelstrukturen

- Keine zweite Agent Runtime
- Keine zweite Workflow Engine
- Keine zweite EventBus-/Queue-Architektur

---

## Kapitel 2 – Datenmodelle

### 2.1 Agent

- `id`, `tenantId`, `name`, `version`, `state`
- `state ∈ {registered, enabled, running, paused, disabled}`

### 2.2 Capability

- `agentId`, `name`, `version`, `inputSchema`, `outputSchema`, `permissions[]`

### 2.3 AgentMemory

- `tenantId`, `agentId`, `scope` (short|long), `key`, `value`, `version`

### 2.4 ExecutionRecord

- `executionKey` (Idempotenz), `tenantId`, `agentId`, `capability`, `status`, `result`

---

## Kapitel 3 – APIs

### 3.1 Endpunkte

- `GET /api/v1/agents` — Liste (tenant-isoliert)
- `POST /api/v1/agents/:id/capabilities/discover`
- `POST /api/v1/agents/:id/execute` — Capability-Ausführung
- `GET /api/v1/agents/:id/memory`

### 3.2 Standard

Alle Endpunkte nutzen Band-10-Envelope und `withApiContext`.

---

## Kapitel 4 – Events

- `agent.registered.v1`
- `agent.state.changed.v1`
- `agent.capability.executed.v1`
- `agent.memory.written.v1`

Versioniert, über bestehende Outbox/Queue.

---

## Kapitel 5 – Workflows

### 5.1 Execution-Flow

```
execute
 → withApiContext(permission)
 → Tenant-Kontext
 → ExecutionKey (Idempotenz)
 → Service/Logic (agents.ts)
 → versioniertes Event (Outbox)
 → Response-Envelope
```

### 5.2 Lifecycle-Transition

Registrierung → Enable → Run → Pause → Disable, jeweils auditiert.

---

## Kapitel 6 – Agenten

Agenten werden in `agents.ts` registriert. Jeder Agent deklariert
Capabilities mit Zod-Schemas. Keine Fachlogik im Route Handler.

---

## Kapitel 7 – UI

Agent-Dashboard zeigt Registry, States, Capabilities, Memory. Keine
Geschäftslogik in Client-Komponenten.

---

## Kapitel 8 – Tests

- Unit: Registry-Operationen, Lifecycle, Discovery, Idempotenz
- Integration: Execution über Worker, Memory-Isolation
- Security: Cross-Tenant Memory-Zugriff blockiert

---

## Kapitel 9 – Security

- Permission-gebundene Capability-Sichtbarkeit
- Tenant-Isolation in Memory und Execution
- Keine Secrets in Memory (verschlüsselt)
- Audit für kritische Agent-Aktionen

---

## Kapitel 10 – Performance

- Execution asynchron über Queue (kein Blockieren)
- Memory-Lookups indexiert auf `tenantId`, `agentId`
- Metriken: Aufrufe, Latenz, Fehler pro Capability

---

## Quality Gates

1. TypeScript Strict, keine `any`.
2. Lint grün.
3. Typecheck grün.
4. Unit-Tests grün.
5. Integrationstests grün.
6. Architekturtests: keine zweite Runtime/Engine/Queue.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand
2. Gap-Analyse
3. erstellte Dateien
4. geänderte Dateien
5. Datenbankänderungen
6. APIs und Events
7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse
9. offene Blocker
10. technische Schulden
11. Empfehlung für den nächsten Schritt
