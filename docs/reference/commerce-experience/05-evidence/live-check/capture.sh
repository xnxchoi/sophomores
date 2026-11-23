#!/bin/zsh
# Records computed fonts and colours on five pages in both modes, one JSON line each, through Orca's
# browser (open a tab on the preview first). Usage: capture.sh out.jsonl [base-url]. Compare two runs:
# the colour objects must match exactly when a slice changes no colour (owner's colour hold, 2026-11-16).
O=/Applications/Orca.app/Contents/Resources/bin/orca; OUT=$1; BASE=${2:-http://localhost:3000}
PROBE=$(cat "${0:A:h}/font-colour-probe.js"); : > "$OUT"
for mode in dark light; do for p in / /shop /help /team /essays; do
  $O goto --url "$BASE/help" >/dev/null 2>&1
  $O eval --expression "localStorage.setItem('sophomores-theme','$mode')" >/dev/null 2>&1
  $O goto --url "$BASE$p" >/dev/null 2>&1; $O wait --timeout 8000 >/dev/null 2>&1; sleep 2
  $O eval --json --expression "$PROBE" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['result'])" >> "$OUT"
done; done
