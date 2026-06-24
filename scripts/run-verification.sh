#!/usr/bin/env bash
# Runs plan.md verification steps literally; artifacts go to $SCRATCH.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${SCRATCH:-/var/folders/f0/sgw9jtdj00z349p4skdvkjtw0000gn/T/grok-goal-11bf01a8a052/implementer}"
cd "$ROOT"
mkdir -p "$SCRATCH"
rm -f "$SCRATCH"/tsc.log "$SCRATCH"/tsc2.log "$SCRATCH"/build.log "$SCRATCH"/build2.log \
  "$SCRATCH"/logic.log "$SCRATCH"/launch.log "$SCRATCH"/launch-full.log \
  "$SCRATCH"/editor-store.log "$SCRATCH"/editor-store2.log "$SCRATCH"/checks.log

lsof -ti:3333 | xargs kill -9 2>/dev/null || true
pkill -f "scripts/dev.mjs" 2>/dev/null || true

run_tsc() {
  local out="$1"
  {
    pnpm exec tsc --noEmit 2>&1
    local ec=$?
    if [ "$ec" -eq 0 ]; then
      echo "success: tsc --noEmit passed with zero errors"
    fi
    exit "$ec"
  } | tee "$out"
}

# Step 1 (plan): tsc twice
run_tsc "$SCRATCH/tsc.log"
run_tsc "$SCRATCH/tsc2.log"

# Step 1 continued: production build twice
pnpm build 2>&1 | tee "$SCRATCH/build.log"
pnpm build 2>&1 | tee "$SCRATCH/build2.log"

# Step 2 (plan): after build:electron, load real compiled exports
pnpm build:electron 2>&1 | tee -a "$SCRATCH/build2.log"
node scripts/verify-logic.mjs 2>&1 | tee "$SCRATCH/logic.log"

# Step 3 (plan): launch — capture startup only (no wait-on HEAD flood)
lsof -ti:3333 | xargs kill -9 2>/dev/null || true
pnpm dev > "$SCRATCH/launch-full.log" 2>&1 &
DEVPID=$!
sleep 10
kill "$DEVPID" 2>/dev/null || true
pkill -f "scripts/dev.mjs" 2>/dev/null || true
pkill -f "next dev -p 3333" 2>/dev/null || true
head -12 "$SCRATCH/launch-full.log" | tee "$SCRATCH/launch.log"

# Step 4 (plan): editor store — run twice for consistency
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store.log"
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store2.log"

# Step 5 (plan): source inspection
{
  echo "=== setRenderTick ==="
  grep -rn "setRenderTick" src/components/graph/ || echo "none"
  echo "=== creating finally ==="
  grep -n "finally" src/components/editor/EditorPanel.tsx src/components/sidebar/FileTree.tsx
  echo "=== clearChatOnClose ==="
  grep -n "clearChatOnClose" src/components/chat/ChatPanel.tsx
  echo "=== before-quit ==="
  grep -n "before-quit\|ready-to-quit" main/index.ts main/preload.ts
  echo "=== handleCloseTab await ==="
  grep -n "await handleCloseTab\|createEditorStoreWithDeps" src/components/editor/EditorPanel.tsx src/stores/editor-store.ts
  echo "=== tab-close-policy ==="
  grep -n "planTabClose" shared/tab-close-policy.ts
  echo "=== vault warm cache ==="
  grep -n "isWarm\|resetVaultFileCache\|coldStart" main/ipc/vault-file-cache.ts main/ipc/vault-watcher.ts
} | tee "$SCRATCH/checks.log"

echo "verification complete"