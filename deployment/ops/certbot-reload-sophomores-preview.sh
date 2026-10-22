#!/usr/bin/env bash
# Root-owned deploy hook scoped to the Sophomores preview certificate.
# Requires lineage directory mounts preserving live -> archive symlinks.
set -Eeuo pipefail
umask 077
trap 'printf "TLS renewal hook failed at line %s\n" "$LINENO" >&2' ERR

lineage=/etc/letsencrypt/live/preview.sophomores.co
case "${RENEWED_LINEAGE:-}" in
  "$lineage") ;;
  '') echo 'Missing RENEWED_LINEAGE; refusing unscoped reload' >&2; exit 1 ;;
  *) exit 0 ;;
esac

exec 9>/run/lock/hideaway-nginx-tls.lock
flock -w 60 9

fingerprint() {
  openssl x509 -noout -fingerprint -sha256 "$@"
}

fail() {
  echo "$1" >&2
  exit 1
}

expected=$(fingerprint -in "$lineage/fullchain.pem")
[[ -n "$expected" ]] || fail 'Empty host certificate fingerprint'
openssl x509 -in "$lineage/fullchain.pem" -noout -checkend 86400 >/dev/null
hosts=(preview.sophomores.co)
for host in "${hosts[@]}"; do
  openssl verify -purpose sslserver -verify_hostname "$host" \
    -untrusted "$lineage/chain.pem" "$lineage/cert.pem" >/dev/null
done

mounted=$(timeout 10 docker exec nginx cat "$lineage/fullchain.pem" | fingerprint)
[[ "$mounted" == "$expected" ]] || fail 'Mounted certificate differs from renewed certificate'
timeout 15 docker exec nginx nginx -t
timeout 15 docker exec nginx nginx -s reload

# Reload is asynchronous; every hostname must serve the expected trusted cert.
verified=false
for attempt in {1..10}; do
  verified=true
  for host in "${hosts[@]}"; do
    served=$(timeout 5 openssl s_client -connect 127.0.0.1:443 \
      -servername "$host" -verify_hostname "$host" -verify_return_error \
      </dev/null 2>/dev/null | fingerprint) || served=''
    if [[ "$served" != "$expected" ]]; then
      verified=false
      break
    fi
  done
  if [[ "$verified" == true ]]; then break; fi
  sleep 1
done
[[ "$verified" == true ]] || fail 'Served certificate verification failed'
echo 'TLS renewal reload verified for preview.sophomores.co'
