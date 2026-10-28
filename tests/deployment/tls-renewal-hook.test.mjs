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
  "../../deployment/ops/certbot-reload-nginx.sh",
  import.meta.url
);

function invoke(overrides = {}) {
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
        RENEWED_LINEAGE: "/etc/letsencrypt/live/hideawayseoul.com",
        CALLS: calls,
        FAIL: "",
        MOUNTED: "NEW",
        SERVED: "NEW",
        ...overrides
      },
      encoding: "utf8",
      timeout: 5000
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
