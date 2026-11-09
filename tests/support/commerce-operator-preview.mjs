// Synthetic loopback-only visual fixture: no auth, database, provider or upstream.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

if (process.env.NODE_ENV === "production") throw new Error("Visual fixtures are not production servers");

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const directory = await mkdtemp(join(tmpdir(), "sphmrs-commerce-operator-"));
const port = 3084;
const origin = "http://127.0.0.1:3084";
const vendorCss = await readFile(require.resolve("@payloadcms/next/css"));
let compiled;
async function compile() {
  compiled ??= (async () => {
    await build({
      absWorkingDir: root, entryPoints: ["tests/fixtures/commerce-operator-preview.tsx"],
      outfile: join(directory, "preview.js"), bundle: true, platform: "browser", format: "iife", jsx: "automatic",
      define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
      tsconfig: join(root, "tsconfig.json"), loader: { ".css": "empty", ".scss": "empty" },
      plugins: [{ name: "synthetic-document-context", setup(builder) {
        builder.onResolve({ filter: /^@payloadcms\/ui$/ }, () => ({ path: resolve(root, "tests/fixtures/commerce-operator-payload.tsx") }));
      } }],
    });
    const from = join(root, "src/styles/staff-login.css");
    const css = await readFile(from, "utf8") + '\n@source "../../tests/fixtures/commerce-operator-preview.tsx";';
    const output = await postcss([tailwind()]).process(css, { from });
    await writeFile(join(directory, "preview.css"), output.css);
  })();
  return compiled;
}
const order = { id: "synthetic-order", commerceVersion: "commerce-v1", commerceSnapshot: { quantity: 3 }, fulfillment: { status: "packed" } };
const admission = { id: "synthetic-admission", unit: 1, status: "checked-in", claimedAccount: "synthetic-customer", guestName: "Synthetic guest" };
const receipts = new Map();
const counts = new Map();
const accepted = new Set();
const disposed = new Map();
const units = z.array(z.int().min(1).max(3)).min(1).max(3).refine((value) => new Set(value).size === value.length);
const commandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("fulfillment"), orderID: z.literal(order.id), status: z.enum(["packed", "shipped", "delivered", "return-requested", "returned"]), actionID: z.uuid(), carrier: z.string().trim().min(1).max(100).optional(), trackingNumber: z.string().trim().min(1).max(120).optional() }),
  z.strictObject({ action: z.literal("check-in"), admissionID: z.literal(admission.id) }),
  z.strictObject({ action: z.literal("redeem"), admissionID: z.literal(admission.id), kind: z.enum(["part-i-drink", "shared-transfer"]), actionID: z.uuid() }),
  z.strictObject({ action: z.literal("accept-unit-return"), orderID: z.literal(order.id), units, evidenceID: z.string().trim().min(1).max(200), usedBenefitsReviewed: z.boolean() }),
  z.strictObject({ action: z.literal("return-disposition"), orderID: z.literal(order.id), units, disposition: z.enum(["restock", "do-not-restock"]) }),
]);
function operate(command) {
  if (command.action === "redeem") {
    const key = JSON.stringify([command.admissionID, command.kind, command.actionID]);
    if (receipts.has(key)) return receipts.get(key);
    const count = counts.get(command.kind) ?? 0;
    if (count >= (command.kind === "part-i-drink" ? 4 : 1)) return null;
    const receipt = { ordinal: count + 1 };
    counts.set(command.kind, receipt.ordinal);
    receipts.set(key, receipt);
    return receipt;
  }
  if (command.action === "fulfillment") {
    const transitions = { packed: ["shipped"], shipped: ["delivered", "return-requested"], delivered: ["return-requested"], "return-requested": ["returned"], returned: [] };
    if (order.fulfillment.status !== command.status && !transitions[order.fulfillment.status]?.includes(command.status)) return null;
    if (command.status === "shipped" && (!command.carrier || !command.trackingNumber)) return null;
    if (command.status === "returned" && accepted.size !== 3) return null;
    order.fulfillment = { ...order.fulfillment, status: command.status, ...(command.carrier ? { carrier: command.carrier, trackingNumber: command.trackingNumber } : {}) };
  } else if (command.action === "check-in") admission.status = "checked-in";
  else if (command.action === "accept-unit-return") {
    const newlyAcceptedUnits = command.units.filter((unit) => !accepted.has(unit));
    for (const unit of newlyAcceptedUnits) accepted.add(unit);
    return { newlyAcceptedUnits };
  } else if (command.action === "return-disposition") {
    if (command.units.some((unit) => !accepted.has(unit) || (disposed.has(unit) && disposed.get(unit) !== command.disposition))) return null;
    const disposedUnits = command.units.filter((unit) => !disposed.has(unit));
    for (const unit of disposedUnits) disposed.set(unit, command.disposition);
    return { disposedUnits };
  }
  return { success: true };
}
async function readBody(request) {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") throw new Error("JSON required");
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error("Body limit");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"), (key, value) => {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Forbidden property");
    return value;
  });
}
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  const send = (status, type, body) => { response.writeHead(status, { "Content-Type": type }); response.end(body); };
  const json = (status, data) => send(status, "application/json", JSON.stringify(data));
  try {
    if (request.headers.host !== "127.0.0.1:3084" || (request.headers.origin && request.headers.origin !== origin) || (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(request.headers["sec-fetch-site"]))) return json(403, { success: false });
    const url = new URL(request.url ?? "/", origin);
    if (url.origin !== origin) return json(403, { success: false });
    if (request.method === "POST") {
      if (request.headers.origin !== origin) return json(403, { success: false });
      if (url.pathname !== "/api/commerce/guest-operations" || url.search) return json(503, { success: false, fixture: true });
      const command = commandSchema.safeParse(await readBody(request));
      if (!command.success) return json(400, { success: false });
      const receipt = operate(command.data);
      return receipt ? json(200, receipt) : json(409, { success: false });
    }
    if (request.method !== "GET") return json(405, { success: false });
    if (url.pathname === "/api/orders/synthetic-order" || url.pathname === "/api/commerce-admissions/synthetic-admission") {
      if (url.search !== "?depth=0") return json(400, { success: false });
      return json(200, url.pathname.includes("/orders/") ? order : admission);
    }
    if (url.pathname === "/api/commerce/events/synthetic-event/manifest") {
      if (!["?page=1", "?page=2"].includes(url.search)) return json(400, { success: false });
      const page = Number(url.searchParams.get("page"));
      return json(200, { docs: [{ admissionID: page === 1 ? admission.id : "synthetic-admission-2", name: page === 1 ? admission.guestName : "Synthetic second guest", checkedIn: page === 1, transferRedeemed: page === 1 && counts.has("shared-transfer"), reviewRequired: false, registered: page === 1, transferEligible: page === 1 && !counts.has("shared-transfer") }], page, totalDocs: 2, hasNextPage: page === 1 });
    }
    if (url.pathname.startsWith("/api/")) return json(503, { success: false, fixture: true });
    if (url.search) return json(400, { success: false });
    if (url.pathname === "/") return send(200, "text/html; charset=utf-8", '<!doctype html><html lang="en" data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic commerce operators</title><link rel="stylesheet" href="/vendor.css"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
    if (url.pathname === "/vendor.css") return send(200, "text/css", vendorCss);
    if (["/preview.js", "/preview.css"].includes(url.pathname)) {
      await compile();
      return send(200, url.pathname.endsWith(".js") ? "text/javascript" : "text/css", await readFile(join(directory, url.pathname.slice(1))));
    }
    send(404, "text/plain", "No synthetic fixture route");
  } catch {
    if (!response.headersSent) json(400, { success: false, fixture: true });
    else response.end();
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.listen(port, "127.0.0.1", () => console.log(`${origin} · synthetic operator controls only`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => { void rm(directory, { recursive: true, force: true }); }));
