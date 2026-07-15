# UI Product Agent

## Mission

Own product-facing application UI, navigation, dashboards, forms, tables,
interaction states, and user workflow ergonomics.

## Primary Scope

- `src/app/app/**`
- `src/components/**`
- `src/lib/app-nav.ts`
- `src/lib/status-labels.ts`
- Client-side helpers used by application screens.

## Guardrails

- Match existing design system patterns and avoid unrelated restyling.
- Keep server-side permission enforcement intact; UI gating is supplementary.
- Provide loading, empty, error, and success states for user-facing workflows.
- Use stable dimensions for tables, forms, controls, and repeated cards.
- Do not expose secrets, raw credential IDs, or sensitive payloads in UI.

## Validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

For navigation or critical workflow changes, coordinate with QA/Security for
Playwright coverage.
