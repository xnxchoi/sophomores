import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandMark } from "@/components/core/BrandMark";
import { WALLET_PASS_COLOURS } from "@/lib/commerce/keys/wallet-pass-colours";

/*
 * Apple Wallet pass art drawn from the real BrandMark. Owner, 26 Nov, relayed by Cordy: "Image of our wordmark";
 * Helvetica 'Sophomores', Apple's sizes including @2x/@3x, logoText empty.
 *
 * The mark is the site header's own markup (site-header.tsx: BrandMark with the same classes and --header-logo), styled
 * by the built site CSS. The browser draws it at each scale, so nothing is redrawn by hand. Run it after `next build`:
 *   TSX_TSCONFIG_PATH=$PWD/tsconfig.json node --import tsx scripts/wallet-pass-art.tsx [outDir] [--palette-token]
 * Ink: owner, 26 Nov, via Cordy: "dark green bg + yellow-gold in our palette"; he picked Saffron Amber (--yellow) on
 * Medici Cypress Darker -1 (wallet-pass-colours.ts). The ink is that token's value, read from
 * src/styles/sophomores-palette.css and nowhere else; another token can be passed to try a different ink.
 * The icon is the full wordmark at 29 pt, a placeholder: owner, 26 Nov, "leave it for now, we have a logo incoming".
 * Sizes (Apple, Wallet Developer Guide, "Pass Design and Creation"): logo up to 160×50 pt, icon 29×29 pt; @2x and @3x
 * are the same layout at 2× and 3× pixels.
 */
const outDir = process.argv[2] ?? join(process.cwd(), "public", "wallet-pass");
const inkToken = process.argv[3] ?? WALLET_PASS_COLOURS.ink.paletteVar;
const built = join(process.cwd(), ".next");

// The header's classes, verbatim apart from its phone-only size (max-md), which never applies at this viewport.
const mark = renderToStaticMarkup(
  <BrandMark className="site-header-mark text-[length:var(--header-logo,28px)] leading-none">Sophomores</BrandMark>,
);

const art = [
  { name: "logo", width: 160, height: 50, align: "flex-start" },
  { name: "icon", width: 29, height: 29, align: "center" },
] as const;

// The stylesheets the (site) layout itself loads, as the build's client reference manifest lists them, in order.
async function siteCSS() {
  const manifest = await readFile(join(built, "server", "app", "(site)", "page_client-reference-manifest.js"), "utf8")
    .catch(() => { throw new Error("No build: run `next build` first."); });
  const entry = /"\[project\]\/src\/app\/\(site\)\/layout":(\[[^\]]*\])/.exec(manifest)?.[1];
  const files = entry ? (JSON.parse(entry) as Array<string | { path: string }>).map(file => typeof file === "string" ? file : file.path) : [];
  if (files.length === 0) throw new Error("The (site) layout lists no stylesheets.");
  return (await Promise.all(files.map(file => readFile(join(built, file), "utf8")))).join("\n");
}

/** A palette token's own value (an oklch() literal), read from the palette file and nowhere else. */
export async function paletteColour(token: string) {
  const palette = await readFile(join(process.cwd(), "src", "styles", "sophomores-palette.css"), "utf8");
  const name = token.replace(/[^a-z0-9-]/gi, "");
  const value = new RegExp(`^\\s*${name}:\\s*(oklch\\([^)]*\\))`, "m").exec(palette)?.[1];
  if (!value) throw new Error(`No ${name} in sophomores-palette.css`);
  return value.replace(/\s+/g, " ").replace("( ", "(").replace(" )", ")");
}

async function main() {
  const css = await siteCSS();
  const ink = await paletteColour(inkToken);
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report: Record<string, unknown> = {};
  try {
    for (const scale of [1, 2, 3]) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: scale, colorScheme: "light" });
      for (const item of art) {
        // Fit: the widest font size at which the mark spans the box, less one point either side.
        // The light theme, as the theme boot script sets it; only the ink changes, from the palette.
        await page.setContent(`<!doctype html><html data-theme="light"><head><style>${css}</style></head>
          <body style="margin:0;background:transparent">
            <div id="box" style="width:${item.width}px;height:${item.height}px;display:flex;align-items:center;justify-content:${item.align};--header-logo:100px;color:${ink}">${mark}</div>
          </body></html>`);
        const span = page.locator("#box > span");
        const at100 = await span.evaluate(node => node.getBoundingClientRect().width);
        const size = Math.floor(((item.width - 2) / at100) * 100 * 10) / 10;
        await page.locator("#box").evaluate((node, px) => (node as HTMLElement).style.setProperty("--header-logo", `${px}px`), size);
        const style = await span.evaluate(node => {
          const s = getComputedStyle(node);
          return { fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontStyle: s.fontStyle, letterSpacing: s.letterSpacing,
            textTransform: s.textTransform, lineHeight: s.lineHeight, color: s.color, fontSize: s.fontSize, text: node.textContent };
        });
        const suffix = scale === 1 ? "" : `@${scale}x`;
        await page.locator("#box").screenshot({ path: join(outDir, `${item.name}${suffix}.png`), omitBackground: true });
        if (scale === 1) report[item.name] = style;
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1]?.endsWith("wallet-pass-art.tsx")) main().catch(error => { console.error(error); process.exitCode = 1; });
