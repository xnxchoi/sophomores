// Renders the no-WebGL image set for the shop's books from the owner's book model (public/assets/three/book/book-rest.glb)
// in the shape of stripe.press's fallback manifest (their module 24750): a 36-frame turn (a full turn about the vertical
// axis, 10° a frame, starting at the hero pose), the hero (frame 0's book, cropped, at a larger size), the spine and the
// cover (straight on, cropped). None of their images are used. Writes WebP with alpha to
// public/assets/three/book/fallback/<set>/ and the manifest src/components/commerce/shop/_shared/fallback-manifest.json.
//
//   node scripts/stripe-press-vendor/render-fallback.cjs                       the placeholder set (every product)
//   node scripts/stripe-press-vendor/render-fallback.cjs <productId> <cover>   one product's set, from its cover atlas
//                                                                              (1920×1300, the layout of make-cover.cjs)
// Re-run it when a product's cover changes. Needs Playwright's Chromium (WebGL) and sharp, both already installed.
const path = require("path"), fs = require("fs");
const ROOT = path.join(__dirname, "../..");
const { chromium } = require(path.join(ROOT, "node_modules/playwright"));
const sharp = require(path.join(ROOT, "node_modules/sharp"));

const [productId, coverArg] = process.argv.slice(2);
const SET = productId || "placeholder";
const COVER = coverArg ? path.resolve(coverArg) : path.join(ROOT, "public/assets/three/book/cover-placeholder.png");
const OUT = path.join(ROOT, "public/assets/three/book/fallback", SET), URL_BASE = "/assets/three/book/fallback/" + SET + "/";
const MANIFEST = path.join(ROOT, "src/components/commerce/shop/_shared/fallback-manifest.json");
// Their sizes (24750, Built to Grow): turn frames 580×711, hero 793×1005, spine 109×980, cover 685×1020.
const TURN = { width: 580, height: 711 }, HERO_SCALE = 1005 / 660, STRAIGHT_HEIGHT = 1020, FRAMES = 36;
// The hero pose: the front cover towards the camera, turned so the spine edge shows, seen a little from above.
const FRONT = -Math.PI / 2, HERO_YAW = 0.26, HERO_PITCH = 0.08;

const html = `<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three"; import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9890, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(4, 1, 2); scene.add(fill);
const book = (await new GLTFLoader().loadAsync("/assets/three/book/book-rest.glb")).scene;
const tex = await new THREE.TextureLoader().loadAsync("/cover"); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
const cover = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), page = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.9 }),
  board = new THREE.MeshStandardMaterial({ color: 0xe6e5e1, roughness: 0.85 });
book.traverse((o) => { if (!o.isMesh) return; o.frustumCulled = false; o.material = o.name === "cover_1" ? cover : o.name.startsWith("pages") ? page : board; });
const box = new THREE.Box3().setFromObject(book), size = box.getSize(new THREE.Vector3());
book.position.sub(box.getCenter(new THREE.Vector3()));
const pivot = new THREE.Group(); pivot.add(book); scene.add(pivot);
const reach = Math.max(size.y, size.z) * 0.62;
const perspective = new THREE.PerspectiveCamera(20, 1, 0.1, 500);
const ortho = new THREE.OrthographicCamera(-reach, reach, reach, -reach, 0.1, 500);
window.shot = (w, h, yaw, pitch, straight) => {
  r.setSize(w, h); pivot.rotation.set(pitch, yaw, 0, "YXZ");
  let cam;
  if (straight) { cam = ortho; const a = w / h; cam.left = -reach * a; cam.right = reach * a; cam.top = reach; cam.bottom = -reach; }
  else { cam = perspective; cam.aspect = w / h; }
  cam.position.set(0, 0, straight ? 100 : reach / Math.tan((20 * Math.PI) / 360)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  r.render(scene, cam); return r.domElement.toDataURL("image/png");
};
window.ready = true;
</script></body></html>`;

// Crops to the opaque pixels (alpha > 8), returns the PNG buffer and the box it kept.
async function crop(png) {
  const image = sharp(png), { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const box = { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  return { buffer: await image.extract({ left: box.x, top: box.y, width: box.width, height: box.height }).png().toBuffer(), box };
}
const webp = (buffer, file) => sharp(buffer).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(OUT, file));

(async () => {
  fs.mkdirSync(path.join(OUT, "turn"), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1400 } })).newPage();
  await page.route(/^http:\/\/render\.local\//, (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/") return route.fulfill({ contentType: "text/html", body: html });
    const file = p === "/cover" ? COVER : p.startsWith("/three/") ? path.join(ROOT, "node_modules/three", p.slice(7)) : path.join(ROOT, "public", p);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith(".js") ? "text/javascript" : file.endsWith(".png") ? "image/png" : "application/octet-stream" });
  });
  await page.goto("http://render.local/"); await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const shot = async (w, h, yaw, pitch, straight) => Buffer.from((await page.evaluate(([w, h, yaw, pitch, straight]) => window.shot(w, h, yaw, pitch, straight), [w, h, yaw, pitch, straight])).split(",")[1], "base64");

  // The turn: whole frames (the book moves within them), frame 0 the hero pose; the hero box is frame 0's book.
  const frames = [];
  let heroBox = null;
  for (let i = 0; i < FRAMES; i++) {
    const png = await shot(TURN.width, TURN.height, FRONT + HERO_YAW + (i * 2 * Math.PI) / FRAMES, HERO_PITCH, false);
    if (i === 0) heroBox = (await crop(png)).box;
    const file = "turn/" + String(i).padStart(2, "0") + ".webp";
    await webp(png, file); frames.push(URL_BASE + file);
  }
  // The hero: frame 0's pose rendered larger, cropped to the book.
  const hero = await crop(await shot(Math.round(TURN.width * HERO_SCALE), Math.round(TURN.height * HERO_SCALE), FRONT + HERO_YAW, HERO_PITCH, false));
  await webp(hero.buffer, "hero.webp");
  // The spine and the cover, straight on, cropped.
  const spine = await crop(await shot(STRAIGHT_HEIGHT, STRAIGHT_HEIGHT, 0, 0, true));
  await webp(spine.buffer, "spine.webp");
  const front = await crop(await shot(STRAIGHT_HEIGHT, STRAIGHT_HEIGHT, FRONT, 0, true));
  await webp(front.buffer, "cover.webp");
  await browser.close();

  const set = {
    spine: { src: URL_BASE + "spine.webp", width: spine.box.width, height: spine.box.height },
    cover: { src: URL_BASE + "cover.webp", width: front.box.width, height: front.box.height },
    hero: { src: URL_BASE + "hero.webp", width: hero.box.width, height: hero.box.height },
    turn: { frames, width: TURN.width, height: TURN.height, heroBox },
  };
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { placeholder: null, books: {} };
  if (productId) manifest.books[productId] = set; else manifest.placeholder = set;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ set: SET, hero: set.hero, spine: set.spine, cover: set.cover, heroBox }));
})().catch((error) => { console.error(String(error).slice(0, 600)); process.exit(1); });
