#!/bin/bash
# Exercise the exact u3 control flow with fake Docker and DB results.
set -euo pipefail
helper=${1:?candidate helper required}
source <(sed -n '/^EXPECTED_MIGRATIONS=/p; /^BIZ_NUM_MIGRATION=/p; /^u3_core() {/,/^}/p' "$helper")
RUNNER_ID=sha256:fixture
U_SHA=fixture-source
expected=$(printf '%s\n' $EXPECTED_MIGRATIONS "$BIZ_NUM_MIGRATION")
[ "$(wc -l <<<"$expected" | tr -d ' ')" = 33 ]

schema_is_locked() { [ "$locks" = held ]; }
schema_state() { printf '%s\n' "$schema"; }
docker() {
  [ "$1 $2 $3" = "image inspect $RUNNER_ID" ] || return 1
  printf '%s|%s|node|/app|amd64\n' "$RUNNER_ID" "$revision"
}
timeout() {
  [ "$1 $2 $3" = '120 docker run' ] &&
    [[ " $* " == *" --pull=never "* && " $* " == *" --network none "* && " $* " == *" $RUNNER_ID "* ]] || return 1
  printf '%s\n' "$fixture_registry"
}

locks=held revision=$U_SHA schema=32 fixture_registry=$expected
u3_core | grep -q '^MIGRATIONS-BASELINE-32-RUNNER-33 '
echo 'PASS exact runner identity, ordered registry and schema 32'
expect_stop() {
  local out rc=0
  out=$(u3_core) || rc=$?
  [ "$rc" = 1 ] && [[ $out == STOP:* ]]
}
locks=missing expect_stop
revision=wrong expect_stop
schema=33 expect_stop
fixture_registry=$(sed '1d' <<<"$expected") expect_stop
fixture_registry=$(printf '%s\n' "$expected" "$BIZ_NUM_MIGRATION") expect_stop
fixture_registry=$(printf '%s\n' "$(sed -n '2p' <<<"$expected")" "$(sed -n '1p' <<<"$expected")" "$(sed '1,2d' <<<"$expected")") expect_stop
echo 'PASS missing locks, wrong image, schema 33, and missing/extra/reordered registry all stop'
