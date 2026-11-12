import assert from "node:assert/strict";
import { createRequire, isBuiltin } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { APIError, type Payload, type PayloadRequest } from "payload";
import type { PostgresAdapter, postgresAdapter } from "@payloadcms/db-postgres";

const require = createRequire(import.meta.url);
const adapterEntry = require.resolve("@payloadcms/db-postgres");
const ownerRequire = createRequire(adapterEntry);
const drizzleRequire = createRequire(ownerRequire.resolve("@payloadcms/drizzle"));
type Bundle = {
  postgresAdapter: typeof postgresAdapter;
  inClaimTransaction: <T>(req: PayloadRequest, action: () => Promise<T>) => Promise<T>;
  inPaymentTransaction: <T>(req: PayloadRequest, action: () => Promise<T>) => Promise<T>;
};
type Stats = { toJson: (options: Record<string, boolean>) => { modules?: { name?: string }[]; errors?: { message?: string }[] } };
type Compiler = { run: (callback: (error: Error | null, stats?: Stats) => void) => void; close: (callback: (error: Error | null) => void) => void };
type ExternalCallback = (error?: Error | null, result?: string, type?: string) => void;

test("Next installed webpack preserves the claim transaction's supported bundled adapter graph", { timeout: 90_000 }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "sphmrs-claim-bundle-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const entry = path.join(directory, "entry.cjs");
  const loader = path.join(directory, "typescript-loader.cjs");
  const output = path.join(directory, "result.cjs");
  const source = path.resolve("src/lib/commerce/_shared/transaction.ts");
  await writeFile(entry, `module.exports = { ...require(${JSON.stringify(source)}), postgresAdapter: require(${JSON.stringify(adapterEntry)}).postgresAdapter };`);
  await writeFile(loader, `const ts = require(${JSON.stringify(require.resolve("typescript"))}); module.exports = function(source) { return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; };`);
  const compiled: unknown = require("next/dist/compiled/webpack/webpack");
  assert.ok(typeof compiled === "object" && compiled !== null && "webpack" in compiled && typeof compiled.webpack === "function");
  const webpack = compiled.webpack as (config: Record<string, unknown>) => Compiler;
  const compiler = webpack({
    mode: "production", target: "node", entry, devtool: false, cache: false,
    output: { path: directory, filename: "result.cjs", library: { type: "commonjs2" } },
    optimization: { minimize: false, concatenateModules: false },
    resolve: { extensions: [".ts", ".js", ".json"] },
    module: { rules: [{ test: /\.ts$/, use: [{ loader }] }] },
    externals: [({ context, request }: { context?: string; request?: string }, callback: ExternalCallback) => {
      if (!request || request.startsWith(".") || path.isAbsolute(request) || request === "@payloadcms/db-postgres" || request.startsWith("@payloadcms/drizzle")) return callback();
      if (isBuiltin(request)) return callback(null, request, "commonjs");
      try {
        const importer = createRequire(path.join(context ?? directory, "__probe__.cjs"));
        return callback(null, importer.resolve(request), "commonjs");
      } catch (error) {
        return callback(error instanceof Error ? error : new Error("Probe external resolution failed"));
      }
    }],
  });
  const stats = await new Promise<Stats>((resolve, reject) => compiler.run((error, result) => {
    compiler.close((closeError) => {
      if (error || closeError) return reject(error ?? closeError);
      if (!result) return reject(new Error("Webpack probe returned no stats"));
      resolve(result);
    });
  }));
  const summary = stats.toJson({ all: false, modules: true, errors: true });
  assert.equal(summary.errors?.length ?? 0, 0, summary.errors?.slice(0, 2).map((error) => error.message?.slice(0, 400)).join("\n"));
  const names = summary.modules?.map((module) => module.name ?? "") ?? [];
  assert.equal(names.some((name) => name.includes("@payloadcms/db-postgres/dist/index.js")), true, "adapter must actually be bundled");
  assert.equal(names.some((name) => name.includes("@payloadcms/drizzle/dist/transactions/beginTransaction.js")), true, "owner transaction method must actually be bundled");
  const bundled: unknown = require(output);
  assert.ok(typeof bundled === "object" && bundled !== null && "postgresAdapter" in bundled && "inClaimTransaction" in bundled);
  const bundle = bundled as Bundle;
  const nativeExports: unknown = ownerRequire("@payloadcms/drizzle");
  assert.ok(typeof nativeExports === "object" && nativeExports !== null && "beginTransaction" in nativeExports);
  const payload = { logger: { error: () => {} } } as unknown as Payload;
  const makeAdapter = (disabled = false) => {
    // Factory construction only: never invoke adapter.init/connect or a pg Pool.
    const adapter = bundle.postgresAdapter({ pool: {}, migrationDir: path.resolve("tests/commerce/domain"), transactionOptions: disabled ? false : undefined }).init({ payload });
    adapter.resolveInitializing();
    return adapter;
  };
  const first = makeAdapter(); const second = makeAdapter();
  assert.equal(first.beginTransaction === nativeExports.beginTransaction, false, "native and bundled graphs differ");
  assert.equal(first.beginTransaction === second.beginTransaction, true, "same graph factory methods share identity");
  const nativeModule: unknown = await import(pathToFileURL(drizzleRequire.resolve("drizzle-orm/node-postgres")).href);
  assert.ok(typeof nativeModule === "object" && nativeModule !== null && "drizzle" in nativeModule && typeof nativeModule.drizzle === "function");
  type Client = { query: (query: string | { text: string }) => Promise<{ rows: unknown[] }> };
  const nativeDrizzle = nativeModule.drizzle as (client: Client) => PostgresAdapter["drizzle"];
  const events: string[] = [];
  const database = nativeDrizzle({ query: async (query) => { events.push((typeof query === "string" ? query : query.text).split(" ")[0].toLowerCase()); return { rows: [] }; } });
  first.drizzle = database;
  const req = { payload: { ...payload, db: first } } as unknown as PayloadRequest;
  const original = new APIError("private matched expiry", 410, { code: "CLAIM_EXPIRED" }, true);
  let calls = 0;
  await assert.rejects(bundle.inClaimTransaction(req, async () => { calls++; throw original; }), (error: unknown) => error === original);
  assert.equal(calls, 1);
  assert.deepEqual(events, ["begin", "rollback"]);
  assert.equal(req.transactionID, undefined);
  assert.equal(Object.keys(first.sessions).length, 0);
  events.length = 0;
  assert.equal(await bundle.inPaymentTransaction(req, async () => "payment"), "payment");
  assert.deepEqual(events, ["begin", "commit"]);
  // A native helper must not accept an adapter from an unrelated bundled graph.
  const { inPaymentTransaction } = await import("../../../src/lib/commerce/_shared/transaction");
  events.length = 0;
  calls = 0;
  await assert.rejects(inPaymentTransaction(req, async () => { calls++; }));
  assert.equal(calls, 0);
  assert.deepEqual(events, []);
  for (const kind of ["disabled", "bound", "wrapped"] as const) {
    const adapter = makeAdapter(kind === "disabled");
    adapter.drizzle = database;
    if (kind === "bound") adapter.beginTransaction = adapter.beginTransaction.bind(adapter);
    if (kind === "wrapped") { const enabled = adapter.beginTransaction; adapter.beginTransaction = () => enabled.call(adapter); }
    const request = { payload: { ...payload, db: adapter } } as unknown as PayloadRequest;
    calls = 0; events.length = 0;
    await assert.rejects(bundle.inClaimTransaction(request, async () => { calls++; throw original; }), (error: unknown) => error instanceof Error && error !== original);
    assert.equal(calls, 0);
    assert.deepEqual(events, []);
  }
});
