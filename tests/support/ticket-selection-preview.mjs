// Loopback-only visual acceptance. All APIs are synthetic; nothing is proxied.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createLocalTicketQuote } from "../../src/lib/tickets/quotes.ts";
import { normalizeKoreanMobile } from "../../src/lib/phone-verification/model.ts";
import { challengeIdSchema, trialChallengeSchema, trialStatusSchema } from "../../src/lib/phone-verification/client-contracts.ts";

if (process.env.NODE_ENV === "production") throw new Error("Visual fixtures are not a production server.");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const directory = await mkdtemp(join(tmpdir(), "sphmrs-ticket-visual-"));
const port = Number(process.env.TICKET_PREVIEW_PORT ?? 3078);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local fixture port.");
const origin = "http://127.0.0.1:" + port;
const data = JSON.parse(await readFile(join(root, "tests/fixtures/ticket-preview-catalogue.json"), "utf8"));
const account = JSON.parse(await readFile(join(root, "tests/fixtures/customer-auth-design-responses.json"), "utf8"));
const stateSchema = z.strictObject({ member: z.enum(["anonymous", "pending", "member", "unavailable"]), quote: z.enum(["ready", "error", "short-expiry"]), delayMs: z.int().min(0).max(5000), phoneProof: z.enum(["pending", "verified", "expired", "receiver-unavailable"]).default("pending") });
const phoneInputSchema = z.string().max(40).transform(normalizeKoreanMobile).refine((phone) => phone !== null);
const createProofSchema = z.strictObject({ phone: phoneInputSchema });
const bindProofSchema = z.strictObject({ challengeId: challengeIdSchema, phone: phoneInputSchema });
let state = stateSchema.parse({ member: "anonymous", quote: "ready", delayMs: 0 });
// Single synthetic browser fixture, not an account/session or real carrier proof.
// The existing normalizer and client schemas own phone/response syntax. No
// production helper, provider transport, credential or persistent storage exists.
let phoneProof = null;
let compiling;

async function compile() {
  if (compiling) return compiling;
  compiling = (async () => {
    // Next's browser helpers read optional environment flags. Supply an empty
    // fixture environment, never the host process environment or its secrets.
    await build({ absWorkingDir: root, entryPoints: ["tests/fixtures/ticket-selection-preview.tsx"], outfile: join(directory, "preview.js"), bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' }, tsconfig: join(root, "tsconfig.json"), loader: { ".css": "empty", ".scss": "empty" } });
    const from = join(root, "src/styles/ticket-visual-fixture.css");
    const css = '@import "./globals.css";\n@import "./teaser.css";\n@source "../../tests/fixtures/ticket-selection-preview.tsx";';
    const result = await postcss([tailwind()]).process(css, { from });
    await writeFile(join(directory, "preview.css"), result.css);
  })();
  try { await compiling; } finally { compiling = undefined; }
}

const routes = new Set(["/", "/tickets", "/account", "/account/continue"]);
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  const send = (status, type, body) => { response.writeHead(status, { "Content-Type": type }); response.end(body); };
  const json = (status, body) => send(status, "application/json", JSON.stringify(body));
  const unavailable = () => json(503, { success: false, error: { code: "FIXTURE_ONLY", message: "No backend exists in this visual fixture." } });
  const readBody = async () => {
    if (request.headers["content-type"]?.split(";")[0] !== "application/json") throw new Error("JSON fixture body required.");
    let length = 0;
    const chunks = [];
    for await (const chunk of request) {
      length += chunk.length;
      if (length > 16_384) throw new Error("Fixture body too large.");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  };
  try {
    if (request.headers.host !== "127.0.0.1:" + port || (request.headers.origin && request.headers.origin !== origin) || request.headers["sec-fetch-site"] === "cross-site") { json(403, { success: false, error: { code: "FIXTURE_ONLY", message: "Local fixture origin required." } }); return; }
    const url = new URL(request.url ?? "/", origin);
    if (url.origin !== origin || url.search) { json(400, { success: false, error: { code: "FIXTURE_ONLY", message: "Configure this fixture through its visible controls." } }); return; }
    if (["POST", "DELETE", "PUT", "PATCH"].includes(request.method) && request.headers.origin !== origin) { json(403, { success: false, error: { code: "FIXTURE_ONLY", message: "Local fixture origin required." } }); return; }
    if (url.pathname === "/fixture/state") {
      if (request.method === "GET") json(200, state);
      else if (request.method === "POST") {
        const next = stateSchema.safeParse(await readBody());
        if (!next.success) { json(400, { success: false }); return; }
        state = next.data;
        phoneProof = null;
        json(200, { success: true, fixture: true });
      } else send(405, "text/plain", "Fixture method not allowed.");
      return;
    }
    if (url.pathname === "/fixture/quote") {
      if (request.method !== "POST") { unavailable(); return; }
      const input = await readBody();
      const snapshot = { ...state };
      if (snapshot.delayMs) await new Promise((done) => setTimeout(done, snapshot.delayMs));
      if (snapshot.quote === "error" || state.member !== "member") { unavailable(); return; }
      const now = new Date();
      const result = createLocalTicketQuote(input, {
        catalogue: { version: data.version, currency: data.currency, maximumTotalQuantity: data.maximumTotalQuantity, quoteTtlSeconds: snapshot.quote === "short-expiry" ? 3 : 300, saleStartsAt: new Date(now.getTime() - 60_000).toISOString(), saleEndsAt: new Date(now.getTime() + 3_600_000).toISOString(), ticketTypes: data.ticketTypes.filter((type) => type.available !== false).map(({ id, unitAmountMinor, minimumQuantity, maximumQuantity }) => ({ id, unitAmountMinor, minimumQuantity, maximumQuantity })) },
        principal: { userId: "95777897-28ef-459d-bba8-4072dde19a5b", emailVerified: true, phoneBound: true }, now
      });
      if (!result.success) { json(400, result); return; }
      const { id: _id, ownerId: _owner, ...quote } = result.quote;
      void _id; void _owner;
      json(200, quote);
      return;
    }
    if (url.pathname === "/api/member/status" && request.method === "GET") {
      if (state.member === "unavailable") { unavailable(); return; }
      const member = state.member === "pending" ? account.emailVerified : account[state.member];
      json(200, { success: true, data: { ...member, capabilities: { ...account.capabilities, passkey: false } } });
      return;
    }
    if (url.pathname === "/api/member/identify" && request.method === "DELETE") { json(200, { success: true, data: { identified: false } }); return; }
    if (url.pathname === "/api/phone-verification/challenges") {
      if (request.method !== "POST") { send(405, "text/plain", "Fixture method not allowed."); return; }
      const input = createProofSchema.safeParse(await readBody());
      if (!input.success) { json(400, { success: false }); return; }
      phoneProof = null;
      if (state.phoneProof === "receiver-unavailable") {
        json(503, { success: false, error: { code: "RECEIVER_UNAVAILABLE", message: "Synthetic receiver unavailable. No phone verification was granted." } }); return;
      }
      const challenge = trialChallengeSchema.parse({ ...account.challenge, id: randomUUID(), expiresAt: new Date(Date.now() + (state.phoneProof === "expired" ? -1000 : 300_000)).toISOString() });
      phoneProof = { challenge, phone: input.data.phone, state: "pending" };
      json(200, { success: true, data: challenge });
      return;
    }
    if (url.pathname.startsWith("/api/phone-verification/challenges/")) {
      if (!["GET", "DELETE"].includes(request.method)) { send(405, "text/plain", "Fixture method not allowed."); return; }
      const id = challengeIdSchema.safeParse(url.pathname.slice("/api/phone-verification/challenges/".length));
      if (!id.success || !phoneProof || phoneProof.challenge.id !== id.data) { json(400, { success: false }); return; }
      if (request.method === "DELETE") {
        if (!["consumed", "expired"].includes(phoneProof.state)) phoneProof = { ...phoneProof, state: "cancelled" };
        json(200, { success: true, data: { cancelled: true } }); return;
      }
      if (phoneProof.state === "pending") phoneProof = { ...phoneProof, state: Date.parse(phoneProof.challenge.expiresAt) <= Date.now() ? "expired" : state.phoneProof === "verified" ? "verified" : "pending" };
      if (phoneProof.state === "verified" && Date.parse(phoneProof.challenge.expiresAt) <= Date.now()) phoneProof = { ...phoneProof, state: "expired" };
      const status = trialStatusSchema.parse({ id: id.data, expiresAt: phoneProof.challenge.expiresAt, mode: "trial", state: phoneProof.state });
      json(200, { success: true, data: status });
      return;
    }
    if (url.pathname === "/api/phone-verification/bind") {
      if (request.method !== "POST") { send(405, "text/plain", "Fixture method not allowed."); return; }
      const input = bindProofSchema.safeParse(await readBody());
      if (!input.success || state.member !== "pending" || !phoneProof || phoneProof.challenge.id !== input.data.challengeId || phoneProof.phone !== input.data.phone || phoneProof.state !== "verified" || Date.parse(phoneProof.challenge.expiresAt) <= Date.now()) {
        json(400, { success: false, error: { code: "INVALID_PHONE_PROOF", message: "Synthetic authenticated email and a matching unexpired phone proof are required." } }); return;
      }
      phoneProof = { ...phoneProof, state: "consumed" };
      state = { ...state, member: "member" };
      json(200, { success: true, data: { phoneBound: true, member: true } });
      return;
    }
    if (url.pathname === "/api/auth/get-session" && request.method === "GET") { json(200, null); return; }
    if (url.pathname === "/api/auth/sign-out" && request.method === "POST") { state = { ...state, member: "anonymous" }; phoneProof = null; json(200, { success: true }); return; }
    if (["/api/auth/email-otp/send-verification-otp", "/api/auth/sign-in/magic-link"].includes(url.pathname) && request.method === "POST") { await readBody(); json(200, { success: true }); return; }
    if (url.pathname === "/api/auth/sign-in/email-otp" && request.method === "POST") {
      const body = await readBody();
      if (body?.email !== account.email || body?.otp !== "ABC123") { json(400, { code: "INVALID_OTP", message: "Synthetic code not accepted." }); return; }
      state = { ...state, member: "pending" };
      phoneProof = null;
      json(200, { token: "fixture", user: { id: "95777897-28ef-459d-bba8-4072dde19a5b", email: account.email, emailVerified: true } });
      return;
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/fixture/")) { unavailable(); return; }
    if (request.method !== "GET") { send(405, "text/plain", "Fixture method not allowed."); return; }
    if (routes.has(url.pathname)) {
      await compile();
      response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
      send(200, "text/html; charset=utf-8", '<!doctype html><html lang="en" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket selection · synthetic visual fixture</title><link rel="stylesheet" href="/preview.css"></head><body class="bg-neutral-950 font-sans text-neutral-100"><div id="root"></div><script src="/preview.js"></script></body></html>');
    } else if (url.pathname === "/preview.js") send(200, "text/javascript", await readFile(join(directory, "preview.js")));
    else if (url.pathname === "/preview.css") send(200, "text/css", await readFile(join(directory, "preview.css")));
    else send(404, "text/plain", "No route exists in this visual fixture.");
  } catch {
    if (!response.headersSent) json(400, { success: false, error: { code: "FIXTURE_ONLY", message: "Visual fixture request unavailable." } });
    else response.end();
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.listen(port, "127.0.0.1", () => console.log(origin + "/tickets · synthetic APIs only · " + directory));
server.on("error", (error) => { console.error(error); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
