# CarryOS Universe – Band 14
# Masterprompt: Business and Finance (VOLLSTÄNDIG)

> Band: 14
> Masterprompt: 14.0 (vollständig, konsolidiert)
> Status: PLANNED
> Abhängigkeit: Band 10 (API), Band 13 (Revenue-Daten)
> Ziel: Finance-Engine, Budgets, Invoices, Payouts, Affiliate-Commissions — auditierbar.

---

## Kapitel 1 – Architektur

Basis: `src/lib/finance`. **Keine zweite Finance Engine.** Alle
Finanzoperationen idempotent und auditiert. Bestehende Module erweitern.

---

## Kapitel 2 – Datenmodelle

- `Budget` (tenantId, amount, period)
- `Invoice` (tenantId, partnerId, lines[], total)
- `Payout` (tenantId, amount, status)
- `Commission` (tenantId, affiliateId, amount, status)
- Erweiterung `ApiAuditLog` für Finanz-Aktionen

---

## Kapitel 3 – APIs

- `POST /api/v1/finance/budgets`
- `POST /api/v1/finance/invoices`
- `POST /api/v1/finance/payouts`
- `POST /api/v1/finance/commissions`

Alle nutzen Band-10-Envelope + `withApiContext` + Audit.

---

## Kapitel 4 – Events

- `finance.budget.updated.v1`
- `finance.invoice.created.v1`
- `finance.payout.executed.v1`
- `finance.commission.accrued.v1`

Versioniert, auditiert.

---

## Kapitel 5 – Workflows

Budget → Spend-Tracking → Invoice → Commission → Payout. Jeder Schritt
idempotent (ExecutionKey) und auditiert.

---

## Kapitel 6 – Agenten

Finance-Agent (optional) für Reconciliation, registered in Band 11 Runtime.

---

## Kapitel 7 – UI

Finanz-Dashboards: Budgets, Invoices, Payouts, Commissions, Profitability.

---

## Kapitel 8 – Tests

- Unit: Berechnungen (Commission, Tax-Reserve)
- Integration: Invoice→Payout
- Security: Tenant-Isolation, Audit-Vollständigkeit

---

## Kapitel 9 – Security

- Strikte Tenant-Isolation (Finanzdaten hochsensibel)
- Audit für jede kritische Änderung (Pflicht)
- Keine Secrets in Logs

---

## Kapitel 10 – Performance

- Aggregationen über indizierte Finanz-Tabellen
- Report-Queries materialisiert/cached pro Tenant

---

## Quality Gates

1. TypeScript Strict, keine `any`. 2. Lint grün. 3. Typecheck grün.
4. Unit-Tests grün. 5. Integrationstests grün.
6. Architekturtests: KEINE zweite Finance Engine.

---

## Abschlussbericht (Struktur)

1. Ausgangszustand 2. Gap-Analyse 3. erstellte Dateien 4. geänderte Dateien
5. Datenbankänderungen 6. APIs und Events 7. Sicherheitsmaßnahmen
8. Tests und tatsächliche Ergebnisse 9. offene Blocker 10. technische Schulden
11. Empfehlung für den nächsten Schritt
