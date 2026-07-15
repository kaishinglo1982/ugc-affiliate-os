# Band 11 – Masterprompt 11.0, Teil 1: Vision & Architektur

## 1.1 Vision

Band 11 definiert die Agentic Operating System-Schicht von CarryOS: eine
einzige, erweiterbare Agenten-Laufzeit, auf der alle späteren Bänder
(Content Factory, Growth, Brancheneditionen) aufbauen.

## 1.2 Strategische Prinzipien

- **Eine Runtime.** Es gibt keine zweite Agent Runtime. Basis:
  `src/server/services/agents.ts`.
- **Erweiterung vor Duplikation.** Bestehende Workflow Engine, EventBus und
  Queue werden wiederverwendet.
- **Tenant-Isolation durchgehend.** Agenten agieren strikt im Tenant-Kontext.
- **Beobachtbarkeit.** Jede Agenten-Aktion ist metrisch und auditiert.

## 1.3 Komponenten

- Agent Registry (in `agents.ts`)
- Capability Registry (abgeleitet aus Agent-Metadaten)
- Execution Runtime (nutzt bestehende Worker/Queue)
- Agent Memory (tenant-isoliert über Repository-Schicht)
- Observability (in `src/lib/observability`)

## 1.4 Architektur-Schichten

```
Agent Call
  → withApiContext(permission)        (Band 10)
    → ExecutionKey (Idempotenz)
      → Agent Service (agents.ts)
        → Capability-Logik / Tool-Call
          → versioniertes Event (Outbox)
            → Response-Envelope (Band 10)
```

## 1.5 Verbotene Parallelstrukturen

- Keine zweite Agent Runtime
- Keine zweite Workflow Engine
- Keine zweite EventBus-/Queue-Architektur

## 1.6 Abhängigkeiten

Hängt von Band 10 (API-Standard, Envelope, `withApiContext`).
