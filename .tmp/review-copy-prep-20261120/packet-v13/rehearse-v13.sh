#!/bin/bash
# The one bounded Linux rehearsal of RUNBOOK-v13 (Review-B PASS msg_ab39d045ed4f: implementation and isolated Lima only).
# Runs as root INSIDE a throwaway Lima VM, never on the VPS, in two phases around a VM reboot (run-lima-v13.sh):
#   sudo bash rehearse-v13.sh <packet-v13> <packet-v12> <packet-v10> phase1
#   sudo bash rehearse-v13.sh <packet-v13> <packet-v12> <packet-v10> phase2      (after `limactl stop/start`)
# It builds v12's live state (v4 route to a real d4ff8d7d app, review-pg, nginx with the shared vhosts, preview /
# receiver / hideaway peers with real listeners, f0's DOCKER-USER chain) from synthetic values, then runs the STAMPED
# gate (from RUNBOOK-v13.stamped.md) and the STAMPED review-update.v13.sh from the upload set.
set -u
umask 077
K=${1:?packet-v13}; K12=${2:?packet-v12}; K10=${3:?packet-v10}; PHASE=${4:?phase1|phase2}
fail=0; n=0; ok() { n=$((n+1)); printf 'PASS %s\n' "$*"; }; bad() { printf 'FAIL %s\n' "$*"; fail=1; }
check() { local name=$1; shift; if "$@"; then ok "$name"; else bad "$name"; fi; }
say() { printf '# %s\n' "$*"; }
show_candidate_result() {
  printf '%s\n' "$1" | grep -E '^(IPv6-DIAG |STOP: IPv6 )' || true
  printf '%s\n' "$1" | grep -vE '^(IPv6-DIAG |STOP: IPv6 )' | tail -4
}
finish_phase1() {
  echo "phase1 done: $n passed, fail=$fail"
  printf '%s\n' "$fail" > "$RH/phase1.fail" || return 1
  [ "$fail" = 0 ]
}
[ "$(id -u)" = 0 ] && command -v docker >/dev/null && command -v systemd-run >/dev/null && command -v nsenter >/dev/null || { echo "FAIL run as root in the Lima VM with docker, systemd and nsenter"; exit 1; }
export LC_ALL=C
N8=$(sed -n 's/^SOURCE_SHA=//p' "$K/pins.env" | cut -c1-8)
V10=/var/lib/sophomores-ops/review-d7409895; V12=/var/lib/sophomores-ops/review-update-d4ff8d7d
UOPS=/var/lib/sophomores-ops/review-update-$N8; IN=/home/deploy/review-update-$N8
RH=/srv/rh13; VHOST=$RH/nginx/sophomores-preview.conf; PREVIEW_LOCK=/run/lock/sophomores-preview.lock; TLS_LOCK=/run/lock/hideaway-nginx-tls.lock
PASS=synthetic-local-rehearsal-password
PREV=sha256:5439461f8f643add7be342a2fae02080541cc1201ee088054f1ebf76edd8f29f
PGI=sha256:a026aff735540e5492c2ac4a782edd7dffa9b3b816dbda710d63b7a84f2c9b82
NGINX_IMAGE=${NGINX_IMAGE:-nginx:1.27-alpine}
docker_user_replica() {   # f0-facts.txt's DOCKER-USER chain (ufw-docker), so routed probes meet the VPS's rule order
  local t p
  for t in iptables ip6tables; do
    p=ufw; [ "$t" = ip6tables ] && p=ufw6
    $t -N "$p-user-forward" 2>/dev/null; $t -N "$p-docker-logging-deny" 2>/dev/null; $t -F "$p-docker-logging-deny"; $t -A "$p-docker-logging-deny" -j DROP
    $t -N DOCKER-USER 2>/dev/null; $t -F DOCKER-USER
    $t -A DOCKER-USER -j "$p-user-forward"
    $t -A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
    $t -A DOCKER-USER -m conntrack --ctstate INVALID -j DROP
    $t -A DOCKER-USER -i docker0 -o docker0 -j ACCEPT
  done
  iptables -A DOCKER-USER -s 10.0.0.0/8 -j RETURN; iptables -A DOCKER-USER -s 172.16.0.0/12 -j RETURN; iptables -A DOCKER-USER -s 192.168.0.0/16 -j RETURN
  iptables -A DOCKER-USER -d 10.0.0.0/8 -m conntrack --ctstate NEW -j ufw-docker-logging-deny
  iptables -A DOCKER-USER -d 172.16.0.0/12 -m conntrack --ctstate NEW -j ufw-docker-logging-deny
  iptables -A DOCKER-USER -d 192.168.0.0/16 -m conntrack --ctstate NEW -j ufw-docker-logging-deny
  iptables -A DOCKER-USER -j RETURN
  ip6tables -A DOCKER-USER -s fd00::/8 -j RETURN; ip6tables -A DOCKER-USER -d fd00::/8 -m conntrack --ctstate NEW -j ufw6-docker-logging-deny; ip6tables -A DOCKER-USER -j RETURN
}
fidelity() {   # the VPS facts (f0) this run must match; a mismatch FAILs (isolation rows would be Lima-only)
  local v b lr be
  v=$(docker version -f '{{.Server.Version}}' 2>/dev/null); b=$(lsmod | awk '$1=="br_netfilter"{f=1} END{print (f?"loaded":"not-loaded")}')
  lr=$(docker info -f '{{.LiveRestoreEnabled}}' 2>/dev/null); be=$(docker info -f '{{json .FirewallBackend}}' 2>/dev/null | grep -oE '"Driver":"[a-z]+"' | cut -d'"' -f4)
  echo "FIDELITY docker=$v (VPS 29.5.2) br_netfilter=$b (VPS not-loaded) live-restore=$lr (VPS true) backend=$be (VPS iptables) $(iptables -V) (VPS v1.8.10 nf_tables)"
  [ "$v" = 29.5.2 ] || echo "LIMA-VS-VPS docker $v here, 29.5.2 on the VPS: routed rows read as 'f0's DOCKER-USER chain on Docker $v'; ufw's later FORWARD chains are not replicated"
  [ "$b" = not-loaded ] && [ "$lr" = true ] && [ "$be" = iptables ] && [[ $(iptables -V) == *nf_tables* ]]
}
gate_cookie() {   # sign in to the preview gate through nginx (fixture passcode); prints the Cookie header value
  curl -sk -D - -o /dev/null --connect-to preview.sophomores.co:443:127.0.0.1:443 -H "origin: https://preview.sophomores.co" \
    --data-urlencode username=team --data-urlencode "password=$PASS" https://preview.sophomores.co/api/session \
    | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: \([^;]*\).*/\1/p' | paste -sd ';' -
}
status_via() { status_hdr "$1" "$2" "$3" "$4" preview.sophomores.co preview.sophomores.co; }
code_and_error() {   # stdin: body then a last line with the HTTP code -> "<code> <error.code or ->"
  python3 -I -c '
import json, sys
t = sys.stdin.read().rsplit("\n", 1); body, code = (t[0], t[1]) if len(t) == 2 else ("", t[0])
try: e = (json.loads(body).get("error") or {}).get("code") or "-"
except Exception: e = "not-json"
print(code.strip() or "000", e)'
}
status_hdr() {   # NGINX_PID SRC DST COOKIE HOST XFH -> "<code> <error.code>": the GET with a chosen Host and X-Forwarded-Host
  nsenter -t "$1" -n curl -s -w '\n%{http_code}' --interface "$2" --max-time 10 -H "host: $5" -H 'x-forwarded-proto: https' \
    -H "x-forwarded-host: $6" -H 'accept: application/json' -H "cookie: $4" "http://$3:3000/api/member/status" | code_and_error
}
nginx_run() {   # the fixture nginx (also used to recreate it with the same config in phase 2)
  docker run -d --name nginx --restart unless-stopped --pull=never --network sophomores-preview -p 127.0.0.1:443:443 \
    -v "$VHOST:/etc/nginx/conf.d/sophomores-preview.conf:ro" -v "$RH/shared.conf:/etc/nginx/conf.d/shared.conf:ro" -v "$RH/default.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$RH/headers.conf:/etc/nginx/headers.conf:ro" -v "$RH/ssl.conf:/etc/nginx/ssl.conf:ro" -v "$RH/shared.crt:/etc/nginx/shared.crt:ro" -v "$RH/shared.key:/etc/nginx/shared.key:ro" \
    -v "$RH/live:/etc/letsencrypt/live/preview.sophomores.co:ro" "$NGINX_IMAGE" >/dev/null && docker network connect hideaway nginx
}
pg_run() {
  docker run -d --name sophomores-review-pg --restart unless-stopped --pull=never --log-driver none --network sophomores-review-db \
    --mount type=volume,src=sophomores-review-pgdata,dst=/var/lib/postgresql/data -v "$RH/pg-super.pw:/run/pg-super.pw:ro" \
    -e POSTGRES_USER=review_super -e POSTGRES_PASSWORD_FILE=/run/pg-super.pw "$PGI"
}

smtp_fence_rules() {
  local family hook first_rule
  local -a rule=(-p tcp -m multiport --dports 25,465,587,2525 -j DROP)
  for family in iptables ip6tables; do
    for hook in OUTPUT FORWARD; do
      if [ "$1" = install ]; then
        "$family" -w 5 -t mangle -I "$hook" 1 "${rule[@]}" || return 1
      fi
      first_rule=$("$family" -w 5 -t mangle -S "$hook" 1) || return 1
      [ "$first_rule" = "-A $hook ${rule[*]}" ] || return 1
    done
  done
}
install_smtp_fence() {
  # Docker requires this guest-only fence before starting or restoring containers at boot.
  local unit=/etc/systemd/system/v13-fixture-smtp-fence.service dropin=/etc/systemd/system/docker.service.d
  { printf '%s\n' '#!/bin/bash'; declare -f smtp_fence_rules; printf '%s\n' 'smtp_fence_rules install'; } \
    > /etc/v13-fixture-smtp-fence && chmod 0700 /etc/v13-fixture-smtp-fence || return 1
  printf '%s\n' '[Service]' 'Type=oneshot' 'RemainAfterExit=yes' 'ExecStart=/etc/v13-fixture-smtp-fence' > "$unit" || return 1
  install -d -m 0755 "$dropin" && printf '%s\n' '[Unit]' 'Requires=v13-fixture-smtp-fence.service' \
    'After=v13-fixture-smtp-fence.service' > "$dropin/99-v13-fixture-smtp-fence.conf" || return 1
  systemctl daemon-reload && systemctl start v13-fixture-smtp-fence.service && smtp_fence_rules check
}
require_smtp_fence() {
  if systemctl is-active --quiet v13-fixture-smtp-fence.service && smtp_fence_rules check; then
    printf 'PASS SMTP fixture: guest IPv4/IPv6 OUTPUT and FORWARD block SMTP TCP ports (%s)\n' "$1"
  else
    echo 'STOP: SMTP fixture egress fence not proven'; return 1
  fi
}

if [ "$PHASE" = phase1 ]; then
[ ! -e "$V10" ] && [ ! -e "$UOPS" ] && [ ! -e "$RH" ] || { echo "FAIL this VM was used before; recreate it"; exit 1; }
install -d -m 0700 "$V10" "$V10/secrets" "$V10/tokens" "$V12" "$V12/tokens" "$RH" "$RH/nginx" "$RH/live" "$(dirname "$IN")" "$IN"
# ---------------------------------------------------------------- the daemon as on the VPS (live-restore on), f0 rules
install_smtp_fence || { echo 'STOP: could not install guest-only SMTP fixture fence'; exit 1; }
printf '{"live-restore": true}\n' > /etc/docker/daemon.json && systemctl restart docker || exit 1
require_smtp_fence phase1 || exit 1
sleep 3
modprobe -r br_netfilter 2>/dev/null
check "F0 fidelity: br_netfilter not loaded, live-restore on, iptables backend (nf_tables) as f0" fidelity
docker_user_replica
# ---------------------------------------------------------------- images
say "load d4ff8d7d (v12 runtime), review-pg (v10), the v13 runner (fixture migrate), nginx"
docker load -i "$K12/artifacts/sophomores-review-d4ff8d7d-runtime.tar" >/dev/null || bad "load d4ff8d7d"
docker load -i "$K10/artifacts/sophomores-review-postgres16-amd64.tar" >/dev/null || bad "load review-pg"
docker load -i "$K/artifacts/sophomores-review-$N8-runner.tar" >/dev/null || bad "load v13 runner"
RUNNER=$(sed -n 's/^RUNNER_ID=//p' "$K/evidence/image-pins.env")
docker pull -q "$NGINX_IMAGE" >/dev/null || bad "pull $NGINX_IMAGE"
check "R0 images present: d4ff8d7d, review-pg, v13 runner, nginx" eval 'docker image inspect "$PREV" "$PGI" "$RUNNER" "$NGINX_IMAGE" >/dev/null 2>&1'
# ---------------------------------------------------------------- v10 + v12 world (synthetic values, exact names)
say "build v12's live state"
docker network create --internal sophomores-review-db >/dev/null; docker network create sophomores-review-egress >/dev/null
docker network create --internal sophomores-preview >/dev/null
docker network create --ipv6 --subnet fde5:6827:1dad::/64 hideaway >/dev/null
for v in sophomores-review-pgdata sophomores-review-media review-d7409895-phone-health; do docker volume create "$v" >/dev/null; done
SUPER=$(openssl rand -hex 32); DBPW=$(openssl rand -hex 32)
printf '%s' "$SUPER" > "$RH/pg-super.pw"; chmod 0644 "$RH/pg-super.pw"
pgid=$(pg_run)
for i in $(seq 1 60); do docker exec "$pgid" pg_isready -U review_super >/dev/null 2>&1 && break; sleep 1; done; sleep 2
docker exec "$pgid" psql -X -q -v ON_ERROR_STOP=1 -U review_super -c "create role sophomores_review login password '$DBPW'" -c "create database sophomores_review owner sophomores_review" >/dev/null || bad "fixture role/db"
printf '%s\n' "$pgid" > "$V10/pg-id"
URI="postgresql://sophomores_review:$DBPW@sophomores-review-pg:5432/sophomores_review"; O=https://preview.sophomores.co
a=$(openssl rand -hex 32); b=$(openssl rand -hex 32); c=$(openssl rand -hex 32)
printf '%s\n' "DATABASE_URI=$URI" "PAYLOAD_SECRET=$a" "BETTER_AUTH_SECRET=$b" "NEXT_PUBLIC_SERVER_URL=$O" PREVIEW_AUTH_MODE=protected \
  PREVIEW_AUTH_CONFIG=/run/secrets/preview-auth.json PREVIEW_RUNTIME=sandbox MEMBER_AUTH_MODE=production "MEMBER_AUTH_ORIGIN=$O" \
  PHONE_VERIFICATION_MODE=production "PHONE_VERIFICATION_ORIGIN=$O" PHONE_VERIFICATION_TRANSPORT=zoho-poll \
  PHONE_VERIFICATION_RECIPIENT=verify@sophomores.co "PHONE_VERIFICATION_STATE_SECRET=$c" "PHONE_VERIFICATION_DATABASE_URL=$URI" \
  PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY=/run/phone-receiver-health PORTONE_PAYMENT_MODE=test "PORTONE_ORIGIN=$O" > "$V10/secrets/core.env"
apple_key=$(openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 2>/dev/null | awk 'NR>1{printf "\\n"}{printf "%s",$0}')
store=store-$(cat /proc/sys/kernel/random/uuid); channel=channel-key-$(cat /proc/sys/kernel/random/uuid)
# Match the app's allowlist with synthetic credentials; the VM fence blocks SMTP before any fixture starts.
printf '%s\n' MEMBER_AUTH_MAIL_MODE=smtp MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com MEMBER_AUTH_SMTP_PORT=465 MEMBER_AUTH_SMTP_USERNAME=synthetic-user \
  "MEMBER_AUTH_SMTP_PASSWORD=$(openssl rand -hex 16)" MEMBER_AUTH_SMTP_FROM=noreply@sophomores.co > "$V10/secrets/mail.env"
printf '%s\n' MEMBER_AUTH_APPLE_CLIENT_ID=co.sophomores.preview.synthetic MEMBER_AUTH_APPLE_TEAM_ID=SYNTHTEAM1 MEMBER_AUTH_APPLE_KEY_ID=SYNTHKEY01 \
  "MEMBER_AUTH_APPLE_PRIVATE_KEY=$apple_key" PHONE_VERIFICATION_ZOHO_ACCOUNT_ID=1234567890 "PORTONE_STORE_ID=$store" "PORTONE_CHANNEL_KEY=$channel" \
  "PORTONE_API_SECRET=$(openssl rand -hex 24)" "PORTONE_WEBHOOK_SECRET=whsec_$(openssl rand -base64 32)" > "$V10/secrets/launch.env"
printf '%s\n' "PORTONE_SANDBOX_TEST_STORE_ID=$store" "PORTONE_SANDBOX_TEST_CHANNEL_KEY=$channel" > "$V10/secrets/pin.env"
chmod 0600 "$V10"/secrets/*.env
python3 -I - "$RH/preview-auth.json" "$PASS" <<'PY'
import hashlib, json, secrets, sys
salt = secrets.token_bytes(16)
open(sys.argv[1], 'w').write(json.dumps(dict(origin='https://preview.sophomores.co', username='team', passwordSalt=salt.hex(),
  passwordHash=hashlib.scrypt(sys.argv[2].encode(), salt=salt, n=16384, r=8, p=1, dklen=64).hex(), signingSecret=secrets.token_hex(32))))
PY
chmod 0644 "$RH/preview-auth.json"
ENVF=(--env-file "$V10/secrets/core.env" --env-file "$V10/secrets/mail.env" --env-file "$V10/secrets/launch.env" --env-file "$V10/secrets/pin.env")
docker run --rm --pull=never --log-driver none --network sophomores-review-db --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m --cap-drop ALL --security-opt no-new-privileges \
  "${ENVF[@]}" -e PAYLOAD_CONFIG_PATH=./src/payload.config.ts "$RUNNER" node --import tsx ./node_modules/payload/bin.js --disable-transpile migrate > "$RH/migrate.out" 2>&1
check "R1 fixture: the review DB migrated to the 32" eval '[ "$(docker exec "$pgid" psql -X -At -U review_super -d sophomores_review -c "select count(*) from payload_migrations")" = 32 ]'
docker run --rm --pull=never --network none --mount type=volume,src=sophomores-review-media,dst=/m --entrypoint sh "$PGI" -c 'head -c 278 /dev/urandom > /m/synthetic.png && chown -R 1000:1000 /m'
docker exec "$pgid" psql -X -q -v ON_ERROR_STOP=1 -U review_super -d sophomores_review -c "insert into media (alt, filename, mime_type, filesize, updated_at, created_at) values ('rehearsal', 'synthetic.png', 'image/png', 278, now(), now())" >/dev/null 2>&1 || bad "fixture media row"
say "d4ff8d7d as v12 u4/u5 left it (db, then preview + egress; restart unless-stopped)"
pid4=$(docker run -d --name sophomores-review-d4ff8d7d --label co.sophomores.release=review-update-d4ff8d7d --restart unless-stopped --pull=never --log-driver none --network sophomores-review-db \
  --memory 832m --memory-swap 832m --oom-score-adj 1000 --cpus 1 --pids-limit 160 --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m \
  --tmpfs /app/.next/cache:rw,nosuid,nodev,size=256m,uid=1000,gid=1000 --cap-drop ALL --security-opt no-new-privileges "${ENVF[@]}" \
  --mount type=volume,src=sophomores-review-media,dst=/app/media --mount type=volume,src=review-d7409895-phone-health,dst=/run/phone-receiver-health,readonly \
  --mount "type=bind,src=$RH/preview-auth.json,dst=/run/secrets/preview-auth.json,readonly" "$PREV")
docker network connect sophomores-preview "$pid4"; docker network connect sophomores-review-egress "$pid4"
printf '%s\n' "$pid4" > "$V12/new-app-id"; echo "u5 rehearsal" > "$V12/tokens/u5"
for i in $(seq 1 120); do [ "$(docker exec "$pid4" node -e 'fetch("http://127.0.0.1:3000/login",{headers:{host:"preview.sophomores.co"}}).then(r=>console.log(r.status)).catch(()=>console.log(0))' 2>/dev/null)" = 200 ] && break; sleep 1; done
check "R2 fixture: d4ff8d7d serves /login" eval '[ "$i" -lt 120 ]'
say "untrusted peers with real listeners: d7409895 and receiver stand-ins, two preview stand-ins, a hideaway peer"
docker run -d --name sophomores-review-d7409895 --restart unless-stopped --pull=never --log-driver none --network sophomores-review-db "$NGINX_IMAGE" \
  sh -c "sed -i 's/listen  *80;/listen 3000;/' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'" >/dev/null
docker network connect sophomores-preview sophomores-review-d7409895; docker network connect sophomores-review-egress sophomores-review-d7409895
docker run -d --name review-d7409895-phone-receiver --restart unless-stopped --pull=never --log-driver none --network sophomores-review-db "$NGINX_IMAGE" >/dev/null
docker network connect sophomores-review-egress review-d7409895-phone-receiver
for p in sophomores-preview-app sophomores-preview-auth; do docker run -d --name "$p" --restart unless-stopped --pull=never --log-driver none --network sophomores-preview "$NGINX_IMAGE" >/dev/null; done
docker run -d --name hideaway-holder-rehearsal --restart unless-stopped --pull=never --log-driver none --network hideaway "$NGINX_IMAGE" >/dev/null
say "nginx with the v4 vhost and four other vhosts (on sophomores-preview and hideaway)"
cp "$K12/sophomores-preview.review.v4.conf" "$VHOST"; chmod 0644 "$VHOST"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=preview.sophomores.co -addext "subjectAltName=DNS:preview.sophomores.co" -keyout "$RH/live/privkey.pem" -out "$RH/live/fullchain.pem" >/dev/null 2>&1
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=hideawayseoul.com -addext "subjectAltName=DNS:hideawayseoul.com,DNS:www.hideawayseoul.com,DNS:lostinseoul.com,DNS:www.lostinseoul.com" \
  -keyout "$RH/shared.key" -out "$RH/shared.crt" >/dev/null 2>&1
cp "$RH/live/fullchain.pem" /usr/local/share/ca-certificates/rh13-preview.crt; cp "$RH/shared.crt" /usr/local/share/ca-certificates/rh13-shared.crt
update-ca-certificates >/dev/null 2>&1 || bad "fixture: could not trust the fixture certificates"
: > "$RH/headers.conf"; : > "$RH/ssl.conf"; : > "$RH/default.conf"
printf 'server { listen 443 ssl; server_name hideawayseoul.com www.hideawayseoul.com lostinseoul.com www.lostinseoul.com;\n ssl_certificate /etc/nginx/shared.crt; ssl_certificate_key /etc/nginx/shared.key;\n location / { return 200 "shared\\n"; } }\n' > "$RH/shared.conf"
chmod -R a+rX "$RH/live" "$RH"/*.conf "$RH/shared.crt" "$RH/shared.key"; chmod a+x "$RH" "$RH/nginx"
nginx_run; sleep 3
check "R3 fixture: nginx -t passes with v4; the origin serves d4ff8d7d's /login" eval 'docker exec nginx nginx -t >/dev/null 2>&1 && [ "$(curl -s -o /dev/null -w "%{http_code}" --connect-to preview.sophomores.co:443:127.0.0.1:443 https://preview.sophomores.co/login)" = 200 ]'
printf '%s\n' "REL=review-d7409895" "OPS=$V10" "VHOST=$VHOST" "PREVIEW_LOCK=$PREVIEW_LOCK" "LIVE_PREVIEW=none" "LIVE_PORT=3000" "PREVIEW_AUTH_SRC=$RH/preview-auth.json" "MAIL_STAGED=none" > "$V10/run-vars"
stat -c '%i %d' "$VHOST" > "$V10/vhost-stat.txt"
echo "s7 rehearsal" > "$V10/tokens/s7"; echo "s8 rehearsal" > "$V10/tokens/s8"
: > "$PREVIEW_LOCK"; : > "$TLS_LOCK"
cp "$K/upload/"* "$IN/"

# ---------------------------------------------------------------- the gate, typed from the stamped runbook
WANT=$(sha256sum < "$K/upload/transfer.sha256" | cut -d' ' -f1)
eval "$(awk '/^```bash$/{f=1;next} /^```$/{f=0} f' "$K/RUNBOOK-v13.stamped.md" | sed '/^v13_gate </d')"
check "R4 the stamped runbook's v13_gate was extracted" declare -F v13_gate
o=$(v13_gate 0000000000000000000000000000000000000000000000000000000000000000 2>&1)
check "R5 gate: a wrong digest stops before anything is staged" eval '[[ $o == *"not the approved digest"* ]] && [ ! -e "$UOPS/upload" ]'
mv -T "$UOPS" "$UOPS.partial.r5"
o=$(v13_gate "$WANT" 2>&1); echo "$o" | tail -3
check "R6 gate: snapshot = digest, five basenames; u0 admits" eval '[[ $o == *"STEP-u0-OK"* ]] && [ "$(stat -c "%a %U" "$UOPS/upload/review-update.v13.sh")" = "444 root" ]'
. "$UOPS/upload/review-update.v13.sh"; load_vars

# ---------------------------------------------------------------- u1-u3, n1-n3
for s in u1 u2 u3 n1 n2 n3; do o=$(ustep $s 2>&1); echo "$o" | tail -2; check "R7 $s passes" eval '[[ $o == *"STEP-$s-OK"* ]]'; done
check "R8 n2: nginx's routes gained exactly the ingress link route (recorded before/after)" eval '[ "$(comm -13 "$UOPS/n2-routes-before" "$UOPS/n2-routes-after" | wc -l)" = 1 ] && [ -z "$(comm -23 "$UOPS/n2-routes-before" "$UOPS/n2-routes-after")" ]'
check "R9 n3: review-pg on review-db + db13; egress13 empty; IPv6 off on all three" eval '[ "$(nets_of "$(pin pg)" | tr "\n" " ")" = "sophomores-review-db sophomores-review-db13 " ] && members_are "$EGR13" && [ "$(docker network inspect -f "{{.EnableIPv6}}" "$ING" "$DB13" "$EGR13" | sort -u)" = false ]'

# ---------------------------------------------------------------- u4a (C0) and the C0 status probe
check "F0b fidelity again with all networks created (dockerd did not load br_netfilter)" fidelity
o=$(ustep u4a 2>&1); step_rc=$?; show_candidate_result "$o"
check "R10 u4a: C0 created, validated before start, isolated, restarted, isolated again, stopped" eval '[[ $o == *"STEP-u4a-OK"* ]] && [ "$(state_of "$(recorded c0-id)")" = exited ]'
if [ "$step_rc" != 0 ] || [ "$fail" != 0 ]; then
  echo "STOP: phase1 did not prove the C0 prerequisites; dependent checks not run"
  fail=1; finish_phase1; exit 1
fi
m=$(ls "$UOPS"/matrix-c0-[0-9]* 2>/dev/null | head -1)
cover() { local net; [ -n "$1" ] || return 1; for net in sophomores-preview sophomores-review-db sophomores-review-egress hideaway; do grep -q "^PASS .* net=$net .*=ESTABLISHED target=" "$1" || return 1; done; ! grep -qE '^(FAIL|VOID) ' "$1"; }
check "R11 C0 matrix: rows from every untrusted network (preview, review-db, review-egress, hideaway), each PASS with an ESTABLISHED on-network control; no FAIL/VOID" cover "$m"
say "C0 started briefly for the status probe through nginx's ingress path, then stopped again"
COOKIE=$(gate_cookie); docker start "$(recorded c0-id)" >/dev/null; wait_login "$(recorded c0-id)"
NP=$(pid_of "$(pin nginx)"); NSRC=$(ip_on "$(pin nginx)" "$ING")
s0=$(status_via "$NP" "$NSRC" "$(ip_on "$(recorded c0-id)" "$ING")" "$COOKIE"); echo "C0 /api/member/status via nginx's ingress path: $s0"
check "R12 C0 (no env): member status through nginx's ingress path is refused exactly as on the preview today (403 INVALID_ORIGIN)" eval '[ -n "$COOKIE" ] && [ "$s0" = "403 INVALID_ORIGIN" ]'
timeout 60 docker stop -t 20 "$(recorded c0-id)" >/dev/null

# ---------------------------------------------------------------- u4b (C1)
o=$(ustep u4b 2>&1); step_rc=$?; show_candidate_result "$o"
check "R13 u4b: C1 = C0 + exactly one env line, validated before start, isolated, db13 DNS + DB read" eval '[[ $o == *"STEP-u4b-OK"* ]] && [ "$(comm -13 <(env_lines_of "$(recorded c0-id)") <(env_lines_of "$(recorded c1-id)"))" = "$TRUST_LINE" ]'
if [ "$step_rc" != 0 ] || [ "$fail" != 0 ]; then
  echo "STOP: phase1 did not prove the C1 prerequisites; dependent checks not run"
  fail=1; finish_phase1; exit 1
fi
s1=$(status_via "$NP" "$NSRC" "$(ip_on "$(recorded c1-id)" "$ING")" "$COOKIE"); echo "C1 /api/member/status via nginx's ingress path: $s1"
check "R14 C1 (env): member status through nginx's ingress path answers 200 (signed-out member: no data)" eval '[ "${s1%% *}" = 200 ]'
r15() {   # the probe tool sees establishment, and the membership guard fails, when a peer is put on db13
  local pp r rc
  docker network connect "$DB13" sophomores-preview-app || return 1
  pp=$(pid_of sophomores-preview-app); r=$(probe_tcp "$pp" "$(ip_on sophomores-preview-app "$DB13")" "$(ip_on "$(recorded c1-id)" "$DB13")" 3000)
  isolated_ok "$(recorded c1-id)" "$C1" negative >/dev/null; rc=$?
  docker network disconnect "$DB13" sophomores-preview-app
  [ "$r" = ESTABLISHED ] && [ "$rc" != 0 ]
}
check "R15 negative control: a preview stand-in put on db13 ESTABLISHES (the tool detects it) and isolated_ok then fails" r15
r15b_pair_row() {
  awk -v peer="peer=$2" -v net="net=$3" -v source="src=$4" -v target="target=$5" \
    '$3 == peer && $4 == net && $5 == source && $8 == target {print; n++} END {exit n != 1}' "$1"
}
r15b_rule_counts() {
  local table=$1 chain=$2 listing
  listing=$(iptables -w 5 -t "$table" -v -S "$chain") || return 1
  awk -v forward="$3" -v reverse="$4" '
    {for (i=1; i<NF; i++) if ($i=="--comment") {
      tag=$(i+1); gsub(/^"|"$/, "", tag)
      if (tag!=forward && tag!=reverse) continue
      for (j=1; j<NF; j++) if ($j=="-c" && $(j+1)~/^[0-9]+$/ && $(j+2)~/^[0-9]+$/) {
        printf "%s packets=%s bytes=%s\n", tag, $(j+1), $(j+2); n[tag]++
      }
    }} END {exit n[forward] != 1 || n[reverse] != 1}' <<<"$listing"
}
r15b_control_counts() {
  local filter raw
  filter=$(r15b_rule_counts filter DOCKER-USER "$1" "$2") || return 1
  raw=$(r15b_rule_counts raw PREROUTING "$3" "$4") || return 1
  printf '%s\n' "$filter" "$raw"
}
r15b_legacy_bridge() {
  local data id name
  data=$(docker network inspect "$EGRESS" --format '{{.Id}} {{index .Options "com.docker.network.bridge.name"}}') || return 1
  read -r id name <<<"$data"
  [[ $id =~ ^[0-9a-f]{64}$ ]] || return 1
  name=${name:-br-${id:0:12}}
  [[ $name =~ ^[[:alnum:]_.-]{1,15}$ ]] && printf '%s\n' "$name"
}
r15b() (   # The scoped rules and cleanup trap are local to this disposable guest subshell.
  local peer=review-d7409895-phone-receiver peer_id cid pid cpid src dst dev forward_route reverse_route result before after
  local tag fwd_tag rev_tag raw_fwd_tag raw_rev_tag old_bridge raw_before raw_first raw_second
  local f1 f2 row rc1 cleanup_failed=0 open_verified=0
  peer_id=$(cid_of "$peer") && cid=$(recorded c1-id) && pid=$(pid_of "$peer_id") && cpid=$(pid_of "$cid") || return 1
  src=$(ip_on "$peer_id" "$EGRESS") && dst=$(ip_on "$cid" "$EGR13") || return 1
  [[ $peer_id =~ ^[0-9a-f]{64}$ && $src =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ && $dst =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || return 1
  dev=$(dev_of_src "$pid" "$src")
  forward_route=$(route_get "$pid" "$src" "$dst"); reverse_route=$(route_get "$cpid" "$dst" "$src")
  printf 'MATRIX R15b pair=%s/%s net=%s src=%s dev=%s target=%s/%s:3000 forward=%s reverse=%s\n' \
    "$peer" "${peer_id:0:12}" "$EGRESS" "$src" "$dev" "$EGR13" "$dst" "$forward_route" "$reverse_route"
  ns "$pid" ip -o -4 route get "$dst" from "$src" 2>&1 | sed 's/^/MATRIX R15b route-forward /'
  ns "$cpid" ip -o -4 route get "$src" from "$dst" 2>&1 | sed 's/^/MATRIX R15b route-reverse /'
  before=$(iptables -w 5 -S FORWARD) || return 1
  printf '%s\n' "$before" | awk 'NR<=8 {print "MATRIX R15b filter " $0}'
  if [ "$(sed -n '2p' <<<"$before")" != '-A FORWARD -j DOCKER-USER' ]; then
    echo 'MATRIX R15b CONTROL-NOT-OPEN (FORWARD does not enter DOCKER-USER first)'; return 1
  fi
  old_bridge=$(r15b_legacy_bridge) || { echo 'MATRIX R15b CONTROL-NOT-OPEN (legacy bridge not identified)'; return 1; }
  raw_before=$(iptables -w 5 -t raw -S PREROUTING) || return 1
  if ! grep -Fxq -- "-A PREROUTING -d $dst/32 ! -i $EGR13_BR -j DROP" <<<"$raw_before" \
    || ! grep -Fxq -- "-A PREROUTING -d $src/32 ! -i $old_bridge -j DROP" <<<"$raw_before"; then
    echo 'MATRIX R15b CONTROL-NOT-OPEN (expected per-endpoint raw drops not proven)'; return 1
  fi
  printf 'MATRIX R15b raw baseline pair bridges=%s,%s\n' "$old_bridge" "$EGR13_BR"
  result=$(probe_tcp "$pid" "$src" "$dst" 3000)
  printf 'MATRIX R15b direct-before=%s\n' "$result"
  [[ $result =~ $DENIED_RE ]] || { echo 'MATRIX R15b CONTROL-NOT-BASELINE (expected a denied probe)'; return 1; }

  tag=$(cat /proc/sys/kernel/random/uuid) || return 1
  [[ $tag =~ ^[0-9a-f-]{36}$ ]] || return 1
  tag="rh13-r15b-$tag"
  fwd_tag=$tag-forward; rev_tag=$tag-reverse
  raw_fwd_tag=$tag-raw-forward; raw_rev_tag=$tag-raw-reverse
  local -a forward=(-s "$src/32" -d "$dst/32" -p tcp --dport 3000 -m comment --comment "$fwd_tag" -j ACCEPT)
  local -a reverse=(-s "$dst/32" -d "$src/32" -p tcp --sport 3000 -m conntrack --ctstate ESTABLISHED -m comment --comment "$rev_tag" -j ACCEPT)
  local -a raw_forward=(-i "$old_bridge" -s "$src/32" -d "$dst/32" -p tcp --dport 3000 -m comment --comment "$raw_fwd_tag" -j ACCEPT)
  local -a raw_reverse=(-i "$EGR13_BR" -s "$dst/32" -d "$src/32" -p tcp --sport 3000 -m comment --comment "$raw_rev_tag" -j ACCEPT)
  r15b_cleanup() {
    local listing raw_listing raw_clean=1
    if raw_listing=$(iptables -w 5 -t raw -S PREROUTING); then
      if [[ $raw_listing == *"$raw_fwd_tag"* ]]; then iptables -w 5 -t raw -D PREROUTING "${raw_forward[@]}" || raw_clean=0; fi
      if [[ $raw_listing == *"$raw_rev_tag"* ]]; then iptables -w 5 -t raw -D PREROUTING "${raw_reverse[@]}" || raw_clean=0; fi
    else raw_clean=0; fi
    listing=$(iptables -w 5 -S DOCKER-USER) || return 1
    if [[ $listing == *"$fwd_tag"* ]]; then iptables -w 5 -D DOCKER-USER "${forward[@]}" || cleanup_failed=1; fi
    if [[ $listing == *"$rev_tag"* ]]; then iptables -w 5 -D DOCKER-USER "${reverse[@]}" || cleanup_failed=1; fi
    listing=$(iptables -w 5 -S DOCKER-USER) || return 1
    raw_listing=$(iptables -w 5 -t raw -S PREROUTING) || return 1
    [ "$raw_clean" = 1 ] && [ "$cleanup_failed" = 0 ] && [[ $listing != *"$tag"* && $raw_listing = "$raw_before" ]]
  }
  trap 'r15b_cleanup || { echo "STOP: R15b rule cleanup not verified"; exit 1; }' EXIT
  trap 'exit 1' HUP INT TERM
  if iptables -w 5 -I DOCKER-USER 1 "${forward[@]}" && iptables -w 5 -I DOCKER-USER 1 "${reverse[@]}" \
     && iptables -w 5 -C DOCKER-USER "${forward[@]}" && iptables -w 5 -C DOCKER-USER "${reverse[@]}" \
     && iptables -w 5 -t raw -I PREROUTING 1 "${raw_forward[@]}" && iptables -w 5 -t raw -I PREROUTING 1 "${raw_reverse[@]}" \
     && iptables -w 5 -t raw -C PREROUTING "${raw_forward[@]}" && iptables -w 5 -t raw -C PREROUTING "${raw_reverse[@]}" \
     && raw_first=$(iptables -w 5 -t raw -S PREROUTING 1) && [[ $raw_first == *"$raw_rev_tag"* ]] \
     && raw_second=$(iptables -w 5 -t raw -S PREROUTING 2) && [[ $raw_second == *"$raw_fwd_tag"* ]]; then
    printf 'MATRIX R15b raw first %s\nMATRIX R15b raw second %s\n' "$raw_first" "$raw_second"
    result=$(probe_tcp "$pid" "$src" "$dst" 3000)
    printf 'MATRIX R15b direct-open=%s\n' "$result"
    if after=$(r15b_control_counts "$fwd_tag" "$rev_tag" "$raw_fwd_tag" "$raw_rev_tag"); then
      printf '%s\n' "$after" | sed 's/^/MATRIX R15b after-direct /'
      if [ "$result" = ESTABLISHED ] && [ "$(grep -c 'packets=[1-9][0-9]* ' <<<"$after")" = 4 ]; then
        open_verified=1
      fi
    fi
    if [ "$open_verified" = 1 ]; then
      f1="$UOPS/matrix-sensitivity-open-$tag"; refusal_matrix "$cid" "$f1"; rc1=$?
      row=$(r15b_pair_row "$f1" "$peer/${peer_id:0:12}" "$EGRESS" "$src" "$EGR13/$dst:3000") || row=missing-or-duplicate
      printf 'MATRIX R15b open-row %s\n' "$row"
      if after=$(r15b_control_counts "$fwd_tag" "$rev_tag" "$raw_fwd_tag" "$raw_rev_tag"); then printf '%s\n' "$after" | sed 's/^/MATRIX R15b after-matrix /'; fi
    fi
  fi
  r15b_cleanup || { echo 'STOP: R15b rule cleanup not verified'; return 1; }
  trap - EXIT HUP INT TERM
  echo 'MATRIX R15b cleanup VERIFIED'
  if [ "$open_verified" != 1 ]; then
    echo 'MATRIX R15b CONTROL-NOT-OPEN (direct establishment and four rule hits not proven)'
    iptables -w 5 -t raw -S | awk -v src="$src" -v dst="$dst" -v bridge="$EGR13_BR" 'index($0,src) || index($0,dst) || index($0,bridge) {print "MATRIX R15b raw " $0}'
    return 1
  fi
  result=$(probe_tcp "$pid" "$src" "$dst" 3000)
  printf 'MATRIX R15b direct-restored=%s\n' "$result"
  [[ $result =~ $DENIED_RE ]] || return 1
  local open_row=$row
  f2="$UOPS/matrix-sensitivity-closed-$tag"; refusal_matrix "$cid" "$f2" || return 1
  row=$(r15b_pair_row "$f2" "$peer/${peer_id:0:12}" "$EGRESS" "$src" "$EGR13/$dst:3000") || return 1
  printf 'MATRIX R15b restored-row %s\n' "$row"
  if [ "$rc1" = 0 ] || [[ $open_row != 'FAIL '* || $open_row != *' bound=ESTABLISHED '* ]]; then
    echo 'MATRIX R15b MATRIX-MISSED-OPEN-CONTROL'; return 1
  fi
  [[ $row = 'PASS '* ]] && [ "$(grep -c '^PASS ' "$f2")" = 33 ]
)
r15c() {   # target-side probe failures (tool error, BINDFAIL, empty output) are VOID, never PASS; the matrix fails
  local mode f rc ok=0
  eval "$(declare -f probe_tcp | sed '1s/^probe_tcp/probe_tcp_real/')"
  for mode in ERR99 BINDFAIL EMPTY; do
    eval "probe_tcp() { if [ \"\$4\" = 3000 ]; then [ $mode = EMPTY ] || echo $mode; else probe_tcp_real \"\$@\"; fi; }"
    f="$UOPS/matrix-fixture-$mode-$(date -u +%Y%m%dT%H%M%SZ)"; refusal_matrix "$(recorded c1-id)" "$f" >/dev/null; rc=$?
    [ "$rc" != 0 ] && [ -s "$f" ] && ! grep -q '^PASS ' "$f" && grep -q '^VOID .*why=\(bound-connect\|probe\)-not-a-denial' "$f" || ok=1
  done
  eval "$(declare -f probe_tcp_real | sed '1s/^probe_tcp_real/probe_tcp/')"
  return "$ok"
}
check "R15c matrix fixture: a target-side probe ERR, BINDFAIL or empty output gives VOID rows (no PASS) and fails the matrix" r15c
r15d() {   # a missing inventory entry (one view drops a peer) fails the snapshot: no rows are counted
  local o rc
  eval "$(declare -f members_strict | sed '1s/^members_strict/members_strict_real/')"
  members_strict() { if [ "$1" = sophomores-preview ]; then members_strict_real "$1" | tail -n +2; else members_strict_real "$1"; fi; }
  o=$(refusal_matrix "$(recorded c1-id)" "$UOPS/matrix-fixture-inventory-$(date -u +%Y%m%dT%H%M%SZ)"); rc=$?
  eval "$(declare -f members_strict_real | sed '1s/^members_strict_real/members_strict/')"
  [ "$rc" != 0 ] && [[ $o == *"topology snapshot failed"* ]]
}
check "R15d matrix fixture: one Docker view missing a peer fails the topology snapshot (VOID), not a shorter green matrix" r15d
check "R15b matrix sensitivity: named peer establishes and its exact row fails while open; cleanup verified and full matrix passes" r15b
if [ "$fail" != 0 ]; then
  echo 'STOP: phase1 did not prove matrix sensitivity and prerequisites; no cutover rehearsal'
  finish_phase1; exit 1
fi

# ---------------------------------------------------------------- u5 with the shell killed; reconcile; u6
say "u5 from a shell killed at the intent checkpoint while the unit runs"
setsid bash -c ". $UOPS/upload/review-update.v13.sh; ustep u5" > "$RH/u5-shell.out" 2>&1 & sp=$!
for i in $(seq 1 12000); do [ -e "$UOPS/vhost-intent" ] && break; sleep 0.05; done
kill -9 "$sp" 2>/dev/null; systemctl is-active --quiet "$UREL-u5.service" && KA=1 || KA=0
check "R16a the shell was killed at the intent checkpoint while the u5 unit was active" eval '[ "$KA" = 1 ]'
for i in $(seq 1 300); do systemctl is-active --quiet "$UREL-u5.service" || break; sleep 1; done
check "R16 u5: CUTOVER-PROVEN although its shell died (v5 on the inode; other vhosts unchanged)" eval 'grep -q "^CUTOVER-PROVEN" "$UOPS/u5.out" && [ "$(vhost_state)" = v5 ] && cmp -s "$UOPS/shared-before" "$UOPS/shared-after"'
o=$(update_reconcile u5 2>&1); echo "$o" | tail -1
check "R17 reconcile u5, then u6 (boundary + db13 gate again after the cutover)" eval '[[ $o == *"RECONCILED-OK u5"* ]] && [[ "$(ustep u6 2>&1)" == *STEP-u6-OK* ]]'
s2=$(curl -s -o /dev/null -w '%{http_code}' --connect-to preview.sophomores.co:443:127.0.0.1:443 -H "cookie: $COOKIE" -H 'accept: application/json' https://preview.sophomores.co/api/member/status)
C1IP=$(ip_on "$(recorded c1-id)" "$ING"); NP=$(pid_of "$(pin nginx)"); NSRC=$(ip_on "$(pin nginx)" "$ING")
a1=$(status_hdr "$NP" "$NSRC" "$C1IP" "$COOKIE" preview.sophomores.co preview.sophomores.co)
a2=$(status_hdr "$NP" "$NSRC" "$C1IP" "$COOKIE" evil.example preview.sophomores.co)
a3=$(status_hdr "$NP" "$NSRC" "$C1IP" "$COOKIE" preview.sophomores.co evil.example)
echo "after the cutover: origin status $s2; on C1 directly: right Host/XFH $a1, wrong Host $a2, wrong X-Forwarded-Host $a3"
g=$(nsenter -t "$NP" -n curl -s -w '\n%{http_code}' --interface "$NSRC" --max-time 10 -H 'host: preview.sophomores.co' -H 'x-forwarded-proto: https' -H 'accept: application/json' "http://$C1IP:3000/api/member/status")
echo "C1 without the gate cookie: $(tail -n 1 <<<"$g") '$(sed '$d' <<<"$g")'"
check "R18b the preview gate's own denial, exactly: no cookie -> 401 'Authentication required.' (src/proxy.ts)" eval '[ "$(tail -n 1 <<<"$g")" = 401 ] && [ "$(sed "\$d" <<<"$g")" = "Authentication required." ]'
check "R18 status 200 through the real origin on v5 (signed-out member, no data); on C1: right Host/XFH 200 (control); wrong Host and wrong X-Forwarded-Host each exactly 403 INVALID_ORIGIN" eval '
  [ "$s2" = 200 ] && [ "${a1%% *}" = 200 ] && [ "$a2" = "403 INVALID_ORIGIN" ] && [ "$a3" = "403 INVALID_ORIGIN" ]'

# ---------------------------------------------------------------- survival: container restart, daemon restart
life() { docker inspect "$1" --format '{{.State.StartedAt}} {{.State.Pid}} {{.RestartCount}}'; }
dlife() { systemctl show docker -p MainPID -p ExecMainStartTimestampMonotonic --value | tr '\n' ' '; }
# Review-B acceptance note (msg_5d31074322e3): an identity row counts only when IDs and timestamps are populated on both sides.
life_ok() { local a b c; read -r a b c <<<"$1"; [[ $a =~ ^20[0-9]{2}-[0-9]{2}-[0-9]{2}T ]] && [[ $b =~ ^[1-9][0-9]*$ ]] && [[ $c =~ ^[0-9]+$ ]]; }
dlife_ok() { local a b; read -r a b <<<"$1"; [[ $a =~ ^[1-9][0-9]*$ ]] && [[ $b =~ ^[1-9][0-9]*$ ]]; }
l0=$(life "$(recorded c1-id)"); docker restart -t 20 "$(recorded c1-id)" >/dev/null; rrc=$?; wait_login "$(recorded c1-id)"; l1=$(life "$(recorded c1-id)")
echo "C1 lifecycle across docker restart: rc=$rrc '${l0% *}' -> '${l1% *}'"
check "R19 a C1 container restart that really happened (rc 0; start time and PID changed), then boundary, nginx reach, db13 gate" eval '
  [ "$rrc" = 0 ] && life_ok "$l0" && life_ok "$l1" && [ "$(cut -d" " -f1 <<<"$l0")" != "$(cut -d" " -f1 <<<"$l1")" ] && [ "$(cut -d" " -f2 <<<"$l0")" != "$(cut -d" " -f2 <<<"$l1")" ] \
  && isolated_ok "$(recorded c1-id)" "$C1" r19 >/dev/null && prove_origin new'
d0=$(dlife); l0=$(life "$(recorded c1-id)"); systemctl restart docker; drc=$?; sleep 5; docker_user_replica; d1=$(dlife); l1=$(life "$(recorded c1-id)")
require_smtp_fence daemon-restart || { fail=1; finish_phase1; exit 1; }
echo "daemon across systemctl restart docker: rc=$drc '$d0' -> '$d1'; C1 '$l0' -> '$l1'"
check "R20 a daemon restart that really happened (rc 0; dockerd PID and start time changed) while C1 kept its start time and PID (live-restore); nginx on ingress, pg on db13, boundary holds, origin = C1" eval '
  [ "$drc" = 0 ] && dlife_ok "$d0" && dlife_ok "$d1" && life_ok "$l0" && life_ok "$l1" && [ "$(cut -d" " -f1 <<<"$d0")" != "$(cut -d" " -f1 <<<"$d1")" ] && [ "$(cut -d" " -f2 <<<"$d0")" != "$(cut -d" " -f2 <<<"$d1")" ] && [ "$l0" = "$l1" ] \
  && shared_attached_ok >/dev/null && isolated_ok "$(recorded c1-id)" "$C1" r20 >/dev/null && prove_origin new'
peak() { local f; f=$(find /sys/fs/cgroup -path "*$1*" -name memory.peak 2>/dev/null | head -1); [ -n "$f" ] && awk '{printf "%d", $1/1048576}' "$f" || echo -1; }
echo "MEASURE C1 cgroup peak $(peak "$(recorded c1-id)") MiB of 832; VM MemAvailable $(awk '$1=="MemAvailable:"{printf "%d MiB", $2/1024}' /proc/meminfo)"
for u in n1 n2 n3 u4a u4b u5; do echo "MEASURE locks held in $u: $(grep -h '^LOCKS-HELD ' "$UOPS/$u.out" 2>/dev/null | tr '\n' ' ')"; done
cat /proc/sys/kernel/random/boot_id > "$RH/boot_id.phase1" || exit 1
finish_phase1; exit $?
fi

# ================================================================ phase 2: after a VM reboot
[ -d "$UOPS" ] || { echo "FAIL phase2 without phase1"; exit 1; }
p1=$(cat "$RH/phase1.fail" 2>/dev/null || echo 1)
[ "$p1" = 0 ] || { echo 'STOP: phase2 requires a passed phase1'; exit 1; }
require_smtp_fence reboot || exit 1
modprobe -r br_netfilter 2>/dev/null
check "F1 fidelity after reboot" fidelity
check "R21a this is a different boot (both boot IDs populated, and they differ)" eval '[[ $(cat "$RH/boot_id.phase1" 2>/dev/null) =~ ^[0-9a-f-]{36}$ ]] && [[ $(cat /proc/sys/kernel/random/boot_id) =~ ^[0-9a-f-]{36}$ ]] && [ "$(cat /proc/sys/kernel/random/boot_id)" != "$(cat "$RH/boot_id.phase1")" ]'
docker_user_replica   # on the VPS ufw restores its chains at boot; here the replica is re-applied
. "$UOPS/upload/review-update.v13.sh"; load_vars
for i in $(seq 1 120); do c1_ready && prev_ready && break; sleep 1; done
check "R21 after a VM reboot: C1 back on exactly its three networks, nginx on ingress, pg on db13, boundary holds, origin = C1" eval '
  shared_attached_ok >/dev/null && isolated_ok "$(recorded c1-id)" "$C1" r21 >/dev/null && prove_origin new'

# ---------------------------------------------------------------- recreation: nginx and pg get new IDs; re-pin, attach
say "recreate nginx with its original config (new ID): every step stops; re-pin + attach restore the route"
docker rm -f nginx >/dev/null; nginx_run; sleep 3
o=$(ACCEPT_MSG=msg_000000000000 ustep u7 2>&1); echo "$o" | tail -1
check "R22 with nginx recreated: u7 refuses (Re-pin); update_status says NOT-PINNED" eval '[[ $o == *"Re-pin"* ]] && [[ "$(update_status)" == *"nginx=NOT-PINNED-OR-CHANGED"* ]]'
o=$(update_repin nginx "$(cid_of nginx)" 2>&1); echo "$o" | tail -1; o2=$(nginx_attach 2>&1); echo "$o2" | tail -1
check "R23 update_repin nginx <full id> (generation 0002), then nginx_attach: the v5 route proven again" eval '[[ $o == *"REPINNED nginx generation 0002"* ]] && [[ $o2 == *NGINX-ATTACHED* ]] && prove_origin new'
o=$(update_repin nginx 0000000000000000000000000000000000000000000000000000000000000000 2>&1)
check "R24 re-pin refuses an ID that is not the running nginx" eval '[[ $o == *STOP* ]] && [ "$(pin_gen nginx)" = 2 ]'
say "recreate review-pg on the same data volume (new ID)"
docker rm -f sophomores-review-pg >/dev/null; pg_run >/dev/null
for i in $(seq 1 60); do docker exec sophomores-review-pg pg_isready -U review_super >/dev/null 2>&1 && break; sleep 1; done; sleep 2
o=$(update_repin pg "$(cid_of sophomores-review-pg)" 2>&1); echo "$o" | tail -1
docker stop -t 20 "$(recorded c1-id)" >/dev/null; o3=$(pg_attach 2>&1); echo "$o3" | tail -1; docker start "$(recorded c1-id)" >/dev/null; wait_login "$(recorded c1-id)"
check "R25a on v5 with C1 down, pg_attach does not succeed (no db13 gate) and leaves pg detached" eval '[[ $o3 != *PG-ATTACHED* ]] && ! has_net "$(pin pg)" "$DB13"'
o2=$(pg_attach 2>&1); echo "$o2" | tail -1
check "R25 update_repin pg, then pg_attach: C1's db13 DNS + DB read pass again" eval '[[ $o == *"REPINNED pg generation 0002"* ]] && [[ $o2 == *PG-ATTACHED* ]] && db13_gate "$(recorded c1-id)"'

# ---------------------------------------------------------------- rollback, boundary after rollback, vhost states
docker network connect "$DB13" sophomores-preview-app
o=$(update_rollback 2>&1); rc=$?; echo "$o" | tail -2; docker network disconnect "$DB13" sophomores-preview-app
check "R26a rollback with C1's boundary broken (a stand-in on db13): ROUTE-RESTORED-BOUNDARY-NOT-PROVEN, rc 3, route on v4" eval '[ "$rc" = 3 ] && [[ $o == *ROUTE-RESTORED-BOUNDARY-NOT-PROVEN* ]] && [[ $o != *ROLLED-BACK* ]] && [ "$(vhost_state)" = v4 ] && prove_origin prev'
docker stop -t 20 "$(recorded c1-id)" >/dev/null
printf '%s' "$NEW8" | dd of="$VHOST" bs=8 count=1 seek=2417 oflag=seek_bytes conv=notrunc status=none
o=$(update_repair 2>&1); rc=$?; echo "$o" | tail -2
check "R26b repair on valid v5 bytes with C1 down (not fenced: restart unless-stopped) restores and proves v4, then HOLDs (rc 3)" eval '
  [ "$rc" = 3 ] && [[ $o == *ROUTE-RESTORED-BOUNDARY-NOT-PROVEN* ]] && [ "$(vhost_state)" = v4 ] && prove_origin prev'
docker start "$(recorded c1-id)" >/dev/null; wait_login "$(recorded c1-id)"
printf '%s' "$NEW8" | dd of="$VHOST" bs=8 count=1 seek=2417 oflag=seek_bytes conv=notrunc status=none
docker network connect "$DB13" sophomores-preview-app
o=$(update_repair 2>&1); rc=$?; echo "$o" | tail -2; docker network disconnect "$DB13" sophomores-preview-app
check "R26c repair on valid v5 bytes with C1 RUNNING and its boundary failed: v5 not kept; v4 restored and proven; HOLD rc 3 (never a silent green)" eval '
  [ "$rc" = 3 ] && [[ $o == *ROUTE-RESTORED-BOUNDARY-NOT-PROVEN* ]] && [[ $o != *"REPAIRED ("* ]] && [ "$(vhost_state)" = v4 ] && prove_origin prev'
o=$(update_repair 2>&1); rc=$?; echo "$o" | tail -1
check "R26d repair with v4 already on disk and the boundary intact again: rc 0, BOUNDARY-AFTER-ROUTE-RESTORE-OK" eval '[ "$rc" = 0 ] && [[ $o == *BOUNDARY-AFTER-ROUTE-RESTORE-OK* ]]'
o=$(update_rollback 2>&1); echo "$o" | tail -2
check "R26 rollback again with the boundary intact: ROLLED-BACK with BOUNDARY-AFTER-ROUTE-RESTORE-OK on the running C1, route on v4" eval '[[ $o == *ROLLED-BACK* ]] && [[ $o == *BOUNDARY-AFTER-ROUTE-RESTORE-OK* ]] && [ "$(vhost_state)" = v4 ] && prove_origin prev'
mr=$(curl -s --connect-to preview.sophomores.co:443:127.0.0.1:443 -H "cookie: $(gate_cookie)" -H 'accept: application/json' 'https://preview.sophomores.co/api/media?limit=5' | python3 -I -c 'import json,sys; print(json.load(sys.stdin).get("totalDocs"))' 2>/dev/null)
check "R27 after rollback: a signed-in DB-backed media read through the origin lists the one row" eval '[ "$mr" = 1 ]'
dd if="$K10/sophomores-preview.review.v3.conf" of="$VHOST" conv=notrunc status=none
o=$(update_repair 2>&1); echo "$o" | tail -1
check "R28 v12's v3 on disk: v13 repair writes nothing (ESCALATE, still v3)" eval '[[ $o == *ESCALATE* ]] && [ "$(vhost_state)" = v3 ]'
dd if="$UOPS/upload/sophomores-preview.review.v4.conf" of="$VHOST" conv=notrunc status=none
printf 'zzzzzzzz' | dd of="$VHOST" bs=8 count=1 seek=2417 oflag=seek_bytes conv=notrunc status=none
o=$(update_repair 2>&1); echo "$o" | tail -1
check "R29 a window that is not a mix of d4ff8d7d/NEW8 is foreign: repair writes nothing" eval '[[ $o == *ESCALATE* ]] && [ "$(vhost_state)" = foreign ]'
printf '%s' "${NEW8:0:4}${PREV8:4:4}" | dd of="$VHOST" bs=8 count=1 seek=2417 oflag=seek_bytes conv=notrunc status=none
o=$(update_repair 2>&1); echo "$o" | tail -1
check "R30 a torn mix of our two names: repair writes v4 and reloads" eval '[[ $o == *REPAIRED* ]] && [ "$(vhost_state)" = v4 ] && prove_origin prev'
flock "$PREVIEW_LOCK" sleep 75 & lp=$!; sleep 1
o=$(update_repair 2>&1); echo "$o" | tail -1
check "R31 with the preview lock held elsewhere, repair stops (locks not acquired), vhost untouched" eval '[[ $o == *"locks not acquired"* ]] && [ "$(vhost_state)" = v4 ]'
wait "$lp" 2>/dev/null

# ---------------------------------------------------------------- undo the networks, in order
o=$(nginx_detach 2>&1); echo "$o" | tail -1
check "R32 nginx_detach refuses before fence_candidate" eval '[[ $o == *STOP* ]] && has_net "$(pin nginx)" "$ING"'
docker rename "$C1" "$C1-aside"; o=$(fence_candidate 2>&1); echo "$o" | tail -1
check "R32a fence refuses a recorded C1 that is no longer the container by that name (identity), touching nothing" eval '[[ $o == *"not this update"* ]] && running "$(recorded c1-id)"'
mv "$UOPS/c1-id" "$UOPS/c1-id.aside"; o=$(fence_candidate 2>&1); echo "$o" | tail -1
check "R32b fence blocks when C1's intent exists but no container can be found (UNKNOWN)" eval '[[ $o == *UNKNOWN* ]]'
mv "$UOPS/c1-id.aside" "$UOPS/c1-id"; docker rename "$C1-aside" "$C1"
for f in fence_candidate nginx_detach pg_detach net_rollback; do o=$($f 2>&1); echo "$o" | tail -1; check "R33 $f" eval '[[ $o != *STOP* && $o != *ESCALATE* ]]'; done
check "R34 after the network rollback: the three networks gone, nginx/pg on their original networks, origin = d4ff8d7d, C0/C1 kept (stopped)" eval '
  net_free "$ING" && net_free "$DB13" && net_free "$EGR13" && [ "$(nets_of "$(pin pg)")" = sophomores-review-db ] && ! has_net "$(pin nginx)" "$ING" && prove_origin prev \
  && [ "$(state_of "$(recorded c1-id)")" = exited ] && [ "$(state_of "$(recorded c0-id)")" = exited ]'
for u in rollback repair nginx-attach pg-attach fence nginx-detach pg-detach net-rollback; do echo "MEASURE locks held in $u: $(grep -h '^LOCKS-HELD ' "$UOPS/$u.out" 2>/dev/null | tr '\n' ' ')"; done
echo "RESULT: phase2 $n passed; phase1 fail=$p1 phase2 fail=$fail"
[ "$fail" = 0 ] && [ "$p1" = 0 ]
