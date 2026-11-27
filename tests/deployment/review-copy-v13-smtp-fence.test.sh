#!/bin/bash
# Stubs only: no firewall, Docker, SMTP, or VM calls.
set -eu
script=${1:?provide path to rehearse-v13.sh}
source <(sed -n '/^smtp_fence_rules() {/,/^install_smtp_fence() {/p' "$script" | sed '$d')
tmp=$(mktemp -d)
trap 'rm -r -- "$tmp"' EXIT

mock_firewall() {
  local family=$1 hook=$7
  shift
  [ "$1 $2 $3 $4" = '-w 5 -t mangle' ] || return 90
  case "$5 $hook" in
    '-I OUTPUT'|'-I FORWARD')
      [ "${*:7}" = '1 -p tcp -m multiport --dports 25,465,587,2525 -j DROP' ] || return 91
      [ "${failed_insert:-}" != "$family/$hook" ] || return 92
      printf '%s\n' "-A $hook -p tcp -m multiport --dports 25,465,587,2525 -j DROP" > "$tmp/$family.$hook"
      ;;
    '-S OUTPUT'|'-S FORWARD')
      [ "${*:7}" = 1 ] || return 93
      cat "$tmp/$family.$hook" 2>/dev/null
      ;;
    *) return 94 ;;
  esac
}
iptables() { mock_firewall ipv4 "$@"; }
ip6tables() { mock_firewall ipv6 "$@"; }

smtp_fence_rules install
smtp_fence_rules check
echo 'PASS four first-position SMTP DROP rules'
mv "$tmp/ipv6.FORWARD" "$tmp/missing"
if smtp_fence_rules check; then echo 'FAIL missing IPv6 FORWARD rule accepted'; exit 1; fi
echo 'PASS missing first rule blocks readiness'
printf '%s\n' '-A FORWARD -j ACCEPT' > "$tmp/ipv6.FORWARD"
if smtp_fence_rules check; then echo 'FAIL displaced IPv6 FORWARD rule accepted'; exit 1; fi
echo 'PASS displaced rule blocks readiness'
failed_insert=ipv6/FORWARD
if smtp_fence_rules install; then echo 'FAIL unsuccessful install accepted'; exit 1; fi
echo 'PASS install failure blocks readiness'
