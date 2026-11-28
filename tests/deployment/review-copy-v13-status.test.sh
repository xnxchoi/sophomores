#!/bin/bash
# Offline exercise of the exact probe function; curl and nsenter are stubs.
set -eu
script=${1:?provide candidate helper}
source <(sed -n '/^status_probe() {/,/^status_unit_core() {/p' "$script" | sed '$d')
tmp=$(mktemp -d)
trap 'rm -r -- "$tmp"' EXIT
export PATH="$tmp:$PATH"
status_cookie=$(python3 -I -c 'import base64,json,time; exp=int(time.time())+1200; claims=dict(v=1,iat=exp-43200,exp=exp,nonce="a"*32); print("__Host-sophomores-preview="+base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")+"."+"a"*43)')
cat > "$tmp/nsenter" <<'SH'
#!/bin/bash
[ "$1 $2 $3 $4" = '-t 42 -n --' ] || exit 9
shift 4
exec "$@"
SH
cat > "$tmp/curl" <<'SH'
#!/bin/bash
set -eu
for arg in "$@"; do case "$arg" in *__Host-sophomores-preview*|--location|-L) exit 9;; esac; done
[ "${status_cookie+x}" != x ] || exit 9
read -r input
[[ $input = 'header = "Cookie: __Host-sophomores-preview='* ]] || exit 9
case "$EXPECTED_CASE" in
  wrong-host) [[ " $* " = *' Host: invalid.example '* && " $* " = *' X-Forwarded-Host: preview.sophomores.co '* ]] || exit 9 ;;
  wrong-xfh) [[ " $* " = *' Host: preview.sophomores.co '* && " $* " = *' X-Forwarded-Host: invalid.example '* ]] || exit 9 ;;
  via-nginx) [[ " $* " = *' --connect-to preview.sophomores.co:443:127.0.0.1:443 '* && " $* " = *' https://preview.sophomores.co/api/member/status '* ]] || exit 9 ;;
  *) [[ " $* " = *' --interface 192.0.2.1 '* && " $* " = *' http://192.0.2.2:3000/api/member/status '* ]] || exit 9 ;;
esac
printf '%s\n%s' "$RESPONSE_BODY" "$RESPONSE_CODE"
SH
chmod 0700 "$tmp/nsenter" "$tmp/curl"
export EXPECTED_CASE RESPONSE_CODE RESPONSE_BODY
denied='{"success":false,"error":{"code":"INVALID_ORIGIN"}}'
signed_out='{"success":true,"data":{"authenticated":false,"phoneBindingAuth":"anonymous","emailVerified":false,"phoneBound":false,"member":false,"capabilities":{"emailOtp":true,"magicLink":true,"google":true,"apple":true,"kakao":false,"passkey":true}}}'
expect() {
  EXPECTED_CASE=$1 RESPONSE_CODE=$2 RESPONSE_BODY=$3
  local rc=0
  status_probe "$1" 192.0.2.1 192.0.2.2 42 || rc=$?
  [ "$rc" = "$4" ] || { printf 'FAIL %s status %s\n' "$1" "$2"; exit 1; }
  printf 'PASS %s status %s expected probe exit %s\n' "$1" "$2" "$4"
}
for probe in c0 wrong-host wrong-xfh; do expect "$probe" 403 "$denied" 0; done
for probe in c1 via-nginx; do expect "$probe" 200 "$signed_out" 0; done
expect c0 401 'Authentication required.' 1
expect c0 503 '{"success":false,"error":{"code":"UNAVAILABLE"}}' 1
expect c1 303 "$signed_out" 1
expect c1 200 "${signed_out/\"authenticated\":false/\"authenticated\":true}" 1
expect via-nginx 200 "${signed_out/\"member\":false/\"member\":false,\"email\":\"synthetic@example.test\"}" 1
status_cookie="$status_cookie; member=invalid"
expect c1 200 "$signed_out" 1
