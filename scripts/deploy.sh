#!/usr/bin/env bash
# Zero-touch deploy script run on the VPS (by GitHub Actions or manually).
# Pulls the latest code, installs deps, syncs the DB, rebuilds, and reloads PM2.
# Idempotent and safe to re-run. It NEVER touches your .env file.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/apnenews}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$APP_DIR"

echo "→ [1/6] Fetching origin/$BRANCH"
git fetch --all --prune
git reset --hard "origin/$BRANCH"

echo "→ [2/6] Installing dependencies (npm ci)"
npm ci

echo "→ [3/6] Generating Prisma client"
npx prisma generate

echo "→ [4/6] Syncing database schema"
npx prisma db push --accept-data-loss=false || npx prisma db push

echo "→ [5/6] Building Next.js"
npm run build

echo "→ [6/6] Reloading PM2"
if pm2 describe apnenews >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "✅ Deploy complete: $(git rev-parse --short HEAD) on $BRANCH"
