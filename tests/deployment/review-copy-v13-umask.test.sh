#!/bin/bash
# Synthetic archive and runner-entry checks only; no Docker.
set -euo pipefail
wrapper=${1:?provide the pinned build wrapper}
extract=$(sed -n '/^extract_context() (/,/^)/p' "$wrapper")
entry=$(sed -n '/^registry_entry=$(cat /,/^REGISTRY_ENTRY$/p' "$wrapper" | sed '1d;$d')
[ -n "$extract" ] && [ -n "$entry" ]
eval "$extract"

fixture=$(mktemp -d)
trap 'rm -r -- "$fixture"' EXIT
REPO=$fixture/repo
CONTEXT_PATHS=(package.json src)
mkdir -p "$REPO/src/payload/migrations" "$fixture"/{before,after,bin}
git -C "$REPO" init -q
printf '{}\n' > "$REPO/package.json"
printf 'export const migrations = []\n' > "$REPO/src/payload/migrations/index.ts"
git -C "$REPO" add -- "${CONTEXT_PATHS[@]}"
SHA=$(git -C "$REPO" write-tree)

(umask 077; git -C "$REPO" archive "$SHA" -- "${CONTEXT_PATHS[@]}" | tar -x -C "$fixture/before")
(umask 077; extract_context "$fixture/after"; [ "$(umask)" = 0077 ])
python3 -I - "$fixture" <<'PY'
from pathlib import Path
from stat import S_IMODE
import sys

fixture = Path(sys.argv[1])
paths = ("package.json", "src", "src/payload/migrations/index.ts")
for label, expected in (("before", (0o600, 0o700, 0o600)), ("after", (0o644, 0o755, 0o644))):
    actual = tuple(S_IMODE((fixture / label / name).stat().st_mode) for name in paths)
    assert actual == expected, (label, actual)
PY
echo 'PASS umask 077 reproduces old restrictive modes; corrected extraction preserves readable modes'

cat > "$fixture/bin/node" <<'SH'
#!/bin/sh
test "$*" = "--import tsx" || exit 3
printf 'NODE-INVOKED\n'
SH
chmod +x "$fixture/bin/node"
export PATH="$fixture/bin:$PATH"
run_entry() { sh -c "$entry" runner-registry "$fixture/after" --import tsx; }
blocked() {
  local output rc=0
  output=$(run_entry 2>&1) || rc=$?
  [ "$rc" = 1 ] && [[ $output == STOP:* ]] && [[ $output != *NODE-INVOKED* ]]
}
[ "$(run_entry)" = NODE-INVOKED ]
echo 'PASS readable files reach the Node stub with intact arguments'
mv "$fixture/after/package.json" "$fixture/manifest"
blocked
echo 'PASS missing package.json blocks Node'
mv "$fixture/manifest" "$fixture/after/package.json"
mv "$fixture/after/src" "$fixture/source"
blocked
echo 'PASS missing src blocks Node'
