#!/bin/bash
# Exercise the runtime artifact check on synthetic files only; no Docker.
set -euo pipefail
wrapper=${1:?provide the pinned build wrapper}
probe=$(sed -n '/^runtime_probe=$(cat /,/^RUNTIME_PROBE$/p' "$wrapper" | sed '1d;$d')
[ -n "$probe" ]

fixture=$(mktemp -d)
trap 'rm -r -- "$fixture"' EXIT
mkdir -p "$fixture"/{.next/server/chunks,public/wallet-pass,public/assets/three/book}
touch "$fixture/server.js"
printf '%s\n' PKPassPersonalizationFieldName > "$fixture/.next/server/chunks/fixture.js"

positive() {
  output=$(sh -c "$probe" probe "$fixture")
  grep -qx PUBLIC-OK <<<"$output"
}

missing() {
  local asset=$1 output rc=0
  output=$(sh -c "$probe" probe "$fixture") || rc=$?
  [ "$rc" = 1 ] && ! grep -qx PUBLIC-OK <<<"$output" || return 1
  printf 'PASS missing %s blocks PUBLIC-OK\n' "$asset"
}

logo=public/wallet-pass/logo.png
book=public/assets/three/book/book.glb
touch "$fixture/$book"
missing "$logo"
touch "$fixture/$logo"
rm -- "$fixture/$book"
missing "$book"
touch "$fixture/$book"
positive
echo 'PASS both required public assets present'
