#!/usr/bin/env bash
# Read-only check of the Pages marketing site. Does not touch a vault.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

URL="${TRACES_PAGES_URL:-https://sdefendre.github.io/traces-app/}"
OUT_DIR="${1:-${TRACES_VERIFY_EVIDENCE:-$DEFAULT_EVIDENCE_ROOT/pages}}"
mkdir -p "$OUT_DIR"

BODY="$OUT_DIR/pages.html"
curl -fsSL "$URL" -o "$BODY"

node -e '
  const fs = require("fs");
  const html = fs.readFileSync(process.argv[1], "utf8");
  const required = [
    "<title>Traces. Local-first knowledge workspace</title>",
    "id=\"overview\"",
    "id=\"features\"",
    "id=\"run\"",
    "data-copy",
    "id=\"clone\"",
    "git clone https://github.com/Sdefendre/traces-app.git",
    "pnpm dev",
    "https://sdefendre.github.io/traces-app/",
  ];
  const missing = required.filter((needle) => !html.includes(needle));
  if (missing.length) {
    console.error("pages-check missing:", missing.join(", "));
    process.exit(1);
  }
  console.log("pages-check: ok");
  console.log("bytes:", html.length);
  console.log("url:", process.argv[2]);
' "$BODY" "$URL"

echo "$BODY"
