# Band 33 – Acceptance-Kriterien (Hausmeisterservice)

## Funktionale Kriterien

- [ ] Architektur folgt CarryOS Core (kein Fork, keine zweite Runtime/Engine/Queue/Finance)
- [ ] Tenant- und Workspace-Isolation durchgehend erzwungen
- [ ] APIs nutzen Band-10-Envelope + `withApiContext` + Zod
- [ ] Versionierte Events über bestehende Outbox/Queue
- [ ] Fachlogik in Service-Schicht, nicht in Route Handlern

## Qualitätskriterien

- [ ] Lint grün
- [ ] Typecheck grün (Strict, keine `any`)
- [ ] Unit-Tests vorhanden und grün
- [ ] Integrationstests für kritische Pfade
- [ ] Architekturtests bestehen
- [ ] Keine Secrets in Code/Logs/Docs

## Dokumentation

- [ ] EXECUTION_STATE.md aktualisiert (bei Implementierung)
- [ ] Abschlussbericht erzeugt
