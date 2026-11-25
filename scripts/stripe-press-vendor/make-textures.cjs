// Our own neutral textures for the vendored material slots (none of theirs): flat or lightly noised greys, the blank
// endpaper and the plain page. Deterministic: the noise comes from a seeded generator (mulberry32, SEED), so a re-run
// with the same sharp/libvips reproduces every file byte for byte. Writes them into public/assets/three/book/shared
// and a receipt (seed, versions, SHA-256 of each file) beside this script.
// Usage: node scripts/stripe-press-vendor/make-textures.cjs [out-dir]
const sharp = require("sharp"), path = require("path"), fs = require("fs"), crypto = require("crypto");
const SEED = 20261125;
const out = process.argv[2] || path.join(__dirname, "../../public/assets/three/book/shared");
const random = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const file = (name) => path.join(out, name + ".png");
const flat = (name, rgb, size = 256) => sharp({ create: { width: size, height: size, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).png().toFile(file(name));
const clear = (name, size = 256) => sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(file(name));
const noise = (name, amp, size = 512, weave = 0) => {
  // Each texture has its own stream (the seed plus its name), so adding one never changes another.
  const next = random(SEED ^ [...name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261));
  const buf = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 128 + (next() - 0.5) * 2 * amp;
    if (weave) v += ((x % weave < weave / 2) !== (y % weave < weave / 2) ? 1 : -1) * amp * 0.6;
    const i = (y * size + x) * 3; buf[i] = buf[i + 1] = buf[i + 2] = Math.max(0, Math.min(255, v));
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toFile(file(name));
};
const made = [["diffuse_none", () => flat("diffuse_none", [255, 255, 255])], ["diffuse_overlay", () => flat("diffuse_overlay", [128, 128, 128])],
  ["bump_none", () => flat("bump_none", [128, 128, 128])], ["foil_none", () => flat("foil_none", [0, 0, 0])], ["glitter", () => flat("glitter", [0, 0, 0])],
  ["gloss_none", () => flat("gloss_none", [0, 0, 0])], ["bump_paper", () => noise("bump_paper", 10)], ["bump_cardboard", () => noise("bump_cardboard", 18)],
  ["bump_buckram", () => noise("bump_buckram", 12, 512, 6)], ["blank", () => clear("blank")], ["page_plain", () => flat("page_plain", [243, 242, 238], 8)]];
Promise.all(made.map(([, make]) => make())).then(() => {
  const files = Object.fromEntries(made.map(([name]) => [name + ".png", crypto.createHash("sha256").update(fs.readFileSync(file(name))).digest("hex")]));
  const receipt = { generator: "scripts/stripe-press-vendor/make-textures.cjs", seed: SEED, prng: "mulberry32, per-texture stream (seed ^ FNV-1a of name)",
    sharp: sharp.versions, node: process.version, files };
  fs.writeFileSync(path.join(__dirname, "textures-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log("ok", Object.keys(files).length);
});
