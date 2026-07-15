#!/usr/bin/env sh
# Triggers the Phase 6 analytics automation pipeline (aggregate -> anomaly -> data-quality).
# Call this from cron / a systemd timer / Vercel Cron. Requires WORKER_SECRET to be set to the
# same value used by the publish worker, and APP_BASE_URL pointing at the deployment.
set -eu

BASE_URL="${APP_BASE_URL:-http://localhost:3000}"
: "${WORKER_SECRET:?WORKER_SECRET must be set to the same value as the publish worker}"

curl -fsS -X POST "$BASE_URL/api/analytics/jobs/run" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  --data '{}'

echo "analytics automation pipeline triggered at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
