# Phase 40 Scale Certification Runbook

Stand: 2026-08-18

## Zweck

Dieses Runbook steuert den Übergang von implementierter Software zu einer
evidenzbasierten produktiven Freigabe. Ein grüner Anwendungsbuild allein ist keine
Go-live- oder Scale-Zertifizierung.

## 1. Gates initialisieren

Als Workspace-Owner an `POST /api/scale-control` senden:

```json
{
  "action": "initialize_readiness_gates",
  "payload": {
    "regionCodes": ["DE", "AT", "CH"]
  }
}
```

Der Befehl ist idempotent. Er erzeugt fehlende Phase-30-Gates einmal pro Workspace
und Phase-40-Gates einmal pro Workspace, Region und Gate-Key. Alle Gates beginnen
auf `PENDING`.

## 2. Evidence erfassen

Ein Gate darf nur auf `PASS` oder `WAIVED` gesetzt werden, wenn eine belastbare
`evidenceReference` vorhanden ist:

```json
{
  "action": "set_scale_gate",
  "payload": {
    "gateKey": "regional_load_slo",
    "regionCode": "DE",
    "status": "PASS",
    "required": true,
    "evidenceReference": "evidence://load-tests/de/2026-08-18",
    "notes": "Ziel-SLO und Stop-Kriterien erfüllt."
  }
}
```

Evidence soll auf unveränderliche oder versionierte Nachweise verweisen, zum
Beispiel CI-Artefakte, Testberichte, Restore-Protokolle, freigegebene Fachprüfungen
oder Incident-Übungen.

## 3. Pflichtreihenfolge

1. Migrationen auf einer frischen PostgreSQL-Datenbank einspielen.
2. `db:verify:phase20`, `db:verify:phase30` und `db:verify:phase40` ausführen.
3. Architekturcheck, Typecheck, Lint, Unit-/Integrationstests und Build.
4. Datenbank seeden und E2E ausführen.
5. Tenant-, RBAC-, Vault-, Export- und Partner-Revocation testen.
6. Last-, Queue-, Retry-, DLQ- und Provider-Failover testen.
7. Backup erstellen und Restore praktisch durchführen.
8. SLO, Monitoring, Alerting und Incident Response prüfen.
9. Compliance, Datenschutz, Steuer, Finance und Plattformregeln je Region prüfen.
10. Canary je Region mit messbaren Stop-Kriterien durchführen.
11. Evidence hinterlegen und Gates einzeln freigeben.

## 4. Sofortiges NO-GO

- erforderliches Gate ist `PENDING` oder `FAIL`
- Phase-30-Gates fehlen
- Phase-40-Gates fehlen
- aktiver Operational Kill Switch
- offener SEV1- oder SEV2-Incident
- Evidence fehlt oder ist nicht nachvollziehbar
- Restore, Rollback oder Canary wurde nicht praktisch getestet

## 5. Kill Switch

Bei kritischer Abweichung über `POST /api/executive-control` aktivieren:

```json
{
  "action": "activate_kill_switch",
  "payload": {
    "scopeType": "GLOBAL",
    "reason": "Kritische Abweichung vom Scale-SLO"
  }
}
```

Freigabe erfolgt ausschließlich auditierbar über `release_kill_switch`.

## 6. Reliability Incident

Incident über `open_incident` an `POST /api/scale-control` anlegen. SEV1 und
SEV2 blockieren Scale Readiness bis zur Auflösung mit `evidenceReference`.

## 7. Dashboard

`/app/scale-control` zeigt:

- gesamtes READY/NO-GO
- Phase-30- und Phase-40-Blocker
- aktive Kill Switches
- kritische Incidents
- Gate-Status und Evidence je Region

## 8. GitHub Actions

Für PR #33 wurde bislang kein GitHub-Actions-Lauf erzeugt, obwohl der Workflow auf
`master` vorhanden ist und `pull_request` abonniert. Repository- oder
Organisations-Einstellungen unter **Settings → Actions → General** müssen geprüft
werden. Erst ein realer grüner Lauf darf als CI-Nachweis verlinkt werden.
