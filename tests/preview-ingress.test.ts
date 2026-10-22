import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const hookPath = new URL(
  "../deployment/ops/certbot-reload-sophomores-preview.sh",
  import.meta.url
);

function invoke(overrides: Readonly<Record<string, string | undefined>> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "soph-tls-hook-"));
  try {
    const source = readFileSync(hookPath, "utf8").replace(
      "/run/lock/hideaway-nginx-tls.lock",
      join(dir, "lock")
    );
    writeFileSync(join(dir, "hook"), source);
    const stubs = {
      flock: '#!/bin/sh\n[ "$FAIL" != lock ]',
      sleep: "#!/bin/sh\nexit 0",
      timeout: '#!/bin/sh\nshift\nexec "$@"',
      docker: `#!/bin/sh
echo "$*" >> "$CALLS"
case "$*" in
  *'cat '*) [ "$FAIL" = mount-read ] && exit 1; echo "$MOUNTED" ;;
  *'nginx -t'*) [ "$FAIL" != syntax ] ;;
  *'nginx -s reload'*) [ "$FAIL" != reload ] ;;
  *) exit 99 ;;
esac`,
      openssl: `#!/bin/sh
echo "openssl $*" >> "$CALLS"
case "$*" in
  's_client '*) [ "$FAIL" = handshake ] && exit 1; echo "$SERVED" ;;
  *-checkend*) [ "$FAIL" != expired ] ;;
  'verify '*) [ "$FAIL" != hostname ] ;;
  *-fingerprint*)
    [ "$FAIL" = empty ] && exit 0
    case "$*" in *' -in '*) value=NEW ;; *) read -r value ;; esac
    [ -n "$value" ] || exit 1
    echo "sha256 Fingerprint=$value" ;;
  *) exit 98 ;;
esac`
    };
    for (const [name, body] of Object.entries(stubs)) {
      const file = join(dir, name);
      writeFileSync(file, body);
      chmodSync(file, 0o700);
    }
    const calls = join(dir, "calls");
    writeFileSync(calls, "");
    const result = spawnSync("bash", [join(dir, "hook")], {
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        RENEWED_LINEAGE: "/etc/letsencrypt/live/preview.sophomores.co",
        CALLS: calls,
        FAIL: "",
        MOUNTED: "NEW",
        SERVED: "NEW",
        ...overrides
      },
      encoding: "utf8",
      timeout: 15000
    });
    return { ...result, calls: readFileSync(calls, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("reload succeeds only after certificate verification", () => {
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /nginx -s reload/);
  assert.match(result.stdout, /verified/);
});

test("unrelated lineage is ignored without Docker access", () => {
  const result = invoke({
    RENEWED_LINEAGE: "/etc/letsencrypt/live/other.example"
  });
  assert.equal(result.status, 0);
  assert.equal(result.calls, "");
});

test("missing lineage fails closed", () => {
  assert.notEqual(invoke({ RENEWED_LINEAGE: "" }).status, 0);
});

for (const fail of [
  "lock",
  "mount-read",
  "syntax",
  "expired",
  "hostname",
  "empty"
]) {
  test(`${fail} blocks reload`, () => {
    const result = invoke({ FAIL: fail });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.calls, /nginx -s reload/);
  });
}

test("stale mounted certificate blocks reload", () => {
  const result = invoke({ MOUNTED: "OLD" });
  assert.notEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.calls, /nginx -s reload/);
});

for (const overrides of [
  { FAIL: "reload" },
  { FAIL: "handshake" },
  { SERVED: "OLD" }
]) {
  test(`reload or serving failure is not success: ${JSON.stringify(overrides)}`, () => {
    const result = invoke(overrides);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /verified/);
  });
}

const configPath = new URL(
  "../deployment/ops/sophomores-preview.conf",
  import.meta.url
);
const config = () => readFileSync(configPath, "utf8");

test("HTTP only exposes ACME and a fixed-host HTTPS redirect", () => {
  const http = config().split("listen 443")[0];
  assert.match(http, /listen 80;/);
  assert.match(http, /location \^~ \/\.well-known\/acme-challenge\//);
  assert.match(http, /root \/var\/www\/certbot;/);
  assert.match(http, /try_files \$uri =404;/);
  assert.match(
    http,
    /return 301 https:\/\/preview\.sophomores\.co\$request_uri;/
  );
  assert.doesNotMatch(http, /proxy_pass|https:\/\/\$host/);
});

test("TLS uses Next for authentication and preserves the isolated AR upstream", () => {
  const tls = config().split("listen 443")[1];
  const serverScope = tls.split("location =")[0];
  assert.match(tls, /server_name preview\.sophomores\.co;/);
  assert.doesNotMatch(serverScope, /^\s*auth_request/m);
  assert.doesNotMatch(
    tls,
    /auth_basic|satisfy any|allow all|sophomores-preview-auth/
  );
  assert.match(tls, /location = \/api\/session\/verify \{\s*internal;/);
  assert.equal((tls.match(/proxy_pass http:/g) || []).length, 3);
  assert.match(
    tls,
    /ssl_certificate \/etc\/letsencrypt\/live\/preview\.sophomores\.co\/fullchain.pem;/
  );
});

test("AR verification is internal, bodyless, cookie-only and served by Next", () => {
  const verifier = config().split("location = /api/session/verify {")[1]?.split("}")[0];
  assert.ok(verifier);
  for (const directive of [
    "internal;",
    "auth_request off;",
    "resolver 127.0.0.11 valid=30s ipv6=off;",
    "resolver_timeout 5s;",
    "proxy_pass http://$sophomores_preview_upstream/api/session/verify;",
    "proxy_pass_request_body off;",
    "proxy_pass_request_headers off;",
    'proxy_set_header Content-Length "";',
    "proxy_set_header Host preview.sophomores.co;",
    "proxy_set_header X-Forwarded-Proto https;",
    "proxy_set_header Cookie $http_cookie;",
    'proxy_set_header Authorization "";',
    'proxy_set_header Proxy-Authorization "";',
    "proxy_connect_timeout 2s;",
    "proxy_read_timeout 3s;",
    "proxy_cache off;"
  ]) assert.ok(verifier.includes(directive), directive);
});

test("isolated AR route preserves its upstream behavior behind the new login gate", () => {
  const ar = config().split("location ~ ^/ar(?:/|$) {")[1]?.split("}")[0];
  assert.ok(ar);
  for (const directive of [
    "auth_request /api/session/verify;",
    "error_page 401 =303 https://preview.sophomores.co/login;",
    "set $sophomores_ar_upstream sophomores-preview-ar:8080;",
    "resolver 127.0.0.11 valid=30s ipv6=off;",
    "resolver_timeout 5s;",
    "proxy_pass http://$sophomores_ar_upstream;",
    "proxy_http_version 1.1;",
    "proxy_set_header Host preview.sophomores.co;",
    'proxy_set_header Connection "";',
    'proxy_set_header Cookie "";',
    'proxy_set_header Authorization "";',
    'proxy_set_header Proxy-Authorization "";',
    "proxy_connect_timeout 3s;",
    "proxy_read_timeout 15s;",
    "proxy_send_timeout 15s;",
    "proxy_cache off;",
    "proxy_hide_header Cache-Control;",
    "proxy_hide_header Expires;",
    "proxy_hide_header X-Robots-Tag;"
  ]) assert.ok(ar.includes(directive), directive);
  assert.doesNotMatch(config(), /__preview/);
});

test("password attempts have separate bounded limits and no Basic challenge", () => {
  const conf = config();
  assert.match(
    conf,
    /map "\$request_method:\$uri" \$sophomores_preview_login_key/
  );
  assert.match(conf, /"POST:\/api\/session" \$binary_remote_addr;/);
  assert.match(conf, /zone=sophomores_preview_login:1m rate=5r\/m;/);
  assert.match(
    conf,
    /limit_req zone=sophomores_preview_login burst=10 nodelay;/
  );
  assert.match(conf, /client_max_body_size 4k;/);
  assert.match(
    conf,
    /"POST:\/api\/session\/logout" \$binary_remote_addr;/
  );
  assert.doesNotMatch(conf, /sophomores-preview-auth/);
});

test("private proxy strips credentials/cache and uses isolated Docker DNS", () => {
  const conf = config();
  assert.match(conf, /resolver 127\.0\.0\.11 valid=30s ipv6=off;/);
  assert.match(
    conf,
    /set \$sophomores_preview_upstream sophomores-preview-app:3000;/
  );
  assert.match(conf, /proxy_pass http:\/\/\$sophomores_preview_upstream;/);
  assert.match(conf, /proxy_set_header Authorization "";/);
  assert.match(conf, /proxy_set_header Proxy-Authorization "";/);
  assert.match(conf, /proxy_hide_header Cache-Control;/);
  assert.match(conf, /proxy_hide_header Expires;/);
  assert.match(conf, /proxy_cache off;/);
  assert.match(conf, /add_header Cache-Control "private, no-store" always;/);
  assert.match(
    conf,
    /add_header X-Robots-Tag "noindex, nofollow, nosnippet" always;/
  );
  assert.match(conf, /include \/etc\/nginx\/headers.conf;/);
  assert.match(
    conf,
    /limit_req_zone \$binary_remote_addr zone=sophomores_preview_auth:10m rate=5r\/s;/
  );
  assert.match(
    conf,
    /limit_req zone=sophomores_preview_auth burst=100 nodelay;/
  );
  assert.match(conf, /limit_req_status 429;/);
  assert.match(conf, /client_max_body_size 4k;/);
  assert.match(conf, /proxy_read_timeout 60s;/);
});

test("renewal checks only the preview hostname and shares the proxy reload lock", () => {
  const source = readFileSync(hookPath, "utf8");
  assert.match(source, /\/run\/lock\/hideaway-nginx-tls.lock/);
  const result = invoke();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /-verify_hostname preview\.sophomores\.co/);
  assert.doesNotMatch(result.calls, /hideawayseoul\.com|lostinseoul\.com/);
  const verify = result.calls.indexOf("openssl verify");
  const syntax = result.calls.indexOf("nginx -t");
  const reload = result.calls.indexOf("nginx -s reload");
  assert.ok(verify >= 0 && syntax > verify && reload > syntax);
});

test("TLS inherits shared SSL headers/resolver without duplicate directives", () => {
  const tls = config().split("listen 443")[1];
  const serverScope = tls.split("location =")[0];
  const locationScope = tls.split("location / {")[1];
  assert.match(serverScope, /include \/etc\/nginx\/ssl.conf;/);
  assert.doesNotMatch(serverScope, /include \/etc\/nginx\/headers.conf;/);
  assert.doesNotMatch(serverScope, /resolver(?:_timeout)? /);
  assert.match(locationScope, /resolver 127\.0\.0\.11 valid=30s ipv6=off;/);
  assert.match(locationScope, /resolver_timeout 5s;/);
  assert.match(
    locationScope,
    /proxy_pass http:\/\/\$sophomores_preview_upstream;/
  );
});

test("Next bypass headers are stripped without breaking legitimate RSC navigation", () => {
  const conf = config();
  for (const name of [
    "X-Middleware-Subrequest",
    "X-Middleware-Rewrite",
    "X-Middleware-Override-Headers",
    "X-Middleware-Redirect",
    "X-Middleware-Set-Cookie",
    "X-Middleware-Skip",
    "X-Middleware-Next",
    "X-Now-Route-Matches",
    "X-Matched-Path",
    "X-Nextjs-Rewritten-Path",
    "X-Nextjs-Rewritten-Query"
  ]) {
    assert.ok(conf.includes(`proxy_set_header ${name} "";`), name);
  }
  assert.doesNotMatch(
    conf,
    /proxy_set_header (?:RSC|Next-Router-State-Tree|Next-Router-Prefetch) "";/i
  );
});

test("Next location isolates shared headers while preserving the application CSP", () => {
  const location = config().split("listen 443")[1].split("location / {")[1];
  assert.ok(location);
  for (const directive of [
    'add_header Cache-Control "private, no-store" always;',
    'add_header X-Robots-Tag "noindex, nofollow, nosnippet" always;',
    'add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;',
    'add_header X-Frame-Options "SAMEORIGIN" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "same-origin" always;',
    'add_header Cross-Origin-Opener-Policy "same-origin" always;',
    'add_header Cross-Origin-Embedder-Policy "unsafe-none" always;',
    'add_header Cross-Origin-Resource-Policy "cross-origin" always;',
    'add_header Permissions-Policy "magnetometer=(), microphone=(), payment=(), usb=()" always;',
    "proxy_hide_header Referrer-Policy;",
    "proxy_hide_header X-Powered-By;"
  ]) assert.ok(location.includes(directive), directive);
  assert.doesNotMatch(location, /(?:add_header|proxy_hide_header) Content-Security-Policy\b/i);
  assert.doesNotMatch(location, /include \/etc\/nginx\/(?:ssl|headers)\.conf;/);
});
