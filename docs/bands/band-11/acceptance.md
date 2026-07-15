# Band 11 – Acceptance-Kriterien

## Funktionale Kriterien

- [ ] Agent-Registry in `src/server/services/agents.ts` erweitert (keine zweite Runtime).
- [ ] Lifecycle-States implementiert und getestet.
- [ ] Capability Discovery nutzt bestehende Registry, Zod-validiert.
- [ ] Execution über bestehende Queue/Worker, idempotent.
- [ ] Agent Memory tenant-isoliert.
- [ ] Observability in `src/lib/observability` integriert.

## Qualitätskriterien

- [ ] Lint grün.
- [ ] Typecheck grün (Strict).
- [ ] Unit-Tests für Registry, Discovery, Execution, Memory vorhanden.
- [ ] Architekturtest: keine zweite Agent Runtime / Workflow Engine / Queue.
- [ ] Keine Secrets in Code/Logs/Docs.

## Dokumentation

- [ ] EXECUTION_STATE.md aktualisiert.
- [ ] Abschlussbericht erzeugt.
