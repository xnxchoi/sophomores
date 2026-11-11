// Disposable loopback fixture. Never imports application environment or credentials.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV === "production") throw new Error("Identity fixture is not a production server");
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const port = 3091;
const origin = `http://127.0.0.1:${port}`;
const bundle = await build({
  absWorkingDir: root, entryPoints: ["tests/fixtures/commerce-identity-preview.tsx"], outfile: "preview.js", write: false,
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' }, loader: { ".css": "empty", ".scss": "empty" },
  plugins: [{ name: "unused-checkout-dependencies-only", setup(builder) {
    // The actual CommerceIdentityBoundary and EcommerceProvider are NEVER stubbed.
    const virtual = new Map([
      ["@/components/Authentication/member-auth/account-study", "export function MemberAccountFlow(){throw new Error('Account flow is outside identity fixture');}"],
      ["@/lib/member-auth/client", "export function createMemberClient(){throw new Error('Real auth client is forbidden');} export function parseMemberStatus(){throw new Error('Real auth client is forbidden');}"]
    ]);
    builder.onResolve({ filter: /.*/ }, (args) => {
      if (args.importer.endsWith("/src/components/commerce/checkout.tsx")) {
        if (virtual.has(args.path)) return { path: args.path, namespace: "identity-unused" };
        if (args.path === "./payment" || args.path === "./shipping-address") return { path: args.path, namespace: "identity-unused" };
      }
      return undefined;
    });
    builder.onLoad({ filter: /.*/, namespace: "identity-unused" }, (args) => ({ loader: "js", resolveDir: root,
      contents: virtual.get(args.path) ?? (args.path === "./payment" ? "export function CommercePayment(){throw new Error('Payment is forbidden in identity fixture');}" : "export function ShippingAddressForm(){throw new Error('Address providers are forbidden in identity fixture');}")
    }));
  } }]
});
const from = join(root, "src/styles/globals.css");
const css = await postcss([tailwind()]).process(await readFile(from, "utf8") + '\n@source "../../tests/fixtures/commerce-identity-preview.tsx";', { from });
const html = '<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic checkout identity</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js" defer></script></body></html>';
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
server.listen(port, "127.0.0.1", () => console.log(`Synthetic checkout identity: ${origin}/review`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => process.exit()));
