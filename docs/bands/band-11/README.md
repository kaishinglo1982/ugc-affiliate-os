# Band 11 – Agentic Operating System

Band 11 baut auf Band 10 (API Governance) auf und definiert die
Agenten-Laufzeit und -Steuerung von CarryOS. Es darf **keine zweite
Agent Runtime** entstehen — die bestehende Registry in
`src/server/services/agents.ts` wird erweitert.

## Ziele

- Einheitliche Agent-Registry und Lifecycle
- Capability Discovery
- Ausführung über bestehende Runtime
- Agent Memory und Observability
- Worker/Scheduler-Integration

## Masterprompts

- [11.1 Agent Registry & Lifecycle](./masterprompt-11.1-agent-registry.md)
- [11.2 Capability Discovery](./masterprompt-11.2-capability-discovery.md)
- [11.3 Execution Runtime](./masterprompt-11.3-execution-runtime.md)
- [11.4 Agent Memory](./masterprompt-11.4-agent-memory.md)
- [11.5 Observability & Scheduler](./masterprompt-11.5-observability-scheduler.md)
- [Acceptance](./acceptance.md)

## Status

`PLANNED` – abhängig von Band 10.
