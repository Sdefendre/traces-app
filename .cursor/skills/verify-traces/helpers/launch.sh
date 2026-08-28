#!/usr/bin/env bash
# Start an isolated Traces desktop instance for verification.
# Prints a run.env path. Source that file before doctor / drive / cleanup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_cmd node
require_cmd pnpm
require_cmd curl

[ -d "$REPO_ROOT/node_modules" ] || die "run pnpm install in $REPO_ROOT first"
[ -x "$REPO_ROOT/node_modules/.bin/electron" ] || die "Electron binary missing. From $REPO_ROOT run: node node_modules/electron/install.js"

NEXT_PORT="${TRACES_VERIFY_NEXT_PORT:-$DEFAULT_NEXT_PORT}"
CDP_PORT="${TRACES_VERIFY_CDP_PORT:-$DEFAULT_CDP_PORT}"
RUN_ID="${TRACES_VERIFY_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
RUN_DIR="${TRACES_VERIFY_RUN:-/tmp/traces-verify-$RUN_ID}"
EVIDENCE_ROOT="${TRACES_VERIFY_EVIDENCE_ROOT:-$DEFAULT_EVIDENCE_ROOT}"
EVIDENCE_DIR="$EVIDENCE_ROOT/$RUN_ID"

if [ "$NEXT_PORT" != "3333" ]; then
  die "Electron loads http://localhost:3333 in dev. TRACES_VERIFY_NEXT_PORT must be 3333 (got $NEXT_PORT)"
fi

if port_in_use "$NEXT_PORT"; then
  die "port $NEXT_PORT is already taken. Cleanup the verify run that owns it, or stop that PID. Do not pkill by name."
fi

if port_in_use "$CDP_PORT"; then
  die "CDP port $CDP_PORT is already taken. Set TRACES_VERIFY_CDP_PORT to a free port, or cleanup the run that owns $CDP_PORT."
fi

mkdir -p "$RUN_DIR/home/Desktop/Traces Notes" \
  "$RUN_DIR/user-data" \
  "$RUN_DIR/logs" \
  "$EVIDENCE_DIR"

VERIFY_HOME="$RUN_DIR/home"
VAULT_DIR="$VERIFY_HOME/Desktop/Traces Notes"

cat > "$VAULT_DIR/Verify Alpha.md" <<'EOF'
# Verify Alpha

Seeded for verification. Links to [[Verify Beta]].
EOF

cat > "$VAULT_DIR/Verify Beta.md" <<'EOF'
# Verify Beta

Second seeded note.
EOF

echo "verify-traces: compiling Electron main process"
(
  cd "$REPO_ROOT"
  pnpm exec tsc -p tsconfig.electron.json
)

NEXT_LOG="$RUN_DIR/logs/next.log"
ELECTRON_LOG="$RUN_DIR/logs/electron.log"

echo "verify-traces: starting Next.js on 127.0.0.1:$NEXT_PORT"
(
  cd "$REPO_ROOT"
  setsid pnpm exec next dev -p "$NEXT_PORT" --turbo
) >"$NEXT_LOG" 2>&1 &
NEXT_PID=$!
NEXT_PGID="$(ps -o pgid= -p "$NEXT_PID" | tr -d ' ')"

cleanup_failed_launch() {
  kill_recorded_pid "$NEXT_PID" "$NEXT_PGID"
  if [ -n "${ELECTRON_PID:-}" ]; then
    kill_recorded_pid "$ELECTRON_PID" "${ELECTRON_PGID:-}"
  fi
}
trap cleanup_failed_launch EXIT

echo "verify-traces: waiting for Next.js"
ready=0
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null "http://127.0.0.1:$NEXT_PORT"; then
    ready=1
    break
  fi
  if ! pid_alive "$NEXT_PID"; then
    die "Next.js exited during startup. See $NEXT_LOG"
  fi
  sleep 1
done
[ "$ready" = 1 ] || die "Next.js did not answer on 127.0.0.1:$NEXT_PORT. See $NEXT_LOG"

ELECTRON_BIN="$REPO_ROOT/node_modules/.bin/electron"
DISPLAY_VALUE="${DISPLAY:-:1}"
# Keep the real X cookie. A fake HOME would hide ~/.Xauthority and Electron
# exits with "Authorization required" / "Missing X server or $DISPLAY".
REAL_XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
REAL_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}"

echo "verify-traces: starting Electron (HOME=$VERIFY_HOME, CDP=$CDP_PORT, DISPLAY=$DISPLAY_VALUE)"
ELECTRON_ENV=(
  HOME="$VERIFY_HOME"
  DISPLAY="$DISPLAY_VALUE"
  XAUTHORITY="$REAL_XAUTHORITY"
  ELECTRON_ENABLE_LOGGING=1
)
if [ -n "$REAL_XDG_RUNTIME_DIR" ]; then
  ELECTRON_ENV+=(XDG_RUNTIME_DIR="$REAL_XDG_RUNTIME_DIR")
fi
(
  cd "$REPO_ROOT"
  setsid env "${ELECTRON_ENV[@]}" \
    "$ELECTRON_BIN" . \
    --user-data-dir="$RUN_DIR/user-data" \
    --remote-debugging-port="$CDP_PORT" \
    --remote-allow-origins="*" \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage
) >"$ELECTRON_LOG" 2>&1 &
ELECTRON_PID=$!
ELECTRON_PGID="$(ps -o pgid= -p "$ELECTRON_PID" | tr -d ' ')"

echo "verify-traces: waiting for renderer CDP"
renderer_ready=0
for _ in $(seq 1 60); do
  if ! pid_alive "$ELECTRON_PID"; then
    die "Electron exited during startup. See $ELECTRON_LOG"
  fi
  if curl -sf "http://127.0.0.1:$CDP_PORT/json/list" >/dev/null; then
    if TRACES_VERIFY_RUN="$RUN_DIR" TRACES_VERIFY_CDP_PORT="$CDP_PORT" \
      node "$HELPERS_DIR/drive.mjs" ready >/dev/null 2>&1; then
      renderer_ready=1
      break
    fi
  fi
  sleep 1
done
[ "$renderer_ready" = 1 ] || die "renderer never became ready. See $ELECTRON_LOG and $NEXT_LOG"

cat > "$RUN_DIR/state.json" <<EOF
{
  "runId": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$RUN_ID"),
  "repoRoot": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$REPO_ROOT"),
  "skillDir": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$SKILL_DIR"),
  "home": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$VERIFY_HOME"),
  "vaultDir": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$VAULT_DIR"),
  "userDataDir": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$RUN_DIR/user-data"),
  "nextPort": $NEXT_PORT,
  "cdpPort": $CDP_PORT,
  "nextPid": $NEXT_PID,
  "nextPgid": ${NEXT_PGID:-0},
  "electronPid": $ELECTRON_PID,
  "electronPgid": ${ELECTRON_PGID:-0},
  "evidenceDir": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$EVIDENCE_DIR"),
  "nextLog": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$NEXT_LOG"),
  "electronLog": $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$ELECTRON_LOG"),
  "startedAt": $(node -e 'console.log(JSON.stringify(new Date().toISOString()))')
}
EOF

cat > "$RUN_DIR/run.env" <<EOF
export TRACES_VERIFY_RUN=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$RUN_DIR")
export TRACES_VERIFY_RUN_ID=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$RUN_ID")
export TRACES_VERIFY_CDP_PORT=$CDP_PORT
export TRACES_VERIFY_NEXT_PORT=$NEXT_PORT
export TRACES_VERIFY_EVIDENCE=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$EVIDENCE_DIR")
export TRACES_VERIFY_HOME=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$VERIFY_HOME")
export TRACES_VERIFY_VAULT=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$VAULT_DIR")
EOF

trap - EXIT

echo "verify-traces: ready"
echo "source $RUN_DIR/run.env"
echo "evidence: $EVIDENCE_DIR"
echo "vault: $VAULT_DIR"
echo "cdp: http://127.0.0.1:$CDP_PORT"
