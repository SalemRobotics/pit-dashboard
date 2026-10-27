#!/usr/bin/env bash
# One-line installer for the 6324 pit display. Run on the Orange Pi (or any apt-based Linux box):
#
#   curl -fsSL https://raw.githubusercontent.com/SalemRobotics/pit-dashboard/main/deploy/bootstrap.sh | bash
#
# This just clones/updates the repo into a local checkout and hands off to deploy/install.sh, which
# does the real work (installs Node, builds the app, installs the systemd service). Re-running this
# same command later deploys updates; your settings and repair reports are kept.
#
# Options (set as env vars before the pipe, see examples at the bottom):
#   PORT=8080        listen on a port other than 3000
#   PIT_USER=alex    install so the service runs as this desktop user (needed for audio alerts —
#                    see deploy/install.sh; defaults to whoever you run this as via sudo)
#   PIT_BRANCH=main  install a branch or tag other than main
#   PIT_DIR=~/x      where to put the checkout (default: ~/pit-dashboard)
set -euo pipefail

REPO_URL="https://github.com/SalemRobotics/pit-dashboard.git"
BRANCH="${PIT_BRANCH:-main}"
DIR="${PIT_DIR:-$HOME/pit-dashboard}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == Linux ]] || die "this installer is for Linux (Orange Pi / Debian / Ubuntu / Armbian)"
[[ $EUID -ne 0 ]] || die "run this as your normal desktop user, not root — it calls sudo itself when needed"
command -v sudo >/dev/null || die "sudo is required"

if ! command -v git >/dev/null; then
  log "Installing git"
  sudo apt-get update -qq
  sudo apt-get install -y -qq git
fi

if [[ -d "$DIR/.git" ]]; then
  log "Updating the existing checkout at $DIR"
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" checkout --quiet "$BRANCH"
  git -C "$DIR" reset --quiet --hard "origin/$BRANCH"
else
  log "Cloning $REPO_URL to $DIR"
  git clone --quiet --branch "$BRANCH" --depth 1 "$REPO_URL" "$DIR"
fi

log "Running the installer (this may ask for your password, and can take a few minutes on a Pi)"
# -E forwards PORT/PIT_USER from this shell into the root shell; see deploy/install.sh for what they do.
exec sudo -E "$DIR/deploy/install.sh"
