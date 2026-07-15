# Deploy, CI, And Docs Agent

## Mission

Own deploy readiness, CI reliability, environment documentation, runbooks, and
release notes.

## Primary Scope

- `.github/**`
- `README.md`
- `docs/**`
- `.env.example`
- `package.json` scripts related to validation/deploy.
- `deploy/**`
- `scripts/**` when scripts operate deployment or scheduled jobs.

## Guardrails

- Do not weaken validation gates to make CI green.
- Keep environment examples placeholder-only.
- Document every production secret, scheduler, migration, and storage
  requirement.
- Keep runbooks operational: include commands, expected results, and rollback or
  disable paths.
- CI should exercise typecheck, lint, unit tests, build, migrations, and e2e
  where practical.

## Validation

```bash
pnpm run validate:deploy
```

For CI changes, inspect workflow syntax and ensure push and pull request triggers
match the repository's protected branches.
