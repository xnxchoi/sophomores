// Disposable loopback fixture. Never imports application environment or credentials.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV === "production") throw new Error("Commerce width fixture is not a production server");
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const port = 3001;
const origin = `http://127.0.0.1:${port}`;
const bundle = await build({
  absWorkingDir: root, entryPoints: ["tests/fixtures/commerce-width-preview.tsx"], outfile: "preview.js", write: false,
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' }, loader: { ".css": "empty", ".scss": "empty" },
  plugins: [{ name: "synthetic-commerce-boundaries", setup(builder) {
    const virtual = new Map([
      ["@/components/core/Link/Link", 'import { createElement } from "react"; export function Link({ prefetch, ...props }) { return createElement("a", props); }'],
      ["@/components/Authentication/member-auth/account-study", 'import { useEffect } from "react"; export function MemberAccountFlow({onSnapshot}) { useEffect(() => { onSnapshot({status:{authenticated:true, member:true}}); }, [onSnapshot]); return null; }'],
      ["@/lib/member-auth/client", 'export function createMemberClient(){return {status: async () => {throw new Error("Real auth forbidden")}};} export function parseMemberStatus(value){return value;}'],
      ["./payment", 'import {createElement} from "react"; export function CommercePayment({disabled}) { return createElement("button", {type:"button", disabled, className:"min-h-12 rounded-xl border border-border px-5"}, "Pay by card"); }']
    ]);
    builder.onResolve({ filter: /.*/ }, args => {
      if (virtual.has(args.path) && (args.path.startsWith("@/") || args.importer.endsWith("/commerce/checkout.tsx"))) {
        return { path: args.path, namespace: "commerce-fixture" };
      }
      return undefined;
    });
    builder.onLoad({ filter: /.*/, namespace: "commerce-fixture" }, args => ({ loader: "js", resolveDir: root, contents: virtual.get(args.path) }));
  } }]
});
const from = join(root, "src/styles/globals.css");
const css = await postcss([tailwind()]).process(await readFile(from, "utf8") + '\n@source "../../tests/fixtures/commerce-width-preview.tsx";', { from });
const html = '<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic commerce layout</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js" defer></script></body></html>';
const assets = new Map([
  ["/review", ["text/html; charset=utf-8", html]],
  ["/preview.js", ["text/javascript; charset=utf-8", bundle.outputFiles.find((file) => file.path.endsWith(".js")).contents]],
  ["/preview.css", ["text/css; charset=utf-8", css.css]]
]);
const server = createServer({ maxHeaderSize: 8192 }, (request, response) => {
  response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive"); response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'");
  const navigation = request.method === "GET" && request.headers["sec-fetch-mode"] === "navigate" && request.headers["sec-fetch-dest"] === "document";
  if (request.headers.host !== `127.0.0.1:${port}` || (request.headers.origin && request.headers.origin !== origin) || (request.headers["sec-fetch-site"] === "cross-site" && !navigation)) { response.writeHead(403); response.end(); return; }
  const pathname = new URL(request.url, origin).pathname;
  const asset = request.method === "GET" && assets.get(pathname);
  response.writeHead(asset ? 200 : 404, { "Content-Type": asset ? asset[0] : "text/plain" });
  response.end(asset ? asset[1] : "Not found");
});
server.listen(port, "127.0.0.1", () => console.log(`Synthetic commerce layout: ${origin}/review`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => process.exit()));
