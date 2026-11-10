// Loopback-only production-component render, with synthetic auth/network boundaries.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV === "production") throw new Error("Visual fixture is not a production server");
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const port = 3087;
const origin = `http://127.0.0.1:${port}`;
const bundle = await build({
  absWorkingDir: root, entryPoints: ["tests/fixtures/commerce-copy-preview.tsx"], outfile: "preview.js", write: false,
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
  loader: { ".css": "empty", ".scss": "empty" },
  plugins: [{ name: "synthetic-commerce-boundaries", setup(builder) {
    builder.onResolve({ filter: /^\.\/checkout$/ }, (args) => args.importer.endsWith("/src/components/commerce/invitation-claim.tsx")
      ? { path: "account-gate", namespace: "synthetic-commerce" } : undefined);
    builder.onResolve({ filter: /^next\/script$/ }, () => ({ path: "lookup-script", namespace: "synthetic-commerce" }));
    builder.onLoad({ filter: /.*/, namespace: "synthetic-commerce" }, (args) => ({
      loader: "js", resolveDir: root,
      contents: args.path === "account-gate"
        ? "export function CommerceAccountGate({children}) { return children; }"
        : 'import { useEffect } from "react"; export default function Script({onError}) { useEffect(() => { onError?.(new Error("Synthetic lookup failure")); }, []); return null; }'
    }));
  } }]
});
const from = join(root, "src/styles/globals.css");
const css = await postcss([tailwind()]).process(
  await readFile(from, "utf8") + '\n@source "../../tests/fixtures/commerce-copy-preview.tsx";', { from }
);
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic approved commerce copy</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js" defer></script></body></html>';
const assets = new Map([
  ["/review", ["text/html; charset=utf-8", html]],
  ["/preview.js", ["text/javascript; charset=utf-8", bundle.outputFiles[0].contents]],
  ["/preview.css", ["text/css; charset=utf-8", css.css]],
  ["/", ["text/html; charset=utf-8", '<!doctype html><html lang="en"><head><title>Synthetic home destination</title></head><body><h1>Synthetic home destination reached</h1><p>No production navigation or provider request was made.</p></body></html>']]
]);
const server = createServer({ maxHeaderSize: 8192 }, (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'");
  const navigation = request.method === "GET" && request.headers["sec-fetch-mode"] === "navigate" && request.headers["sec-fetch-dest"] === "document";
  if (request.headers.host !== `127.0.0.1:${port}` || request.headers.origin && request.headers.origin !== origin || request.headers["sec-fetch-site"] === "cross-site" && !navigation) {
    response.writeHead(403); response.end(); return;
  }
  const path = new URL(request.url, origin).pathname;
  const asset = request.method === "GET" && assets.get(path);
  response.writeHead(asset ? 200 : 404, { "Content-Type": asset ? asset[0] : "text/plain" });
  response.end(asset ? asset[1] : "Not found");
});
server.listen(port, "127.0.0.1", () => console.log(`Synthetic approved copy: ${origin}/review#token=${"a".repeat(43)}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => process.exit()));
