#!/bin/bash
# Stub only: never opens a socket, writes a vhost, or calls nginx/Docker.
set -eu
script=${1:?provide candidate helper}
source <(sed -n '/^back_to_v4() {/,/^# After the route is on v4/p' "$script" | sed '$d')
UOPS=$(mktemp -d)
trap 'rm -r -- "$UOPS"' EXIT
hash=$(printf '%064d' 1)
printf '%s\n' "$hash" > "$UOPS/route-prev"
PREV8=d4ff8d7d V4_SHA=$hash
vhost_state() { printf '%s\n' "$fixture_state"; }
prev_ready() { [ "$ready" = yes ]; }
prev_cid() { echo baseline; }
identity_in() { [ "$1" = baseline ] && printf '%s\n' "$identity"; }
write_window() { [ "$*" = "$PREV8 $V4_SHA" ] && printf 'write\n' >> "$UOPS/actions"; }
reload_checked() { printf 'reload\n' >> "$UOPS/actions"; }
prove_origin() { [ "$1" = prev ] && printf 'prove\n' >> "$UOPS/actions"; }
expect() {
  local fixture_state=$1 ready=$2 identity=$3 expected=$4 actions=$5 rc=0
  : > "$UOPS/actions"
  back_to_v4 >/dev/null || rc=$?
  [ "$rc" = "$expected" ] && [ "$(cat "$UOPS/actions")" = "$actions" ] || {
    printf 'FAIL %s baseline=%s rc=%s expected=%s\n' "$fixture_state" "$ready" "$rc" "$expected"; exit 1;
  }
  printf 'PASS %s baseline=%s rc=%s\n' "$fixture_state" "$ready" "$rc"
}
expect v5 no "$hash" 2 ''
expect torn no "$hash" 2 ''
expect v4 no "$hash" 2 ''
expect v5 yes "$(printf '%064d' 2)" 2 ''
expect v5 yes "$hash" 0 $'write\nreload\nprove'
expect torn yes "$hash" 0 $'write\nreload\nprove'
expect v4 yes "$hash" 0 $'reload\nprove'
