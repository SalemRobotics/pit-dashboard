#!/usr/bin/env bash
# Installs the pit display as a systemd service (tested target: Debian/Ubuntu/Armbian on Orange Pi).
# Run from a checkout of this repo:   sudo ./deploy/install.sh
# Re-run any time to deploy updates; settings and survey reports in /var/lib/pit-display are kept.
# Optional: PORT=8080 sudo -E ./deploy/install.sh
set -euo pipefail

APP_NAME=pit-display
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
# build-essential/python3 let npm compile ssh2's optional "cpu-features" native addon (used for
# the robot log puller's SFTP connection); without a compiler that build silently fails in a way
# that can leave node_modules in a broken state and confuse later npm commands.
apt-get install -y -qq ca-certificates curl rsync pulseaudio-utils espeak-ng build-essential python3

if ! node_ok; then
  log "Installing Node.js $NODE_MAJOR (from NodeSource)"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node_ok || die "Node.js 20.9 or newer is required"
NODE_BIN="$(readlink -f "$(command -v node)")"
echo "Using $NODE_BIN ($(node -v))"

log "Choosing the service user and creating directories"
APP_USER="${PIT_USER:-${SUDO_USER:-}}"
AUDIO_USER=0
if [[ -z "$APP_USER" || "$APP_USER" == root ]]; then
  APP_USER=pitdisplay
  printf 'warning: no desktop user detected; using the dedicated "%s" user.\n' "$APP_USER" >&2
  printf 'warning: audio alerts will NOT work. Run via sudo from the desktop user'"'"'s account, or set PIT_USER=<name>.\n' >&2
  id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
else
  id "$APP_USER" >/dev/null 2>&1 || die "user '$APP_USER' does not exist"
  AUDIO_USER=1
  # Keep /run/user/<uid> and the user's PipeWire/Pulse socket alive without a login session.
  loginctl enable-linger "$APP_USER"
fi
APP_UID="$(id -u "$APP_USER")"
APP_GROUP="$(id -gn "$APP_USER")"
echo "Service user: $APP_USER (uid $APP_UID, group $APP_GROUP)"
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
# A previous failed install can leave node_modules half-built in a way `npm ci` won't repair on
# its own (it only reports the mismatch, it doesn't fix it) — wipe it first so this is always a
# clean install, then fall back to a slower but more forgiving `npm install` if `npm ci` still
# complains the lock file is out of sync.
rm -rf node_modules
if ! npm ci --no-audit --no-fund; then
  log "npm ci failed; retrying with npm install (slower, but repairs an out-of-sync lock file)"
  rm -rf node_modules
  npm install --no-audit --no-fund
fi
npm run build
VOICE_DIR="$DATA_DIR/voice"
PIPER_VOICE="${PIPER_VOICE:-en_US-lessac-medium}"

# Pre-renders "Now queued for Red" / "Now queued for Blue" with Piper (a natural-sounding offline voice) so the
# running service only has to play two WAV files. Needs internet once (~300 MB incl. the Python venv).
setup_voice() {
  local py="$VOICE_DIR/venv/bin/python" alliance
  apt-get install -y -qq python3 python3-venv || return 1
  mkdir -p "$VOICE_DIR/models" "$VOICE_DIR/clips" || return 1
  [[ -x "$py" ]] || python3 -m venv "$VOICE_DIR/venv" || return 1
  "$py" -m pip install -q piper-tts || return 1
  [[ -f "$VOICE_DIR/models/$PIPER_VOICE.onnx" ]] ||
    "$py" -m piper.download_voices "$PIPER_VOICE" --download-dir "$VOICE_DIR/models" || return 1
  rm -f "$VOICE_DIR"/clips/*-alliance.wav # clips from earlier versions
  for alliance in red blue; do
    "$py" -m piper -m "$PIPER_VOICE" --data-dir "$VOICE_DIR/models" \
      -f "$VOICE_DIR/clips/queued-$alliance.tmp.wav" -- "Now queued for ${alliance^}" || return 1
    mv "$VOICE_DIR/clips/queued-$alliance.tmp.wav" "$VOICE_DIR/clips/queued-$alliance.wav" || return 1
  done
}

if [[ $AUDIO_USER -eq 1 ]]; then
  log "Generating the alliance voice clips ($PIPER_VOICE)"
  if ! setup_voice; then
    printf 'warning: could not set up the Piper voice; alerts will use the espeak-ng voice instead.\n' >&2
  fi
fi

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR" "$DATA_DIR"

log "Installing the systemd service"
sed -e "s|__NODE__|$NODE_BIN|" -e "s|__PORT__|$PORT|" \
  -e "s|__USER__|$APP_USER|g" -e "s|__GROUP__|$APP_GROUP|g" -e "s|__UID__|$APP_UID|g" \
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
  if [[ $AUDIO_USER -eq 1 ]]; then
    echo "    audio:   test with the 'Test red alliance alert' button in Settings; watch 'journalctl -u $APP_NAME -f' for audio warnings"
  fi
else
  journalctl -u "$APP_NAME" -n 30 --no-pager || true
  die "the service failed to start (see log above)"
fi
