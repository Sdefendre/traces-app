#!/usr/bin/env bash
# Runs plan.md verification steps literally; artifacts go to $SCRATCH.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${SCRATCH:-/var/folders/f0/sgw9jtdj00z349p4skdvkjtw0000gn/T/grok-goal-11bf01a8a052/implementer}"
cd "$ROOT"
mkdir -p "$SCRATCH"
rm -f "$SCRATCH"/tsc.log "$SCRATCH"/tsc2.log "$SCRATCH"/build.log "$SCRATCH"/build2.log \
  "$SCRATCH"/logic.log "$SCRATCH"/launch.log "$SCRATCH"/editor-store.log \
  "$SCRATCH"/editor-store2.log "$SCRATCH"/checks.log

# Step 1: type-check (twice)
pnpm exec tsc --noEmit 2>&1 | tee "$SCRATCH/tsc.log"
pnpm exec tsc --noEmit 2>&1 | tee "$SCRATCH/tsc2.log"

# Step 1 continued: production build (twice)
pnpm build 2>&1 | tee "$SCRATCH/build.log"
pnpm build 2>&1 | tee "$SCRATCH/build2.log"

# Step 2: after build:electron, exercise shipped parseVault + buildTree
pnpm build:electron 2>&1 | tee -a "$SCRATCH/build2.log"
node scripts/verify-logic.mjs 2>&1 | tee "$SCRATCH/logic.log"

# Step 3: launch attempt (15s)
if command -v timeout >/dev/null 2>&1; then
  timeout 15s pnpm dev 2>&1 | head -100 | tee "$SCRATCH/launch.log" || true
else
  perl -e 'alarm 15; exec @ARGV' pnpm dev 2>&1 | head -100 | tee "$SCRATCH/launch.log" || true
fi
pkill -f "scripts/dev.mjs" 2>/dev/null || true
pkill -f "next dev -p 3333" 2>/dev/null || true

# Step 4: editor store (twice)
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store.log"
pnpm verify:editor 2>&1 | tee "$SCRATCH/editor-store2.log"

# Step 5: source inspection
{
  echo "=== setRenderTick ==="
  grep -rn "setRenderTick" src/components/graph/ || echo "none"
  echo "=== creating finally ==="
  grep -n "finally" src/components/editor/EditorPanel.tsx src/components/sidebar/FileTree.tsx
  echo "=== clearChatOnClose ==="
  grep -n "clearChatOnClose" src/components/chat/ChatPanel.tsx
  echo "=== before-quit ==="
  grep -n "before-quit\|ready-to-quit" main/index.ts main/preload.ts
  echo "=== closeTab saveError recovery ==="
  grep -n "saveError" src/stores/create-editor-store.ts src/types/index.ts
  echo "=== closeTab discard on unlink ==="
  grep -n "discard: true" src/components/layout/AppShell.tsx src/components/sidebar/FileTree.tsx
  echo "=== incremental watcher ==="
  grep -n "bootstrapKnownFiles\|hadChanges" main/ipc/vault-watcher.ts
} | tee "$SCRATCH/checks.log"

echo "verification complete"