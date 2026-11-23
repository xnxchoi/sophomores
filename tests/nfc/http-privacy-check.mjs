import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer, request } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
assert.equal(require("next/package.json").version, "16.5.0-canary.27");
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
const { port } = reservation.address();
await new Promise(resolve => reservation.close(resolve));
const dev = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev",
  "--turbopack", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "inherit" });
const completed = once(dev, "exit");
const send = (path, headers = {}, method = "GET", input) => new Promise((resolve, reject) => {
  const outgoing = request({ host: "127.0.0.1", port, path, method, headers: {
    host: "sophomores.co", "x-forwarded-proto": "https", ...headers,
  } }, response => {
    response.setEncoding("utf8");
    let body = "";
    response.on("data", data => { body += data; });
    response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
  });
  outgoing.on("error", reject);
  outgoing.end(input);
});
const card = "/nfc/AAAAAAAAAAAAAAAAAAAAAA";
const sentinels = ["00112233445566778899AABBCCDDEEFF", "445566778899AABB"];
const query = "?picc=" + sentinels[0] + "&cmac=" + sentinels[1];

const avoidsQuery = (response) => {
  const bytes = JSON.stringify(response).toLowerCase();
  assert.equal(sentinels.some(value => bytes.includes(value.toLowerCase())), false, "response contained a SUN sentinel");
};
try {
  let raw;
  for (let attempt = 0; ; attempt++) {
    try { raw = await send(card + query); break; }
    catch (error) {
      if (attempt === 60 || dev.exitCode !== null || error.code !== "ECONNREFUSED") throw error;
      await sleep(250);
    }
  }
  avoidsQuery(raw);
  assert.equal(raw.status, 303);
  assert.equal(raw.body, "");
  assert.equal(raw.headers.location, "/nfc/confirm/unavailable");
  assert.equal(raw.headers["referrer-policy"], "no-referrer");
  assert.equal(raw.headers["cache-control"], "private, no-store");
  const ie = { "user-agent": "Mozilla/5.0 Trident/7.0" };
  const legacyIe = await send("/essays", ie);
  assert.equal(legacyIe.status, 307);
  assert.equal(legacyIe.headers.location, "/ie-incompatible.html");
  const ieTap = await send(card + query, ie);
  avoidsQuery(ieTap);
  assert.equal(ieTap.status, 303);
  assert.equal(ieTap.headers.location, raw.headers.location);
  for (const path of [card + "/" + query, "/NFC/AAAAAAAAAAAAAAAAAAAAAA" + query,
    raw.headers.location + query, "/nfc/not-a-tap" + query]) {
    const invalid = await send(path, ie);
    avoidsQuery(invalid);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body, "");
  }
  const document = await send(raw.headers.location);
  avoidsQuery(document);
  assert.equal(document.status, 200, "clean HTML render");
  assert.ok(document.body.includes("self.__next_f.push"), "actual Flight bootstrap");
  assert.ok(document.body.includes("Can&#x27;t check this card") || document.body.includes("Can't check this card"), "actual TapPage content");
  assert.equal(document.headers["referrer-policy"], "origin");
  assert.match(document.headers["cache-control"], /no-store/);
  const policy = document.headers["content-security-policy"];
  const nonce = /'nonce-([^']+)'/.exec(policy)[1];
  assert.match(policy, /frame-ancestors 'none'/);
  assert.equal(policy.includes("unsafe-inline"), false);
  assert.ok(document.body.includes('nonce="' + nonce + '"'));
  assert.equal(document.headers["set-cookie"], undefined);
  const rscHeaders = { rsc: "1", accept: "text/x-component" };
  let flight = await send(raw.headers.location, rscHeaders);
  if (flight.status === 307) {
    avoidsQuery(flight);
    const destination = new URL(flight.headers.location, "https://sophomores.co");
    assert.equal(destination.origin, "https://sophomores.co");
    assert.equal(destination.pathname, raw.headers.location);
    assert.match(destination.search, /^\?_rsc(?:=[A-Za-z0-9_-]+)?$/);
    flight = await send(destination.pathname + destination.search, rscHeaders);
  }
  avoidsQuery(flight);
  assert.equal(flight.status, 200, "clean RSC");
  assert.match(flight.headers["content-type"], /text\/x-component/);
  assert.ok(flight.body.length > 0);
  const posted = await send(card, { origin: "https://sophomores.co",
    "content-type": "application/x-www-form-urlencoded" }, "POST", "confirmation=AAAAAAAAAAAAAAAAAAAAAA");
  avoidsQuery(posted);
  assert.equal(posted.status, 303);
  assert.equal(posted.headers.location, "/nfc/confirm/stale");
  assert.equal((await send(card + query, { "sec-purpose": "prefetch" })).status, 204);
  assert.equal((await send(card + query, {}, "HEAD")).status, 405);
  assert.equal((await send(card + query, {}, "OPTIONS")).status, 204);
  console.log("Actual Next HTML, Flight bootstrap, Flight HTTP, redirects and headers excluded SUN values.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (dev.exitCode === null) dev.kill("SIGTERM");
  await completed;
  // The CLI can exit before an owned compiler helper notices shutdown.
  // Leave a bounded grace window, with the outer guard supervising both.
  await sleep(1_500);
}
