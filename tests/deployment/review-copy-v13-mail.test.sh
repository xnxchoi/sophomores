#!/bin/bash
# Offline only: exercise the exact environment gate and a stubbed TCP probe.
set -eu
script=${1:?provide candidate helper}
source <(sed -n '/^smtp_env_ok() {/,/^env_invariants_ok() {/p; /^mail_tcp_ok() {/,/^ipv6_process_identity() {/p' "$script" | sed '/^env_invariants_ok() {/d; /^ipv6_process_identity() {/d')
fixture=$'MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com\nMEMBER_AUTH_SMTP_PORT=465\nMEMBER_AUTH_SMTP_USERNAME=fixture\nMEMBER_AUTH_SMTP_PASSWORD=fixture\nMEMBER_AUTH_SMTP_FROM=fixture@example.test'
smtp_env_ok <<<"$fixture"
echo 'PASS complete SMTP configuration'
for key in HOST PORT USERNAME PASSWORD FROM; do
  if smtp_env_ok <<<"$(sed "/^MEMBER_AUTH_SMTP_$key=/d" <<<"$fixture")"; then exit 1; fi
done
echo 'PASS each required SMTP name is enforced'
if smtp_env_ok <<<"$fixture"$'\nMEMBER_AUTH_SMTP_PORT=465'; then exit 1; fi
if smtp_env_ok <<<"${fixture/MEMBER_AUTH_SMTP_PASSWORD=fixture/MEMBER_AUTH_SMTP_PASSWORD=}"; then exit 1; fi
if smtp_env_ok <<<"${fixture/MEMBER_AUTH_SMTP_PASSWORD=fixture/MEMBER_AUTH_SMTP_PASSWORD}"; then exit 1; fi
if smtp_env_ok <<<"${fixture/smtp.zeptomail.com/invalid.example}"; then exit 1; fi
echo 'PASS duplicate, empty and unsupported endpoint rejected'

UOPS=/synthetic EGR13=egress13
status_identity() { printf 'pinned-fixture\n'; }
mail_structural_ok() { :; }
env_lines_of() { printf '%s\n' "$fixture"; }
pid_of() { echo 55; }
ip_on() { [ "$2" = egress13 ] && echo 192.0.2.2; }
timeout() { [ "$1 $2 $3 $4" = '5 docker exec pinned' ] && [ "${!#}" = smtp.zeptomail.com ] && echo 192.0.2.3; }
dev_of_src() { echo fixture-device; }
route_dev() { echo "$route"; }
probe_tcp() { [ "$PROBE_TIMEOUT $*" = '5 55 192.0.2.2 192.0.2.3 465' ] && echo "$probe"; }
publish_stdin() { [ "$1" = "$UOPS/status-c1-mail-tcp" ] && [ "$(cat)" = pinned-fixture ]; }
route=fixture-device probe=ESTABLISHED
mail_tcp_ok pinned
route=wrong-device
if mail_tcp_ok pinned; then exit 1; fi
route=fixture-device probe=TIMEOUT
if mail_tcp_ok pinned; then exit 1; fi
echo 'PASS wrong egress and TCP timeout rejected'

source <(sed -n '/^mail_acceptance_run() {/,/^# ===.*operator entry points/p' "$script" | sed '$d')
UOPS=$(mktemp -d)
trap 'rm -r -- "$UOPS"' EXIT
mkdir "$UOPS/tokens"
touch "$UOPS/status-c1-postwrite" "$UOPS/status-c1-mail-tcp"
printf '%s\n' completed > "$UOPS/tokens/u5"
printf '%s\n' cutover-one > "$UOPS/vhost-intent"
SELF=helper PREV_APP=baseline
verified() { [ "$1" = "$SELF" ]; }
vhost_state() { echo v5; }
vhost_inode_ok() { :; }
recorded() { [ "$1" = c1-id ] && echo pinned-c1; }
hash_of() { shasum -a 256 < "$1" | cut -d ' ' -f1; }
status_identity() { [ "$*" = 'c1 pinned-c1' ] && echo "generation=$(cat "$UOPS/gen")"; }
status_receipt_ok() { [ "$(cat "$UOPS/gen")" = initial ] && [ "$2 $3" = 'c1 pinned-c1' ]; }
c1_ready() { :; }
schema_forward_ready() { [ "${schema:-33}" = 33 ]; }
locks_take() { [ "$REVIEW_LOCKS_HELD" = 0 ] || return 1; held=yes; }
prove_origin() { [ "$held" = yes ] || return 1; if [ "$scenario" = changed ]; then echo restarted > "$UOPS/gen"; fi; }
publish_stdin() { [ "${held:-}" = yes ] && cat > "$1"; }
ACCEPT_MSG=msg_000000000001 MAIL_PASS_MSG=msg_000000000002 REVIEW_LOCKS_HELD=1
echo initial > "$UOPS/gen"
MAIL_RUN_SHA=$(mail_acceptance_run)
pre_u7
if grep -q '^schema_forward_ready() {' "$script"; then
  schema=32
  if pre_u7 || [ -e "$UOPS/accepted" ]; then exit 1; fi
  echo 'PASS mail acceptance blocked without schema 33 proof'
  schema=33
fi
scenario=changed
if do_u7 || [ -e "$UOPS/accepted" ]; then exit 1; fi
echo 'PASS nginx/C1 identity churn during origin proof prevents acceptance'
echo initial > "$UOPS/gen"
printf '%s\n' cutover-two > "$UOPS/vhost-intent"
if pre_u7 || [ -e "$UOPS/accepted" ]; then exit 1; fi
echo 'PASS confirmation bound to an older cutover run is rejected'
printf '%s\n' cutover-one > "$UOPS/vhost-intent"
scenario=stable
do_u7
grep -Fq "mail_run=$MAIL_RUN_SHA" "$UOPS/accepted"
echo 'PASS stable run acceptance is published under the locks'
