#!/usr/bin/env bash
# Read-only: is this verify-traces instance worth driving?
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

load_run_state

NEXT_PORT="$(state_get nextPort)"
CDP_PORT="$(state_get cdpPort)"
NEXT_PID="$(state_get nextPid)"
ELECTRON_PID="$(state_get electronPid)"
VAULT_DIR="$(state_get vaultDir)"
HOME_DIR="$(state_get home)"
REPO="$(state_get repoRoot)"

echo "run: $TRACES_VERIFY_RUN"
echo "repo: $REPO"
echo "home: $HOME_DIR"
echo "vault: $VAULT_DIR"
echo "nextPid: $NEXT_PID"
echo "electronPid: $ELECTRON_PID"
echo "nextPort: $NEXT_PORT"
echo "cdpPort: $CDP_PORT"

REAL_LOGIN_HOME="${REAL_HOME:-$HOME}"
if [ "$HOME_DIR" = "$REAL_LOGIN_HOME" ]; then
  die "refusing to drive: isolated HOME equals the real login home ($REAL_LOGIN_HOME)"
fi
if [ "$VAULT_DIR" = "$REAL_LOGIN_HOME/Desktop/Traces Notes" ]; then
  die "refusing to drive the default user vault at $VAULT_DIR"
fi

case "$VAULT_DIR" in
  "$HOME_DIR"/Desktop/"Traces Notes") ;;
  *) die "vault path $VAULT_DIR is not \$HOME/Desktop/Traces Notes under the isolated home" ;;
esac

pid_alive "$NEXT_PID" || die "Next.js pid $NEXT_PID is not running"
pid_alive "$ELECTRON_PID" || die "Electron pid $ELECTRON_PID is not running"

code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NEXT_PORT" || true)"
[ "$code" = "200" ] || [ "$code" = "304" ] || die "Next.js on 127.0.0.1:$NEXT_PORT returned HTTP $code"

curl -sf "http://127.0.0.1:$CDP_PORT/json/list" >/dev/null || die "CDP on 127.0.0.1:$CDP_PORT is not answering"

export TRACES_VERIFY_CDP_PORT="$CDP_PORT"
node "$HELPERS_DIR/drive.mjs" doctor-json

echo "doctor: ok"
