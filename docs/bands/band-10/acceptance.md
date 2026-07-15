# Band 10 – Acceptance-Kriterien

## Funktionale Kriterien

- [ ] Ein zentraler Error-Envelope mit einheitlichem Format existiert.
- [ ] Alle `/api`-Routen können den Envelope ohne Duplikation nutzen.
- [ ] Request-Validierung erfolgt über Zod-Schemas (kein `any`).
- [ ] Tenant-/Workspace-Isolation ist in einem wiederverwendbaren Wrapper
      gekapselt und wird von Routen genutzt.
- [ ] Keine Fachlogik steht direkt in Route Handlern (Gap-Review der 12
      geänderten Routen).

## Qualitätskriterien

- [ ] Lint grün.
- [ ] Typecheck grün (Strict Mode).
- [ ] Unit-Tests für das neue Gerüst vorhanden und grün.
- [ ] Keine Secrets in Code, Logs oder Dokumentation.

## Dokumentation

- [ ] EXECUTION_STATE.md auf `VALIDATING`/`COMPLETED` aktualisiert.
- [ ] Abschlussbericht unter `docs/reports/` erzeugt.
- [ ] Kein Band als abgeschlossen markiert, wenn Pflicht-Gates fehlschlagen.
