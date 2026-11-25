#!/usr/bin/env bash
# kj-guard: the key job's host guard on the preview VPS (installed as /usr/local/sbin/kj-guard, root 0700).
# VPS plans v3 (H1 lifecycle), v4 (per-invocation records, env allowlists), v5 (K4 modes), v6 (the fence), and
# Review-B's v6 carry-ins (msg_adef3153ac01). Every key-job container is started, reaped and fenced through here.
#
#   kj-guard run <unit>         ExecStart: admission under the lock, docker create, record, re-check, docker start -a
#   kj-guard reap <unit>        ExecStopPost: remove this invocation's container and prove it absent, or fence
#   kj-guard prove-dead <unit>  exit 0 only if a successful query lists no container of that unit
#   kj-guard fence <reason>     a new fence generation: marker, then table, then verify (never takes the lock)
#   kj-guard sweep              install and verify a table for every marker without one (never deletes)
#   kj-guard restore            boot, before Docker: reinstall every generation's table (presence and hash)
#   kj-guard probe-all          after Docker: packet-verify every generation's table
#   kj-guard unfence <N>        an operator's release of generation N, on the coordinator's go (never automatic)
#   kj-guard receipt <address>  the read-only queue receipt (scripts/key-grant-queue-read.ts), DB network only
#
# Units: tick and first-run are chain-capable (signer + RPC + egress); failed and mail are not (the mailer must keep
# delivering a fence alert). Output is fixed codes only: no env value, address or credential is ever printed.
# KJ_ROOT and KJ_RUN exist for the repo's tests (tests/deployment/kj-guard.test.ts); the units never set them.
set -euo pipefail
umask 077

KJ="${KJ_ROOT:-/var/lib/sophomores-key-grant}"
RUN="${KJ_RUN:-/run/key-grant}"
FENCE_DIR="$KJ/fence"
LOCK="$RUN/guard.lock"
CONF="$KJ/config/guard.conf"
LABEL=co.sophomores.key-job
RUNLABEL=co.sophomores.key-job-run
DOCKER_TIMEOUT=20   # every Docker call made under the lock is bounded (timeout -k 5 20)
FENCE_REASONS=" fence_unknown_quiescence fence_query_failed fence_stop_hung fence_live_permit_left fence_install_failed fence_verify_failed "

say() { printf '{"guard":"%s","event":"%s"%s}\n' "${CMD:-}" "$1" "${2:+,$2}"; }
die() { say "$1" "${2:-}"; exit "${3:-1}"; }
crit() { logger -p daemon.crit -t kj-guard "KJ_FENCE $1" 2>/dev/null || true; }
dockerq() { timeout -k 5 "$DOCKER_TIMEOUT" docker "$@"; }
hex16() { od -An -N8 -tx1 /dev/urandom | tr -d ' \n'; }

# ---- configuration (root 0600, no secrets): values are validated before any use --------------------------------
load_conf() {
  [ -f "$CONF" ] || die conf_missing
  [ "$(stat -c '%u:%a' "$CONF")" = "0:600" ] || die conf_mode
  # shellcheck disable=SC1090
  . "$CONF"
  [[ "${IMAGE:-}" =~ ^sha256:[0-9a-f]{64}$ ]] || die conf_image
  local name
  for name in DBNET KJNET MAILNET; do [[ "${!name:-}" =~ ^[a-z0-9][a-z0-9_.-]{0,62}$ ]] || die conf_network; done
  [[ "${BRIDGE:-}" =~ ^[a-z0-9]{1,15}$ ]] || die conf_bridge
  [[ "${TICK_MEMORY:-}" =~ ^[0-9]{2,5}m$ ]] || die conf_memory
}

# The fence path needs only these, read as plain values (never sourced), so a damaged or half-filled guard.conf can't
# stop a fence: the marker is written before this runs, and BRIDGE falls back to the K2 name.
conf_value() { [ -f "$CONF" ] && sed -nE "s/^$1=([^[:space:]]*)$/\1/p" "$CONF" | tail -1 || true; }
load_fence_conf() {
  BRIDGE="$(conf_value BRIDGE)"; [[ "$BRIDGE" =~ ^[a-z0-9]{1,15}$ ]] || BRIDGE=kjegress0
  FENCE_LIST_SHA="$(conf_value FENCE_LIST_SHA)"; [[ "$FENCE_LIST_SHA" =~ ^[0-9a-f]{64}$ ]] || FENCE_LIST_SHA=""
  PROBE_ADDR="$(conf_value PROBE_ADDR)"; PROBE_GW="$(conf_value PROBE_GW)"; PROBE_TARGET="$(conf_value PROBE_TARGET)"
}

# ---- markers and tables ------------------------------------------------------------------------------------------
markers() {
  local path base
  [ -d "$FENCE_DIR" ] || return 0
  for path in "$FENCE_DIR"/*; do
    base="${path##*/}"
    if [[ "$base" =~ ^[0-9a-f]{16}$ ]] && [ -f "$path" ]; then printf '%s\n' "$base"; fi
  done | sort
}
# Our tables, by name. A failed listing is an error the caller must treat as "fenced" (fail closed).
tables() { local listing; listing="$(nft list tables)" || return 1; printf '%s\n' "$listing" | sed -nE 's/^table inet key_grant_fence_([0-9a-f]{16})$/\1/p' | sort; }
any_fence() {
  local found
  found="$(markers)" || return 0
  [ -n "$found" ] && return 0
  found="$(tables)" || return 0
  [ -n "$found" ]
}

table_text() {
  cat <<EOF
table inet key_grant_fence_$1 {
	chain forward {
		type filter hook forward priority -200; policy accept;
		iifname "$BRIDGE" counter drop
	}
	chain input {
		type filter hook input priority -200; policy accept;
		iifname "$BRIDGE" counter drop
	}
}
EOF
}
# One atomic transaction; "add" then "flush" makes it idempotent and never touches another generation.
install_table() { { printf 'add table inet key_grant_fence_%s\nflush table inet key_grant_fence_%s\n' "$1" "$1"; table_text "$1"; } | nft -f -; }
# The table's own definition, counters stripped (nft -s), generation-neutral; FENCE_LIST_SHA is recorded at K1.
owned_definition() {
  local listing
  [ -n "${FENCE_LIST_SHA:-}" ] || return 1
  listing="$(nft -s list table inet "key_grant_fence_$1")" || return 1
  [ "$(printf '%s\n' "$listing" | sed "s/key_grant_fence_$1/key_grant_fence_@/" | sha256sum | cut -c1-64)" = "$FENCE_LIST_SHA" ]
}
forward_count() { nft list chain inet "key_grant_fence_$1" forward | sed -nE 's/.*counter packets ([0-9]+) .*/\1/p' | head -1; }

# Packet proof on the bridge, with no Docker call: a netns whose veth is enslaved to the bridge. ARP to the gateway
# shows the L2 path works (nft inet never sees ARP); a TCP connect out must fail while this table's own counter rises.
# Probes are serialized by their own short lock (never the admission lock): they share PROBE_ADDR on one bridge, and a
# fence and the sweep may probe the same generation at once.
packet_probe() {
  local n="$1" ns="kjp$1" host="kjh${1:0:8}" peer="kjn${1:0:8}" before after ok=1
  [[ "${PROBE_ADDR:-}" =~ ^[0-9.]+/[0-9]{1,2}$ && "${PROBE_GW:-}" =~ ^[0-9.]+$ && "${PROBE_TARGET:-}" =~ ^[0-9.]+$ ]] || return 1
  ip link show "$BRIDGE" >/dev/null 2>&1 || return 2
  mkdir -p -m 0700 "$RUN"
  exec 8>"$RUN/probe.lock"
  flock -w 60 8 || { exec 8>&-; return 1; }
  ip link del "$host" 2>/dev/null || true
  ip netns del "$ns" 2>/dev/null || true
  before="$(forward_count "$n")" || { exec 8>&-; return 1; }
  ip netns add "$ns" && ip link add "$host" type veth peer name "$peer" && ip link set "$peer" netns "$ns" &&
    ip link set "$host" master "$BRIDGE" && ip link set "$host" up &&
    ip -n "$ns" addr add "$PROBE_ADDR" dev "$peer" && ip -n "$ns" link set "$peer" up && ip -n "$ns" route add default via "$PROBE_GW" || ok=0
  if [ "$ok" = 1 ]; then
    ip netns exec "$ns" ping -c 1 -W 1 "$PROBE_GW" >/dev/null 2>&1 || true
    ip -n "$ns" neigh show "$PROBE_GW" | grep -q lladdr || ok=0
    if ip netns exec "$ns" timeout 4 bash -c "exec 3<>/dev/tcp/$PROBE_TARGET/443" 2>/dev/null; then ok=0; fi
    after="$(forward_count "$n")" || ok=0
    [ "${after:-0}" -gt "${before:-0}" ] || ok=0
  fi
  ip link del "$host" 2>/dev/null || true
  ip netns del "$ns" 2>/dev/null || true
  exec 8>&-
  [ "$ok" = 1 ]
}

# A fence alert slot, written here in shell with spoolTickAlert's protocol (tick-alerts.ts): a private temporary
# `.<16 hex>.tmp`, fsync, then an exclusive link to a free slot-NNN.alert.json, group 2001 (alerts), mode 0660.
spool_fence() {
  local reason="$1" spool="$KJ/alerts/spool" tmp start i slot
  [ -d "$spool" ] || return 1
  tmp="$spool/.$(hex16).tmp"
  ( umask 007; printf '{"kind":"fence","reason":"%s"}' "$reason" >"$tmp" ) || return 1
  chgrp 2001 "$tmp" && chmod 0660 "$tmp" && sync "$tmp" || { rm -f "$tmp"; return 1; }
  start=$(( $(od -An -N2 -tu2 /dev/urandom | tr -d ' ') % 500 ))
  for ((i = 0; i < 500; i++)); do
    slot="$spool/$(printf 'slot-%03d.alert.json' $(( (start + i) % 500 )))"
    if ln "$tmp" "$slot" 2>/dev/null; then rm -f "$tmp"; sync "$spool"; return 0; fi
  done
  rm -f "$tmp"; : >"$spool/overflow"; return 1
}
escalate() { crit "$1"; spool_fence "$1" || crit "alert_spool_failed"; }

# Steps 2-3 for generation N (v6 §1): install, verify the owned definition, then packets when the bridge exists.
complete_generation() {
  local n="$1" probe=0
  if ! install_table "$n" || ! owned_definition "$n"; then escalate fence_install_failed; return 1; fi
  [ "${2:-probe}" = probe ] || return 0
  packet_probe "$n" || probe=$?
  case "$probe" in
    0|2) return 0 ;;   # 2: no bridge yet (before Docker); key-grant-fence-probe.service probes after Docker
    *) escalate fence_verify_failed; return 1 ;;
  esac
}

fence() {
  local reason="$1" n tmp
  n="$(hex16)"
  mkdir -p -m 0700 "$FENCE_DIR"
  tmp="$FENCE_DIR/.$n.tmp"
  { printf '%s %s %s\n' "$n" "$reason" "$(date -u +%s)" >"$tmp" && sync "$tmp" && mv "$tmp" "$FENCE_DIR/$n" && sync "$FENCE_DIR"; } ||
    crit fence_marker_failed   # the table still goes in: adding a drop only moves toward safety
  load_fence_conf   # after the marker: the intent is durable before any configuration is read
  escalate "$reason"
  complete_generation "$n" || die fence_incomplete "\"generation\":\"$n\""
  say fenced "\"generation\":\"$n\""
}

sweep() {
  local mode="$1" pass before after n installed failed=0
  for pass in 1 2 3 4 5 6 7 8 9 10; do
    before="$(markers | sha256sum)"
    installed="$(tables)" || { escalate fence_install_failed; installed=""; }
    for n in $(markers); do
      printf '%s\n' "$installed" | grep -qx "$n" && continue
      complete_generation "$n" "$mode" || failed=1
    done
    after="$(markers | sha256sum)"
    [ "$before" = "$after" ] && break   # a newer marker landed meanwhile: sweep again
  done
  [ "$failed" = 0 ] || die sweep_incomplete
  say swept "\"pass\":$pass"
}

probe_all() {
  local n rc failed=0
  for n in $(markers); do
    if ! owned_definition "$n"; then escalate fence_install_failed; complete_generation "$n" || failed=1; continue; fi
    rc=0; packet_probe "$n" || rc=$?
    [ "$rc" = 0 ] || { escalate fence_verify_failed; failed=1; }
  done
  [ "$failed" = 0 ] || die probe_failed
  say probed
}

# ---- units, records and env files ---------------------------------------------------------------------------------
chain_capable() { [ "$1" = tick ] || [ "$1" = first-run ]; }
valid_unit() { case "$1" in tick|first-run|failed|mail) return 0 ;; *) return 1 ;; esac; }

# owner:group mode, then the exact key set (names only; no value is printed or kept).
check_env_file() {
  local file="$1" owner="$2" allowed="$3" required="$4" key keys rc=0
  [ -f "$file" ] && [ ! -L "$file" ] || return 1
  [ "$(stat -c '%u:%g %a' "$file")" = "$owner" ] || return 1
  # Exit 1 (no line outside KEY=value, comments and blanks) is the only pass; a grep error refuses too.
  grep -qvE '^([A-Z][A-Z0-9_]*=.*|#.*)?$' "$file" || rc=$?
  [ "$rc" = 1 ] || return 1
  keys="$(sed -nE 's/^([A-Z][A-Z0-9_]*)=.*/\1/p' "$file" | sort)"
  [ -z "$(printf '%s\n' "$keys" | uniq -d)" ] || return 1
  for key in $keys; do
    [[ " $allowed " == *" $key "* ]] && continue
    [[ " $allowed " == *" MEMBER_AUTH_SMTP_* "* && "$key" == MEMBER_AUTH_SMTP_* ]] && continue
    return 1
  done
  for key in $required; do printf '%s\n' "$keys" | grep -qx "$key" || return 1; done
}
KEYJOB_KEYS="DATABASE_URI PAYLOAD_SECRET BETTER_AUTH_SECRET KEY_GRANT_POLYGON_MAX_COST_WEI KEY_GRANT_POLYGON_EVENT_LOCKS"
live_value_ok() { [ "$(sed -nE 's/^KEY_GRANT_POLYGON_LIVE=(.*)$/\1/p' "$1")" = 1 ]; }

# Every key-job container of a unit, any state: "ID STATE RUN" lines. A failed query returns non-zero.
listing() { dockerq ps -a --no-trunc --filter "label=$LABEL=$1" --format "{{.ID}} {{.State}} {{.Label \"$RUNLABEL\"}}"; }
# The container's image as its full ID (docker ps shows the reference used at create, which is not an ID).
image_of() { dockerq inspect --format '{{.Image}}' "$1"; }
all_key_jobs() { dockerq ps -a --no-trunc --filter "label=$LABEL" --format "{{.ID}} {{.Label \"$LABEL\"}}"; }
# 0 = proven absent, 1 = still listed, 2 = the query failed.
absent() { local out; out="$(dockerq ps -a --no-trunc --filter "id=$1" --format '{{.ID}}')" || return 2; [ -z "$out" ] || return 1; }

take_lock() { mkdir -p -m 0700 "$RUN"; exec 9>"$LOCK"; flock -w "${1:-30}" 9 || die lock_timeout; }
drop_lock() { flock -u 9 2>/dev/null || true; exec 9>&-; }
# A fence from inside run/reap: a fresh generation in its own process, without our lock fd (fence never waits on it).
fence_now() { CMD=fence "$0" fence "$1" 9>&- || true; }

docker_args() {
  local unit="$1" cid="$2" live=""
  ARGS=(create --cidfile "$cid" --pull=never --init --log-driver none --restart no --read-only --tmpfs /tmp:size=64m
    --cap-drop ALL --security-opt no-new-privileges --label "$LABEL=$unit" --label "$RUNLABEL=$INVOCATION_ID"
    -e KEY_GRANT_ALERT_SPOOL=/spool -v "$KJ/alerts/spool:/spool")
  case "$unit" in
    tick|first-run)
      ARGS+=(--name "key-grant-$unit" --user 1000:1000 --group-add 2001 --memory "$TICK_MEMORY" --memory-swap "$TICK_MEMORY"
        --pids-limit 128 --network "$DBNET" --network "$KJNET"
        -v "$KJ/rpc/polygon-rpc.env:/home/node/.config/sphmrs/polygon-rpc.env:ro"
        -v "$KJ/signer/polygon-key-granter.env:/home/node/.config/sphmrs/polygon-key-granter.env:ro"
        -v "$KJ/config/key-job.env:/run/kj/key-job.env:ro")
      if [ "$unit" = first-run ]; then
        ARGS+=(-e KEY_GRANT_TICK_MODE=first-run -v "$KJ/config/live.env:/run/kj/live.env:ro"); live=" --env-file=/run/kj/live.env"
      else
        ARGS+=(-e KEY_GRANT_TICK_MODE=scheduled)
        if [ -e "$KJ/config/scheduled.env" ]; then ARGS+=(-v "$KJ/config/scheduled.env:/run/kj/live.env:ro"); live=" --env-file=/run/kj/live.env"; fi
      fi
      ARGS+=("$IMAGE" sh -c "umask 0007; exec node --env-file=/run/kj/key-job.env$live --import tsx scripts/key-grant-tick.ts") ;;
    failed)
      ARGS+=(--name key-grant-tick-failed --user 1000:1000 --group-add 2001 --memory 256m --memory-swap 256m --pids-limit 64
        --network none "$IMAGE" sh -c 'umask 0007; exec node --import tsx scripts/key-grant-alert.ts systemd-failed') ;;
    mail)
      ARGS+=(--name key-grant-alert-mail --user 2002:2001 -e HOME=/tmp -e KEY_GRANT_ALERT_STATE=/state/state.json
        --memory 256m --memory-swap 256m --pids-limit 64 --network "$MAILNET"
        -v "$KJ/mail/alert-mail.env:/run/kj/alert-mail.env:ro" -v "$KJ/alerts/mailer:/state"
        "$IMAGE" node --env-file=/run/kj/alert-mail.env --import tsx scripts/key-grant-alert.ts deliver) ;;
  esac
}

preflight_files() {
  case "$1" in
    tick|first-run)
      [ "$(stat -c '%u:%g %a' "$KJ/rpc/polygon-rpc.env" 2>/dev/null)" = "1000:1000 600" ] || die rpc_file_refused
      [ "$(stat -c '%u:%g %a' "$KJ/signer/polygon-key-granter.env" 2>/dev/null)" = "1000:1000 600" ] || die signer_file_refused
      check_env_file "$KJ/config/key-job.env" "1000:1000 400" "$KEYJOB_KEYS" "DATABASE_URI" || die keyjob_env_refused
      if [ "$1" = first-run ]; then
        { check_env_file "$KJ/config/live.env" "1000:1000 400" "KEY_GRANT_POLYGON_LIVE KEY_GRANT_POLYGON_ALLOWED_INTENTS" \
          "KEY_GRANT_POLYGON_LIVE KEY_GRANT_POLYGON_ALLOWED_INTENTS" && live_value_ok "$KJ/config/live.env"; } || die live_env_refused
      elif [ -e "$KJ/config/scheduled.env" ]; then
        # The scheduled tick never sees the first-run permit; its LIVE comes only from scheduled.env (K6g).
        { check_env_file "$KJ/config/scheduled.env" "1000:1000 400" "KEY_GRANT_POLYGON_LIVE" "KEY_GRANT_POLYGON_LIVE" &&
          live_value_ok "$KJ/config/scheduled.env"; } || die scheduled_env_refused
      fi ;;
    mail)
      check_env_file "$KJ/mail/alert-mail.env" "2002:2002 400" "MEMBER_AUTH_MAIL_MODE KEY_GRANT_ALERT_TO MEMBER_AUTH_SMTP_*" \
        "MEMBER_AUTH_MAIL_MODE KEY_GRANT_ALERT_TO" || die mail_env_refused ;;
  esac
}

# Leftovers of this unit from an earlier run (v3 pre): none = go; created/exited/dead with our image = remove and
# prove absent; anything running or unknown = fence (chain-capable) and refuse.
clear_leftovers() {
  local unit="$1" lines id state rc
  lines="$(listing "$unit")" || { if chain_capable "$unit"; then fence_now fence_query_failed; fi; die query_failed; }
  while read -r id state _; do
    [ -n "$id" ] || continue
    case "$state" in
      created|exited|dead)
        [ "$(image_of "$id" 2>/dev/null)" = "$IMAGE" ] || { if chain_capable "$unit"; then fence_now fence_unknown_quiescence; fi; die leftover_unknown; }
        dockerq rm -f "$id" >/dev/null 2>&1 || true
        rc=0; absent "$id" || rc=$?
        [ "$rc" = 0 ] || { if chain_capable "$unit"; then fence_now fence_unknown_quiescence; fi; die leftover_not_removed; } ;;
      *) if chain_capable "$unit"; then fence_now fence_unknown_quiescence; fi; die leftover_running ;;
    esac
  done <<<"$lines"
}

run() {
  local unit="$1" dir cid id
  valid_unit "$unit" || die unit_invalid
  [[ "${INVOCATION_ID:-}" =~ ^[0-9a-f]{32}$ ]] || die invocation_missing
  load_conf
  preflight_files "$unit"
  dir="$RUN/$unit"; mkdir -p -m 0700 "$dir"; cid="$dir/$INVOCATION_ID.cid"
  take_lock 30
  if chain_capable "$unit" && any_fence; then die fenced; fi
  [ "$(dockerq image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null)" = "$IMAGE" ] || die image_mismatch
  clear_leftovers "$unit"
  docker_args "$unit" "$cid"
  if ! dockerq "${ARGS[@]}" >/dev/null 2>&1; then
    # The create may still complete on the daemon side: reap and the unfence enumeration find it by its labels.
    if chain_capable "$unit"; then fence_now fence_query_failed; fi
    die create_failed
  fi
  id="$(cat "$cid")"; [[ "$id" =~ ^[0-9a-f]{64}$ ]] || die cid_invalid
  # Review-B carry-in: re-check the markers between create and start. A fence that landed meanwhile wins.
  if chain_capable "$unit" && any_fence; then
    dockerq rm -f "$id" >/dev/null 2>&1 || true
    absent "$id" || fence_now fence_unknown_quiescence
    die fenced_before_start
  fi
  drop_lock
  exec docker start -a "$id"
}

reap() {
  local unit="$1" dir cid id="" lines rc failed=0 lid lrun limage
  valid_unit "$unit" || die unit_invalid
  [[ "${INVOCATION_ID:-}" =~ ^[0-9a-f]{32}$ ]] || die invocation_missing
  load_conf
  dir="$RUN/$unit"; cid="$dir/$INVOCATION_ID.cid"; mkdir -p -m 0700 "$dir"
  take_lock 30   # with rm (25 s) and the absence check (25 s), reap and any fence it starts fit TimeoutStopSec=300
  if [ -s "$cid" ]; then id="$(cat "$cid")"; fi
  # A CID never published: find this invocation's container by its run label (unit + run + image must all match).
  if lines="$(listing "$unit")"; then
    while read -r lid _ lrun; do
      [ -n "$lid" ] && [ "$lrun" = "$INVOCATION_ID" ] || continue
      if limage="$(image_of "$lid")"; then [ "$limage" = "$IMAGE" ] || failed=1; else failed=2; fi
      if [ -n "$id" ] && [ "$id" != "$lid" ]; then failed=1; fi
      id="$lid"
    done <<<"$lines"
  else failed=2; fi
  if [ -n "$id" ] && [ "$failed" = 0 ]; then
    rc=0; timeout -k 5 20 docker rm -f "$id" >/dev/null 2>&1 || rc=$?
    if [ "$rc" = 124 ] || [ "$rc" = 137 ]; then failed=3; fi
    rc=0; absent "$id" || rc=$?
    if [ "$rc" = 2 ]; then failed=2; elif [ "$rc" != 0 ]; then failed=$(( failed == 3 ? 3 : 1 )); fi
  fi
  # Proven absent: the record goes. A record left in /run/key-grant is one never proven, and unfence refuses on it.
  if [ "$failed" = 0 ]; then rm -f "$cid"; fi
  if [ "$unit" = first-run ]; then
    # The first-run permit never outlives its run (v4 H1): delete it and prove it gone, whatever happened.
    rm -f "$KJ/config/live.env"
    [ ! -e "$KJ/config/live.env" ] || fence_now fence_live_permit_left
  fi
  if [ "$failed" != 0 ]; then
    if chain_capable "$unit"; then
      case "$failed" in 2) fence_now fence_query_failed ;; 3) fence_now fence_stop_hung ;; *) fence_now fence_unknown_quiescence ;; esac
    fi
    die reap_unproven
  fi
  # Publisher temp files from a hard kill: only under all-publisher quiescence (no key-job container of any kind).
  if lines="$(all_key_jobs)" && [ -z "$lines" ]; then
    # Older than a minute only: a fence process (it takes no lock) may be writing one right now.
    while IFS= read -r path; do
      if [[ "${path##*/}" =~ ^\.[0-9a-f]{16}\.tmp$ ]] && [ -f "$path" ]; then rm -f "$path"; fi
    done < <(find "$KJ/alerts/spool" -maxdepth 1 -type f -name '.*.tmp' -mmin +1 2>/dev/null)
  fi
  say reaped
}

prove_dead() {
  local lines
  valid_unit "$1" || die unit_invalid
  load_conf
  lines="$(listing "$1")" || die query_failed "" 2
  [ -z "$lines" ] || die not_dead
  say dead
}

unfence() {
  local n="$1" pid lines unit cg record
  [[ "$n" =~ ^[0-9a-f]{16}$ ]] || die generation_invalid
  load_conf
  { [ -f "$FENCE_DIR/$n" ] || tables | grep -qx "$n"; } || die generation_unknown
  take_lock 120   # held to the end: admission stays locked through the whole release (Review-B carry-in)
  for unit in key-grant-tick.service key-grant-first-run.service key-grant-tick.timer; do
    [ "$(systemctl is-active "$unit" 2>/dev/null || true)" = inactive ] || die unit_active "\"unit\":\"$unit\""
  done
  [ "$(systemctl is-enabled key-grant-tick.timer 2>/dev/null || true)" = disabled ] || die timer_enabled
  for unit in key-grant-tick.service key-grant-first-run.service; do
    cg="$(systemctl show -p ControlGroup --value "$unit")"
    if [ -n "$cg" ] && [ -s "/sys/fs/cgroup$cg/cgroup.procs" ]; then die cgroup_not_empty "\"unit\":\"$unit\""; fi
  done
  # Daemon-side reconcile, not elapsed time: stop the socket too (no API call may start a daemon mid-check), prove the
  # old dockerd exited, start again. In-flight API requests die with it, so any create it accepted is now on disk.
  pid="$(systemctl show -p MainPID --value docker.service)"
  timeout 300 systemctl stop docker.socket docker.service || die daemon_stop_failed
  if [ -n "$pid" ] && [ "$pid" != 0 ] && kill -0 "$pid" 2>/dev/null; then die daemon_not_exited; fi
  [ "$(systemctl is-active docker.service 2>/dev/null || true)" != active ] || die daemon_not_exited
  timeout 300 systemctl start docker.socket docker.service || die daemon_start_failed
  timeout 120 bash -c 'until docker info >/dev/null 2>&1; do sleep 1; done' || die daemon_unavailable
  lines="$(all_key_jobs)" || die query_failed
  while read -r _ unit; do
    case "$unit" in tick|first-run) die container_present "\"unit\":\"$unit\"" ;; esac
  done <<<"$lines"
  for record in "$RUN"/tick/*.cid "$RUN"/first-run/*.cid; do
    [ -e "$record" ] && die record_unproven
  done
  # Generation N only: marker first (admission stays refused by the table), then the table, name and hash checked.
  rm -f "$FENCE_DIR/$n"; sync "$FENCE_DIR" 2>/dev/null || true
  if tables | grep -qx "$n"; then
    owned_definition "$n" || die table_not_owned
    nft delete table inet "key_grant_fence_$n" || die table_delete_failed
  fi
  say released "\"generation\":\"$n\",\"remaining\":$( { markers; tables || true; } | sort -u | grep -c . || true)"
}

# The queue receipt, read only: the DB network only, no signer or RPC mount, its own read-role env file.
receipt() {
  local signer="$1"
  [[ "$signer" =~ ^0x[0-9a-fA-F]{40}$ ]] || die signer_invalid
  load_conf
  check_env_file "$KJ/config/queue-read.env" "1000:1000 400" "DATABASE_URI PAYLOAD_SECRET BETTER_AUTH_SECRET KEY_GRANT_POLYGON_EVENT_LOCKS" \
    "DATABASE_URI" || die receipt_env_refused
  exec timeout -k 5 300 docker run --rm --pull=never --init --log-driver none --restart no --read-only --tmpfs /tmp:size=64m \
    --cap-drop ALL --security-opt no-new-privileges --label "$LABEL=receipt" --user 1000:1000 --memory 512m --memory-swap 512m \
    --pids-limit 64 --network "$DBNET" -v "$KJ/config/queue-read.env:/run/kj/queue-read.env:ro" \
    "$IMAGE" node --env-file=/run/kj/queue-read.env --import tsx scripts/key-grant-queue-read.ts --signer "$signer"
}

CMD="${1:-}"
case "$CMD" in
  run) run "${2:-}" ;;
  reap) reap "${2:-}" ;;
  prove-dead) prove_dead "${2:-}" ;;
  fence) [[ "$FENCE_REASONS" == *" ${2:-x} "* ]] || die reason_invalid; fence "$2" ;;
  sweep) load_fence_conf; sweep probe ;;
  restore) load_fence_conf; sweep presence ;;
  probe-all) load_fence_conf; probe_all ;;
  unfence) unfence "${2:-}" ;;
  receipt) receipt "${2:-}" ;;
  *) die usage ;;
esac
