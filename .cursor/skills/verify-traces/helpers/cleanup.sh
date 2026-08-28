#!/usr/bin/env bash
# Tear down the instance this run started. Leaves evidence in place.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

load_run_state

EVIDENCE_DIR="$(state_get evidenceDir)"
NEXT_PID="$(state_get nextPid)"
NEXT_PGID="$(state_get nextPgid || true)"
ELECTRON_PID="$(state_get electronPid)"
ELECTRON_PGID="$(state_get electronPgid || true)"
VAULT_DIR="$(state_get vaultDir)"

echo "verify-traces: stopping Next.js pid $NEXT_PID pgid ${NEXT_PGID:-none}"
kill_recorded_pid "$NEXT_PID" "${NEXT_PGID:-}"

echo "verify-traces: stopping Electron pid $ELECTRON_PID pgid ${ELECTRON_PGID:-none}"
kill_recorded_pid "$ELECTRON_PID" "${ELECTRON_PGID:-}"

# Drop isolated vault, Electron profile, and logs. Never touch evidence.
if [ -n "$TRACES_VERIFY_RUN" ] && [ -d "$TRACES_VERIFY_RUN" ]; then
  case "$TRACES_VERIFY_RUN" in
    /tmp/traces-verify-*)
      rm -rf "$TRACES_VERIFY_RUN"
      echo "verify-traces: removed $TRACES_VERIFY_RUN"
      ;;
    *)
      echo "verify-traces: leaving $TRACES_VERIFY_RUN (not a /tmp/traces-verify-* scratch dir)"
      ;;
  esac
fi

if [ -n "$EVIDENCE_DIR" ] && [ -d "$EVIDENCE_DIR" ]; then
  echo "verify-traces: evidence kept at $EVIDENCE_DIR"
  ls -la "$EVIDENCE_DIR"
else
  echo "verify-traces: no evidence directory recorded"
fi

# Confirm we did not delete the default user vault path as a side effect.
if [ -n "${VAULT_DIR:-}" ] && [ "$VAULT_DIR" = "$HOME/Desktop/Traces Notes" ]; then
  echo "verify-traces: warning: recorded vault was the default user path; cleanup does not delete it" >&2
fi
