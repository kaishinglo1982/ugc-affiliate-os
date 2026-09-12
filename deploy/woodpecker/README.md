# Woodpecker CI — self-hosted setup

Free, self-hosted replacement for `.github/workflows/ci.yml`'s `validate` job,
for whenever GitHub Actions' quota/spending limit blocks CI on this repo (see
`docs/architecture` and PR #36 for the background). Runs on a host you
control; GitHub only ever talks to it via a webhook + OAuth login, never via
GitHub Actions billing.

## Prerequisites

- A host reachable from the public internet on the `WOODPECKER_HOST` domain
  you pick — a small VPS, or your existing box (the one `deploy/*.service`
  already runs on) plus a reverse proxy, or a home server behind a
  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  if you don't have a static IP. Docker + Docker Compose installed there.
- A domain (or subdomain) pointed at that host, e.g. `ci.yourdomain.tld`.
  GitHub's OAuth callback and webhook both need this to be reachable over
  HTTPS — self-signed certs won't work with GitHub's webhook delivery.

## 1. Provision the host

Pick one (all have a free tier as of writing — verify current terms before
committing, free tiers change):

- Your existing server, if `deploy/*.service` already runs somewhere with a
  public address — simplest, nothing new to manage.
- A free-tier VPS (e.g. Oracle Cloud "Always Free" compute) if you don't have
  one yet.
- Your own machine + Cloudflare Tunnel, if you'd rather not run a public
  server at all.

## 2. Create the GitHub OAuth App

1. GitHub → your account → **Settings → Developer settings → OAuth Apps →
   New OAuth App**.
2. Application name: `Woodpecker CI (ugc-affiliate-os)`.
3. Homepage URL: `https://<your WOODPECKER_HOST>`.
4. **Authorization callback URL: `https://<your WOODPECKER_HOST>/authorize`**
   — must match exactly, this is the #1 cause of login failures.
5. Save. Copy the **Client ID** and generate a **Client Secret** — you'll
   need both for `.env`.

## 3. Configure and start

```bash
cd deploy/woodpecker
cp .env.example .env
openssl rand -hex 32   # paste the output into WOODPECKER_AGENT_SECRET
$EDITOR .env            # fill in WOODPECKER_HOST, GITHUB_CLIENT, GITHUB_SECRET, ADMIN
docker compose up -d
docker compose logs -f  # confirm both server and agent start cleanly
```

Put `server:8000` behind your existing reverse proxy (nginx/Caddy/Traefik/
Cloudflare Tunnel) so it's served over HTTPS at `WOODPECKER_HOST`. The compose
file binds it to `127.0.0.1:8000` on purpose — it is not meant to be exposed
directly.

## 4. Enable the repository

1. Open `https://<WOODPECKER_HOST>`, log in with GitHub (as `WOODPECKER_ADMIN`).
2. Find `kaishinglo1982/ugc-affiliate-os` in the repo list and enable it.
   This registers the GitHub webhook automatically — no manual webhook setup
   needed.
3. Push a commit or open a PR. Woodpecker picks up `.woodpecker.yml` from the
   repo root (see that file) and reports back as a commit status, exactly
   like the existing `Vercel` check does today.

## What this does and doesn't replace

Covers the same ground as `ci.yml`'s `validate` job: architecture check,
Prisma generate + migrate, typecheck, lint, test, build, against a real
Postgres service container. It deliberately does **not** yet cover the `e2e`
job (Playwright/Chromium) — that's heavier to run self-hosted and was left
for a follow-up once the basic pipeline is confirmed working.

Known pre-existing, unrelated issue that will still show up here: `pnpm run
lint` currently crashes repo-wide under TypeScript 7.0.2
(`@typescript-eslint/typescript-estree` incompatibility, see #35/#36/#38) —
that step will fail on Woodpecker too, for the same reason it fails
everywhere else right now. Not something this migration fixes or should try
to paper over.
