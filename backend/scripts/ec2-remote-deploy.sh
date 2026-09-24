#!/usr/bin/env bash
# Runs ON the EC2 box, piped in over SSH by .github/workflows/deploy-backend-ec2.yml.
#
# This repo disagrees with itself about how that box is laid out — the workflow
# assumed ec2-user + docker-compose, backend/deploy.sh assumes ubuntu + PM2 — so
# nothing here is assumed: the app directory is located and the runtime detected
# before anything is restarted.
set -euo pipefail

# 1. Locate the checkout.
APP_DIR=""
for d in "$HOME/zeflash-backend" "$HOME/zeflash/backend" "$HOME/zeflash" \
         /home/ec2-user/zeflash-backend /home/ubuntu/zeflash-backend \
         /home/ubuntu/zeflash/backend /opt/zeflash-backend; do
  if [ -d "$d/.git" ] || [ -f "$d/package.json" ]; then APP_DIR="$d"; break; fi
done
if [ -z "$APP_DIR" ]; then
  echo "ERROR: no backend checkout found on $(hostname)."
  echo "Looked under \$HOME, /home/ec2-user, /home/ubuntu and /opt."
  exit 1
fi
echo "==> app directory: $APP_DIR"
cd "$APP_DIR"

# 2. Take the latest code.
if [ -d .git ]; then
  git fetch --quiet origin
  git reset --hard origin/main
  echo "==> now at $(git rev-parse --short HEAD): $(git log -1 --format=%s)"
else
  echo "WARNING: $APP_DIR is not a git checkout; skipping code update."
fi

# 3. Detect how the service actually runs before touching it.
RUNTIME=""
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q zeflash-backend; then
  RUNTIME=docker
elif command -v pm2 >/dev/null 2>&1 && pm2 list 2>/dev/null | grep -q zeflash-backend; then
  RUNTIME=pm2
elif [ -f docker-compose-ec2.yml ] || [ -f docker-compose.yml ]; then
  RUNTIME=docker
elif command -v pm2 >/dev/null 2>&1; then
  RUNTIME=pm2
fi
echo "==> runtime: ${RUNTIME:-none detected}"

case "$RUNTIME" in
  docker)
    COMPOSE="docker compose"
    docker compose version >/dev/null 2>&1 || COMPOSE="docker-compose"
    FILE=docker-compose-ec2.yml
    [ -f "$FILE" ] || FILE=docker-compose.yml
    # Build first — if the build fails the running container is left untouched.
    $COMPOSE -f "$FILE" build
    $COMPOSE -f "$FILE" up -d
    ;;
  pm2)
    npm ci --omit=dev 2>/dev/null || npm install
    npx prisma generate
    npm run build
    pm2 restart zeflash-backend --update-env || pm2 start dist/index.js --name zeflash-backend
    pm2 save
    ;;
  *)
    echo "ERROR: neither Docker nor PM2 is available here; cannot restart the service."
    exit 1
    ;;
esac

# 4. Confirm it came back up before calling this a success.
for i in $(seq 1 12); do
  if curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
    echo "==> healthy after ${i} attempt(s): $(curl -s http://localhost:3001/health)"
    exit 0
  fi
  sleep 5
done

echo "ERROR: backend did not become healthy on port 3001 within 60s."
if [ "$RUNTIME" = docker ]; then
  docker logs --tail 50 zeflash-backend 2>&1 || true
else
  pm2 logs zeflash-backend --lines 50 --nostream 2>&1 || true
fi
exit 1
