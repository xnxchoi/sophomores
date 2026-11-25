// Our own neutral textures for the vendored material slots (none of theirs): flat or lightly noised greys.
const sharp = require("sharp"), path = require("path"), out = path.join(__dirname, "assets/shared");
const flat = (name, v, size = 256) => sharp({ create: { width: size, height: size, channels: 3, background: { r: v, g: v, b: v } } }).png().toFile(path.join(out, name + ".png"));
const noise = (name, amp, size = 512, weave = 0) => {
  const buf = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 128 + (Math.random() - 0.5) * 2 * amp;
    if (weave) v += ((x % weave < weave / 2) !== (y % weave < weave / 2) ? 1 : -1) * amp * 0.6;
    const i = (y * size + x) * 3; buf[i] = buf[i + 1] = buf[i + 2] = Math.max(0, Math.min(255, v));
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toFile(path.join(out, name + ".png"));
};
Promise.all([flat("diffuse_none", 255), flat("diffuse_overlay", 128), flat("bump_none", 128), flat("foil_none", 0),
  flat("glitter", 0), flat("gloss_none", 0), noise("bump_paper", 10), noise("bump_cardboard", 18), noise("bump_buckram", 12, 512, 6)])
  .then(() => console.log("ok"));
