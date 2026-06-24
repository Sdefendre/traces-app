#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${SCRATCH:-/var/folders/f0/sgw9jtdj00z349p4skdvkjtw0000gn/T/grok-goal-11bf01a8a052/implementer}"
cd "$ROOT"
mkdir -p "$SCRATCH"

echo "=== traces-app verification ===" | tee "$SCRATCH/verification-summary.log"

run_tsc() {
  local out="$1"
  {
    echo "command: pnpm exec tsc --noEmit"
    echo "cwd: $ROOT"
    echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    pnpm exec tsc --noEmit
    local code=$?
    echo "finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "exit_code: $code"
    if [ "$code" -eq 0 ]; then
      echo "result: TypeScript check passed with zero errors"
    fi
    exit "$code"
  } 2>&1 | tee "$out"
}

run_tsc "$SCRATCH/tsc.log"
run_tsc "$SCRATCH/tsc2.log"

{
  echo "command: pnpm build"
  pnpm build
  echo "exit_code: $?"
  echo "result: build success"
} 2>&1 | tee "$SCRATCH/build1.log"

{
  echo "command: pnpm build (repeat)"
  pnpm build
  echo "exit_code: $?"
  echo "result: build success"
} 2>&1 | tee "$SCRATCH/build2.log"

pnpm verify:logic 2>&1 | tee "$SCRATCH/logic.log"
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store.log"
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store2.log"

{
  echo "=== setRenderTick ==="
  grep -n "setRenderTick" src/components/graph/GraphScene.tsx || echo "NONE"
  echo "=== getVaultRoot ==="
  grep -n "getVaultRoot" main/ipc/handlers.ts
  echo "=== creating finally ==="
  grep -n "finally" src/components/editor/EditorPanel.tsx src/components/sidebar/FileTree.tsx
  echo "=== clearChatOnClose ==="
  grep -n "clearChatOnClose" src/components/chat/ChatPanel.tsx
  echo "=== before-quit ==="
  grep -n "before-quit\|ready-to-quit" main/index.ts main/preload.ts
  echo "=== closeTab void/await ==="
  grep -rn "closeTab" src/components/
} | tee "$SCRATCH/checks.log"

echo "verification complete" | tee -a "$SCRATCH/verification-summary.log"