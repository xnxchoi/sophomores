# Review copy in-place update to @@NEW8@@ (PLAN-v13): shell functions for the root bash shell on the VPS.
# TEMPLATE until finalize-v13.sh stamps the five pin tokens below from the built images (it refuses if any remains).
#
# v13.2 = v13.1 + Review-B's HOLD msg_f50bd70f6624: repair applies rollback's boundary-or-fenced disposition (rc 3 hold)
# whenever it ends on v4, including when v4 was already on disk.
# v13.1 = v13 + Review-B's HOLD msg_01f6c95bfeaf: the matrix needs a complete two-view topology snapshot and counts only
# recognized denials (tool errors, BINDFAIL, empty output, route-lookup errors, missing rows = VOID); rollback reports
# ROUTE-RESTORED-BOUNDARY-NOT-PROVEN (rc 3) as a distinct hold; fence/detach verify identity, restart=no and stopped, and
# an unknown candidate blocks; repair never keeps v5 on valid bytes alone; the DB helper gets only a 0600 passfile;
# re-pin/re-attach repeat u0/n2/n3's safeguards; docker calls, units and u5's pre-write checks are time-bounded.
# v13 = v12's operator model (one go per step, tokens, systemd units under both locks, fixed-token output) plus
# Review-B's gate (msg_5d1379a1ab29) and its PASS details (msg_923323be9a0b, msg_ab39d045ed4f):
# - the candidate is attached ONLY to three new networks: ingress (nginx + candidate), db13 (review-pg + candidate),
#   egress13 (candidate only); it is never on sophomores-preview / -review-db / -review-egress;
# - every step re-checks that the PINNED nginx and pg are the running ones and are attached (recreation = STOP, then
#   an explicit `update_repin` under the locks; nothing is ever adopted by name);
# - isolation is proven by a refusal matrix from every untrusted peer's own netns, per source address and the kernel's
#   route, each row with an on-network positive control; a TCP connect that establishes FAILS the row, HTTP or not;
# - C0 (no env) proves the boundary and is stopped; C1 (= C0 + TRUSTED_PROXY_LISTENER_ORIGIN) is validated as created,
#   before start, then re-proven, and again under the cutover locks; DNS and a DB read on db13 are runtime gates.
#
# The route: v4 (upstream d4ff8d7d, v12's live state) -> v5 (upstream = the new build, NEW8): ONE 8-byte write at OFF, as v12.
# v12's update_rollback/update_repair know only v3/v4 and would read v5 as "torn": they are RETIRED from v13's u5
# intent onward (RUNBOOK-v13). To reach d7409895 again: v13 rollback to v4 first, then v12.
#
# Nothing here removes a container, volume or image. Network removal exists only in net_rollback (its own go).
# Terminal output is tokens and fixed messages; no secret, env value or DSN is ever printed. Matrix rows (container
# names, short IDs, private bridge addresses, interfaces, results) are written to root-0600 files under $UOPS.
case $- in *x*) echo "STOP: xtrace is on in this shell; use a fresh shell without set -x"; return 1 2>/dev/null || exit 1;; esac
export LC_ALL=C
U_SHA=@@U_SHA@@
NEW8=@@NEW8@@
APP_ID=@@APP_ID@@
RUNNER_ID=@@RUNNER_ID@@
V5_SHA=@@V5_SHA@@
case "$U_SHA$NEW8$APP_ID$RUNNER_ID$V5_SHA" in *@[@]*) echo "STOP: this is the unstamped template (finalize-v13.sh not run)"; return 1 2>/dev/null || exit 1;; esac
UREL=review-update-$NEW8
# Keep the retired admission path unusable for shells that already sourced the old helper.
UOPS=/var/lib/sophomores-ops/$UREL-status
SELF=review-update.v13.sh
APP_TAR=sophomores-review-$NEW8-runtime.tar
RUNNER_TAR=sophomores-review-$NEW8-runner.tar
C0=sophomores-review-c0-$NEW8
C1=sophomores-review-$NEW8
TRUST_LINE=TRUSTED_PROXY_LISTENER_ORIGIN=https://0.0.0.0:3000
# v10 (secrets, run-vars, vhost inode, review-pg) and v12 (the live app) are read, never written.
REL=review-d7409895
V10=/var/lib/sophomores-ops/$REL
V12=/var/lib/sophomores-ops/review-update-d4ff8d7d
V12_UNITS="u4 u5 rollback repair abandon reconcile-u4 reconcile-u5"
PREV_APP=sophomores-review-d4ff8d7d
PREV_APP_ID=sha256:5439461f8f643add7be342a2fae02080541cc1201ee088054f1ebf76edd8f29f
PREV8=d4ff8d7d
PG=sophomores-review-pg
PG_IMAGE_ID=sha256:a026aff735540e5492c2ac4a782edd7dffa9b3b816dbda710d63b7a84f2c9b82
PG_SUPER=review_super
PG_DATA_VOL=sophomores-review-pgdata
DBNET=sophomores-review-db
EGRESS=sophomores-review-egress
PREVIEW_NET=sophomores-preview
MEDIA=sophomores-review-media
HEALTH_VOL=$REL-phone-health
RECV_HEALTH_DIR=/run/phone-receiver-health
# The three new networks: explicit bridge names and subnets inside 172.16/12 (ufw-docker's existing NEW deny covers
# them from outside), IPv4 only. u0 refuses if a name, bridge or subnet is taken or overlaps.
ING=sophomores-review-ingress; ING_BR=br-sph-ing13; ING_SUB=172.29.13.0/24
DB13=sophomores-review-db13;    DB13_BR=br-sph-db13;  DB13_SUB=172.29.14.0/24
EGR13=sophomores-review-egress13; EGR13_BR=br-sph-egr13; EGR13_SUB=172.29.15.0/24
TLS_LOCK=/run/lock/hideaway-nginx-tls.lock
P=https://preview.sophomores.co
SHARED_HOSTS="hideawayseoul.com www.hideawayseoul.com lostinseoul.com www.lostinseoul.com"
V3_SHA=4052e02f193b7960fd82925629f7241e97d1ec611dc0ada360ed5b50724c15fa   # v12's rollback state (d7409895): never ours to write
V4=sophomores-preview.review.v4.conf
V4_SHA=333e3ce75cf84cc66e19477468e1cb8bad3e5269cecc7072cf1c7029f139c570
V5=sophomores-preview.review.v5.conf
VHOST_SIZE=27153
OFF=2417
APP_MEM_LIMIT=832m
APP_MEM_BYTES=872415232
MIN_MEM_KIB_START=1114112    # 832 MiB + 256 MiB reserve, before each of C0 and C1 starts
DISK_UOPS_KIB=3145728
DISK_ROOT_KIB=8388608
EXPECTED_MIGRATIONS="20261026_071140 20261027_124500_auth_integrity 20261101_000000_canonical_members 20261101_081527_canonical_auth_schema 20261102_000000_recovery_intake 20261103_070710_content_collections 20261106_000000_payment_safety 20261109_142834_payload_commerce 20261109_150000_commerce_resolution_conflicts 20261110_052422_setlists_collaborative_tracks 20261114_000000_commerce_reconciliation 20261114_085802_business_info 20261114_210340_key_grant_intents 20261118_091841_ds05_native_edition_display 20261119_123904_team_members 20261119_190000_commerce_order_payment_unique 20261120_021117_editorial_globals 20261120_062810_policy_locales 20261121_011000_key_grant_hardening 20261122_061613_setlist_curator_grant 20261122_065037_wallet_catch_up 20261122_153000_nfc_storage 20261122_160000_setlist_entries_running_order 20261122_160100_native_edition_settlement 20261122_220722_setlist_event 20261123_030000_nfc_tap_handoffs 20261123_040000_event_ticket_targets 20261123_045913_product_page_fields 20261124_120000_shared_event_ticket_binding 20261124_121000_shared_guest_cart_kind 20261124_130000_home_entry 20261124_140000_order_refund"
EXPECTED_MIGRATION_COUNT=32
BIZ_NUM_MIGRATION=20261127_100000_business_info_biz_num
STEP_ORDER="u0 u1 u2 u3 n1 n2 n3 u4a u4b u5 u6 u7"
DSN_RE='^postgresql://sophomores_review:[0-9a-f]{64}@sophomores-review-pg:5432/sophomores_review$'
FORBIDDEN_NAME_RE='^(PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL|PAYLOAD_DROP_DATABASE|REVIEW_OWNER_EMAIL|MEMBER_AUTH_KAKAO_[A-Z0-9_]*|PHONE_VERIFICATION_CARRIER_POLICY|PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC|PHONE_VERIFICATION_RECEIVER_SECRETS_FILE|PHONE_VERIFICATION_ZOHO_(CLIENT|REFRESH|MAIL_ORIGIN|ACCOUNTS_ORIGIN)[A-Z0-9_]*|KEY_GRANT_[A-Z0-9_]*|MEMBER_WALLET_[A-Z0-9_]*|WALLET_PASS_[A-Z0-9_]*|OWN_[A-Z0-9_]*WALLET[A-Z0-9_]*|GOOGLE_WALLET_[A-Z0-9_]*|[A-Z0-9_]*(PRIVATE_KEY|MNEMONIC|SIGNER|RPC|UNLOCK)[A-Z0-9_]*)$'
PROBE_TIMEOUT=2
MEMINFO=${MEMINFO:-/proc/meminfo}
REVIEW_LOCKS_HELD=${REVIEW_LOCKS_HELD:-0}
U5_PREWRITE_MAX=900          # u5 refuses to write if its checks under the locks took longer than this (seconds)
# v13.1: every docker call through this function is bounded (DOCKER_TIMEOUT, default 60 s), so no check can hold the
# shared preview/TLS locks on a hung daemon call. `timeout N docker ...` (loads, dumps) calls the binary directly.
docker() { timeout "${DOCKER_TIMEOUT:-60}" docker "$@"; }

# ================================================================ basics (as v12)
hash_of() { sha256sum < "$1" | cut -d' ' -f1; }
publish_new() {
  local tmp=$1 out=$2 h
  h=$(hash_of "$tmp") || return 1
  [ -e "$out" ] && return 1
  mv -n "$tmp" "$out" || return 1
  [ ! -e "$tmp" ] && [ -f "$out" ] && [ "$(hash_of "$out")" = "$h" ]
}
publish_stdin() {
  local out=$1 tmp
  [ -e "$out" ] && return 1
  tmp=$(umask 077; mktemp "$out.partial.XXXXXX") || return 1
  cat > "$tmp" && chmod 0600 "$tmp" && sync "$tmp" && publish_new "$tmp" "$out"
}
verified() {
  local f=$1 want n
  [ -f "$UOPS/admission-active" ] && [ ! -L "$UOPS/admission-active" ] \
    && [ "$(stat -c '%u:%a' "$UOPS/admission-active")" = 0:400 ] \
    && [ "$(cat "$UOPS/admission-active")" = "$(hash_of "$UOPS/transfer.sha256")" ] \
    || { echo 'STOP: status admission not active'; return 1; }
  n=$(awk -v f="$f" '$2 == f' "$UOPS/transfer.sha256" 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = 1 ] || { echo "STOP: $f is not exactly once in the transfer manifest"; return 1; }
  want=$(awk -v f="$f" '$2 == f { print $1 }' "$UOPS/transfer.sha256")
  [ -f "$UOPS/upload/$f" ] && [ "$(hash_of "$UOPS/upload/$f")" = "$want" ] && return 0
  echo "STOP: $UOPS/upload/$f no longer matches its verified hash"; return 1
}
v10_var() { sed -n "s/^$1=//p" "$V10/run-vars" 2>/dev/null; }
cid_of() { docker inspect "$1" --format '{{.Id}}' 2>/dev/null; }
img_of() { docker inspect "$1" --format '{{.Image}}' 2>/dev/null; }
running() { [ "$(docker inspect "$1" --format '{{.State.Running}}' 2>/dev/null)" = true ]; }
state_of() { docker inspect "$1" --format '{{.State.Status}}' 2>/dev/null; }
is_not_found() { local m; m=$(tr 'A-Z' 'a-z' <<<"$1"); [[ $m =~ no\ such\ (object|container|network|volume|image) ]] || [[ $m =~ network\ .*not\ found ]]; }
name_free() { local e; e=$(docker inspect "$1" 2>&1 >/dev/null) && return 1; is_not_found "$e"; }
net_free() { local e; e=$(docker network inspect "$1" 2>&1 >/dev/null) && return 1; is_not_found "$e"; }
recorded() { local c; c=$(cat "$UOPS/$1" 2>/dev/null) && [[ $c =~ ^[0-9a-f]{64}$ ]] && printf '%s' "$c"; }
# Pins with generations: pins/<what>-id.NNNN; the highest generation is the authorized container. Only u0 (generation
# 0001) and update_repin (next generation, explicit full ID, validated under the locks) ever write one.
pin() { local f c; f=$(ls -1 "$UOPS/pins/$1-id."[0-9][0-9][0-9][0-9] 2>/dev/null | LC_ALL=C sort | tail -n 1); [ -n "$f" ] || return 1; c=$(cat "$f") && [[ $c =~ ^[0-9a-f]{64}$ ]] && printf '%s' "$c"; }
pin_gen() { ls -1 "$UOPS/pins/$1-id."[0-9][0-9][0-9][0-9] 2>/dev/null | wc -l | tr -d ' '; }
prev_cid() { recorded prev-app-id; }
pg_q() { docker exec "$(pin pg)" psql -X -At -v ON_ERROR_STOP=1 -U "$PG_SUPER" -d "${2:-postgres}" -c "$1"; }
ENV_FILES="core mail launch pin"
file_lines() { local f; for f in $ENV_FILES; do cat "$V10/secrets/$f.env"; done | sed '/^$/d' | sort; }
cand_env_files() {
  local f="$UOPS/private/staff.env"
  [ -f "$f" ] && [ ! -L "$f" ] && [ "$(stat -c '%u:%a' "$f")" = 0:600 ] || return 1
  # Validate the one allowed name, never the owner's value. Payload validates the list at boot.
  [ "$(cut -d= -f1 < "$f")" = STAFF_EXTRA_EMAILS ] && grep -q '^STAFF_EXTRA_EMAILS=' "$f" 2>/dev/null
}
env_lines_of() { docker inspect "$1" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | sed '/^$/d' | sort; }
img_env_lines() { docker image inspect "$1" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | sed '/^$/d' | sort; }
effective_env_ok() {   # CID IMAGE: check expected effective env without printing values.
  local keys want got effective_files
  effective_files=$(file_lines) || return 1
  if [ "$2" = "$APP_ID" ]; then
    cand_env_files || return 1
    effective_files=$(printf '%s\n' "$effective_files"; cat "$UOPS/private/staff.env") || return 1
  fi
  keys=$(cut -d= -f1 <<<"$effective_files"); [ -n "$keys" ] && [ -z "$(sort <<<"$keys" | uniq -d)" ] || return 1
  want=$( { printf '%s\n' "$effective_files"; img_env_lines "$2" | awk -F= 'NR==FNR {k[$1]=1; next} !($1 in k)' <(printf '%s\n' "$keys") -; } | sort)
  got=$(env_lines_of "$1"); [ -n "$got" ] || return 1
  [ "$(printf '%s' "$want" | sha256sum)" = "$(printf '%s' "$got" | sha256sum)" ]
}
smtp_env_ok() {   # Read env lines on stdin; never print values.
  awk -F= '
    BEGIN { n=split("HOST PORT USERNAME PASSWORD FROM", keys, " ") }
    /^MEMBER_AUTH_SMTP_/ {
      if (++seen[$1] != 1 || index($0,"=") == 0 || length(substr($0,index($0,"=")+1)) == 0) bad=1
      if ($1=="MEMBER_AUTH_SMTP_HOST" && $0!="MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com") bad=1
      if ($1=="MEMBER_AUTH_SMTP_PORT" && $0!="MEMBER_AUTH_SMTP_PORT=465" && $0!="MEMBER_AUTH_SMTP_PORT=587") bad=1
    }
    END {
      for (i=1; i<=n; i++) if (seen["MEMBER_AUTH_SMTP_" keys[i]] != 1) bad=1
      exit bad+0
    }'
}
env_invariants_ok() {   # CID: the sandbox profile (as v12) plus the listener shape the env value depends on
  local e; e=$(env_lines_of "$1"); [ -n "$e" ] || return 1
  smtp_env_ok <<<"$e" || { echo 'STOP: SMTP environment incomplete or endpoint unsupported'; return 1; }
  v() { sed -n "s/^$1=//p" <<<"$e"; }
  [[ $(v DATABASE_URI) =~ $DSN_RE ]] && [ "$(v PHONE_VERIFICATION_DATABASE_URL)" = "$(v DATABASE_URI)" ] \
    && [ "$(v PREVIEW_AUTH_MODE)" = protected ] && [ "$(v PREVIEW_AUTH_CONFIG)" = /run/secrets/preview-auth.json ] && [ "$(v PREVIEW_RUNTIME)" = sandbox ] \
    && [ "$(v NEXT_PUBLIC_SERVER_URL)" = "$P" ] && [ "$(v MEMBER_AUTH_ORIGIN)" = "$P" ] && [ "$(v PHONE_VERIFICATION_ORIGIN)" = "$P" ] && [ "$(v PORTONE_ORIGIN)" = "$P" ] \
    && [ "$(v PORTONE_PAYMENT_MODE)" = test ] && [ -n "$(v PORTONE_STORE_ID)" ] && [ "$(v PORTONE_STORE_ID)" = "$(v PORTONE_SANDBOX_TEST_STORE_ID)" ] \
    && [ -n "$(v PORTONE_CHANNEL_KEY)" ] && [ "$(v PORTONE_CHANNEL_KEY)" = "$(v PORTONE_SANDBOX_TEST_CHANNEL_KEY)" ] && [ "$(v MEMBER_AUTH_MAIL_MODE)" = smtp ] \
    && [ "$(v HOSTNAME)" = 0.0.0.0 ] && [ "$(v PORT)" = 3000 ] \
    && [ "$(cut -d= -f1 <<<"$e" | grep -v '^MEMBER_AUTH_APPLE_PRIVATE_KEY$' | grep -cE "$FORBIDDEN_NAME_RE")" = 0 ]
}
env_mode_ok() {   # CID c0|c1: c0 has no TRUSTED_PROXY_LISTENER_ORIGIN; c1 = C0's env plus exactly TRUST_LINE
  local e c0; e=$(env_lines_of "$1"); [ -n "$e" ] || return 1
  case $2 in
    c0) ! grep -q '^TRUSTED_PROXY_LISTENER_ORIGIN=' <<<"$e" && effective_env_ok "$1" "$APP_ID" ;;
    c1) c0=$(recorded c0-id) && [ -n "$(env_lines_of "$c0")" ] || return 1
        [ "$(comm -13 <(env_lines_of "$c0") <(printf '%s\n' "$e"))" = "$TRUST_LINE" ] && [ -z "$(comm -23 <(env_lines_of "$c0") <(printf '%s\n' "$e"))" ] ;;
    *) return 1 ;;
  esac
}
mounts_json() { docker inspect "$1" --format '{{json .HostConfig.Mounts}}' 2>/dev/null; }
mounts_of() { docker inspect "$1" --format '{{range .Mounts}}{{.Type}}|{{if eq .Type "volume"}}{{.Name}}{{else}}{{.Source}}{{end}}|{{.Destination}}|{{.RW}}{{"\n"}}{{end}}' 2>/dev/null | sed '/^$/d' | sort; }
expected_mounts() { printf '%s\n' "bind|$PREVIEW_AUTH_SRC|/run/secrets/preview-auth.json|false" "volume|$HEALTH_VOL|$RECV_HEALTH_DIR|false" "volume|$MEDIA|/app/media|true" | sort; }
nets_of() { docker inspect "$1" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' 2>/dev/null | sed '/^$/d' | sort; }
has_net() { nets_of "$1" | grep -qx -- "$2"; }
cand_nets() { printf '%s\n' "$ING" "$DB13" "$EGR13" | sort; }
prev_nets() { printf '%s\n' "$DBNET" "$EGRESS" "$PREVIEW_NET" | sort; }
ip_on() { docker inspect "$1" --format "{{with index .NetworkSettings.Networks \"$2\"}}{{.IPAddress}}{{end}}" 2>/dev/null; }
disk_ok() {
  local n; n=$(df -P -k "$1" 2>/dev/null | awk 'NR==2 {print $4}')
  [[ $n =~ ^[0-9]+$ ]] && [ "$n" -ge "$2" ] || { echo "STOP: less than $(($2 / 1048576)) GiB free (or unreadable) at $1"; return 1; }
}
disk_floor() { disk_ok "$UOPS" "$DISK_UOPS_KIB" && disk_ok "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)" "$DISK_ROOT_KIB"; }
mem_floor() { local kib; kib=$(awk '$1=="MemAvailable:"{print $2}' "$MEMINFO"); [ "${kib:-0}" -ge "$MIN_MEM_KIB_START" ] || { echo "STOP: MemAvailable below $((MIN_MEM_KIB_START/1024)) MiB; nothing created"; return 1; }; }

load_vars() {
  VHOST=$(v10_var VHOST); PREVIEW_LOCK=$(v10_var PREVIEW_LOCK); PREVIEW_AUTH_SRC=$(v10_var PREVIEW_AUTH_SRC)
  [ -n "$VHOST" ] && [ -n "$PREVIEW_LOCK" ] && [ -n "$PREVIEW_AUTH_SRC" ] || { echo "STOP: cannot read VHOST/PREVIEW_LOCK/PREVIEW_AUTH_SRC from $V10/run-vars"; return 1; }
}
locks_take() {
  [ "$REVIEW_LOCKS_HELD" = 1 ] && return 0
  load_vars || return 1
  exec 8>>"$PREVIEW_LOCK" 9>>"$TLS_LOCK" || { echo "STOP: cannot open lock files"; return 1; }
  if flock -w 60 8 && flock -w 60 9; then
    if ! verified "$SELF"; then exec 8>&- 9>&-; return 1; fi
    REVIEW_LOCKS_HELD=1; LOCK_T0=$SECONDS; trap 'locks_release' EXIT; return 0
  fi
  exec 8>&- 9>&-; echo "STOP: locks not acquired"; return 1
}
locks_free() { flock -n "$PREVIEW_LOCK" true && flock -n "$TLS_LOCK" true; }
# Inside a unit: report how long Hideaway's TLS lock and the preview lock were held, then release both (closing the fds).
locks_release() { [ "$REVIEW_LOCKS_HELD" = 1 ] || return 0; echo "LOCKS-HELD $((SECONDS - LOCK_T0))s"; trap - EXIT; exec 8>&- 9>&-; REVIEW_LOCKS_HELD=0; }
v12_units_idle() { local u; for u in $V12_UNITS; do systemctl is-active --quiet "review-update-d4ff8d7d-$u.service" && return 1; done; return 0; }

# ================================================================ nginx and the vhost (v4 <-> v5)
vhost_inode_ok() { [ "$(stat -c %i "$VHOST")" = "$(cut -d' ' -f1 "$V10/vhost-stat.txt")" ]; }
nginx_vhost_mount() { docker inspect "$1" --format '{{range .Mounts}}{{if eq .Source "'"$VHOST"'"}}{{.Type}}|{{.Destination}}|{{.RW}}{{"\n"}}{{end}}{{end}}' 2>/dev/null | sed '/^$/d'; }
nginx_file_ok() {   # ID: that container bind-mounts VHOST once, as recorded, and sees the host file (bytes and dev:inode)
  local id=$1 m d hin hout din dout
  m=$(nginx_vhost_mount "$id"); [ "$m" = "$(cat "$UOPS/nginx-mount" 2>/dev/null)" ] && [ "$(wc -l <<<"$m")" = 1 ] || return 1
  d=$(cut -d'|' -f2 <<<"$m"); vhost_inode_ok || return 1
  hin=$(docker exec "$id" sha256sum "$d" 2>/dev/null | cut -d' ' -f1); hout=$(hash_of "$VHOST")
  [[ $hin =~ ^[0-9a-f]{64}$ && $hout =~ ^[0-9a-f]{64}$ ]] && [ "$hin" = "$hout" ] || return 1
  din=$(docker exec "$id" stat -L -c '%d:%i' "$d" 2>/dev/null); dout=$(stat -L -c '%d:%i' "$VHOST" 2>/dev/null)
  [[ $din =~ ^[0-9]+:[0-9]+$ ]] && [ "$din" = "$dout" ] && [ "${dout#*:}" = "$(cut -d' ' -f1 "$V10/vhost-stat.txt")" ]
}
nginx_identity_ok() { local id; id=$(pin nginx) || return 1; [ "$(cid_of nginx)" = "$id" ] && running "$id" && nginx_file_ok "$id"; }
pg_identity_ok() { local id; id=$(pin pg) || return 1; [ "$(cid_of "$PG")" = "$id" ] && running "$id" && [ "$(img_of "$id")" = "$PG_IMAGE_ID" ]; }
# After n2/n3: the pinned nginx is on ingress and the pinned pg on db13. A recreated nginx/pg (new ID) fails here.
shared_attached_ok() {
  if [ -s "$UOPS/tokens/n2" ]; then nginx_identity_ok && has_net "$(pin nginx)" "$ING" || { echo "STOP: the pinned nginx is not running or not on $ING (recreated? RUNBOOK 'Re-pin'); nothing done"; return 1; }; fi
  if [ -s "$UOPS/tokens/n3" ]; then pg_identity_ok && has_net "$(pin pg)" "$DB13" || { echo "STOP: the pinned review-pg is not running or not on $DB13 (recreated? RUNBOOK 'Re-pin'); nothing done"; return 1; }; fi
  return 0
}
reload_checked() { nginx_identity_ok && nginx_test && nginx_reload; }
nginx_test() { docker exec "$(pin nginx)" nginx -t >/dev/null 2>&1; }
nginx_reload() {
  case "$(vhost_state)" in
    v4) schema_route_ready v4 || return 1 ;;
    v5) schema_route_ready v5 && schema_maintenance_proof_ok || return 1 ;;
    *) return 1 ;;
  esac
  docker exec "$(pin nginx)" nginx -s reload >/dev/null 2>&1
}
window_bytes() { dd if="$VHOST" bs=1 skip="$OFF" count=8 status=none 2>/dev/null; }
outside_window_is_v4() {
  [ "$(stat -c %s "$VHOST")" = "$VHOST_SIZE" ] && cmp -s -n "$OFF" "$VHOST" "$UOPS/upload/$V4" \
    && cmp -s -i "$((OFF + 8))" "$VHOST" "$UOPS/upload/$V4"
}
window_is_mix() {   # every window byte is the old or the new byte at that position (a torn write of OUR two values)
  local w i; w=$(window_bytes); [ "${#w}" = 8 ] || return 1
  for i in 0 1 2 3 4 5 6 7; do [ "${w:$i:1}" = "${PREV8:$i:1}" ] || [ "${w:$i:1}" = "${NEW8:$i:1}" ] || return 1; done
}
write_window() {
  local bytes=$1 want=$2
  case "$bytes:$want" in
    "$PREV8:$V4_SHA") schema_route_ready v4 || return 1 ;;
    "$NEW8:$V5_SHA") schema_route_ready v5 && schema_maintenance_proof_ok || return 1 ;;
    *) return 1 ;;
  esac
  printf '%s' "$bytes" | dd of="$VHOST" bs=8 count=1 seek="$OFF" oflag=seek_bytes conv=notrunc,fsync status=none 2>/dev/null \
    && [ "$(hash_of "$VHOST")" = "$want" ] && vhost_inode_ok
}
# v3 (v12's rollback state) is its own state and never "repaired" by v13; torn = v4 outside the window and a mix of
# OUR two upstream names inside it; anything else is foreign.
vhost_state() { case "$(hash_of "$VHOST")" in "$V4_SHA") echo v4;; "$V5_SHA") echo v5;; "$V3_SHA") echo v3;; *) outside_window_is_v4 && window_is_mix && echo torn || echo foreign;; esac; }

page_build_id() { grep -oE '\\?"b\\?":\\?"[A-Za-z0-9_-]{8,64}' | head -n 1 | grep -oE '[A-Za-z0-9_-]{8,64}$'; }
build_identity() {
  local h a b; h=$(cat); b=$(page_build_id <<<"$h"); a=$(grep -oE '/_next/static/[A-Za-z0-9._/~-]+[.](js|css)' <<<"$h" | sort -u)
  [ -n "$b" ] && [ -n "$a" ] || return 1; printf 'build=%s\n%s\n' "$b" "$a" | sha256sum | cut -d' ' -f1
}
fetch_login_in() { docker exec "$1" node -e "fetch('http://127.0.0.1:3000/login',{headers:{host:'preview.sophomores.co'},redirect:'manual'}).then(r=>r.ok?r.text():Promise.reject(r.status)).then(t=>process.stdout.write(t)).catch(()=>process.exit(1))" 2>/dev/null; }
build_id_matches() { local b f; b=$(fetch_login_in "$1" | page_build_id); f=$(docker exec "$1" cat /app/.next/BUILD_ID 2>/dev/null); [[ $b =~ ^[A-Za-z0-9_-]{8,64}$ ]] && [ "$b" = "$f" ]; }
identity_in() { local b; b=$(fetch_login_in "$1") || return 1; build_identity <<<"$b"; }
origin_login() { curl -sS --max-time 15 --connect-to "preview.sophomores.co:443:127.0.0.1:443" -w '\n%{http_code}' "$P/login" 2>/dev/null; }
origin_identity() { local b c; b=$(origin_login) || return 1; c=${b##*$'\n'}; [[ $c =~ ^2[0-9][0-9]$ ]] || return 1; build_identity <<<"${b%$'\n'*}"; }
origin_css_ok() {
  local b a c; b=$(origin_login) || return 1; a=$(grep -oE '/_next/static/[A-Za-z0-9._/~-]+[.]css' <<<"${b%$'\n'*}" | head -1); [ -n "$a" ] || return 1
  c=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 --connect-to "preview.sophomores.co:443:127.0.0.1:443" "$P$a" 2>/dev/null); [ "$c" = 200 ]
}
prove_origin() {   # prev|new: the origin serves that recorded build and one of its CSS assets
  local want i o; want=$(cat "$UOPS/route-$1" 2>/dev/null)
  [[ $want =~ ^[0-9a-f]{64}$ ]] || return 1
  for i in 1 2 3 4 5 6; do o=$(origin_identity) && [ "$o" = "$want" ] && origin_css_ok && return 0; sleep 2; done
  return 1
}
prev_ready() { local c; c=$(prev_cid) || return 1; [ "$(cid_of "$PREV_APP")" = "$c" ] && [ "$(img_of "$c")" = "$PREV_APP_ID" ] && running "$c" && fetch_login_in "$c" >/dev/null; }
c1_ready() { local c; c=$(recorded c1-id) || return 1; [ "$(cid_of "$C1")" = "$c" ] && [ "$(img_of "$c")" = "$APP_ID" ] && running "$c" && fetch_login_in "$c" >/dev/null; }
shared_probe() {
  local h code fp
  for h in $SHARED_HOSTS; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 --connect-to "$h:443:127.0.0.1:443" "https://$h/" 2>/dev/null) || code=curl-failed
    fp=$(echo | timeout 15 openssl s_client -connect 127.0.0.1:443 -servername "$h" 2>/dev/null | openssl x509 -noout -fingerprint -sha256 2>/dev/null | cut -d= -f2)
    echo "$h $code ${fp:-no-cert}"
  done
}
shared_baseline_ok() { [ "$(wc -l < "$1")" = "$(wc -w <<<"$SHARED_HOSTS")" ] && ! grep -qvE '^[a-z0-9.-]+ [1-5][0-9][0-9] ([0-9A-F]{2}:){31}[0-9A-F]{2}$' "$1"; }

# ================================================================ networks: shape, membership, netns probes
net_shape() {   # NAME -> one line: id|driver|internal|ipv6|bridge|subnets|label
  docker network inspect "$1" --format '{{.Id}}|{{.Driver}}|{{.Internal}}|{{.EnableIPv6}}|{{index .Options "com.docker.network.bridge.name"}}|{{range .IPAM.Config}}{{.Subnet}} {{end}}|{{index .Labels "co.sophomores.release"}}' 2>/dev/null
}
net_ok() {   # NAME BRIDGE SUBNET INTERNAL: the network is the pinned one with exactly this shape
  local id; id=$(recorded "net-$1-id") || return 1
  [ "$(net_shape "$1")" = "$id|bridge|$4|false|$2|$3 |$UREL" ]
}
nets_ok() { net_ok "$ING" "$ING_BR" "$ING_SUB" true && { [ ! -s "$UOPS/tokens/n3" ] || { net_ok "$DB13" "$DB13_BR" "$DB13_SUB" true && net_ok "$EGR13" "$EGR13_BR" "$EGR13_SUB" false; }; }; }
members() { docker network inspect "$1" --format '{{range $id, $c := .Containers}}{{$id}}{{"\n"}}{{end}}' 2>/dev/null | sed '/^$/d' | sort; }
members_are() { local n=$1; shift; [ "$(members "$n")" = "$(printf '%s\n' "$@" | sed '/^$/d' | sort)" ]; }
pid_of() { local p; p=$(docker inspect "$1" --format '{{.State.Pid}}' 2>/dev/null); [[ $p =~ ^[1-9][0-9]*$ ]] && printf '%s' "$p"; }
ns() { local p=$1; shift; nsenter -t "$p" -n "$@"; }   # the host's own tools inside a container's network namespace only
dev_of_src() { ns "$1" ip -o -4 addr show 2>/dev/null | awk -v s="$2" '{split($4,a,"/"); if (a[1]==s) {print $2; exit}}'; }
route_dev() { local r; r=$(route_get "$@"); [[ $r == "dev "* ]] && echo "${r#dev }"; }
probe_tcp() {   # PID SRC DST PORT -> ESTABLISHED|REFUSED|TIMEOUT|UNREACH|BINDFAIL|ERRn (bound to SRC, fixed timeout)
  ns "$1" python3 -I -c '
import errno, socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(float(sys.argv[4]))
try: s.bind((sys.argv[1], 0))
except OSError: print("BINDFAIL"); sys.exit(0)
try: s.connect((sys.argv[2], int(sys.argv[3]))); print("ESTABLISHED")
except ConnectionRefusedError: print("REFUSED")
except socket.timeout: print("TIMEOUT")
except OSError as e: print("UNREACH" if e.errno in (errno.ENETUNREACH, errno.EHOSTUNREACH) else "ERR%d" % e.errno)
finally: s.close()' "$2" "$3" "$4" "$PROBE_TIMEOUT" 2>/dev/null || echo ERR
}
dns_a() {   # PID NAME -> the A records Docker's embedded DNS (127.0.0.11) gives that netns, sorted; empty on NXDOMAIN; rc!=0 on no answer
  ns "$1" python3 -I -c '
import random, socket, struct, sys
n = sys.argv[1]; tid = random.randint(0, 65535)
q = struct.pack(">HHHHHH", tid, 0x0100, 1, 0, 0, 0) + b"".join(bytes([len(p)]) + p.encode() for p in n.split(".")) + b"\0" + struct.pack(">HH", 1, 1)
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(3); s.sendto(q, ("127.0.0.11", 53)); r = s.recv(4096)
if struct.unpack(">H", r[:2])[0] != tid: sys.exit(1)
an = struct.unpack(">H", r[6:8])[0]; i = len(q); out = []
for _ in range(an):
    if r[i] & 0xC0 == 0xC0: i += 2
    else:
        while r[i]: i += r[i] + 1
        i += 1
    t, c, ttl, l = struct.unpack(">HHIH", r[i:i + 10]); i += 10
    if t == 1: out.append(socket.inet_ntoa(r[i:i + 4]))
    i += l
print("\n".join(sorted(out)))' "$2" 2>/dev/null
}
listen_set() { ns "$1" ss -ltnH 2>/dev/null | awk '{print $4}' | grep -v '^127\.0\.0\.11:' | sort -u; }
# A positive control on network NET for a probe from PEER: a member of NET (pinned nginx, then pinned pg, then any
# other) with a TCP listener on that network; prints "IP PORT". Never the candidate, never loopback.
control_for() {   # NET PEER_ID EXCLUDE_ID
  local net=$1 peer=$2 ex=$3 c ip p port
  for c in $(pin nginx) $(pin pg) $(members "$net"); do
    { [ "$c" = "$peer" ] || [ "$c" = "$ex" ]; } && continue
    has_net "$c" "$net" && running "$c" || continue
    ip=$(ip_on "$c" "$net"); p=$(pid_of "$c") || continue; [ -n "$ip" ] || continue
    port=$(ns "$p" ss -ltnH 2>/dev/null | awk -v ip="$ip" '{n=split($4,a,":"); h=substr($4,1,length($4)-length(a[n])-1); if (h=="0.0.0.0" || h=="*" || h==ip) {print a[n]; exit}}')
    [[ $port =~ ^[0-9]+$ ]] && { echo "$ip $port"; return 0; }
  done
  return 1
}
# The refusal matrix for candidate CID (Review-B HOLD msg_01f6c95bfeaf): a complete topology snapshot first; then for
# every untrusted (network, peer) pair exactly three rows, one per candidate address. A row PASSes only on a recognized
# denial (REFUSED, TIMEOUT, UNREACH, or the kernel's own UNREACHABLE route plus a denied bound connect) with an
# ESTABLISHED on-network control; any ESTABLISHED is FAIL; anything else (tool error, BINDFAIL, empty, missing data,
# route-lookup error, over the time budget) is VOID. FAIL or VOID, a missing row, or a snapshot failure fails the matrix.
DENIED_RE='^(REFUSED|TIMEOUT|UNREACH)$'
MATRIX_BUDGET=${MATRIX_BUDGET:-600}
refusal_matrix() {   # CID FILE
  local cid=$1 out=$2 ex targets t tn net peer pid name src dev cip cport cres rg res bound verdict why rows=0 pairs=0 fails=0 voids=0 tmp snap t0=$SECONDS
  ex=" $(pin nginx) $(pin pg) $(recorded c0-id 2>/dev/null) $(recorded c1-id 2>/dev/null) "
  targets=$(for net in "$ING" "$DB13" "$EGR13"; do t=$(ip_on "$cid" "$net"); [[ $t =~ ^[0-9.]+$ ]] && echo "$net=$t"; done)
  [ "$(grep -c . <<<"$targets")" = 3 ] || { echo "MATRIX: the candidate does not have exactly three addresses; VOID"; return 1; }
  snap=$(inventory) || { echo "MATRIX: the topology snapshot failed (a Docker call failed or two views disagree); VOID"; return 1; }
  tmp=$(mktemp "$UOPS/.matrix.XXXXXX") || return 1
  while read -r net peer; do
    [ -n "$peer" ] || continue
    case "$ex" in *" $peer "*) continue;; esac
    pairs=$((pairs + 1)); why=
    name=$(docker inspect "$peer" --format '{{.Name}}' 2>/dev/null | tr -d /); pid=$(pid_of "$peer"); src=$(ip_on "$peer" "$net")
    [ -n "$name" ] && [ -n "$pid" ] && [[ $src =~ ^[0-9.]+$ ]] || why=peer-inspect-failed
    [ -z "$why" ] && { dev=$(dev_of_src "$pid" "$src"); [ -n "$dev" ] || why=no-interface-for-src; }
    cip=; cport=; cres=NO-CONTROL
    if [ -z "$why" ]; then
      read -r cip cport <<<"$(control_for "$net" "$peer" "$cid")"
      [ -n "$cip" ] && [ "$(route_get "$pid" "$src" "$cip")" = "dev $dev" ] && cres=$(probe_tcp "$pid" "$src" "$cip" "$cport")
    fi
    while IFS== read -r tn t; do
      rows=$((rows + 1)); res=-; rg=-; bound=-
      if [ $((SECONDS - t0)) -gt "$MATRIX_BUDGET" ]; then verdict=VOID; why=over-time-budget
      elif [ -n "$why" ]; then verdict=VOID
      else
        rg=$(route_get "$pid" "$src" "$t")
        case $rg in
          "dev $dev") res=$(probe_tcp "$pid" "$src" "$t" 3000) ;;
          "dev "*)    res="NO-PATH-VIA-$net" ;;
          UNREACHABLE) res=NO-ROUTE ;;
          *)          res=ROUTE-ERROR ;;
        esac
        case $res in NO-*|ROUTE-ERROR) bound=$(probe_tcp "$pid" "$src" "$t" 3000) ;; *) bound=$res ;; esac
        if [ "$res" = ESTABLISHED ] || [ "$bound" = ESTABLISHED ]; then verdict=FAIL
        elif [ "$cres" != ESTABLISHED ]; then verdict=VOID; why=control-not-established
        elif [ "$res" = ROUTE-ERROR ]; then verdict=VOID; why=route-lookup-error
        elif ! [[ $bound =~ $DENIED_RE ]]; then verdict=VOID; why=bound-connect-not-a-denial
        elif [[ $res != NO-* ]] && ! [[ $res =~ $DENIED_RE ]]; then verdict=VOID; why=probe-not-a-denial
        else verdict=PASS; fi
      fi
      case $verdict in FAIL) fails=$((fails + 1));; VOID) voids=$((voids + 1));; esac
      printf '%s %s peer=%s/%s net=%s src=%s dev=%s control=%s:%s=%s target=%s/%s:3000 route=%s result=%s bound=%s why=%s\n' \
        "$verdict" "$(date -u +%TZ)" "${name:-?}" "${peer:0:12}" "$net" "${src:-?}" "${dev:-?}" "${cip:-none}" "${cport:-}" "$cres" "$tn" "$t" "${rg// /:}" "$res" "${bound:--}" "${why:--}" >> "$tmp"
    done <<<"$targets"
  done <<<"$snap"
  publish_new "$tmp" "$out" || { echo "MATRIX: could not record $out"; return 1; }
  echo "MATRIX pairs=$pairs rows=$rows expected=$((pairs * 3)) fail=$fails void=$voids seconds=$((SECONDS - t0)) (file $out)"
  [ "$pairs" -gt 0 ] && [ "$rows" = $((pairs * 3)) ] && [ "$(grep -c '^PASS ' "$out")" = "$rows" ] && [ "$fails" = 0 ] && [ "$voids" = 0 ]
}
route_get() {   # PID SRC DST -> "dev <if>" | UNREACHABLE (the kernel says so) | ERROR (the tool failed: never counted as a refusal)
  local o rc; o=$(ns "$1" ip -o route get "$3" from "$2" 2>&1); rc=$?
  if [ "$rc" = 0 ]; then o=$(grep -oE ' dev [^ ]+' <<<"$o" | head -1 | cut -d' ' -f3); [ -n "$o" ] && echo "dev $o" || echo ERROR
  elif grep -qiE 'network is unreachable|no route to host|prohibit' <<<"$o"; then echo UNREACHABLE
  else echo ERROR; fi
}
members_strict() { local o; o=$(docker network inspect "$1" --format '{{range $id, $c := .Containers}}{{$id}}{{"\n"}}{{end}}') || return 1; sed '/^$/d' <<<"$o" | sort; }
running_on() {   # by the network's full ID, so a name that is a prefix of another (sophomores-review-db / -db13) cannot match loosely
  local id o; id=$(docker network inspect "$1" --format '{{.Id}}') && [[ $id =~ ^[0-9a-f]{64}$ ]] || return 1
  o=$(docker ps -q --no-trunc --filter "network=$id") || return 1; sed '/^$/d' <<<"$o" | sort
}
# The topology snapshot: every bridge network but ours, and its running members, from TWO independent Docker views that
# must agree; any Docker failure or disagreement fails the snapshot (never a silent omission). Lines: "<net> <id>".
inventory() {
  local nets net a b
  nets=$(docker network ls --filter driver=bridge --format '{{.Name}}') || return 1
  nets=$(sed '/^$/d' <<<"$nets" | sort); [ -n "$nets" ] || return 1
  for net in $nets; do
    case " $ING $DB13 $EGR13 " in *" $net "*) continue;; esac
    a=$(members_strict "$net") || return 1; b=$(running_on "$net") || return 1
    [ "$a" = "$b" ] || return 1
    sed '/^$/d' <<<"$a" | sed "s|^|$net |"
  done
}
# The DB helper (Review-B MEDIUM): only the DB credential, never in argv, never the whole env file. The password from
# core.env's DATABASE_URI goes into a root-0600 libpq passfile under $UOPS, bind-mounted read-only; host/port/db/user are
# fixed, non-secret -e values; psql gets no connection string. Output: "<pg ip list>" then "<count>", else HELPER-FAILED.
pg_passfile() {
  local dsn f; dsn=$(sed -n 's/^DATABASE_URI=//p' "$V10/secrets/core.env" 2>/dev/null)
  [[ $dsn =~ ^postgresql://sophomores_review:([0-9a-f]{64})@sophomores-review-pg:5432/sophomores_review$ ]] || return 1
  for f in "$UOPS"/.pgpass.*; do [ -f "$f" ] && rm -f -- "${f:?}"; done   # left by a killed unit (root 0600)
  f=$(umask 077; mktemp "$UOPS/.pgpass.XXXXXX") || return 1
  printf 'sophomores-review-pg:5432:sophomores_review:sophomores_review:%s\n' "${BASH_REMATCH[1]}" > "$f" && chmod 0600 "$f" && printf '%s' "$f"
}
db_helper() {   # NETNS_CID -> two lines (pg addresses seen by DNS in that netns; media count in a READ ONLY transaction)
  local f o rc
  f=$(pg_passfile) || { echo HELPER-FAILED; return 1; }
  o=$(timeout 60 docker run --rm --pull=never --log-driver none --network "container:$1" --read-only --cap-drop ALL --security-opt no-new-privileges \
      --memory 128m --memory-swap 128m --pids-limit 32 --label "co.sophomores.release=$UREL" --mount "type=bind,src=$f,dst=/run/pgpass,readonly" \
      -e PGPASSFILE=/run/pgpass -e PGHOST=sophomores-review-pg -e PGPORT=5432 -e PGDATABASE=sophomores_review -e PGUSER=sophomores_review -e PGCONNECT_TIMEOUT=10 \
      --entrypoint sh "$PG_IMAGE_ID" -c 'getent ahostsv4 "$PGHOST" | awk "{print \$1}" | sort -u | tr "\n" " "; echo; psql -X -q -At -v ON_ERROR_STOP=1 -c "begin transaction read only; select count(*) from media; commit;"' 2>/dev/null); rc=$?
  case $f in "$UOPS"/.pgpass.*) rm -f -- "${f:?}" ;; esac
  [ "$rc" = 0 ] && [ "$(wc -l <<<"$o")" = 2 ] && [[ $(sed -n 2p <<<"$o") =~ ^[0-9]+$ ]] || { echo HELPER-FAILED; return 1; }
  printf '%s\n' "$o"
}
# Candidate identity (Review-B HIGH): the recorded/intended container is the one by that name, on APP_ID, with our label.
cand_name() { [ "$1" = c0 ] && echo "$C0" || echo "$C1"; }
cand_identity_ok() { local w=$1 c=$2; [ "$(cid_of "$(cand_name "$w")")" = "$c" ] && [ "$(img_of "$c")" = "$APP_ID" ] && [ "$(docker inspect "$c" --format '{{index .Config.Labels "co.sophomores.release"}}')" = "$UREL" ]; }
cand_fenced() { local c=$2; cand_identity_ok "$1" "$c" && case "$(state_of "$c")" in exited|created) true;; *) false;; esac && [ "$(docker inspect "$c" --format '{{.HostConfig.RestartPolicy.Name}}')" = no ]; }
cand_running_ids() { local w c; for w in c0 c1; do c=$(find_cand "$w" 2>/dev/null) && running "$c" && echo "$c"; done; }
nginx_reach_ok() {   # CID NAME: from the pinned nginx's netns, on ingress: the route uses nginx's ingress interface, TCP
  local cid=$1 name=$2 np src dst dev code a        # establishes, /login answers 200, and NAME resolves to exactly that address
  np=$(pid_of "$(pin nginx)") || return 1; src=$(ip_on "$(pin nginx)" "$ING"); dst=$(ip_on "$cid" "$ING")
  [ -n "$src" ] && [ -n "$dst" ] || return 1
  dev=$(dev_of_src "$np" "$src"); [ -n "$dev" ] && [ "$(route_dev "$np" "$src" "$dst")" = "$dev" ] || return 1
  [ "$(probe_tcp "$np" "$src" "$dst" 3000)" = ESTABLISHED ] || return 1
  code=$(ns "$np" curl -sS -o /dev/null -w '%{http_code}' --interface "$src" --max-time 10 -H 'host: preview.sophomores.co' -H 'x-forwarded-proto: https' "http://$dst:3000/login" 2>/dev/null)
  [ "$code" = 200 ] || return 1
  a=$(dns_a "$np" "$name") && [ "$a" = "$dst" ]
}
status_read_input() {   # Unit stdin is a private pipe; do not use argv, files or a terminal for the cookie.
  local input rc=0
  unset status_cookie; set +a
  [ -p /dev/fd/0 ] || return 1
  input=$(timeout 8 python3 -I -c '
import re, sys
s = sys.stdin.buffer.read(1100)
if len(s) >= 1100 or not re.fullmatch(rb"__Host-sophomores-preview=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}\n", s):
    sys.exit(1)
sys.stdout.buffer.write(s)
') || rc=$?
  exec </dev/null
  [ "$rc" = 0 ] || return 1
  status_cookie=$input
  export -n status_cookie
  status_probe check "" "" ""
}
status_probe() {   # CASE SRC DST NGINX_PID
  printf '%s\n' "${status_cookie:-}" | python3 -I -c '
import base64, json, re, subprocess, sys, time

def check_cookie(cookie):
    match = re.fullmatch(r"__Host-sophomores-preview=([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]{43}", cookie)
    if not match:
        return False
    raw = match[1]
    claims = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
    now = int(time.time())
    # Accept only a normal session near expiry. The app verifies its signature.
    return (type(claims) is dict and set(claims) == {"v", "iat", "exp", "nonce"}
            and type(claims["v"]) is int and claims["v"] == 1 and type(claims["iat"]) is int
            and type(claims["exp"]) is int and 0 < claims["exp"] - now <= 1800
            and claims["exp"] - claims["iat"] == 43200
            and re.fullmatch(r"[a-f0-9]{32}", claims["nonce"]) is not None)

def response_ok(case, result):
    raw, code = result.rsplit(b"\n", 1)
    body = json.loads(raw)
    if case in ("c0", "wrong-host", "wrong-xfh"):
        return (code == b"403" and body.get("success") is False
                and body.get("error", {}).get("code") == "INVALID_ORIGIN" and "data" not in body)
    expected = {"authenticated": False, "phoneBindingAuth": "anonymous", "emailVerified": False,
                "phoneBound": False, "member": False}
    data = body.get("data")
    if code != b"200" or body.get("success") is not True or set(body) != {"success", "data"}:
        return False
    if type(data) is not dict or set(data) != {*expected, "capabilities"}:
        return False
    caps = data["capabilities"]
    return (all(type(data[k]) is type(value) and data[k] == value for k, value in expected.items())
            and type(caps) is dict and set(caps) == {"emailOtp", "magicLink", "google", "apple", "kakao", "passkey"}
            and all(type(value) is bool for value in caps.values()))

try:
    case, src, dst, pid = sys.argv[1:]
    cookie = sys.stdin.buffer.read(1100).removesuffix(b"\n").decode("ascii")
    if not check_cookie(cookie):
        sys.exit(1)
    if case in ("check", "check-cutover"):
        # Leave time for the checked reload and post-write observation.
        encoded = cookie.split("=", 1)[1].split(".", 1)[0]
        expires = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))["exp"]
        sys.exit(0 if case == "check" or expires - int(time.time()) >= 180 else 1)
    if case not in ("c0", "c1", "wrong-host", "wrong-xfh", "via-nginx"):
        sys.exit(1)
    host = "preview.sophomores.co"
    args = ["curl", "-q", "--silent", "--noproxy", "*", "--connect-timeout", "3",
            "--max-time", "8", "--max-filesize", "16384", "--write-out", "\n%{http_code}",
            "--header", "Accept: application/json", "--config", "-"]
    path = "/api/member/status"
    if case == "via-nginx":
        args += ["--connect-to", host + ":443:127.0.0.1:443", "https://" + host + path]
    else:
        args = ["nsenter", "-t", pid, "-n", "--", *args, "--interface", src,
                "--header", "Host: " + ("invalid.example" if case == "wrong-host" else host),
                "--header", "X-Forwarded-Host: " + ("invalid.example" if case == "wrong-xfh" else host),
                "--header", "X-Forwarded-Proto: https", "--header", "X-Forwarded-For: 127.0.0.1",
                "--header", "X-Real-IP: 127.0.0.1", "http://" + dst + ":3000" + path]
    done = subprocess.run(args, input=("header = \"Cookie: " + cookie + "\"\n").encode("ascii"),
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=10)
    sys.exit(0 if done.returncode == 0 and len(done.stdout) <= 16388 and response_ok(case, done.stdout) else 1)
except Exception:
    sys.exit(1)
' "$1" "$2" "$3" "$4" 2>/dev/null
}
status_unit_core() {
  local status_cookie
  set +a
  status_read_input || { echo 'STOP: private preview status input not accepted'; exit 1; }
  unit_core "$1"
}
status_identity() {   # WHO CID; project only non-secret pins, start identities and ingress endpoints.
  local which=$1 cid=$2 nginx gen nstat cstat src dst manifest helper phase
  nginx=$(pin nginx) && gen=$(pin_gen nginx) && nginx_identity_ok && cand_identity_ok "$which" "$cid" || return 1
  nstat=$(docker inspect "$nginx" --format '{{.State.StartedAt}} {{.State.Pid}}') || return 1
  cstat=$(docker inspect "$cid" --format '{{.State.StartedAt}}') || return 1
  [[ $nstat =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\ [1-9][0-9]*$ && $cstat =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$ && $gen =~ ^[1-9][0-9]*$ ]] || return 1
  src=$(ip_on "$nginx" "$ING"); dst=$(ip_on "$cid" "$ING")
  [[ $src =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  phase=$(state_of "$cid") || return 1
  case "$phase:$which" in
    running:*) [[ $dst =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1 ;;
    exited:c0) [ -z "$dst" ] || return 1; dst=stopped ;;
    *) return 1 ;;
  esac
  manifest=$(hash_of "$UOPS/transfer.sha256") && helper=$(hash_of "$UOPS/upload/$SELF") || return 1
  printf '%s\n' "$UREL $manifest $helper nginx=$nginx/$gen/$nstat src=$src $which=$cid/$cstat dst=$dst"
}
status_cases() {   # WHO CID RECEIPT CASES...; prove identities before and after the exact cases.
  local which=$1 cid=$2 before src dst np dev outcome
  local receipt=$3
  shift 3
  before=$(status_identity "$which" "$cid") || return 1
  np=$(pid_of "$(pin nginx)") || return 1
  src=$(ip_on "$(pin nginx)" "$ING"); dst=$(ip_on "$cid" "$ING")
  [[ $src =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ && $dst =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  dev=$(dev_of_src "$np" "$src")
  [ -n "$dev" ] && [ "$(route_dev "$np" "$src" "$dst")" = "$dev" ] || return 1
  for outcome in "$@"; do
    [ "$before" = "$(status_identity "$which" "$cid")" ] || return 1
    status_probe "$outcome" "$src" "$dst" "$np" || { echo "STOP: member-status $outcome not proven"; return 1; }
    echo "STATUS-PROVEN $outcome"
  done
  [ "$before" = "$(status_identity "$which" "$cid")" ] &&
    printf '%s\n' "$before" | publish_stdin "$UOPS/status-$receipt"
}
status_receipt_ok() {
  local current file="$UOPS/status-$1" age written now
  current=$(status_identity "$2" "$3") && [ -f "$file" ] && [ ! -L "$file" ] \
    && [ "$(stat -c '%u:%a' "$file")" = 0:600 ] || return 1
  written=$(stat -c %Y "$file") && now=$(date +%s) || return 1
  age=$((now - written))
  [ "$age" -ge 0 ] && [ "$age" -le 86400 ] && [ "$(cat "$file")" = "$current" ]
}
status_c0_stop_receipt() {
  local cid=$1 live stopped file="$UOPS/status-c0-live"
  [ -f "$file" ] && [ ! -L "$file" ] && [ "$(stat -c '%u:%a' "$file")" = 0:600 ] || return 1
  live=$(cat "$file") && stopped=$(status_identity c0 "$cid") || return 1
  [[ ${live##* dst=} =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ && $stopped = "${live% dst=*} dst=stopped" ]] \
    && cand_fenced c0 "$cid" && printf '%s\n' "$stopped" | publish_stdin "$UOPS/status-c0-stopped"
}
mail_structural_ok() {   # CID: default route via egress13's gateway on the egress13 interface; the host masquerades egress13
  local p ip gw dev; p=$(pid_of "$1") || return 1; ip=$(ip_on "$1" "$EGR13"); [ -n "$ip" ] || return 1
  gw=$(docker network inspect "$EGR13" --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null)
  dev=$(dev_of_src "$p" "$ip"); [ -n "$gw" ] && [ -n "$dev" ] || return 1
  [ "$(ns "$p" ip -o route show default 2>/dev/null | awk '{print $3" "$5}')" = "$gw $dev" ] || return 1
  iptables -t nat -S 2>/dev/null | grep -qE -- "-s $EGR13_SUB ! -o $EGR13_BR -j MASQUERADE"
}
mail_tcp_ok() {   # C1 only, before cutover; DNS in the container, TCP bound to its egress13 IPv4 address.
  local cid=$1 before e host port p src dst dev result
  before=$(status_identity c1 "$cid") && mail_structural_ok "$cid" || return 1
  e=$(env_lines_of "$cid") && smtp_env_ok <<<"$e" || return 1
  host=$(sed -n 's/^MEMBER_AUTH_SMTP_HOST=//p' <<<"$e")
  port=$(sed -n 's/^MEMBER_AUTH_SMTP_PORT=//p' <<<"$e")
  p=$(pid_of "$cid") && src=$(ip_on "$cid" "$EGR13") || return 1
  dst=$(timeout 5 docker exec "$cid" node -e 'require("node:dns").lookup(process.argv[1], {family:4}, (err, addr) => {if(err) process.exitCode=1; else console.log(addr);})' "$host" 2>/dev/null) || return 1
  [[ $dst =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ && $src =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  dev=$(dev_of_src "$p" "$src")
  [ -n "$dev" ] && [ "$(route_dev "$p" "$src" "$dst")" = "$dev" ] || return 1
  [ "$before" = "$(status_identity c1 "$cid")" ] || return 1
  result=$(PROBE_TIMEOUT=5 probe_tcp "$p" "$src" "$dst" "$port")
  [ "$result" = ESTABLISHED ] && [ "$before" = "$(status_identity c1 "$cid")" ] || return 1
  printf '%s\n' "$before" | publish_stdin "$UOPS/status-c1-mail-tcp" || return 1
  echo 'SMTP-TCP-REACHABLE (one connection over egress13; no protocol or delivery proof)'
}
ipv6_process_identity() {   # Project only container identity and lifecycle; never log inspect output.
  local id=$1 state cid running pid started
  state=$(docker inspect --type container --format '{{.Id}} {{.State.Running}} {{.State.Pid}} {{.State.StartedAt}}' "$id" 2>/dev/null) || return 1
  [[ $state =~ ^([0-9a-f]{64})\ (true)\ ([1-9][0-9]*)\ ([^[:space:]]+)$ ]] || return 1
  read -r cid running pid started <<<"$state"
  [[ $cid = "$id" && $started =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$ ]] && printf '%s\n' "$state"
}
ipv6_netns_identity() {
  local inode; inode=$(stat -Lc '%d:%i' "/proc/$1/ns/net" 2>/dev/null) || return 1
  [[ $inode =~ ^[0-9]+:[1-9][0-9]*$ ]] && printf '%s\n' "$inode"
}
no_ipv6_ok() {
  local cid=$1 state pid inode end_state end_inode endpoints addresses verdict rc
  state=$(ipv6_process_identity "$cid") || { echo 'STOP: IPv6 PID_UNKNOWN'; return 1; }
  read -r _ _ pid _ <<<"$state"
  inode=$(ipv6_netns_identity "$pid") || { echo 'STOP: IPv6 NETNS_PROBE_FAILED (identity)'; return 1; }
  endpoints=$(docker inspect --type container --format '{{range $name, $ep := .NetworkSettings.Networks}}[{{json $name}},{{json $ep.GlobalIPv6Address}},{{json $ep.GlobalIPv6PrefixLen}}]{{"\n"}}{{end}}' "$cid" 2>/dev/null) \
    || { echo 'STOP: IPv6 ENDPOINT_INSPECT_FAILED'; return 1; }
  addresses=$(ns "$pid" ip -j -6 addr show 2>/dev/null) || { echo 'STOP: IPv6 NETNS_PROBE_FAILED (ip)'; return 1; }
  end_state=$(ipv6_process_identity "$cid") && end_inode=$(ipv6_netns_identity "$pid") && [ "$state" = "$end_state" ] && [ "$inode" = "$end_inode" ] \
    || { echo 'STOP: IPv6 PID_UNKNOWN (process or namespace changed)'; return 1; }

  # Validate all projected fields before reporting any. Unparsed stdout is never logged.
  verdict=$(python3 -I -c '
import ipaddress, json, re, sys

try:
    rows = [json.loads(line) for line in sys.argv[1].splitlines()]
    expected = sys.argv[3:]
    if len(rows) != len(expected) or len(set(expected)) != 3:
        raise ValueError
    found, endpoint_v6 = set(), []
    for name, address, prefix in rows:
        if name not in expected or name in found or type(prefix) is not int or not 0 <= prefix <= 128:
            raise ValueError
        found.add(name)
        if address != "":
            if not isinstance(address, str) or "%" in address:
                raise ValueError
            endpoint_v6.append((name, ipaddress.IPv6Address(address), prefix))
        elif prefix != 0:
            raise ValueError
except (TypeError, ValueError):
    sys.exit(2)

try:
    links = json.loads(sys.argv[2])
    if not isinstance(links, list) or not links:
        raise ValueError
    interfaces, global_v6, link_local = set(), [], 0
    for link in links:
        if not isinstance(link, dict):
            raise ValueError
        name, infos = link.get("ifname"), link.get("addr_info")
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.:@-]{1,32}", name) or name in interfaces or not isinstance(infos, list):
            raise ValueError
        interfaces.add(name)
        for info in infos:
            if not isinstance(info, dict) or info.get("family") != "inet6":
                raise ValueError
            address, prefix, scope = info.get("local"), info.get("prefixlen"), info.get("scope")
            if not isinstance(address, str) or "%" in address or type(prefix) is not int or not 0 <= prefix <= 128 or scope not in ("global", "site", "link", "host", "nowhere"):
                raise ValueError
            parsed = ipaddress.IPv6Address(address)
            if scope == "global":
                global_v6.append((name, parsed, prefix))
            elif scope == "link":
                link_local += 1
    if "lo" not in interfaces:
        raise ValueError
except (TypeError, ValueError):
    sys.exit(3)

print(f"IPv6-DIAG endpoint_addresses={len(endpoint_v6)} netns_global={len(global_v6)} netns_link_local={link_local}")
for name, address, prefix in endpoint_v6:
    print(f"IPv6-DIAG endpoint network={name} IPv6={address}/{prefix}")
for name, address, prefix in global_v6:
    print(f"IPv6-DIAG netns interface={name} IPv6={address}/{prefix} scope=global")
if endpoint_v6:
    print("STOP: IPv6 ENDPOINT_IPV6")
if global_v6:
    print("STOP: IPv6 NETNS_GLOBAL_IPV6")
sys.exit(4 if endpoint_v6 or global_v6 else 0)
' "$endpoints" "$addresses" "$ING" "$DB13" "$EGR13" 2>/dev/null); rc=$?
  case $rc in
    0) if [[ $verdict = 'IPv6-DIAG '* ]]; then printf '%s\n' "$verdict"; return 0; fi
       echo 'STOP: IPv6 NETNS_PROBE_FAILED (empty validation result)' ;;
    4) printf '%s\n' "$verdict" ;;
    2) echo 'STOP: IPv6 ENDPOINT_INSPECT_FAILED (invalid projection)' ;;
    *) echo 'STOP: IPv6 NETNS_PROBE_FAILED (invalid projection or parser failed)' ;;
  esac
  return 1
}
dns_names_ok() {   # CID NAME: on each network, DNSNames = {NAME, short ID} and Aliases within {NAME}; nothing else
  local n d a; for n in "$ING" "$DB13" "$EGR13"; do
    d=$(docker inspect "$1" --format "{{with index .NetworkSettings.Networks \"$n\"}}{{range .DNSNames}}{{.}} {{end}}{{end}}" | tr ' ' '\n' | sed '/^$/d' | sort | tr '\n' ' ')
    a=$(docker inspect "$1" --format "{{with index .NetworkSettings.Networks \"$n\"}}{{range .Aliases}}{{.}} {{end}}{{end}}" | tr ' ' '\n' | sed '/^$/d' | grep -vx -- "$2")
    [ "$d" = "$(printf '%s\n' "$2" "${1:0:12}" | sort | tr '\n' ' ')" ] && [ -z "$a" ] || return 1
  done
}
# DNS and a DB read on db13, as the candidate sees them, through db_helper (passfile only; nothing in argv).
db13_gate() {   # CID: on db13, DNS gives exactly pg's db13 address; the count equals pg's own superuser count read now
  local o want; want=$(ip_on "$(pin pg)" "$DB13"); [ -n "$want" ] || return 1
  o=$(db_helper "$1") || return 1
  [ "$(head -n 1 <<<"$o" | sed 's/ $//')" = "$want" ] && [ "$(sed -n 2p <<<"$o")" = "$(pg_q "select count(*) from media" sophomores_review 2>/dev/null)" ]
}
prev_db_count() { local o; o=$(db_helper "$(prev_cid)") || return 1; sed -n 2p <<<"$o"; }
# The created container, BEFORE start: image, env (mode), sandbox invariants, mounts, policies, no ports, exactly the
# three configured networks and no extra aliases.
created_ok() {   # CID NAME c0|c1
  local cid=$1 name=$2 n a
  [ "$(img_of "$cid")" = "$APP_ID" ] || { echo "STOP: $name is not on $APP_ID"; return 1; }
  env_mode_ok "$cid" "$3" || { echo "STOP: $name's effective env is not the expected $3 env (pass/fail only)"; return 1; }
  env_invariants_ok "$cid" || { echo "STOP: $name's effective env fails a sandbox or listener invariant"; return 1; }
  [ "$(mounts_json "$cid")" = "$(cat "$UOPS/prev-mounts.json")" ] || { echo "STOP: $name's mounts differ from $PREV_APP's"; return 1; }
  [ "$(docker inspect "$cid" --format '{{.HostConfig.RestartPolicy.Name}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.Memory}}|{{.HostConfig.PublishAllPorts}}|{{.HostConfig.NetworkMode}}')" = "no|true|$APP_MEM_BYTES|false|$ING" ] \
    || { echo "STOP: $name's restart/readonly/memory/publish/network mode is not as created"; return 1; }
  case "$(docker inspect "$cid" --format '{{json .HostConfig.PortBindings}}')" in '{}'|null) ;; *) echo "STOP: $name has port bindings"; return 1;; esac
  [ "$(nets_of "$cid")" = "$(cand_nets)" ] || { echo "STOP: $name's configured networks are not exactly $ING, $DB13, $EGR13"; return 1; }
  for n in "$ING" "$DB13" "$EGR13"; do
    a=$(docker inspect "$cid" --format "{{with index .NetworkSettings.Networks \"$n\"}}{{range .Aliases}}{{.}} {{end}}{{end}}" | tr ' ' '\n' | sed '/^$/d' | grep -vx -- "$name")
    [ -z "$a" ] || { echo "STOP: $name has an extra alias on $n"; return 1; }
  done
}
# The started candidate: networks, names, no v6, the one listener, memberships, nginx reach, mail shape, refusals, db13.
isolated_ok() {   # CID NAME TAG
  local cid=$1 name=$2
  running "$cid" || { echo "STOP: $name is not running"; return 1; }
  nets_ok || { echo "STOP: the networks are not the pinned shape (ID, bridge, subnet, internal, IPv6 off, label)"; return 1; }
  [ "$(nets_of "$cid")" = "$(cand_nets)" ] || { echo "STOP: $name is not on exactly the three new networks"; return 1; }
  dns_names_ok "$cid" "$name" || { echo "STOP: $name's DNS names or aliases are not exactly {name, short ID}"; return 1; }
  no_ipv6_ok "$cid" || return 1
  [ -z "$(docker port "$cid" 2>/dev/null)" ] || { echo "STOP: $name publishes a port"; return 1; }
  [ "$(listen_set "$(pid_of "$cid")")" = "0.0.0.0:3000" ] || { echo "STOP: $name does not listen on exactly 0.0.0.0:3000"; return 1; }
  members_are "$ING" "$(pin nginx)" "$cid" || { echo "STOP: $ING is not exactly {nginx, $name}"; return 1; }
  members_are "$DB13" "$(pin pg)" "$cid" || { echo "STOP: $DB13 is not exactly {review-pg, $name}"; return 1; }
  members_are "$EGR13" "$cid" || { echo "STOP: $EGR13 is not exactly {$name}"; return 1; }
  nginx_reach_ok "$cid" "$name" || { echo "STOP: nginx does not reach $name on ingress (route, connect, /login 200, name = its ingress address)"; return 1; }
  mail_structural_ok "$cid" || { echo "STOP: $name's egress13 route/masquerade shape is not as expected"; return 1; }
  refusal_matrix "$cid" "$UOPS/matrix-$3-$(date -u +%Y%m%dT%H%M%SZ)" || { echo "STOP: the refusal matrix for $name did not pass (FAIL or VOID rows)"; return 1; }
  db13_gate "$cid" || { echo "STOP: on db13, $name does not resolve review-pg to its db13 address or read the expected media count"; return 1; }
}
wait_login() { local i got; for i in $(seq 1 90); do got=$(docker exec "$1" node -e 'fetch("http://127.0.0.1:3000/login",{headers:{host:"preview.sophomores.co"}}).then(r=>console.log(r.status)).catch(()=>console.log(0))' 2>/dev/null); [ "$got" = 200 ] && return 0; sleep 1; done; return 1; }

# ================================================================ the step chain (as v12)
ustep() {
  local s=${1:-} prev="" x rc
  case $- in *x*) echo "STOP: xtrace is on"; return 1;; esac
  case " $STEP_ORDER " in *" $s "*) ;; *) echo "STOP: unknown step '$s'"; return 1;; esac
  for x in $STEP_ORDER; do [ "$x" = "$s" ] && break; prev=$x; done
  if [ -n "$prev" ] && [ ! -s "$UOPS/tokens/$prev" ]; then echo "STOP: $s refused: step $prev has not passed"; return 1; fi
  [ -e "$UOPS/abandoned" ] && { echo "STOP: $s refused: this update was abandoned"; return 1; }
  [ -e "$UOPS/launch-unknown" ] && { echo "STOP: $s refused: a launch outcome is unknown (RUNBOOK 'Unknown launch')"; return 1; }
  for x in "$s" "$s.failed"; do [ -e "$UOPS/tokens/$x" ] && { echo "STOP: $s refused: it already ran (tokens/$x)"; return 1; }; done
  [ -e "$UOPS/tokens/$s.started" ] && { echo "STOP: $s refused: tokens/$s.started exists without a result; do not rerun; report"; return 1; }
  verified "$SELF" || return 1
  load_vars || return 1
  [ "$s" = u0 ] || shared_attached_ok || return 1
  if declare -F "pre_$s" >/dev/null; then "pre_$s" || return 1; fi
  [ -d "$UOPS/tokens" ] || install -d -m 0700 "$UOPS/tokens" || { echo "STOP: cannot create $UOPS/tokens"; return 1; }
  echo "$s $(date -u +%FT%TZ)" | publish_stdin "$UOPS/tokens/$s.started" || { echo "STOP: cannot record tokens/$s.started; nothing run"; return 1; }
  "do_$s"; rc=$?
  if [ "$rc" = 0 ]; then echo "$s $(date -u +%FT%TZ)" | publish_stdin "$UOPS/tokens/$s" || { echo "STOP: $s passed but its token could not be recorded"; rc=1; }; fi
  if [ "$rc" = 0 ]; then echo "STEP-$s-OK"; return 0; fi
  echo "$s rc=$rc" | publish_stdin "$UOPS/tokens/$s.failed" 2>/dev/null
  echo "STEP-$s-FAILED rc=$rc: no later step will run; report"; return "$rc"
}
in_unit() {   # NAME FUNCTION (as v12: own systemd unit, re-verifies this file, holds both locks itself)
  local name=$1 fn=$2 out="$UOPS/$1.out" start rc
  local -a unit_io=(-p StandardOutput=append:"$out" -p StandardError=append:"$out")
  verified "$SELF" || return 1
  : >> "$out" && chmod 0600 "$out" || { echo "STOP: cannot open $out"; return 1; }
  start=$(wc -l < "$out")
  case "$name" in u4a|u4b|u5) unit_io=(--pipe) ;; esac
  if [ "${unit_io[0]}" = --pipe ]; then
    { systemd-run --quiet --wait --collect --pipe --unit "$UREL-$name" -p RuntimeMaxSec="${UNIT_MAX_SEC:-2400}" -E LC_ALL=C \
        /bin/bash --noprofile --norc -c 'set +x; w=$(awk -v f="$2" '"'"'$2 == f {print $1}'"'"' "$1/transfer.sha256"); [ -n "$w" ] && [ "$(sha256sum < "$1/upload/$2" | cut -d" " -f1)" = "$w" ] || exit 1; . "$1/upload/$2" || exit 1; "$3"' \
        _ "$UOPS" "$SELF" "$fn" <&7 7<&-; } >> "$out" 2>&1
    rc=$?
    tail -n "+$((start + 1))" "$out"
    return "$rc"
  fi
  systemd-run --quiet --wait --collect --unit "$UREL-$name" -p RuntimeMaxSec="${UNIT_MAX_SEC:-2400}" "${unit_io[@]}" -E LC_ALL=C \
    -E "RECONCILE_STEP=${RECONCILE_STEP:-}" -E "REPIN_WHAT=${REPIN_WHAT:-}" -E "REPIN_ID=${REPIN_ID:-}" \
    /bin/bash -c 'w=$(awk -v f="$2" '"'"'$2 == f {print $1}'"'"' "$1/transfer.sha256"); [ -n "$w" ] && [ "$(sha256sum < "$1/upload/$2" | cut -d" " -f1)" = "$w" ] || { echo "STOP: $2 does not match the manifest inside the unit"; exit 1; }; . "$1/upload/$2" || exit 1; "$3"' \
    _ "$UOPS" "$SELF" "$fn"
  rc=$?
  tail -n "+$((start + 1))" "$out"
  return "$rc"
}
unit_core() { locks_take || exit 1; "$1"; exit $?; }   # FUNCTION under both locks, streaming; the EXIT trap prints LOCKS-HELD   # FUNCTION: run a body under both locks, inside the unit

# ================================================================ u0: admission (read-only, apart from $UOPS)
subnets_free() {   # our three subnets overlap no Docker network and no host route
  { docker network ls -q | xargs -r docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}}{{"\n"}}{{end}}'; ip -o -4 route show | awk '{print $1}'; } 2>/dev/null | sed '/^$/d' \
    | python3 -I -c '
import ipaddress, sys
ours = [ipaddress.ip_network(a) for a in sys.argv[1:]]
taken = []
for l in sys.stdin.read().split():
    try: taken.append(ipaddress.ip_network(l, strict=False))
    except ValueError: pass
taken = [t for t in taken if t.version == 4 and t.prefixlen > 0]
sys.exit(1 if any(o.overlaps(t) for o in ours for t in taken) else 0)' "$ING_SUB" "$DB13_SUB" "$EGR13_SUB"
}
do_u0() {
  local c f
  [ -s "$V10/tokens/s7" ] && [ -s "$V10/tokens/s8" ] || { echo "STOP: v10 is not complete (s7/s8 tokens)"; return 1; }
  [ -s "$V12/tokens/u5" ] || { echo "STOP: v12's cutover (u5) is not recorded; v13 starts from v12's v4 route"; return 1; }
  v12_units_idle || { echo "STOP: a v12 unit is active"; return 1; }
  disk_floor || return 1
  locks_free || { echo "STOP: the preview/TLS locks are busy"; return 1; }
  vhost_inode_ok && [ "$(vhost_state)" = v4 ] || { echo "STOP: the live vhost is not v4 (upstream $PREV8) on v10's recorded inode"; return 1; }
  c=$(cat "$V12/new-app-id" 2>/dev/null); [[ $c =~ ^[0-9a-f]{64}$ ]] && [ "$(cid_of "$PREV_APP")" = "$c" ] && [ "$(img_of "$c")" = "$PREV_APP_ID" ] && running "$c" && fetch_login_in "$c" >/dev/null \
    || { echo "STOP: $PREV_APP is not v12's recorded container, on its image, running and answering /login"; return 1; }
  printf '%s\n' "$c" | publish_stdin "$UOPS/prev-app-id" || { echo "STOP: cannot record prev-app-id"; return 1; }
  [ "$(nets_of "$c")" = "$(prev_nets)" ] || { echo "STOP: $PREV_APP's networks are not the three v12 gave it"; return 1; }
  [ "$(mounts_of "$c")" = "$(expected_mounts)" ] || { echo "STOP: $PREV_APP's mounts are not exactly the expected three"; return 1; }
  mounts_json "$c" | publish_stdin "$UOPS/prev-mounts.json" && [ -s "$UOPS/prev-mounts.json" ] || { echo "STOP: cannot record $PREV_APP's mounts"; return 1; }
  effective_env_ok "$c" "$PREV_APP_ID" && env_invariants_ok "$c" || { echo "STOP: $PREV_APP's effective env is not its image env plus v10's four env files, with the invariants (pass/fail only)"; return 1; }
  install -d -m 0700 "$UOPS/pins" || { echo "STOP: cannot create $UOPS/pins"; return 1; }
  c=$(cat "$V10/pg-id" 2>/dev/null); [[ $c =~ ^[0-9a-f]{64}$ ]] && [ "$(cid_of "$PG")" = "$c" ] && running "$c" && [ "$(img_of "$c")" = "$PG_IMAGE_ID" ] \
    || { echo "STOP: $PG is not v10's recorded, running review-pg"; return 1; }
  [ "$(nets_of "$c")" = "$DBNET" ] || { echo "STOP: review-pg is not on exactly $DBNET"; return 1; }
  printf '%s\n' "$c" | publish_stdin "$UOPS/pins/pg-id.0001" && mounts_of "$c" | publish_stdin "$UOPS/pg-mounts" || { echo "STOP: cannot pin review-pg and its mounts"; return 1; }
  grep -qx "volume|$PG_DATA_VOL|/var/lib/postgresql/data|true" "$UOPS/pg-mounts" || { echo "STOP: review-pg does not mount $PG_DATA_VOL read-write at /var/lib/postgresql/data"; return 1; }
  c=$(cid_of nginx); [[ $c =~ ^[0-9a-f]{64}$ ]] && running "$c" || { echo "STOP: no running nginx container"; return 1; }
  [ "$(nginx_vhost_mount "$c" | wc -l)" = 1 ] && [ "$(nginx_vhost_mount "$c" | cut -d'|' -f1)" = bind ] || { echo "STOP: nginx does not bind-mount $VHOST exactly once"; return 1; }
  nginx_vhost_mount "$c" | publish_stdin "$UOPS/nginx-mount" && printf '%s\n' "$c" | publish_stdin "$UOPS/pins/nginx-id.0001" && nets_of "$c" | publish_stdin "$UOPS/nginx-nets" \
    || { echo "STOP: cannot pin nginx, its vhost mount and its networks"; return 1; }
  nginx_identity_ok || { echo "STOP: the file nginx sees at its vhost mount is not the host vhost"; return 1; }
  [ "$(hash_of "$UOPS/upload/$V4")" = "$V4_SHA" ] && [ "$(hash_of "$UOPS/upload/$V5")" = "$V5_SHA" ] || { echo "STOP: the uploaded v4/v5 vhosts do not match their pins"; return 1; }
  [ "$(dd if="$UOPS/upload/$V4" bs=1 skip="$OFF" count=8 status=none)" = "$PREV8" ] && [ "$(dd if="$UOPS/upload/$V5" bs=1 skip="$OFF" count=8 status=none)" = "$NEW8" ] \
    && [ "$(cmp -l "$UOPS/upload/$V4" "$UOPS/upload/$V5" | awk '$1 < '"$((OFF + 1))"' || $1 > '"$((OFF + 8))"' {n++} END {print n+0}')" = 0 ] \
    || { echo "STOP: v4 and v5 do not differ in exactly the pinned 8-byte window"; return 1; }
  f=$(origin_identity) && [ "$f" = "$(identity_in "$(prev_cid)")" ] || { echo "STOP: the origin does not serve $PREV_APP's build right now"; return 1; }
  printf '%s\n' "$f" | publish_stdin "$UOPS/route-prev" || { echo "STOP: cannot record the current route identity"; return 1; }
  for c in $ENV_FILES; do [ "$(stat -c '%a %U' "$V10/secrets/$c.env" 2>/dev/null)" = "600 root" ] || { echo "STOP: $c.env missing or not 0600 root"; return 1; }; done
  name_free "$C0" && name_free "$C1" || { echo "STOP: $C0 or $C1 exists, or the daemon cannot say"; return 1; }
  for c in "$ING" "$DB13" "$EGR13"; do net_free "$c" || { echo "STOP: network $c exists, or the daemon cannot say"; return 1; }; done
  for c in "$ING_BR" "$DB13_BR" "$EGR13_BR"; do ip link show "$c" >/dev/null 2>&1 && { echo "STOP: interface $c exists"; return 1; }; done
  subnets_free || { echo "STOP: $ING_SUB/$DB13_SUB/$EGR13_SUB overlap an existing Docker network or host route"; return 1; }
  [ "$(docker info --format '{{.LiveRestoreEnabled}}' 2>/dev/null)" = true ] || { echo "STOP: Docker live-restore is not on (f0 recorded it on)"; return 1; }
  docker image inspect "$APP_ID" >/dev/null 2>&1 && { echo "STOP: $APP_ID is already loaded (u1 must be the one that loads it)"; return 1; }
  for c in systemd-run flock nsenter python3 ip ss curl iptables; do command -v "$c" >/dev/null || { echo "STOP: $c missing"; return 1; }; done
  echo "UPDATE-ADMITTED (v12 u5 recorded, v4 live on the inode; $PREV_APP, review-pg and nginx pinned (generation 0001); v4/v5 differ only in the window; names, networks, bridges and subnets free; live-restore on; locks free)"
}

# ================================================================ u1-u3 (as v12)
tar_config() { local c; c=$(tar -xOf "$1" manifest.json 2>/dev/null | grep -oE '"Config":"[^"]*"' | grep -oE '[0-9a-f]{64}'); [ "$(wc -l <<<"$c" | tr -d ' ')" = 1 ] && [[ $c =~ ^[0-9a-f]{64}$ ]] && echo "sha256:$c"; }
do_u1() {
  local f want got
  disk_floor || return 1
  docker image ls --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}}' | sort | publish_stdin "$UOPS/images-before.txt" || { echo "STOP: cannot record images before"; return 1; }
  for f in "$APP_TAR=$APP_ID" "$RUNNER_TAR=$RUNNER_ID"; do
    want=${f#*=}; f=${f%%=*}
    verified "$f" || return 1
    [ "$(tar_config "$UOPS/upload/$f")" = "$want" ] || { echo "STOP: $f's config digest is not $want"; return 1; }
    timeout 900 docker load -i "$UOPS/upload/$f" >/dev/null 2>&1 || { echo "STOP: docker load failed for $f"; return 1; }
    docker image inspect "$want" >/dev/null 2>&1 || { echo "ESCALATE: $f loaded but $want is not present; report"; return 2; }
    got=$(docker image inspect "$want" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}|{{.Config.User}}|{{.Architecture}}')
    [ "$got" = "$U_SHA|node|amd64" ] || { echo "STOP: $want label/user/arch is not ${U_SHA:0:8}|node|amd64"; return 1; }
  done
  echo "IMAGES-LOADED (APP_ID ${APP_ID:7:12}, RUNNER_ID ${RUNNER_ID:7:12}, both labelled ${U_SHA:0:8}; K1 may now check them)"
}
media_helper() {
  timeout 600 docker run --rm --pull=never --log-driver none --oom-score-adj 1000 --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --memory 256m --memory-swap 256m --cpus 1 --pids-limit 64 --label "co.sophomores.release=$UREL" \
    --mount "type=volume,src=$MEDIA,dst=/m,readonly" --entrypoint sh "$PG_IMAGE_ID" -c "$1"
}
do_u2() {
  local d="$UOPS/backups" ts f m rc files tarn bad lsn rows
  disk_floor || return 1
  install -d -m 0700 -o root -g root "$d" || { echo "STOP: cannot create $d"; return 1; }
  ts=$(date -u +%Y%m%dT%H%M%SZ); f="$d/review-db-$ts.dump"; m="$d/review-media-$ts.tar"
  lsn=$(pg_q "select pg_current_wal_lsn()" sophomores_review) && rows=$(pg_q "select count(*) from media" sophomores_review) \
    && files=$(media_helper 'find /m -type f | wc -l') && [[ $rows =~ ^[0-9]+$ && $files =~ ^[0-9]+$ ]] \
    || { echo "STOP: cannot read the backup boundary"; return 1; }
  printf 'utc=%s wal_lsn=%s media_rows=%s media_files=%s\n' "$(date -u +%FT%TZ)" "$lsn" "$rows" "$files" | publish_stdin "$UOPS/backup-boundary" \
    || { echo "STOP: cannot record the backup boundary"; return 1; }
  timeout 900 docker exec "$(pin pg)" pg_dump -U "$PG_SUPER" -Fc sophomores_review | publish_stdin "$f"; rc=${PIPESTATUS[0]}
  [ "$rc" = 0 ] && [ -s "$f" ] || { echo "STOP: DB dump failed"; return 1; }
  timeout 900 docker exec -i "$(pin pg)" pg_restore --exit-on-error -f /dev/null < "$f" >/dev/null 2>&1 || { echo "STOP: the DB dump does not fully decode"; return 1; }
  media_helper 'tar -C /m -cf - .' | publish_stdin "$m"; rc=${PIPESTATUS[0]}
  [ "$rc" = 0 ] && [ -s "$m" ] || { echo "STOP: media archive failed"; return 1; }
  tarn=$(tar -tvf "$m" --numeric-owner 2>/dev/null | awk '$1 ~ /^-/ {n++} END {print n+0}') || { echo "STOP: the media archive does not read back"; return 1; }
  bad=$(tar -tvf "$m" --numeric-owner 2>/dev/null | awk '$2 !~ /^1000\// && $6 != "./" {n++} END {print n+0}')
  [ "$tarn" = "$files" ] || { echo "STOP: the media archive holds $tarn files, the volume $files"; return 1; }
  [ "$bad" = 0 ] || { echo "STOP: $bad media archive entries are not owned by uid 1000"; return 1; }
  [ "$(stat -c '%a %U' "$f")|$(stat -c '%a %U' "$m")" = "600 root|600 root" ] || { echo "STOP: backup files are not 0600 root"; return 1; }
  echo "BACKED-UP (dump fully decodes; media tar $tarn files = volume, uid 1000; boundary recorded: $UOPS/backup-boundary)"
}
schema_query() {
  pg_identity_ok || return 1
  timeout 20 docker exec "$(pin pg)" psql -X -q -At -v ON_ERROR_STOP=1 -U "$PG_SUPER" -d sophomores_review -c "$1" 2>/dev/null
}
schema_is_locked() {
  [ "$REVIEW_LOCKS_HELD" = 1 ] && python3 -I -c '
import os, sys
try:
    ok = all(os.path.samestat(os.fstat(fd), os.stat(path)) for fd, path in zip((8, 9), sys.argv[1:]))
except OSError:
    ok = False
sys.exit(0 if ok else 1)
' "$PREVIEW_LOCK" "$TLS_LOCK"
}
schema_read() {   # Live classification. Tokens are never substituted for catalog/ledger observations.
  schema_query "begin isolation level repeatable read read only;
    set local role pg_read_all_data;
    set local statement_timeout = '5s';
    set local lock_timeout = '2s';
    select current_user||'|'||current_setting('transaction_read_only')||'|'||current_database();
    select 'ledger='||count(*)||'|'||count(distinct name)||'|'||count(*) filter
      (where batch is null or batch::text in ('NaN','Infinity','-Infinity') or batch<1 or batch<>trunc(batch))
      from public.payload_migrations;
    select 'name='||name from public.payload_migrations order by name collate \"C\";
    select 'column='||attname from pg_catalog.pg_attribute
      where attrelid='public.business_info'::regclass and attnum>0 and not attisdropped
        and attname in ('business_registration_number','biz_num') order by attname collate \"C\";
    select 'dedicated_batch='||case when count(*)=1 and count(*) filter(where name='$BIZ_NUM_MIGRATION')=1
      then 'yes' else 'no' end from public.payload_migrations
      where batch=(select max(batch) from public.payload_migrations);
    commit;"
}
schema_state() {
  local out names cols batch ledger
  out=$(schema_read) || return 1
  [ "$(head -n 1 <<<"$out")" = 'pg_read_all_data|on|sophomores_review' ] || return 1
  names=$(sed -n 's/^name=//p' <<<"$out")
  cols=$(sed -n 's/^column=//p' <<<"$out")
  batch=$(sed -n 's/^dedicated_batch=//p' <<<"$out")
  ledger=$(sed -n 's/^ledger=//p' <<<"$out")
  if [ "$ledger" = '32|32|0' ] && [ "$cols" = business_registration_number ] && [ "$names" = "$(printf '%s\n' $EXPECTED_MIGRATIONS | LC_ALL=C sort)" ]; then
    echo 32
  elif [ "$ledger" = '33|33|0' ] && [ "$cols" = biz_num ] && [ "$batch" = yes ] \
    && [ "$names" = "$(printf '%s\n' $EXPECTED_MIGRATIONS "$BIZ_NUM_MIGRATION" | LC_ALL=C sort)" ]; then
    echo 33
  else return 1; fi
}
schema_proof_key() {
  local pg gen manifest intent
  pg=$(pin pg) && gen=$(pin_gen pg) && pg_identity_ok || return 1
  manifest=$(hash_of "$UOPS/transfer.sha256") && intent=$(hash_of "$UOPS/schema-up.intent") || return 1
  [[ $pg =~ ^[0-9a-f]{64}$ && $gen =~ ^[0-9]+$ && $manifest =~ ^[0-9a-f]{64}$ && $intent =~ ^[0-9a-f]{64}$ ]] || return 1
  printf '%s\n' "$manifest $pg $gen $intent"
}
schema_proof_file() {
  [ -f "$1" ] && [ ! -L "$1" ] && [ "$(stat -c '%u:%a' "$1")" = 0:600 ] && [ "$(cat "$1")" = "$2" ]
}
schema_maintenance_proof_ok() {
  local key
  key=$(schema_proof_key) && schema_proof_file "$UOPS/schema-maintenance.proven" "$key" \
    && schema_maintenance_current
}
schema_maintenance_current() {
  # No live maintenance verifier has been approved for this draft. A stored receipt alone is staleable.
  return 1
}
schema_v4_network_ready() {
  if [ ! -e "$UOPS/schema-up.intent" ] && [ ! -L "$UOPS/schema-up.intent" ]; then
    schema_is_locked && [ "$(schema_state)" = 32 ] && [ "$(vhost_state)" = v4 ] && prove_origin prev
  else
    schema_route_ready v4
  fi
}
schema_forward_ready() {
  local key
  [ "$(schema_state)" = 33 ] && [ ! -e "$UOPS/schema-down.intent" ] && [ ! -L "$UOPS/schema-down.intent" ] \
    && key=$(schema_proof_key) && schema_proof_file "$UOPS/schema-up.proven" "$key"
}
schema_route_ready() {
  local expected current key cid baseline down
  schema_is_locked || return 1
  case "$1" in v4) expected=32 ;; v5) expected=33 ;; *) return 1 ;; esac
  current=$(schema_state) && [ "$current" = "$expected" ] || return 1
  if [ "$1" = v5 ]; then
    schema_forward_ready
  else
    schema_maintenance_proof_ok && key=$(schema_proof_key) && cid=$(prev_cid) && baseline=$(cat "$UOPS/route-prev") \
      && down=$(hash_of "$UOPS/schema-down.intent") && [[ $baseline =~ ^[0-9a-f]{64}$ && $down =~ ^[0-9a-f]{64}$ ]] \
      && prev_ready && [ "$(identity_in "$cid")" = "$baseline" ] && cands_down \
      && schema_proof_file "$UOPS/schema-down-and-old-read.proven" "$key $cid $baseline $down"
  fi
}
do_u3() {
  local files
  files=$(timeout 120 docker run --rm --pull=never --log-driver none --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
      -e TSX_DISABLE_CACHE=1 --entrypoint node "$RUNNER_ID" --import tsx --input-type=module -e '
        import * as ns from "./src/payload/migrations/index.ts";
        const items = ns.migrations ?? ns.default?.migrations;
        if (!Array.isArray(items) || items.some(x => typeof x.up !== "function" || typeof x.down !== "function" || !/^[a-z0-9_]+$/.test(x.name))) process.exit(1);
        process.stdout.write(items.map(x => x.name).join("\n") + "\n");
      ' 2>/dev/null) || return 1
  [ "$files" = "$(printf '%s\n' $EXPECTED_MIGRATIONS "$BIZ_NUM_MIGRATION")" ] \
    && [ "$(schema_state)" = 32 ] || { echo 'STOP: exact runner 33 and baseline schema/ledger 32 not proven'; return 1; }
  echo 'MIGRATIONS-BASELINE-32-RUNNER-33 (one named migration pending; no DDL)'
}

# ================================================================ n1-n3: the networks and the two shared attachments
net_create() {   # NAME BRIDGE SUBNET INTERNAL(true|false)
  local id i=; [ "$4" = true ] && i=--internal
  id=$(docker network create --driver bridge $i --subnet "$3" --opt "com.docker.network.bridge.name=$2" --label "co.sophomores.release=$UREL" "$1" 2>/dev/null) \
    || { echo "STOP: docker network create $1 failed"; return 1; }
  [[ $id =~ ^[0-9a-f]{64}$ ]] && printf '%s\n' "$id" | publish_stdin "$UOPS/net-$1-id" || { echo "ESCALATE: $1 created but its ID could not be recorded; report"; return 2; }
  net_ok "$1" "$2" "$3" "$4" || { echo "STOP: $1 is not the expected shape (driver, internal, IPv6 off, bridge, subnet, label)"; return 1; }
}
n1_body() { net_create "$ING" "$ING_BR" "$ING_SUB" true || return $?; members_are "$ING" || { echo "STOP: $ING is not empty"; return 1; }; echo "INGRESS-NET-CREATED ($ING, bridge $ING_BR, $ING_SUB, internal, IPv4 only)"; }
n1_wrap() { unit_core n1_body; }
do_n1() { in_unit n1 n1_wrap; }
nginx_routes() { ns "$(pid_of "$(pin nginx)")" ip -o -4 route show 2>/dev/null | sed 's/  */ /g' | sort; }
n2_body() {   # attach the pinned nginx to ingress; nothing else about nginx changes (no restart, no file)
  local before after added rc=0
  nginx_identity_ok || { echo "STOP: nginx is not the pinned container or its vhost file is not the recorded one; nothing done"; return 1; }
  net_ok "$ING" "$ING_BR" "$ING_SUB" true && members_are "$ING" || { echo "STOP: $ING is not the pinned, empty network"; return 1; }
  shared_probe | publish_stdin "$UOPS/n2-shared-before" && shared_baseline_ok "$UOPS/n2-shared-before" || { echo "STOP: the other vhosts' baseline is not valid; nothing done"; return 1; }
  before=$(nginx_routes); printf '%s\n' "$before" | publish_stdin "$UOPS/n2-routes-before" || { echo "STOP: cannot record nginx's routes"; return 1; }
  date -u +%FT%TZ | publish_stdin "$UOPS/n2-intent" || { echo "STOP: cannot record the n2 intent"; return 1; }
  docker network connect "$ING" "$(pin nginx)" >/dev/null 2>&1 || { echo "STOP: docker network connect nginx failed"; return 1; }
  after=$(nginx_routes); added=$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after"))
  printf '%s\n' "$after" | publish_stdin "$UOPS/n2-routes-after"
  if [ -n "$(comm -23 <(printf '%s\n' "$before") <(printf '%s\n' "$after"))" ] || [ "$(wc -l <<<"$added")" != 1 ] || [[ $added != "$ING_SUB dev "*" proto kernel scope link src "* ]]; then
    echo "nginx's routes changed beyond the one ingress link route; detaching"; rc=1
  fi
  shared_probe | publish_stdin "$UOPS/n2-shared-after"
  [ "$rc" = 0 ] && cmp -s "$UOPS/n2-shared-before" "$UOPS/n2-shared-after" && prove_origin prev && members_are "$ING" "$(pin nginx)" || rc=1
  if [ "$rc" = 0 ]; then echo "NGINX-ON-INGRESS (one link route added, default and other routes unchanged; other vhosts identical; origin = $PREV_APP)"; return 0; fi
  docker network disconnect "$ING" "$(pin nginx)" >/dev/null 2>&1 && ! has_net "$(pin nginx)" "$ING" && prove_origin prev \
    && { echo "STOP: n2 not proven; nginx detached again, origin = $PREV_APP"; return 1; }
  echo "ESCALATE: n2 not proven and nginx could not be proven detached; report"; return 2
}
n2_wrap() { unit_core n2_body; }
do_n2() { in_unit n2 n2_wrap; }
pg_hba_ok() {   # read-only: the first pg_hba rule matching a host connection from DB13_SUB to sophomores_review is not reject
  local rules; rules=$(pg_q "select type||'|'||array_to_string(database,',')||'|'||array_to_string(user_name,',')||'|'||coalesce(address,'')||'|'||coalesce(netmask,'')||'|'||auth_method from pg_hba_file_rules where error is null order by line_number") || return 1
  printf '%s\n' "$rules" | python3 -I -c '
import ipaddress, sys
probe = next(ipaddress.ip_network(sys.argv[1]).hosts())
for l in sys.stdin.read().splitlines():
    if not l: continue
    t, db, us, addr, mask, auth = l.split("|")
    if t not in ("host", "hostnossl"): continue
    if not ({"all", "sophomores_review"} & set(db.split(","))): continue
    if not ({"all", "sophomores_review"} & set(us.split(","))): continue
    if addr in ("all", "samenet"): hit = True
    elif addr == "samehost" or not addr: hit = False
    else:
        try:
            net = addr + ("/" + str(ipaddress.ip_network("0.0.0.0/" + mask).prefixlen) if mask else "")
            hit = probe in ipaddress.ip_network(net, strict=False)
        except ValueError: hit = False
    if hit: sys.exit(0 if auth != "reject" else 1)
sys.exit(1)' "$DB13_SUB"
}
n3_body() {   # create db13 + egress13; attach the pinned review-pg to db13 (no restart); the live app's DB read unchanged
  local before after
  pg_identity_ok || { echo "STOP: review-pg is not the pinned container; nothing done"; return 1; }
  prev_ready || { echo "STOP: $PREV_APP is not as recorded and answering; nothing done"; return 1; }
  pg_hba_ok || { echo "STOP: review-pg's pg_hba would not admit $DB13_SUB (read-only check); nothing done"; return 1; }
  before=$(prev_db_count); [[ $before =~ ^[0-9]+$ ]] || { echo "STOP: cannot read $PREV_APP's DB count before; nothing done"; return 1; }
  net_create "$DB13" "$DB13_BR" "$DB13_SUB" true || return $?
  net_create "$EGR13" "$EGR13_BR" "$EGR13_SUB" false || return $?
  members_are "$DB13" && members_are "$EGR13" || { echo "STOP: the new networks are not empty"; return 1; }
  date -u +%FT%TZ | publish_stdin "$UOPS/n3-intent" || { echo "STOP: cannot record the n3 intent"; return 1; }
  docker network connect "$DB13" "$(pin pg)" >/dev/null 2>&1 || { echo "STOP: docker network connect review-pg failed (networks left empty; net_rollback on a go)"; return 1; }
  after=$(prev_db_count)
  if [ "$(nets_of "$(pin pg)")" = "$(printf '%s\n' "$DBNET" "$DB13" | sort)" ] && members_are "$DB13" "$(pin pg)" && [ "$after" = "$before" ] && prev_ready && prove_origin prev; then
    echo "DB13-EGRESS13-READY ($DB13 internal + $EGR13 created; review-pg on $DBNET and $DB13; $PREV_APP's DB read unchanged ($after rows); origin = $PREV_APP)"; return 0
  fi
  docker network disconnect "$DB13" "$(pin pg)" >/dev/null 2>&1 && ! has_net "$(pin pg)" "$DB13" && { echo "STOP: n3 not proven; review-pg detached again (networks kept; net_rollback on a go)"; return 1; }
  echo "ESCALATE: n3 not proven and review-pg could not be proven detached; report"; return 2
}
n3_wrap() { unit_core n3_body; }
do_n3() { in_unit n3 n3_wrap; }

# ================================================================ u4a / u4b: C0, then C1
find_cand() {   # c0|c1: by recorded ID, else by name + label + image after its launch intent
  local c name; [ "$1" = c0 ] && name=$C0 || name=$C1
  c=$(recorded "$1-id") && { printf '%s' "$c"; return 0; }
  [ -s "$UOPS/$1-intent" ] || return 1
  c=$(docker ps -aq --no-trunc --filter "name=^/$name\$" --filter "label=co.sophomores.release=$UREL" 2>/dev/null)
  [[ $c =~ ^[0-9a-f]{64}$ ]] && [ "$(img_of "$c")" = "$APP_ID" ] && printf '%s' "$c"
}
create_cand() {   # c0|c1: create on ingress, attach db13 + egress13 while still created, validate BEFORE start
  local which=$1 name cid extra=(); [ "$which" = c0 ] && name=$C0 || { name=$C1; extra=(-e "$TRUST_LINE"); }
  cand_env_files || { echo 'STOP: owner-managed STAFF_EXTRA_EMAILS file invalid or missing (name only)'; return 1; }
  printf 'name=%s image=%s label=co.sophomores.release=%s utc=%s\n' "$name" "$APP_ID" "$UREL" "$(date -u +%FT%TZ)" | publish_stdin "$UOPS/$which-intent" \
    || { echo "STOP: could not record the $which launch intent; nothing created"; return 1; }
  cid=$(docker create --name "$name" --label "co.sophomores.release=$UREL" --restart no --pull=never --log-driver none \
    --network "$ING" --memory "$APP_MEM_LIMIT" --memory-swap "$APP_MEM_LIMIT" --oom-score-adj 1000 --cpus 1 --pids-limit 160 \
    --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m --tmpfs /app/.next/cache:rw,nosuid,nodev,size=256m,uid=1000,gid=1000 \
    --cap-drop ALL --security-opt no-new-privileges \
    --env-file "$V10/secrets/core.env" --env-file "$V10/secrets/mail.env" --env-file "$V10/secrets/launch.env" --env-file "$V10/secrets/pin.env" \
    --env-file "$UOPS/private/staff.env" "${extra[@]}" \
    --mount "type=volume,src=$MEDIA,dst=/app/media" \
    --mount "type=volume,src=$HEALTH_VOL,dst=$RECV_HEALTH_DIR,readonly" \
    --mount "type=bind,src=$PREVIEW_AUTH_SRC,dst=/run/secrets/preview-auth.json,readonly" \
    "$APP_ID" 2>/dev/null) || { echo "STOP: docker create failed for $name (update_abandon checks for a leftover)"; return 1; }
  [[ $cid =~ ^[0-9a-f]{64}$ ]] && [ "$(cid_of "$name")" = "$cid" ] || { echo "ESCALATE: cannot prove $name is the container this step created; report"; return 2; }
  printf '%s\n' "$cid" | publish_stdin "$UOPS/$which-id" || { echo "ESCALATE: could not record $which-id; report"; return 2; }
  docker network connect "$DB13" "$cid" >/dev/null 2>&1 && docker network connect "$EGR13" "$cid" >/dev/null 2>&1 || { echo "STOP: could not attach $name to $DB13/$EGR13 before start; update_abandon"; return 1; }
  created_ok "$cid" "$name" "$which" || { echo "STOP: $name's created config failed validation; not started; update_abandon"; return 1; }
}
u4a_body() {
  local cid status_rc
  schema_route_ready v5 && schema_maintenance_proof_ok || { echo 'STOP: schema 33 and maintenance proof required before C0'; return 1; }
  { [ -e "$UOPS/abandoned" ] || [ -e "$UOPS/launch-unknown" ]; } && { echo "STOP: abandoned or unknown launch; nothing created"; return 1; }
  nets_ok && members_are "$ING" "$(pin nginx)" && members_are "$DB13" "$(pin pg)" && members_are "$EGR13" || { echo "STOP: the networks or their members are not as pinned before C0; nothing created"; return 1; }
  create_cand c0 || return $?; cid=$(recorded c0-id)
  docker start "$cid" >/dev/null 2>&1 || { echo "STOP: docker start $C0 failed; update_abandon"; return 1; }
  wait_login "$cid" || { echo "STOP: $C0 did not serve /login within 90 s; update_abandon"; return 1; }
  build_id_matches "$cid" || { echo "STOP: $C0's /login does not carry its own build ID; update_abandon"; return 1; }
  isolated_ok "$cid" "$C0" c0 || { echo "STOP: C0 boundary not proven; update_abandon"; return 1; }
  docker restart -t 20 "$cid" >/dev/null 2>&1 && wait_login "$cid" || { echo "STOP: $C0 did not come back after a container restart; update_abandon"; return 1; }
  isolated_ok "$cid" "$C0" c0-restart || { echo "STOP: C0 boundary not proven after a container restart; update_abandon"; return 1; }
  status_cases c0 "$cid" c0-live c0; status_rc=$?
  timeout 60 docker stop -t 20 "$cid" >/dev/null 2>&1; [ "$(state_of "$cid")" = exited ] && members_are "$ING" "$(pin nginx)" \
    || { echo "STOP: $C0 is not proven stopped with its ingress endpoint released; report"; return 1; }
  [ "$status_rc" = 0 ] && status_c0_stop_receipt "$cid" \
    || { echo 'STOP: C0 stopped, but live origin refusal evidence is not proven'; return 1; }
  echo "C0-ISOLATED ($C0: created and validated before start; boundary proven, again after a container restart; stopped, endpoint released)"
}
u4a_wrap() { status_unit_core u4a_body; }
do_u4a() { in_unit u4a u4a_wrap; }
status_input_ready() { [ -p /dev/fd/7 ] || { echo 'STOP: a private preview-status pipe must be open on FD 7'; return 1; }; }
pre_u4a() { status_input_ready && mem_floor; }
u4b_body() {
  local cid c0 o a np d
  schema_route_ready v5 && schema_maintenance_proof_ok || { echo 'STOP: schema 33 and maintenance proof required before C1'; return 1; }
  { [ -e "$UOPS/abandoned" ] || [ -e "$UOPS/launch-unknown" ]; } && { echo "STOP: abandoned or unknown launch; nothing created"; return 1; }
  c0=$(recorded c0-id) && [ "$(state_of "$c0")" = exited ] || { echo "STOP: $C0 is not recorded and stopped"; return 1; }
  status_receipt_ok c0-stopped c0 "$c0" || { echo 'STOP: current stopped C0 receipt does not hold under the locks'; return 1; }
  nets_ok && members_are "$ING" "$(pin nginx)" && members_are "$DB13" "$(pin pg)" && members_are "$EGR13" || { echo "STOP: the networks or their members are not as pinned (a stale C0 endpoint?); nothing created"; return 1; }
  np=$(pid_of "$(pin nginx)") && d=$(dns_a "$np" "$C1") && [ -z "$d" ] || { echo "STOP: $C1 already resolves from nginx (a stale name or alias), or the DNS check failed; nothing created"; return 1; }
  name_free "$C1" || { echo "STOP: $C1 exists; nothing created"; return 1; }
  create_cand c1 || return $?; cid=$(recorded c1-id)
  docker start "$cid" >/dev/null 2>&1 || { echo "STOP: docker start $C1 failed; update_abandon"; return 1; }
  wait_login "$cid" || { echo "STOP: $C1 did not serve /login within 90 s; update_abandon"; return 1; }
  build_id_matches "$cid" || { echo 'STOP: C1 build ID at /login not proven; update_abandon'; return 1; }
  isolated_ok "$cid" "$C1" c1 || { echo "STOP: C1 boundary not proven; update_abandon"; return 1; }
  if ! status_cases c1 "$cid" c1-offroute c1 wrong-host wrong-xfh; then
    timeout 60 docker stop -t 20 "$cid" >/dev/null 2>&1
    cand_fenced c1 "$cid" || { echo 'ESCALATE: unproven C1 could not be fenced; keep v4 and report'; return 2; }
    echo 'STOP: C1 status not proven; C1 fenced, v4 unchanged'; return 1
  fi
  o=$(cat "$UOPS/route-prev"); a=$(identity_in "$cid") || { echo "STOP: cannot read $C1's build identity"; return 1; }
  [ "$o" != "$a" ] || { echo "STOP: $PREV_APP and $C1 name the same /login assets; rollback could not be told apart"; return 1; }
  printf '%s\n' "$a" | publish_stdin "$UOPS/route-new" || { echo "STOP: could not record the new route identity"; return 1; }
  [ "$(vhost_state)" = v4 ] || { echo 'STOP: v4 bytes changed while preview is fenced'; return 1; }
  echo "C1-ISOLATED ($C1 = C0 + TRUSTED_PROXY_LISTENER_ORIGIN, validated before start; boundary, nginx reach, db13 DNS and DB read proven; identity ${a:0:12} != ${o:0:12}; restart policy no until u5)"
}
u4b_checked_body() {
  local rc cid
  u4b_body; rc=$?
  [ "$rc" != 0 ] || return 0
  if [ -s "$UOPS/c1-intent" ]; then
    cid=$(recorded c1-id) && cand_identity_ok c1 "$cid" \
      || { echo 'ESCALATE: C1 launch recorded without a proven container identity; report'; return 2; }
    if ! cand_fenced c1 "$cid"; then
      timeout 60 docker stop -t 20 "$cid" >/dev/null 2>&1
      cand_fenced c1 "$cid" || { echo 'ESCALATE: failed C1 could not be fenced; report'; return 2; }
    fi
  fi
  return "$rc"
}
u4b_wrap() { status_unit_core u4b_checked_body; }
do_u4b() { in_unit u4b u4b_wrap; }
pre_u4b() {
  local c0
  status_input_ready && mem_floor && c0=$(recorded c0-id) && status_receipt_ok c0-stopped c0 "$c0" \
    || { echo 'STOP: current stopped C0 status receipt is not proven'; return 1; }
}
pre_u5() { status_input_ready; }

# ================================================================ u5: cutover v4 -> v5 under both locks
u5_core() {
  local c1 status_cookie
  status_read_input || { echo 'STOP: private preview status input not accepted'; exit 1; }
  locks_take || exit 1
  c1=$(recorded c1-id) || { echo "STOP: no C1 recorded"; exit 1; }
  nginx_identity_ok && shared_attached_ok >/dev/null || { echo "STOP: nginx/pg are not the pinned, attached containers; nothing written"; exit 1; }
  vhost_inode_ok && [ "$(vhost_state)" = v4 ] && [ "$(window_bytes)" = "$PREV8" ] || { echo "STOP: the live vhost is not v4 on its inode; nothing written"; exit 1; }
  schema_route_ready v5 && schema_maintenance_proof_ok && c1_ready || { echo 'STOP: compatible off-route C1 or maintenance not proven; nothing written'; exit 1; }
  isolated_ok "$c1" "$C1" u5 || { echo "STOP: C1's boundary did not hold under the cutover locks; nothing written"; exit 1; }
  status_receipt_ok c1-offroute c1 "$c1" && status_cases c1 "$c1" c1-prewrite c1 wrong-host wrong-xfh \
    || { echo 'STOP: off-route C1 status not proven under the cutover locks; nothing written'; exit 1; }
  nginx_test || { echo "STOP: nginx -t fails before any write; nothing written"; exit 1; }
  shared_probe | publish_stdin "$UOPS/shared-before" && shared_baseline_ok "$UOPS/shared-before" || { echo "STOP: the other vhosts' baseline is not valid; nothing written"; exit 1; }
  [ $((SECONDS - LOCK_T0)) -le "$U5_PREWRITE_MAX" ] || { echo "STOP: the checks under the locks took $((SECONDS - LOCK_T0)) s (> $U5_PREWRITE_MAX s); nothing written"; exit 1; }
  status_receipt_ok c1-prewrite c1 "$c1" || { echo 'STOP: C1 prewrite identities changed; nothing written'; exit 1; }
  status_probe check-cutover '' '' '' || { echo 'STOP: insufficient preview proof lifetime for cutover; nothing written'; exit 1; }
  mail_tcp_ok "$c1" && status_receipt_ok c1-prewrite c1 "$c1" \
    || { echo 'STOP: C1 SMTP TCP not proven on egress13; nothing written'; exit 1; }
  [ $((SECONDS - LOCK_T0)) -le "$U5_PREWRITE_MAX" ] && status_probe check-cutover '' '' '' \
    || { echo 'STOP: prewrite timing expired during SMTP check; nothing written'; exit 1; }
  printf 'off=%s old=%s new=%s pre=%s dev-inode=%s nginx=%s utc=%s\n' "$OFF" "$PREV8" "$NEW8" "$V4_SHA" "$(stat -c '%d:%i' "$VHOST")" "$(pin nginx)" "$(date -u +%FT%TZ)" \
    | publish_stdin "$UOPS/vhost-intent" || { echo "STOP: could not record the cutover intent; nothing written"; exit 1; }
  if write_window "$NEW8" "$V5_SHA" && reload_checked && prove_origin new \
     && status_receipt_ok c1-prewrite c1 "$c1" && status_cases c1 "$c1" c1-postwrite via-nginx \
     && status_receipt_ok c1-prewrite c1 "$c1"; then
    shared_probe | publish_stdin "$UOPS/shared-after"
    if cmp -s "$UOPS/shared-before" "$UOPS/shared-after"; then
      docker update --restart unless-stopped "$c1" >/dev/null 2>&1 || echo "WARNING: restart policy not set on $C1 (set it on a separate go)"
      locks_release; echo 'CUTOVER-PROVEN (v5 on the same inode; C1 status and other vhosts proven; old schema app must remain fenced)'; exit 0
    fi
    echo "The other vhosts answer differently after the reload"
  else
    echo "Cutover not proven"
  fi
  echo 'ESCALATE: keep preview in maintenance; no automatic route rollback on schema 33'; exit 2
}
back_to_v4() {
  local baseline state
  schema_route_ready v4 || { echo 'ESCALATE: schema/down/old-app read not proven; keep maintenance; no write or reload'; return 2; }
  state=$(vhost_state)
  case "$state" in
    v4|v5|torn) ;;
    v3) echo "ESCALATE: the live vhost is v12's v3 (d7409895), not ours; nothing written, nginx NOT reloaded. Report"; return 2 ;;
    *) echo "ESCALATE: the live vhost is not v4/v5 or a torn mix of them (foreign); nothing written, nginx NOT reloaded. Report"; return 2 ;;
  esac
  baseline=$(cat "$UOPS/route-prev" 2>/dev/null) && [[ $baseline =~ ^[0-9a-f]{64}$ ]] \
    && prev_ready && [ "$(identity_in "$(prev_cid)")" = "$baseline" ] \
    || { echo 'ESCALATE: pinned v4 baseline is not ready; no write or reload'; return 2; }
  [ "$(vhost_state)" = "$state" ] || { echo 'ESCALATE: vhost changed during baseline proof; no write or reload'; return 2; }
  schema_route_ready v4 || { echo 'ESCALATE: schema proof changed during baseline check; no write or reload'; return 2; }
  case "$state" in
    v4) ;;
    v5|torn) write_window "$PREV8" "$V4_SHA" || { echo "ESCALATE: v4 bytes could not be written back on the inode; nginx NOT reloaded. Report"; return 2; } ;;
  esac
  reload_checked || { echo "ESCALATE: v4 is on disk but the nginx identity recheck, nginx -t or reload failed. Report"; return 2; }
  prove_origin prev || { echo "ESCALATE: v4 is live but the origin does not serve $PREV_APP's build. Report"; return 2; }
}
# After the route is on v4 (rollback, or a repair that restored or found v4): release the locks, then dispose of the
# opted-in C1 (never changes the route). rc 0 only if C1 is fenced, or never launched, or running and re-proven isolated;
# otherwise ROUTE-RESTORED-BOUNDARY-NOT-PROVEN, rc 3, a distinct hold with the named fence path. LABEL = the rc-0 token.
v4_disposition() {   # LABEL TAG
  local c1
  locks_release
  if [ ! -s "$UOPS/c1-intent" ]; then echo "$1 (no C1 was ever launched)"; exit 0; fi
  c1=$(find_cand c1)
  if [ -n "$c1" ] && cand_fenced c1 "$c1"; then echo "$1 ($C1 fenced: stopped, restart no)"; exit 0; fi
  if [ -n "$c1" ] && cand_identity_ok c1 "$c1" && c1_ready && isolated_ok "$c1" "$C1" "$2" >/dev/null; then echo "$1 ($C1 running off-route; BOUNDARY-AFTER-ROUTE-RESTORE-OK)"; exit 0; fi
  echo "ROUTE-RESTORED-BOUNDARY-NOT-PROVEN (HOLD: the route is on v4, but $C1 is neither fenced nor proven isolated; next: fence_candidate on a go; report)"; exit 3
}
rollback_core() {
  locks_take || exit 1
  [ -e "$UOPS/vhost-intent" ] || { echo "STOP: no cutover was attempted; nothing to roll back (use update_abandon)"; exit 1; }
  nginx_identity_ok || { echo "ESCALATE: nginx is not the pinned container or its vhost file/inode is not the recorded one; nothing written. Report"; exit 2; }
  if [ "$(vhost_state)" = v5 ] && ! prev_ready; then echo "ESCALATE: v5 is live and $PREV_APP is not answering; route NOT changed. Report"; exit 2; fi
  back_to_v4 || exit 2
  echo "ROUTE-RESTORED (v4 on the inode; origin serves $PREV_APP's build and its CSS)"
  v4_disposition ROLLED-BACK after-rollback
}
repair_core() {
  locks_take || exit 1
  [ -e "$UOPS/vhost-intent" ] || { echo "STOP: no cutover was attempted; nothing to repair"; exit 1; }
  nginx_identity_ok || { echo "ESCALATE: nginx is not the pinned container or its vhost file/inode is not the recorded one; nothing written. Report"; exit 2; }
  case "$(vhost_state)" in
    v4) back_to_v4 || exit 2
        echo "ROUTE-RESTORED (v4 was on disk; tested, reloaded, origin = $PREV_APP; u5 is NOT rerun)"
        v4_disposition REPAIRED after-repair ;;
    v5) # Valid bytes are not enough to activate v5 (Review-B HIGH): re-prove C1 under these locks, or restore and prove v4.
        # Repair has no fresh preview status input, so it cannot re-prove the live route.
        echo "v5 member status not re-provable in repair; restoring v4" ;;
    torn) ;;
    v3) echo "ESCALATE: the live vhost is v12's v3, not ours; nothing written. Report"; exit 2 ;;
    *) echo "ESCALATE: the live vhost is foreign (not v4/v5 or a torn mix of them); nothing written. Report"; exit 2 ;;
  esac
  back_to_v4 || exit 2
  echo "ROUTE-RESTORED (v4 written, tested, reloaded; origin = $PREV_APP; u5 is NOT rerun)"
  v4_disposition REPAIRED-TO-V4 after-repair
}
do_u5() { UNIT_MAX_SEC=1800 in_unit u5 u5_core; }

# ================================================================ u6 / u7
do_u6() {
  schema_forward_ready && c1_ready || { echo 'STOP: C1 or schema 33 not proven'; return 1; }
  vhost_inode_ok && [ "$(vhost_state)" = v5 ] || { echo "STOP: the live vhost is not v5 on the recorded inode"; return 1; }
  prove_origin new || { echo "STOP: the origin does not serve $C1's build"; return 1; }
  isolated_ok "$(recorded c1-id)" "$C1" u6 || { echo "STOP: C1's boundary did not hold after the cutover"; return 1; }
  echo "READY-FOR-OWNER-CHECK (origin = $C1's build; boundary and db13 gate re-proven; rollback requires paired schema recovery)"
}
mail_acceptance_run() {   # Non-secret correlation digest for one completed cutover and its pinned instances.
  local cid identity intent after tcp
  verified "$SELF" && schema_forward_ready \
    && [ "$(vhost_state)" = v5 ] && [ -s "$UOPS/tokens/u5" ] || return 1
  cid=$(recorded c1-id) && identity=$(status_identity c1 "$cid") || return 1
  intent=$(hash_of "$UOPS/vhost-intent") && after=$(hash_of "$UOPS/status-c1-postwrite") \
    && tcp=$(hash_of "$UOPS/status-c1-mail-tcp") || return 1
  status_receipt_ok c1-postwrite c1 "$cid" && status_receipt_ok c1-mail-tcp c1 "$cid" \
    && [ "$identity" = "$(status_identity c1 "$cid")" ] || return 1
  printf '%s\n' "$identity" "$intent" "$after" "$tcp" | sha256sum | cut -d' ' -f1
}
pre_u7() {
  local current
  [[ ${ACCEPT_MSG:-} =~ ^msg_[0-9a-f]{12}$ && ${MAIL_PASS_MSG:-} =~ ^msg_[0-9a-f]{12}$ \
    && ${MAIL_RUN_SHA:-} =~ ^[0-9a-f]{64}$ ]] && current=$(mail_acceptance_run) && [ "$current" = "$MAIL_RUN_SHA" ] \
    || { echo 'STOP: require coordinator acceptance and owner receipt for the current mail run'; return 1; }
}
do_u7() (
  REVIEW_LOCKS_HELD=0
  locks_take || return 1
  local accepted_at
  c1_ready && vhost_inode_ok && [ "$(vhost_state)" = v5 ] && prove_origin new || { echo "STOP: the new route is not as at u6"; return 1; }
  accepted_at=$(date -u +%FT%TZ) || return 1
  # Origin proof can take time; recheck the run and live receipt under both locks before publishing.
  pre_u7 || return 1
  printf '%s mail=%s mail_run=%s %s\n' "$ACCEPT_MSG" "$MAIL_PASS_MSG" "$MAIL_RUN_SHA" "$accepted_at" | publish_stdin "$UOPS/accepted" || { echo "STOP: could not record the acceptance"; return 1; }
  echo "ACCEPTED ($ACCEPT_MSG; stopping $PREV_APP waits for Cordy's rollback-window call)"
)

# ================================================================ operator entry points (each on its own go)
update_rollback() { load_vars || return 1; in_unit rollback rollback_core; }
update_repair()   { load_vars || return 1; in_unit repair repair_core; }
abandon_core() {   # before any cutover: stop C1 and C0 (by ID, or by intent), never remove
  local w c name
  locks_take || exit 1
  [ -e "$UOPS/vhost-intent" ] && { echo "STOP: a cutover was attempted; use update_rollback or update_repair"; exit 1; }
  vhost_inode_ok && [ "$(vhost_state)" = v4 ] || { echo "ESCALATE: the live vhost is not v4 on its inode; report"; exit 2; }
  for w in u4a u4b; do systemctl is-active --quiet "$UREL-$w.service" && { echo "STOP: the $w unit is still active; wait for it"; exit 1; }; done
  for w in c1 c0; do
    [ "$w" = c0 ] && name=$C0 || name=$C1
    c=$(find_cand "$w")
    if [ -z "$c" ] && [ -s "$UOPS/$w-intent" ]; then
      name_free "$name" || { echo "ESCALATE: a $name container exists that is not this update's (label/image); not touched. Report"; exit 2; }
      date -u +%FT%TZ | publish_stdin "$UOPS/launch-unknown" 2>/dev/null || [ -e "$UOPS/launch-unknown" ] || { echo "ESCALATE: could not record launch-unknown. Report"; exit 2; }
      echo "LAUNCH-UNKNOWN ($w intent recorded; no container found; a late create cannot be ruled out). Follow RUNBOOK 'Unknown launch'"; exit 2
    fi
    if [ -n "$c" ]; then   # as fence: identity first, then restart=no confirmed, then stopped
      cand_identity_ok "$w" "$c" || { echo "STOP: the container found for $w is not this update's (name/image/label); not touched"; exit 1; }
      docker update --restart no "$c" >/dev/null 2>&1
      [ "$(docker inspect "$c" --format '{{.HostConfig.RestartPolicy.Name}}')" = no ] || { echo "ESCALATE: restart=no is not confirmed on $name; report"; exit 2; }
      timeout 60 docker stop -t 20 "$c" >/dev/null 2>&1
      cand_fenced "$w" "$c" || { echo "ESCALATE: $name is not proven stopped with restart=no; report"; exit 2; }
    fi
  done
  date -u +%FT%TZ | publish_stdin "$UOPS/abandoned" || { echo "ESCALATE: stopped, but the abandoned marker could not be recorded. Report"; exit 2; }
  echo "ABANDONED (C1/C0 stopped if they existed; v4 live; networks and attachments kept: nginx_detach / pg_detach / net_rollback, each on a go)"; exit 0
}
update_abandon() { load_vars || return 1; in_unit abandon abandon_core; }
# Re-pin: a recreated nginx or review-pg is a NEW container. Only this, with the operator's explicit full ID, under the
# locks, after validation, adds a pin generation. It never attaches anything (nginx_attach / pg_attach, own go).
repin_core() {   # Review-B MEDIUM: the replacement must match what u0 recorded (mounts, networks), not just its name
  local what=$REPIN_WHAT id=$REPIN_ID g
  locks_take || exit 1
  [[ $id =~ ^[0-9a-f]{64}$ ]] || { echo "STOP: give the full 64-hex container ID"; exit 1; }
  case $what in
    nginx) [ "$(cid_of nginx)" = "$id" ] && running "$id" || { echo "STOP: $id is not the running container named nginx"; exit 1; }
           nginx_file_ok "$id" || { echo "STOP: $id does not bind-mount the recorded vhost file with the recorded destination/mode, or sees different bytes/inode"; exit 1; }
           [ "$(nets_of "$id" | grep -vx "$ING")" = "$(cat "$UOPS/nginx-nets")" ] || { echo "STOP: $id's networks (other than ingress) are not the ones u0 recorded for nginx"; exit 1; } ;;
    pg)    [ "$(cid_of "$PG")" = "$id" ] && running "$id" && [ "$(img_of "$id")" = "$PG_IMAGE_ID" ] || { echo "STOP: $id is not the running $PG on the pinned image"; exit 1; }
           [ "$(mounts_of "$id")" = "$(cat "$UOPS/pg-mounts")" ] || { echo "STOP: $id's mounts (type, source, destination, mode) are not the ones u0 recorded for review-pg"; exit 1; }
           [ "$(nets_of "$id" | grep -vx "$DB13")" = "$DBNET" ] || { echo "STOP: $id's networks (other than db13) are not exactly $DBNET"; exit 1; } ;;
    *) echo "STOP: update_repin nginx|pg <id>"; exit 1 ;;
  esac
  [ "$id" != "$(pin "$what")" ] || { echo "STOP: $id is already the pinned $what"; exit 1; }
  g=$(printf '%04d' $(( $(pin_gen "$what") + 1 )))
  printf '%s\n' "$id" | publish_stdin "$UOPS/pins/$what-id.$g" || { echo "STOP: could not record the new pin"; exit 1; }
  echo "REPINNED $what generation $g (${id:0:12}); not attached: ${what}_attach on its own go"; exit 0
}
update_repin() { case ${1:-} in nginx|pg) ;; *) echo "STOP: update_repin nginx|pg <full id>"; return 1;; esac; load_vars || return 1; REPIN_WHAT=$1 REPIN_ID=${2:-} in_unit "repin-$1" repin_core; }
nginx_attach_core() {   # n2's safeguards again: network shape and members, routes before/after, other vhosts, the route proof
  local before after added sb
  locks_take || exit 1
  case "$(vhost_state)" in v4) schema_v4_network_ready ;; v5) schema_route_ready v5 ;; *) false ;; esac \
    || { echo 'STOP: route/schema recovery proof missing; no nginx attachment'; exit 1; }
  nginx_identity_ok || { echo "STOP: nginx is not the pinned container (update_repin first)"; exit 1; }
  has_net "$(pin nginx)" "$ING" && { echo "STOP: the pinned nginx is already on $ING"; exit 1; }
  net_ok "$ING" "$ING_BR" "$ING_SUB" true || { echo "STOP: $ING is not the pinned network shape"; exit 1; }
  members_are "$ING" $(cand_running_ids) || { echo "STOP: $ING has members other than this update's running candidate"; exit 1; }
  sb=$(shared_probe); before=$(nginx_routes)
  docker network connect "$ING" "$(pin nginx)" >/dev/null 2>&1 && has_net "$(pin nginx)" "$ING" || { echo "STOP: connect failed"; exit 1; }
  after=$(nginx_routes); added=$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after"))
  if [ -z "$(comm -23 <(printf '%s\n' "$before") <(printf '%s\n' "$after"))" ] && [ "$(wc -l <<<"$added")" = 1 ] && [[ $added == "$ING_SUB dev "*" proto kernel scope link src "* ]] \
     && [ "$(shared_probe)" = "$sb" ] \
     && case "$(vhost_state)" in v5) prove_origin new && c1_ready && nginx_reach_ok "$(recorded c1-id)" "$C1" ;; v4) prove_origin prev ;; *) false ;; esac; then
    echo "NGINX-ATTACHED (pinned nginx on $ING: one link route added, other vhosts identical, route proven)"; exit 0
  fi
  docker network disconnect "$ING" "$(pin nginx)" >/dev/null 2>&1 && ! has_net "$(pin nginx)" "$ING" && { echo "STOP: reattach not proven; nginx detached again"; exit 1; }
  echo "ESCALATE: reattach not proven and nginx could not be proven detached; report"; exit 2
}
nginx_attach() { load_vars || return 1; in_unit nginx-attach nginx_attach_core; }
pg_attach_core() {   # n3's safeguards again; on v5 a live, proven C1 is REQUIRED (no success without the db13 gate)
  local before after
  locks_take || exit 1
  case "$(vhost_state)" in v4) schema_v4_network_ready ;; v5) schema_route_ready v5 ;; *) false ;; esac \
    || { echo 'STOP: route/schema recovery proof missing; no pg attachment'; exit 1; }
  pg_identity_ok || { echo "STOP: review-pg is not the pinned container (update_repin first)"; exit 1; }
  has_net "$(pin pg)" "$DB13" && { echo "STOP: the pinned review-pg is already on $DB13"; exit 1; }
  net_ok "$DB13" "$DB13_BR" "$DB13_SUB" true || { echo "STOP: $DB13 is not the pinned network shape"; exit 1; }
  members_are "$DB13" $(cand_running_ids) || { echo "STOP: $DB13 has members other than this update's running candidate"; exit 1; }
  prev_ready && pg_hba_ok || { echo "STOP: $PREV_APP not answering, or pg_hba would not admit $DB13_SUB"; exit 1; }
  before=$(prev_db_count); [[ $before =~ ^[0-9]+$ ]] || { echo "STOP: cannot read $PREV_APP's DB count before"; exit 1; }
  docker network connect "$DB13" "$(pin pg)" >/dev/null 2>&1 && has_net "$(pin pg)" "$DB13" || { echo "STOP: connect failed"; exit 1; }
  after=$(prev_db_count)
  if [ "$after" = "$before" ]; then
    case "$(vhost_state)" in
      v5) c1_ready && db13_gate "$(recorded c1-id)" && { echo "PG-ATTACHED (pinned review-pg on $DB13; $C1's db13 DNS + DB read proven)"; exit 0; } ;;
      v4) if c1_ready; then db13_gate "$(recorded c1-id)" && { echo "PG-ATTACHED (pinned review-pg on $DB13; $C1's db13 gate proven)"; exit 0; }
          else echo "PG-ATTACHED (pinned review-pg on $DB13; route on v4, $C1 not running: db13 gate not applicable)"; exit 0; fi ;;
    esac
  fi
  docker network disconnect "$DB13" "$(pin pg)" >/dev/null 2>&1 && ! has_net "$(pin pg)" "$DB13" && { echo "STOP: reattach not proven; review-pg detached again"; exit 1; }
  echo "ESCALATE: reattach not proven and review-pg could not be proven detached; report"; exit 2
}
pg_attach() { load_vars || return 1; in_unit pg-attach pg_attach_core; }
# Network rollback, in order, each on its own go: the route back on v4 first (update_rollback), then fence, then
# detach nginx and pg, then remove the networks.
fence_core() {   # Review-B HIGH: identity, restart=no and stopped are each verified; an unknown candidate blocks
  local w c
  locks_take || exit 1
  if [ "$(schema_state)" = 33 ]; then
    schema_maintenance_proof_ok || { echo 'STOP: maintenance proof required before fencing on 33'; exit 1; }
  else
    schema_route_ready v4 && [ "$(vhost_state)" = v4 ] && prove_origin prev \
      || { echo 'STOP: compatible v4 route not proven; nothing fenced'; exit 1; }
  fi
  for w in c1 c0; do
    [ -s "$UOPS/$w-intent" ] || continue
    c=$(find_cand "$w") || { echo "STOP: $w's launch intent is recorded but its container cannot be found (UNKNOWN); nothing more fenced; RUNBOOK 'Unknown launch'"; exit 1; }
    cand_identity_ok "$w" "$c" || { echo "STOP: the container found for $w is not this update's (name/image/label); not touched"; exit 1; }
    docker update --restart no "$c" >/dev/null 2>&1
    [ "$(docker inspect "$c" --format '{{.HostConfig.RestartPolicy.Name}}')" = no ] || { echo "ESCALATE: restart=no is not confirmed on $w; report"; exit 2; }
    timeout 60 docker stop -t 20 "$c" >/dev/null 2>&1
    cand_fenced "$w" "$c" || { echo "ESCALATE: $w is not proven stopped with restart=no; report"; exit 2; }
  done
  echo "FENCED (every intended candidate found, ours, restart=no confirmed, stopped; no route change)"; exit 0
}
fence_candidate() { load_vars || return 1; in_unit fence fence_core; }
# Every candidate this update ever intended is found, is ours, is stopped and has restart=no. An intent whose container
# cannot be found is UNKNOWN and blocks (a late create cannot be ruled out).
cands_down() {
  local w c
  for w in c0 c1; do
    [ -s "$UOPS/$w-intent" ] || continue
    c=$(find_cand "$w") || return 1
    cand_fenced "$w" "$c" || return 1
  done
}
nginx_detach_core() {
  local before
  locks_take || exit 1
  schema_v4_network_ready || { echo 'STOP: schema/route proof required before detaching ingress'; exit 1; }
  [ "$(vhost_state)" = v4 ] && cands_down || { echo "STOP: route not on v4, or C1/C0 not fenced (fence_candidate first)"; exit 1; }
  nginx_identity_ok && has_net "$(pin nginx)" "$ING" || { echo "STOP: the pinned nginx is not on $ING"; exit 1; }
  before=$(shared_probe)
  docker network disconnect "$ING" "$(pin nginx)" >/dev/null 2>&1 && ! has_net "$(pin nginx)" "$ING" || { echo "ESCALATE: disconnect not proven; report"; exit 2; }
  [ "$(shared_probe)" = "$before" ] && prove_origin prev && { echo "NGINX-DETACHED (route on v4 proven; other vhosts identical)"; exit 0; }
  echo "ESCALATE: nginx detached but the route or other vhosts are not as before; report"; exit 2
}
nginx_detach() { load_vars || return 1; in_unit nginx-detach nginx_detach_core; }
pg_detach_core() {
  local b a
  locks_take || exit 1
  schema_v4_network_ready || { echo 'STOP: schema/route proof required before detaching db13'; exit 1; }
  cands_down || { echo "STOP: C1/C0 not fenced (fence_candidate first)"; exit 1; }
  pg_identity_ok && has_net "$(pin pg)" "$DB13" || { echo "STOP: the pinned review-pg is not on $DB13"; exit 1; }
  b=$(prev_db_count)
  docker network disconnect "$DB13" "$(pin pg)" >/dev/null 2>&1 && ! has_net "$(pin pg)" "$DB13" || { echo "ESCALATE: disconnect not proven; report"; exit 2; }
  a=$(prev_db_count); [[ $a =~ ^[0-9]+$ ]] && [ "$a" = "$b" ] && { echo "PG-DETACHED ($PREV_APP's DB read unchanged)"; exit 0; }
  echo "ESCALATE: review-pg detached but $PREV_APP's DB read changed or failed; report"; exit 2
}
pg_detach() { load_vars || return 1; in_unit pg-detach pg_detach_core; }
net_rollback_core() {
  local w c n
  locks_take || exit 1
  schema_v4_network_ready || { echo 'STOP: schema/route proof required before removing bridges'; exit 1; }
  cands_down || { echo "STOP: C1/C0 not fenced"; exit 1; }
  ! has_net "$(pin nginx)" "$ING" && ! has_net "$(pin pg)" "$DB13" || { echo "STOP: nginx or review-pg is still attached (nginx_detach / pg_detach first)"; exit 1; }
  for w in c0 c1; do c=$(find_cand "$w") || continue; for n in "$ING" "$DB13" "$EGR13"; do has_net "$c" "$n" && docker network disconnect "$n" "$c" >/dev/null 2>&1; done; done
  for n in "$EGR13" "$DB13" "$ING"; do
    net_free "$n" && continue
    [ "$(net_shape "$n" | cut -d'|' -f1)" = "$(recorded "net-$n-id")" ] || { echo "ESCALATE: $n is not the network this update created; not removed. Report"; exit 2; }
    members_are "$n" || { echo "STOP: $n still has members"; exit 1; }
    docker network rm "$n" >/dev/null 2>&1 && net_free "$n" || { echo "ESCALATE: $n not proven removed; report"; exit 2; }
  done
  echo "NETWORKS-REMOVED ($ING, $DB13, $EGR13; containers kept, stopped)"; exit 0
}
net_rollback() { load_vars || return 1; in_unit net-rollback net_rollback_core; }
reconcile_core() {
  local st=$RECONCILE_STEP ok=0 tok c
  locks_take || exit 1
  [ -e "$UOPS/tokens/$st.started" ] && [ ! -e "$UOPS/tokens/$st" ] && [ ! -e "$UOPS/tokens/$st.failed" ] || { echo "STOP: nothing to reconcile for $st"; exit 1; }
  tok=$(grep -v '^LOCKS-HELD ' "$UOPS/$st.out" 2>/dev/null | tail -n 1 | cut -d' ' -f1)
  case $st in
    n1)  [ "$tok" = INGRESS-NET-CREATED ] && net_ok "$ING" "$ING_BR" "$ING_SUB" true && ok=1 ;;
    n2)  [ "$tok" = NGINX-ON-INGRESS ] && nginx_identity_ok && has_net "$(pin nginx)" "$ING" && prove_origin prev && ok=1 ;;
    n3)  [ "$tok" = DB13-EGRESS13-READY ] && net_ok "$DB13" "$DB13_BR" "$DB13_SUB" true && net_ok "$EGR13" "$EGR13_BR" "$EGR13_SUB" false && pg_identity_ok && has_net "$(pin pg)" "$DB13" && ok=1 ;;
    u4a) schema_route_ready v5 && schema_maintenance_proof_ok && [ "$tok" = C0-ISOLATED ] && c=$(recorded c0-id) && cand_fenced c0 "$c" && status_receipt_ok c0-stopped c0 "$c" && ok=1 ;;
    u4b) schema_route_ready v5 && schema_maintenance_proof_ok && [ "$tok" = C1-ISOLATED ] && c=$(recorded c1-id) && c1_ready && status_receipt_ok c1-offroute c1 "$c" && [ -s "$UOPS/route-new" ] && [ "$(vhost_state)" = v4 ] && ok=1 ;;
    u5)  schema_route_ready v5 && schema_maintenance_proof_ok && [ "$tok" = CUTOVER-PROVEN ] && c=$(recorded c1-id) && status_receipt_ok c1-prewrite c1 "$c" && status_receipt_ok c1-postwrite c1 "$c" && status_receipt_ok c1-mail-tcp c1 "$c" && nginx_identity_ok && [ "$(vhost_state)" = v5 ] && prove_origin new && ok=1 ;;
  esac
  if [ "$ok" = 1 ]; then
    echo "$st reconciled $(date -u +%FT%TZ)" | publish_stdin "$UOPS/tokens/$st" && { echo "RECONCILED-OK $st (its unit ended proven; the facts agree)"; exit 0; }
    echo "STOP: could not record tokens/$st"; exit 1
  fi
  echo "$st reconciled-failed $(date -u +%FT%TZ)" | publish_stdin "$UOPS/tokens/$st.failed"
  echo "RECONCILED-FAILED $st (not proven; vhost=$(vhost_state)); next: update_status, then the RUNBOOK's recovery for $st, on a go"; exit 1
}
update_reconcile() {
  case ${1:-} in n1|n2|n3|u4a|u4b|u5) ;; *) echo "STOP: update_reconcile n1|n2|n3|u4a|u4b|u5"; return 1;; esac
  load_vars || return 1
  systemctl is-active --quiet "$UREL-$1.service" && { echo "STOP: the $1 unit is still running; wait for it"; return 1; }
  RECONCILE_STEP=$1 in_unit "reconcile-$1" reconcile_core
}
update_status() {
  local t
  load_vars || return 1
  for t in $STEP_ORDER; do [ -s "$UOPS/tokens/$t" ] && printf '%s ' "$t"; done; echo
  echo "vhost=$(vhost_state) prev=$(prev_ready && echo ok || echo NOT) c1=$(c1_ready && echo ok || echo -) intent=$([ -e "$UOPS/vhost-intent" ] && echo yes || echo no) locks=$(locks_free && echo free || echo HELD)"
  echo "nginx=$(nginx_identity_ok && echo "pinned-g$(pin_gen nginx)" || echo NOT-PINNED-OR-CHANGED) on-ingress=$(has_net "$(pin nginx)" "$ING" && echo yes || echo no) pg=$(pg_identity_ok && echo "pinned-g$(pin_gen pg)" || echo NOT-PINNED-OR-CHANGED) on-db13=$(has_net "$(pin pg)" "$DB13" && echo yes || echo no)"
}
