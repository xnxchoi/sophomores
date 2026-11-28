#!/bin/bash
# Offline contract check for the local v13 packet. All Docker/namespace calls are shell stubs.
set -eu
packet=${1:?provide the absolute path to packet-v13}
source <(sed -n '/^ipv6_process_identity() {/,/^dns_names_ok() {/p' "$packet/review-update.v13.sh" | sed '$d')
source <(sed -n '/^show_candidate_result() {/,/^\[ "\$(id -u)"/p' "$packet/rehearse-v13.sh" | sed '$d')

ING=ingress DB13=db13 EGR13=egress13
fixture_cid=$(printf '%064d' 1)
clear_endpoints='["ingress","",0]
["db13","",0]
["egress13","",0]'
clear_addrs='[{"ifname":"lo","addr_info":[{"family":"inet6","local":"::1","prefixlen":128,"scope":"host"}]},{"ifname":"eth0","addr_info":[]}]'
link_addrs='[{"ifname":"lo","addr_info":[]},{"ifname":"eth0","addr_info":[{"family":"inet6","local":"fe80::1234","prefixlen":64,"scope":"link"}]}]'
global_addrs=${link_addrs/fe80::1234/fd00::1234}
global_addrs=${global_addrs/\"link\"/\"global\"}

scratch=$(mktemp -d)
trap 'rm -r -- "$scratch"' EXIT
docker() {
  [ "$1 $2 $3 $4" = 'inspect --type container --format' ] && [ "$6" = "$fixture_cid" ] || return 99
  case $5 in
    *State.Pid*)
      case $scenario in
        no_pid) printf '%s true 0 2026-11-27T00:00:01Z\n' "$fixture_cid" ;;
        wrong_id) printf '%064d true 80 2026-11-27T00:00:01Z\n' 9 ;;
        rollover) if [ -e "$scratch/probed" ]; then printf '%s true 81 2026-11-27T00:00:02Z\n' "$fixture_cid"; else printf '%s true 80 2026-11-27T00:00:01Z\n' "$fixture_cid"; fi ;;
        *) printf '%s true 80 2026-11-27T00:00:01.012345678Z\n' "$fixture_cid" ;;
      esac ;;
    *GlobalIPv6Address*)
      case $scenario in
        inspect_failure) printf '%s\n' 'UNTRUSTED_DIAGNOSTIC'; return 7 ;;
        inspect_empty_failure) return 7 ;;
        inspect_empty) return 0 ;;
        inspect_missing) printf '%s\n' '["ingress","",0]' ;;
        inspect_placeholder) printf '%s\n' '<no value>' ;;
        endpoint|both) printf '%s\n' "${clear_endpoints/\[\"db13\",\"\",0\]/[\"db13\",\"fd00::42\",64]}" ;;
        *) printf '%s\n' "$clear_endpoints" ;;
      esac ;;
    *) return 99 ;;
  esac
}
stat() {
  if [ "$scenario" = identity_failure ]; then return 7; fi
  if [ "$scenario" = netns_flip ] && [ -e "$scratch/probed" ]; then echo 4:403; else echo 4:402; fi
}
ns() {
  [ "$*" = '80 ip -j -6 addr show' ] || return 99
  : > "$scratch/probed"
  case $scenario in
    ns_failure) return 7 ;;
    ns_empty) return 0 ;;
    ns_empty_list) echo '[]' ;;
    ns_bad) echo '[{"ifname":"lo"}]' ;;
    link) printf '%s\n' "$link_addrs" ;;
    global|both) printf '%s\n' "$global_addrs" ;;
    *) printf '%s\n' "$clear_addrs" ;;
  esac
}
expect() {
  local scenario=$1 expected_rc=$2 required=$3 output rc=0
  rm -f -- "$scratch/probed"
  output=$(no_ipv6_ok "$fixture_cid") || rc=$?
  if [ "$rc" != "$expected_rc" ] || [[ $output != *"$required"* || $output = *UNTRUSTED_DIAGNOSTIC* ]]; then
    printf 'FAIL %s (rc=%s; expected %s; required %s)\n' "$scenario" "$rc" "$expected_rc" "$required"; exit 1
  fi
  printf 'PASS %s\n' "$scenario"
}
expect clear 0 'endpoint_addresses=0 netns_global=0 netns_link_local=0'
expect link 0 'endpoint_addresses=0 netns_global=0 netns_link_local=1'
expect endpoint 1 'STOP: IPv6 ENDPOINT_IPV6'
expect global 1 'STOP: IPv6 NETNS_GLOBAL_IPV6'
expect both 1 $'STOP: IPv6 ENDPOINT_IPV6\nSTOP: IPv6 NETNS_GLOBAL_IPV6'
expect no_pid 1 'STOP: IPv6 PID_UNKNOWN'
expect wrong_id 1 'STOP: IPv6 PID_UNKNOWN'
expect rollover 1 'STOP: IPv6 PID_UNKNOWN (process or namespace changed)'
expect netns_flip 1 'STOP: IPv6 PID_UNKNOWN (process or namespace changed)'
expect identity_failure 1 'STOP: IPv6 NETNS_PROBE_FAILED (identity)'
expect inspect_failure 1 'STOP: IPv6 ENDPOINT_INSPECT_FAILED'
expect inspect_empty_failure 1 'STOP: IPv6 ENDPOINT_INSPECT_FAILED'
expect inspect_empty 1 'STOP: IPv6 ENDPOINT_INSPECT_FAILED (invalid projection)'
expect inspect_missing 1 'STOP: IPv6 ENDPOINT_INSPECT_FAILED (invalid projection)'
expect inspect_placeholder 1 'STOP: IPv6 ENDPOINT_INSPECT_FAILED (invalid projection)'
expect ns_failure 1 'STOP: IPv6 NETNS_PROBE_FAILED (ip)'
expect ns_empty 1 'STOP: IPv6 NETNS_PROBE_FAILED (invalid projection'
expect ns_empty_list 1 'STOP: IPv6 NETNS_PROBE_FAILED (invalid projection'
expect ns_bad 1 'STOP: IPv6 NETNS_PROBE_FAILED (invalid projection'

output=$(show_candidate_result $'IPv6-DIAG counts\nSTOP: IPv6 PID_UNKNOWN\n1\n2\n3\n4\n5')
[[ $output = $'IPv6-DIAG counts\nSTOP: IPv6 PID_UNKNOWN\n2\n3\n4\n5' ]]
printf 'PASS diagnostics survive tail trimming\n'
RH=$scratch n=1 fail=1; ! finish_phase1; [ "$(cat "$RH/phase1.fail")" = 1 ]
fail=0; finish_phase1; [ "$(cat "$RH/phase1.fail")" = 0 ]
printf 'PASS phase1 exit tracks recorded result\n'
