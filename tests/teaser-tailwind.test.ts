import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";
import Home from "../app/(site)/page";

const html = renderToStaticMarkup(createElement(Home));
const tags = [...html.matchAll(/<[a-z][^>]*>/g)].map(([tag]) => tag);
const classes = (tag: string) =>
  (tag.match(/\bclass="([^"]*)"/)?.[1] ?? "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .split(/\s+/);
const elements = (hook: string) =>
  tags.filter((tag) => classes(tag).includes(hook));
const require = createRequire(import.meta.url);
const globalStylesheet = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
const applicationTheme = globalStylesheet.match(/@theme inline\s*\{[^}]+\}/)?.[0];
assert.ok(applicationTheme, "Missing application theme used by the teaser");
const theme = [
  readFileSync(require.resolve("tailwindcss/theme.css"), "utf8"),
  applicationTheme,
  readFileSync(new URL("../styles/teaser-theme.css", import.meta.url), "utf8")
].join("\n");

test("the animated Sophomores wordmark is displayed in uppercase", async () => {
  const css = await utilities("wordmark");
  assert.match(css, /text-transform:\s*uppercase;/);
});

test("wordmark glyphs shrink visually without resizing their layout slots", async () => {
  assert.equal(elements("wordmark-glyph").length, 10);
  const css = await utilities("wordmark-glyph");
  assert.match(css, /display:\s*inline-block;/);
  assert.match(css, /scale:\s*var\(--wordmark-scale\);/,
    "Motion drives the independent CSS scale so fallback transform resets cannot erase it");
  assert.doesNotMatch(css, /(?:^|[;{])\s*(?:transform|translate|rotate):/m);
  assert.match(css, /transform-origin:\s*center;/);
  assert.match(html, /<span aria-hidden="true"[^>]*><span class="wordmark-glyph /);
  for (const path of ["../public/static-fallback.css"]) {
    const fallback = readFileSync(new URL(path, import.meta.url), "utf8");
    const glyphRule = fallback.match(/\.wordmark span\s*\{([^}]+)\}/)?.[1];
    assert.ok(glyphRule, `${path} must still reset animated positioning`);
    assert.match(glyphRule, /transform:\s*none\s*!important/);
    assert.doesNotMatch(glyphRule, /(?:^|;)\s*scale:/,
      "The fallback must preserve independent glyph scaling");
  }
});

test("the default sans face is Helvetica Neue at regular weight", () => {
  const stylesheet = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
  assert.match(stylesheet, /--font-sans:\s*"Helvetica Neue",\s*Helvetica,\s*Arial,\s*sans-serif;/);
  assert.match(stylesheet, /html\s*\{\s*@apply font-sans font-normal;/);
});

test("only notification and conversation message bodies use the softer message font", async () => {
  const bodyAfter = (tag: string, element: "p" | "h2") => {
    const body = tags.slice(tags.indexOf(tag) + 1).find((candidate) => candidate.startsWith(`<${element} `));
    assert.ok(body, `Missing ${element} message body`);
    return body;
  };
  const notices = elements("notification").map((tag) => bodyAfter(tag, "p"));
  const conversations = elements("conversation-card").map((tag) => bodyAfter(tag, "h2"));
  assert.equal(notices.length, 2);
  assert.ok(conversations.length);
  const messageBodies = [...notices, ...conversations];
  for (const tag of messageBodies) {
    assert.ok(classes(tag).includes("font-message"), "Message body must opt into its distinct face");
    assert.ok(!classes(tag).includes("font-sans"), "Avoid competing font family utilities");
    const css = (await compile(`${theme}\n@tailwind utilities;`)).build(classes(tag));
    assert.match(css, /font-family:\s*var\(--font-manrope\),\s*var\(--font-sans\);/);
  }
  assert.deepEqual(elements("font-message"), messageBodies, "Do not change metadata, navigation or other prose");
});

test("the message face is self-hosted Manrope Regular with its license", () => {
  const layout = readFileSync(new URL("../app/(site)/layout.tsx", import.meta.url), "utf8");
  const fonts = readFileSync(new URL("../fonts.ts", import.meta.url), "utf8");
  const registration = [...fonts.matchAll(/localFont\(\{[^}]+\}\)/g)]
    .map(([block]) => block).find((block) => block.includes("--font-manrope"));
  assert.ok(registration, "Register the message font with next/font/local");
  assert.match(registration, /src:\s*["']\.\/public\/fonts\/manrope\/Manrope-Regular-latin\.woff2["']/);
  assert.match(registration, /weight:\s*["']400["']/);
  assert.match(registration, /display:\s*["']swap["']/);
  const declaration = [...fonts.matchAll(/const\s+(\w+)\s*=\s*(localFont\(\{[^}]+\}\))/g)]
    .find(([, , block]) => block === registration);
  assert.ok(declaration);
  assert.ok(layout.match(/<html[^>]+className=[^>]+>/)?.[0].includes(`${declaration[1]}.variable`),
    "Apply the registered message font variable to the site document");
  assert.doesNotMatch(fonts + layout, /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/);
  const font = readFileSync(new URL("../public/fonts/manrope/Manrope-Regular-latin.woff2", import.meta.url));
  assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2");
  const license = readFileSync(new URL("../public/fonts/manrope/OFL.txt", import.meta.url), "utf8");
  assert.match(license, /SIL OPEN FONT LICENSE/);
});

test("the teaser uses Helvetica for its brandmark, default sans for former monospace roles, and retains serif headings", async () => {
  assert.ok(elements("font-sans").length);
  assert.equal(elements("font-teaser-mono").length, 0);
  for (const hook of ["teaser", "story-label", "message-meta", "invitation-sign"]) {
    const matches = elements(hook);
    assert.ok(matches.length, `Missing former monospace role: ${hook}`);
    for (const tag of matches) assert.ok(classes(tag).includes("font-sans"), `${hook} must use the default sans face`);
  }
  // The skip action is intentionally absent until the client entry completes.
  const experience = readFileSync(new URL("../components/teaser/experience.tsx", import.meta.url), "utf8");
  assert.match(experience, /className="skip-chapter[^"\n]*\bfont-sans\b/);
  for (const tag of [elements("hero-statement")[0], tags.find((tag) => /id="people-heading"/.test(tag))]) {
    assert.ok(tag);
    assert.ok(classes(tag).includes("font-teaser-serif"), "Narrative serif styling must remain explicit");
  }
  for (const tag of elements("wordmark")) {
    assert.ok(classes(tag).includes("!font-[Helvetica,Arial,sans-serif]"), "The visual brandmark must use the shared Helvetica face");
    assert.ok(!classes(tag).includes("font-sans"), "The visual brandmark must not compete with the body font");
  }
  assert.match(await utilities("wordmark"), /font-family:\s*Helvetica,\s*Arial,\s*sans-serif\s*!important;/);
});

test("the site no longer registers or aliases the Guida monospace face", () => {
  const layout = readFileSync(new URL("../app/(site)/layout.tsx", import.meta.url), "utf8");
  const fonts = readFileSync(new URL("../fonts.ts", import.meta.url), "utf8");
  const teaserCSS = readFileSync(new URL("../styles/teaser.css", import.meta.url), "utf8");
  const teaserTheme = readFileSync(new URL("../styles/teaser-theme.css", import.meta.url), "utf8");
  assert.doesNotMatch(fonts + layout, /guida-reference|mono\.variable|--font-teaser-mono/);
  assert.doesNotMatch(teaserCSS, /--mono\s*:|var\(--font-teaser-mono\)/);
  assert.doesNotMatch(teaserTheme, /--font-teaser-mono\s*:/);
  assert.match(fonts, /nib-reference\.woff2/);
  assert.match(fonts, /--font-teaser-serif/);
});

test("studies sharing the site layout no longer depend on its removed monospace variable", () => {
  for (const file of ["invitation/study.css", "entry-animation/intro.css", "tickets/tickets.css"]) {
    const stylesheet = readFileSync(new URL(`../components/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(stylesheet, /var\(--font-teaser-mono\)/, `${file} cannot rely on the removed layout font`);
    assert.match(stylesheet, /var\(--font-sans\),\s*sans-serif/, `${file} must inherit the default sans face`);
  }
  const invitation = readFileSync(new URL("../components/invitation/study.css", import.meta.url), "utf8");
  assert.equal((invitation.match(/font:\s*11px\s+var\(--font-sans\),\s*sans-serif/g) ?? []).length, 2);
  assert.match(invitation, /font:\s*11px\/1\.5\s+var\(--font-sans\),\s*sans-serif/);
});

test("the application loads the same shared theme exercised by utility tests", () => {
  const stylesheet = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
  assert.match(stylesheet, /@import\s+["']\.\/teaser-theme\.css["']/);
});

test("teaser styling uses shared responsive and typography conventions", () => {
  for (const file of readdirSync("components/teaser").filter((file) => /\.tsx?$/.test(file))) {
    const source = readFileSync(`components/teaser/${file}`, "utf8");
    assert.doesNotMatch(source, /\[@media\(/, `${file}: use named responsive variants`);
    assert.doesNotMatch(source, /\[font:/, `${file}: compose font family, size and leading utilities`);
    assert.doesNotMatch(source, /\[&&\]/, `${file}: avoid specificity escalation`);
  }
});

test("only the shared Helvetica brand-family override may use important utilities", () => {
  for (const tag of tags) {
    assert.deepEqual(classes(tag).filter((candidate) => candidate !== "!font-[Helvetica,Arial,sans-serif]" &&
      (candidate.endsWith("!") || /(?:^|:)![a-z]/.test(candidate))), [],
      "Resolve competing utilities with explicit variants; only the canonical brand family overrides legacy font shorthands");
  }
});

// Compile the classes actually emitted by the component, rather than accepting
// a source string that Tailwind cannot generate or snapshotting class order.
async function utilities(hook: string) {
  const matches = elements(hook);
  assert.ok(matches.length, `Missing semantic hook: ${hook}`);
  const compiler = await compile(`${theme}\n@tailwind utilities;`);
  return compiler.build([...new Set(matches.flatMap(classes))]);
}

test("fallback hooks survive the utility migration", () => {
  for (const hook of [
    "teaser", "hero-section", "hero-stage", "hero-header", "hero-statement",
    "scroll-section", "stage", "story-stage", "story-track", "story-card",
    "story-controls", "orbit-stage", "orbit-wheel", "orbit-cursor",
    "orbit-descriptions", "orbit-static-title", "conversation-stage",
    "conversation-card", "people-section", "people-stage",
    "people-cards", "people-card", "blur-word", "chapter-nav",
    "desktop-chapters", "mobile-chapters", "invitation-link", "wordmark",
    "notifications", "notification-second", "scene-entry"
  ]) assert.ok(elements(hook).length, `${hook} is consumed by static-fallback.css`);
  assert.match(html, /<noscript>[\s\S]*static-fallback\.css/);
});

test("pinned stages obtain viewport sizing and containment from Tailwind", async () => {
  for (const hook of ["hero-stage", "story-stage", "orbit-stage", "conversation-stage"]) {
    const css = await utilities(hook);
    assert.match(css, /position:\s*sticky;/, `${hook} must remain pinned`);
    assert.match(css, /height:\s*100svh;/, `${hook} must use stable viewport height`);
    assert.match(css, /overflow:\s*hidden;/, `${hook} must contain animated content`);
  }
});

test("navigation and people stacking retain responsive Tailwind rules", async () => {
  const desktop = await utilities("desktop-chapters");
  const mobile = await utilities("mobile-chapters");
  for (const css of [desktop, mobile]) {
    assert.match(css, /@media[^{}]*width/);
    assert.match(css, /display:\s*none;/);
    assert.match(css, /display:\s*flex;/);
  }
  const people = await utilities("people-stage");
  assert.match(people, /position:\s*sticky;/);
  assert.match(people, /@media[^{}]*width/);
  assert.match(people, /position:\s*relative;/);
  assert.match(people, /height:\s*auto;/);
});

test("invitation remains a native closed dialog with utility viewport bounds", async () => {
  const [dialog] = elements("invitation-dialog");
  assert.match(dialog, /^<dialog\b/);
  assert.doesNotMatch(dialog, /\sopen(?:=|\s|>)/);
  assert.match(dialog, /aria-labelledby="invitation-dialog-heading"/);
  assert.match(dialog, /data-lenis-prevent/);
  const css = await utilities("invitation-dialog");
  assert.match(css, /max-height:\s*calc\(100svh\s*-\s*48px\);/);
  assert.match(css, /width:\s*min\(480px,\s*calc\(100vw\s*-\s*32px\)\);/);
  assert.doesNotMatch(css, /(?:^|[;{])\s*display:/m,
    "Unconditional display utilities override the browser's closed-dialog rule");
});

test("Motion-owned transforms are not compounded by Tailwind transforms", async () => {
  for (const hook of ["wordmark", "story-track", "story-card", "orbit-wheel", "conversation-card", "chapter-nav"]) {
    const css = await utilities(hook);
    assert.doesNotMatch(css, /(?:^|[;{])\s*(?:transform|translate|rotate|scale):/m,
      `${hook} must leave transforms to Motion`);
  }
});

type CSSNode = {
  type: string;
  name?: string;
  params?: string;
  selector?: string;
  prop?: string;
  value?: string;
  important?: boolean;
  nodes?: CSSNode[];
};
// Reuse the parser already shipped with the project's Tailwind PostCSS build.
const { parse } = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as {
  parse: (css: string) => CSSNode;
};
type Viewport = { width: number; height: number };

function mediaMatches(condition: string, viewport: Viewport) {
  const checks = [...condition.matchAll(/\(([^()]+)\)/g)];
  assert.ok(checks.length, `Unsupported geometry media query: ${condition}`);
  assert.equal(condition.replace(/\([^()]+\)/g, "").replace(/\band\b|\s/g, ""), "",
    `Unparsed media condition: ${condition}`);
  return checks.every(([, check]) => {
    const legacy = check.match(/^(min|max)-(width|height):\s*([\d.]+)(px|rem)$/);
    const range = check.match(/^(width|height)\s*(>=|<=|>|<|=)\s*([\d.]+)(px|rem)$/);
    assert.ok(legacy || range, `Unsupported geometry comparison: ${check}`);
    const [, axis, operator, amount, unit] = range ?? ["", legacy![2], legacy![1] === "min" ? ">=" : "<=", legacy![3], legacy![4]];
    const actual = viewport[axis as keyof Viewport];
    const target = Number(amount) * (unit === "rem" ? 16 : 1);
    return operator === ">=" ? actual >= target : operator === "<=" ? actual <= target
      : operator === ">" ? actual > target : operator === "<" ? actual < target : actual === target;
  });
}

// Resolve only geometry declarations in these single-element class sets. The
// parser preserves Tailwind's generated order; specificity beats source order.
// This intentionally tests the overlapping cascade, not the presence of a
// short-height class that can silently lose to a later width-only rule.
function geometry(css: string, viewport: Viewport, property: string, required = true) {
  let winner = { specificity: -1, value: "" };
  const visit = (node: CSSNode, specificity = 0) => {
    if (node.type === "atrule" && node.name === "media" &&
      !mediaMatches(node.params ?? "", viewport)) return;
    if (node.type === "rule") {
      specificity = (node.selector?.match(/(?<!\\)\./g) ?? []).length;
    }
    if (node.type === "decl" && node.prop === property) {
      const priority = specificity + (node.important ? 10_000 : 0);
      if (priority >= winner.specificity) winner = { specificity: priority, value: node.value ?? "" };
    }
    for (const child of node.nodes ?? []) visit(child, specificity);
  };
  visit(parse(css));
  if (required) assert.notEqual(winner.value, "", `No ${property} declaration`);
  return winner.value;
}

function pixels(value: string, viewport: Viewport): number {
  if (/^\d+(?:\.\d+)?px$/.test(value)) return Number.parseFloat(value);
  if (/^\d+(?:\.\d+)?rem$/.test(value)) return Number.parseFloat(value) * 16;
  const variable = value.match(/^var\((--[\w-]+)\)$/);
  if (variable) {
    const declarations = [...theme.matchAll(new RegExp(`${variable[1]}:\\s*([^;]+);`, "g"))];
    assert.ok(declarations.length, `Missing theme value for ${variable[1]}`);
    return pixels(declarations.at(-1)![1].trim(), viewport);
  }
  const viewportCalc = value.match(/^calc\(100svh - (\d+)px\)$/);
  if (viewportCalc) return viewport.height - Number(viewportCalc[1]);
  const spacing = value.match(/^calc\(var\(--spacing\) \* (\d+)\)$/);
  if (spacing) {
    const rem = Number(theme.match(/--spacing:\s*([\d.]+)rem;/)?.[1]);
    return rem * 16 * Number(spacing[1]);
  }
  const min = value.match(/^min\((\d+px),\s*(calc\(100svh - \d+px\))\)$/);
  if (min) return Math.min(pixels(min[1], viewport), pixels(min[2], viewport));
  assert.fail(`Unsupported geometry length: ${value}`);
}

function themeValue(value: string, css?: string, viewport?: Viewport): string {
  const variable = value.match(/^var\((--[\w-]+)(?:,\s*(.*))?\)$/);
  if (!variable) return value;
  const declarations = [...theme.matchAll(new RegExp(`${variable[1]}:\\s*([^;]+);`, "g"))];
  const utilityValue = css && viewport ? geometry(css, viewport, variable[1], false) : "";
  const resolved = utilityValue || declarations.at(-1)?.[1].trim() || variable[2];
  assert.ok(resolved, `Missing theme value or fallback for ${variable[1]}`);
  return themeValue(resolved, css, viewport);
}

test("hero and invitation metadata preserve compact 12px typography", async () => {
  const metadata = elements("message-meta");
  assert.ok(metadata.length >= 4);
  for (const tag of [metadata[0], metadata[1], metadata.at(-1)!]) {
    const css = (await compile(`${theme}\n@tailwind utilities;`)).build(classes(tag));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1920, height: 900 }]) {
      const size = pixels(geometry(css, viewport, "font-size"), viewport);
      assert.equal(size, 12);
      assert.equal(Number(themeValue(geometry(css, viewport, "line-height"), css, viewport)), 1.1);
    }
  }
});

test("both hero notifications use uppercase purple metadata", async () => {
  for (const tag of elements("message-meta").slice(0, 2)) {
    const css = (await compile(`${theme}\n@tailwind utilities;`)).build(classes(tag));
    const viewport = { width: 390, height: 844 };
    assert.equal(geometry(css, viewport, "text-transform"), "uppercase");
    assert.equal(themeValue(geometry(css, viewport, "color")), "#d3b7f6");
  }
});

test("conversation metadata retains its responsive size and 1.1 leading", async () => {
  const metadata = elements("message-meta").slice(2, -1);
  assert.ok(metadata.length);
  for (const tag of metadata) {
    const css = (await compile(`${theme}\n@tailwind utilities;`)).build(classes(tag));
    for (const [width, expectedSize] of [[390, 12], [900, 12], [1024, 14], [1920, 14]]) {
      const viewport = { width, height: 900 };
      assert.equal(pixels(geometry(css, viewport, "font-size"), viewport), expectedSize);
      assert.equal(Number(themeValue(geometry(css, viewport, "line-height"), css, viewport)), 1.1);
    }
  }
});

test("People section hands desktop scroll height to CSS without pinning mobile", async () => {
  const [section] = elements("people-section");
  const style = section.match(/\bstyle="([^"]*)"/)?.[1];
  assert.ok(style);
  assert.match(style, /(?:^|;)--people-height:\s*[\d.]+svh(?:;|$)/);
  assert.doesNotMatch(style, /(?:^|;)\s*height:/);
  const css = await utilities("people-section");
  for (const width of [390, 767, 768, 1023]) {
    assert.equal(geometry(css, { width, height: 844 }, "height"), "auto");
  }
  for (const width of [1024, 1728, 1920]) {
    assert.equal(geometry(css, { width, height: 900 }, "height"), "var(--people-height)");
  }
});

test("short-height geometry wins overlapping wide and tablet breakpoints", async () => {
  const storyIndex = tags.findIndex((tag) => classes(tag).includes("story-card"));
  const storyHeading = tags.slice(storyIndex + 1).find((tag) => /^<h2\b/.test(tag));
  const peopleHeading = tags.find((tag) => /id="people-heading"/.test(tag));
  assert.ok(storyHeading && peopleHeading);
  const compileTag = async (tag: string) => (await compile(`${theme}\n@tailwind utilities;`)).build(classes(tag));
  const css = {
    story: await compileTag(elements("story-card")[0]),
    storyHeading: await compileTag(storyHeading),
    peopleHeading: await compileTag(peopleHeading),
    people: await compileTag(elements("people-card")[0])
  };
  for (const [width, height, storyHeight, storyFont, peopleFont, gap] of [
    [1920, 600, 505, 28, 44, 20],
    [900, 600, 505, 28, 44, 20],
    [1728, 650, 555, 28, 44, 20],
    [1920, 900, 728, 44, 80, 60],
    [900, 900, 585, 32, 64, 120],
    [390, 844, 585, 32, 44, 120],
    [390, 600, 470, 26, 44, 120],
    [767, 650, 520, 26, 44, 120],
    [768, 650, 555, 28, 44, 20]
  ]) {
    const viewport = { width, height };
    const label = `${width}x${height}`;
    assert.equal(pixels(geometry(css.story, viewport, "height"), viewport), storyHeight, `${label} story height`);
    assert.equal(pixels(geometry(css.storyHeading, viewport, "font-size"), viewport), storyFont, `${label} story heading`);
    assert.equal(pixels(geometry(css.peopleHeading, viewport, "font-size"), viewport), peopleFont, `${label} people heading`);
    assert.equal(pixels(geometry(css.people, viewport, "gap"), viewport), gap, `${label} people card gap`);
  }
});

test("story playback controls retain independent sizing without consumer overrides", async () => {
  const compiler = await compile(`${theme}\n@tailwind utilities;`);
  const chapterButton = tags.find((tag) => /aria-label="Read story 1"/.test(tag));
  assert.ok(chapterButton);
  const chapter = compiler.build(classes(chapterButton));
  const playback = await utilities("story-playback-toggle");
  for (const [width, height, size] of [[390, 844, 28], [900, 900, 36]]) {
    const viewport = { width, height };
    assert.equal(pixels(geometry(chapter, viewport, "width"), viewport), size);
    assert.equal(pixels(geometry(chapter, viewport, "height"), viewport), size);
    assert.equal(geometry(playback, viewport, "width"), "auto");
    assert.equal(pixels(geometry(playback, viewport, "min-width"), viewport), 56);
    assert.equal(pixels(geometry(playback, viewport, "height"), viewport), size);
  }
});
