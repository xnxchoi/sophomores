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
const loop = process.argv.includes("--loop");
const bundle = await build({
  absWorkingDir: root, entryPoints: [loop ? "tests/fixtures/copy-loop-preview.tsx" : "tests/fixtures/commerce-copy-preview.tsx"], outfile: "preview.js", write: false,
  bundle: true, platform: "browser", format: "iife", jsx: "automatic", tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
  loader: loop ? { ".scss": "empty" } : { ".css": "empty", ".scss": "empty" },
  plugins: [{ name: "synthetic-commerce-boundaries", setup(builder) {
    if (loop) {
      builder.onResolve({ filter: /^next-intl\/server$/ }, () => ({ path: join(root, "tests/fixtures/preview-server-translations.ts") }));
      const virtual = new Map([
        ["@/lib/i18n/locale", "export async function setUserLocale() {}"],
        ["@/lib/auth/client", "export const authClient = { passkey: { listUserPasskeys: async()=>({data:[]}), addPasskey: async()=>({error:{message:'Synthetic only'}}), deletePasskey: async()=>({}) }, revokeOtherSessions: async()=>({}) };"],
        ["next/navigation", "export const usePathname=()=>'/me/settings/general'; export const useRouter=()=>({refresh(){},push(){},prefetch(){}});"],
        // Routing is deliberately synthetic: the real transition router pulls Node's url module into this browser-only fixture.
        ["next-transition-router", "import{createElement}from'react'; export const Link=({children,...props})=>createElement('a',props,children); export const TransitionRouter=({children})=>children; export const useTransitionRouter=()=>({push(){},replace(){},back(){}}); export const useTransitionState=()=>({stage:'none',isReady:true});"],
        ["@/components/core/Link/Link", "import{createElement}from'react'; export const Link=({children,...props})=>createElement('a',props,children); export const LinkUnderlined=Link;"],
        ["@/payload/collections/notifications/actions", "export async function markNotificationRead(id) { return {id, read:true}; }"]
      ]);
      builder.onResolve({ filter: /.*/ }, (args) => virtual.has(args.path) ? { path: args.path, namespace: "synthetic-loop" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "synthetic-loop" }, (args) => ({ loader: "js", resolveDir: root, contents: virtual.get(args.path) }));
      builder.onResolve({ filter: /^\.\/(?:Missing|lays\.client)$/ }, (args) => args.importer.endsWith("/layouts/Missing/not-found-screen.tsx") ? { path: "missing-artwork", namespace: "synthetic-loop-art" } : undefined);
      builder.onResolve({ filter: /^\.\/tape-model$/ }, (args) => args.importer.endsWith("/radio/track-player.tsx") ? { path: "tape-artwork", namespace: "synthetic-loop-art" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "synthetic-loop-art" }, () => ({ loader: "js", contents: "export const Missing=()=>null; export const MissingLayout=()=>null; export const TapeModel=()=>null;" }));
    }
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
  await readFile(from, "utf8") + '\n@source "../../tests/fixtures/commerce-copy-preview.tsx";\n@source "../../tests/fixtures/copy-loop-preview.tsx";', { from }
);
const html = '<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic approved commerce copy</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js" defer></script></body></html>';
const assets = new Map([
  ["/review", ["text/html; charset=utf-8", html]],
  ["/preview.js", ["text/javascript; charset=utf-8", bundle.outputFiles.find((file) => file.path.endsWith(".js")).contents]],
  ["/preview.css", ["text/css; charset=utf-8", css.css + "\n" + (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "")]],
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
