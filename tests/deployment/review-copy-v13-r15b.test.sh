#!/bin/bash
# Exercise only the fixture evidence parsers; no firewall, Docker or VM calls.
set -eu
script=${1:?provide path to rehearse-v13.sh}
source <(sed -n '/^r15b_pair_row() {/,/^r15b() (/p' "$script" | sed '$d')
tmp=$(mktemp -d)
trap 'rm -r -- "$tmp"' EXIT

peer=receiver/0123456789ab net=old-egress source=192.0.2.1 target=new-egress/192.0.2.2:3000
row="FAIL 00:00:00Z peer=$peer net=$net src=$source dev=eth0 control=192.0.2.4:80=ESTABLISHED target=$target route=dev:eth0 result=ESTABLISHED bound=ESTABLISHED why=-"
printf '%s\n' "${row/$peer/other-peer}" "$row" > "$tmp/matrix"
[ "$(r15b_pair_row "$tmp/matrix" "$peer" "$net" "$source" "$target")" = "$row" ]
echo 'PASS exact named pair selected'
printf '%s\n' "$row" >> "$tmp/matrix"
if r15b_pair_row "$tmp/matrix" "$peer" "$net" "$source" "$target" >/dev/null; then exit 1; fi
if r15b_pair_row "$tmp/matrix" "$peer" "$net" "$source" wrong-target >/dev/null; then exit 1; fi
echo 'PASS duplicate and missing rows rejected'

iptables() {
  case "$*" in
    '-w 5 -t filter -v -S DOCKER-USER')
      printf '%s\n' '-A DOCKER-USER -p tcp -m comment --comment "fixture-forward" -c 3 120 -j ACCEPT' \
        '-A DOCKER-USER -p tcp -m comment --comment fixture-reverse -j ACCEPT -c 2 84' ;;
    '-w 5 -t raw -v -S PREROUTING')
      printf '%s\n' '-A PREROUTING -p tcp -m comment --comment fixture-raw-forward -c 3 120 -j ACCEPT'
      if [ "${missing:-0}" = 0 ]; then
        printf '%s\n' '-A PREROUTING -p tcp -m comment --comment "fixture-raw-reverse" -j ACCEPT -c 2 84'
      fi ;;
    *) return 1 ;;
  esac
}
counts=$(r15b_control_counts fixture-forward fixture-reverse fixture-raw-forward fixture-raw-reverse)
[[ $counts = $'fixture-forward packets=3 bytes=120\nfixture-reverse packets=2 bytes=84\nfixture-raw-forward packets=3 bytes=120\nfixture-raw-reverse packets=2 bytes=84' ]]
echo 'PASS captured all four exact filter/raw counters'
missing=1
if r15b_control_counts fixture-forward fixture-reverse fixture-raw-forward fixture-raw-reverse >/dev/null; then exit 1; fi
echo 'PASS missing raw reverse counter blocks proof'
