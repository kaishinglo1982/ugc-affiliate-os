#!/usr/bin/env sh
# Phase 7 — Product Intelligence nightly research pipeline.
# Invokes the authenticated worker endpoint which runs the full discovery ->
# normalization -> matching -> compliance -> content-fit -> profitability ->
# opportunity scoring -> expiration -> data-quality pipeline.
set -u

BASE_URL="${APP_BASE_URL:-http://localhost:3000}"
SECRET="${WORKER_SECRET:-}"

if [ -z "$SECRET" ]; then
  echo "[product-research-cron] WORKER_SECRET not set; relying on signed-in owner fallback." >&2
fi

echo "[product-research-cron] triggering /api/products/jobs/run at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

curl -fsS -X POST "${BASE_URL}/api/products/jobs/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SECRET}" \
  -d '{}' \
  && echo "[product-research-cron] ok" \
  || echo "[product-research-cron] request failed (non-fatal)" >&2
