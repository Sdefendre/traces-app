# Shared paths and state for verify-traces helpers.
# Source this file. Do not execute it.

HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$HELPERS_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"

DEFAULT_NEXT_PORT=3333
DEFAULT_CDP_PORT=9333
DEFAULT_EVIDENCE_ROOT="$SKILL_DIR/evidence"

die() {
  echo "verify-traces: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

load_run_state() {
  if [ -z "${TRACES_VERIFY_RUN:-}" ]; then
    die "TRACES_VERIFY_RUN is unset. Export it from launch output, or source \$RUN_DIR/run.env"
  fi
  STATE_FILE="$TRACES_VERIFY_RUN/state.json"
  [ -f "$STATE_FILE" ] || die "no state file at $STATE_FILE (this run was not launched by verify-traces)"
}

state_get() {
  local key="$1"
  node -e '
    const fs = require("fs");
    const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const key = process.argv[2];
    const value = state[key];
    if (value === undefined || value === null) process.exit(2);
    if (typeof value === "object") process.stdout.write(JSON.stringify(value));
    else process.stdout.write(String(value));
  ' "$STATE_FILE" "$key"
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -qE ":${port}[[:space:]]"
  else
    node -e '
      const net = require("net");
      const port = Number(process.argv[1]);
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.on("connect", () => { socket.end(); process.exit(0); });
      socket.on("error", () => process.exit(1));
    ' "$port"
  fi
}

pid_alive() {
  local pid="$1"
  [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null && kill -0 "$pid" 2>/dev/null
}

kill_recorded_pid() {
  local pid="$1"
  local pgid="$2"
  if [ -n "$pgid" ] && [ "$pgid" -gt 1 ] 2>/dev/null; then
    kill -- "-$pgid" 2>/dev/null || true
  fi
  if pid_alive "$pid"; then
    kill "$pid" 2>/dev/null || true
  fi
  if pid_alive "$pid"; then
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  fi
}
