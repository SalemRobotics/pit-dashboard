#!/usr/bin/env bash
# Installs the pit display as a systemd service (tested target: Debian/Ubuntu/Armbian on Orange Pi).
# Run from a checkout of this repo:   sudo ./deploy/install.sh
# Re-run any time to deploy updates; settings and survey reports in /var/lib/pit-display are kept.
# Optional: PORT=8080 sudo -E ./deploy/install.sh
set -euo pipefail

APP_NAME=pit-display
APP_USER=pitdisplay
APP_DIR=/opt/pit-display
DATA_DIR=/var/lib/pit-display
PORT="${PORT:-3000}"
NODE_MAJOR=22
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root: sudo $0"
command -v systemctl >/dev/null || die "systemd is required"
command -v apt-get >/dev/null || die "this script expects an apt-based OS (Debian, Ubuntu, Armbian)"
[[ -f "$REPO_DIR/package.json" ]] || die "can't find the project at $REPO_DIR"
[[ "$PORT" =~ ^[0-9]+$ ]] || die "PORT must be a number"

node_ok() {
  command -v node >/dev/null || return 1
  # Next.js 16 needs Node 20.9+
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>20||(a===20&&b>=9)?0:1)'
}

log "Installing system packages"
apt-get update -qq
apt-get install -y -qq ca-certificates curl rsync

if ! node_ok; then
  log "Installing Node.js $NODE_MAJOR (from NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node_ok || die "Node.js 20.9 or newer is required"
NODE_BIN="$(readlink -f "$(command -v node)")"
echo "Using $NODE_BIN ($(node -v))"

log "Creating service user and directories"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR"

log "Copying the app to $APP_DIR"
rsync -a --delete \
  --exclude /.git --exclude /node_modules --exclude /.next --exclude /data --exclude /screenshots \
  "$REPO_DIR/" "$APP_DIR/"

log "Installing dependencies and building (this can take a few minutes on a Pi)"
cd "$APP_DIR"
# Small boards can run out of memory during the build; cap the heap below typical RAM.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
export NEXT_TELEMETRY_DISABLED=1
npm ci --no-audit --no-fund
npm run build
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$DATA_DIR"

log "Installing the systemd service"
sed -e "s|__NODE__|$NODE_BIN|" -e "s|__PORT__|$PORT|" \
  "$REPO_DIR/deploy/$APP_NAME.service" > "/etc/systemd/system/$APP_NAME.service"
systemctl daemon-reload
systemctl enable "$APP_NAME" >/dev/null
systemctl restart "$APP_NAME"

sleep 3
if systemctl is-active --quiet "$APP_NAME"; then
  log "Done. The pit display is running."
  for ip in $(hostname -I 2>/dev/null); do echo "    http://$ip:$PORT"; done
  echo "    logs:    journalctl -u $APP_NAME -f"
  echo "    restart: sudo systemctl restart $APP_NAME"
else
  journalctl -u "$APP_NAME" -n 30 --no-pager || true
  die "the service failed to start (see log above)"
fi
