#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/Compliance-360/frontend"
PM2_NAME="compliance-360-frontend"
PM2_PORT="4173"

echo "=========================================="
echo "Compliance 360 - Frontend Redeploy"
echo "=========================================="

cd "$APP_DIR"

echo "==> Installing frontend dependencies"
rm -rf node_modules package-lock.json
npm install

echo "==> Building frontend"
npm run build

echo "==> Starting/restarting PM2 static server"
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
pm2 serve "$APP_DIR/dist" "$PM2_PORT" --name "$PM2_NAME" --spa
pm2 save

echo "==> Checking status"
pm2 list

echo "=========================================="
echo "Frontend redeploy complete!"
echo "=========================================="
echo "Frontend should be reachable on port $PM2_PORT"
echo ""
