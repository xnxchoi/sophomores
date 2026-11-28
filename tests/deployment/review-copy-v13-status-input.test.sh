#!/bin/bash
# Synthetic pipe/EOF checks for the reader only; no systemd, credential or network use.
set -eu
script=${1:?provide candidate helper}
source <(sed -n '/^status_read_input() {/,/^status_probe() {/p' "$script" | sed '$d')
marker=$(printf 'a%.0s' {1..43})
marker="__Host-sophomores-preview=synthetic.$marker"
status_probe() {
  [ "$1" = check ] && [ "$status_cookie" = "$marker" ] && ! IFS= read -r discarded
}
if ! printf '%s\n' "$marker" | status_read_input; then exit 1; fi
echo 'PASS one synthetic line and EOF; stdin closed before probe'
if printf '%s\nextra\n' "$marker" | status_read_input; then exit 1; fi
echo 'PASS extra bytes rejected'
if status_read_input </dev/null; then exit 1; fi
echo 'PASS non-pipe input rejected'
start=$SECONDS
if { printf '%s\n' "$marker"; sleep 10; } | status_read_input; then exit 1; fi
[ "$((SECONDS - start))" -lt 15 ]
echo 'PASS synthetic writer held open beyond reader timeout is rejected'
