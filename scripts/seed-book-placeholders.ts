// Labelled placeholder book art for the disposable owner preview (owner, 25 Nov: "make the labelled placeholders
// first"). Each product gets a cover atlas that says PLACEHOLDER with its own title, and every product shares one
// labelled stage art, until the owner supplies the real ones in Payload. Payload Local API only; the preview lease only.
//
// Run (guarded), from the checkout that owns ./media:
//   DATABASE_URI='postgresql://preview_owner@localhost/sphmrs_owner_preview?host=%2Ftmp%2Fsphmrs-owner-preview-6lse30ag%2Fsocket&port=55439' \
//   NODE_ENV=development node --import tsx scripts/seed-book-placeholders.ts --seed-book-placeholders
import { randomBytes } from "node:crypto";
import { lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CollectionSlug, Where } from "payload";

const lease = "/tmp/sphmrs-owner-preview-6lse30ag";
const socket = join(lease, "socket");
const databaseURI = `postgresql://preview_owner@localhost/sphmrs_owner_preview?host=${encodeURIComponent(socket)}&port=55439`;

function requireFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function admit() {
  requireFixture(process.argv.length === 3 && process.argv[2] === "--seed-book-placeholders"
    && process.env.DATABASE_URI === databaseURI && process.env.NODE_ENV === "development",
  "Refusing to seed: use the exact disposable preview database and the explicit seed flag.");
  const uid = process.getuid?.(), directory = lstatSync(socket), endpoint = lstatSync(join(socket, ".s.PGSQL.55439"));
  requireFixture(directory.isDirectory() && directory.uid === uid && (directory.mode & 0o777) === 0o700
    && endpoint.isSocket() && endpoint.uid === uid, "Refusing to seed: the owned private PostgreSQL socket is not available.");
  // Isolate config from inherited provider keys, dotenv overrides and PG* defaults.
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, {
    NODE_ENV: "development", DATABASE_URI: databaseURI, PAYLOAD_SECRET: randomBytes(48).toString("hex"),
    BETTER_AUTH_URL: "http://127.0.0.1:3000", NEXT_PUBLIC_SERVER_URL: "http://127.0.0.1:3000",
    PORTONE_PAYMENT_MODE: "disabled", NEXT_TELEMETRY_DISABLED: "1", TMPDIR: lease, DISABLE_PAYLOAD_HMR: "true",
  });
}

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

/** Words into lines of at most `max` characters. */
function lines(text: string, max: number) {
  const out: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = out.at(-1);
    if (last !== undefined && (last + " " + word).length <= max) out[out.length - 1] = last + " " + word; else out.push(word);
  }
  return out;
}

// The book's atlas (book.tsx): u across — back 0–0.455, spine 0.455–0.57, front 0.57–1; the covers fill v 0.21–1 (the
// image's top 79%), the strip below holds the page edges and the blank the board edges sample. Neutral greys only
// (colours are on hold).
// Quiet on purpose (owner, 25 Nov: the first, loud version was "an abomination"): flat, plain boards with one small
// grey label, and a flat dark stage, so nothing reads as finished art.
function coverSvg() {
  const w = 2400, h = 2000, top = h * 0.79, back = w * 0.455, front = w * 0.57;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#efeee9"/>
  <rect width="${w}" height="${top}" fill="#e6e5e1"/>
  <rect x="${back}" width="${front - back}" height="${top}" fill="#dcdbd7"/>
  <text x="${front + 90}" y="150" font-family="Helvetica, Arial, sans-serif" font-size="38" letter-spacing="2" fill="#9a9994">Placeholder</text>
</svg>`;
}

function stageSvg() {
  const w = 2400, h = 3000;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#2b2c2e"/>
  <text x="90" y="${h - 90}" font-family="Helvetica, Arial, sans-serif" font-size="40" letter-spacing="2" fill="#5a5b5f">Placeholder</text>
</svg>`;
}

async function seed() {
  const [{ createLocalReq, getPayload }, { default: canonical }, { default: sharp }] = await Promise.all([
    import("payload"), import("../src/payload.config"), import("sharp"),
  ]);
  const config = await canonical;
  const payload = await getPayload({ config: { ...config, typescript: { ...config.typescript, autoGenerate: false } }, disableDBConnect: true, disableOnInit: true });
  const db = payload.db;
  requireFixture(db.name === "postgres" && Reflect.get(db, "push") === false, "Refusing to seed: the adapter could push schema.");
  try {
    await db.connect?.();
    const pool = Reflect.get(db, "pool") as { query: (sql: string) => Promise<{ rows: { database: string; role: string; socket_only: boolean }[] }> };
    const { rows: [identity] } = await pool.query("SELECT current_database() AS database, current_user AS role, inet_server_addr() IS NULL AS socket_only");
    requireFixture(identity?.database === "sphmrs_owner_preview" && identity.role === "preview_owner" && identity.socket_only,
      "Refusing to seed: not the disposable preview database.");
    const upload = payload.collections.media.config.upload;
    requireFixture(typeof upload.staticDir === "string" && resolve(upload.staticDir) === resolve("media"), "Refusing to write outside ./media.");

    const req = await createLocalReq({}, payload);
    const local = { req, depth: 0, overrideAccess: true } as const;
    // One media document per file: an existing one (by filename) is reused, never overwritten.
    const media = async (filename: string, alt: string, svg: string) => {
      const found = await payload.find({ ...local, collection: "media" as CollectionSlug, where: { filename: { equals: filename } } as Where, limit: 1 });
      if (found.docs[0]) return String(found.docs[0].id);
      const data = await sharp(Buffer.from(svg)).png().toBuffer();
      const doc = await payload.create({ ...local, collection: "media" as CollectionSlug, data: { alt } as never,
        file: { data, mimetype: "image/png", name: filename, size: data.length } });
      return String(doc.id);
    };

    const stage = await media("placeholder-stage-art-v2.png", "Placeholder stage art", stageSvg());
    const keep = new Set([stage]);
    const products = await payload.find({ ...local, collection: "products" as CollectionSlug, draft: false, limit: 50, pagination: false });
    for (const product of products.docs as unknown as { id: string; title?: string; page?: Record<string, unknown> & { book?: Record<string, unknown> } }[]) {
      const title = product.title ?? "Untitled";
      const cover = await media("placeholder-cover-v2-" + product.id + ".png", "Placeholder cover art: " + title, coverSvg());
      keep.add(cover);
      const page = product.page ?? {};
      await payload.update({ ...local, collection: "products" as CollectionSlug, id: product.id, draft: false,
        data: { page: { ...page, stageArt: stage, book: { ...(page.book ?? {}), coverDiffuse: cover } } } as never });
      console.log("placeholder art set: " + product.id);
    }
    // Retire the earlier placeholders (no product points at them now): Local API delete, which removes their files too.
    const old = await payload.find({ ...local, collection: "media" as CollectionSlug, where: { filename: { like: "placeholder-" } } as Where, limit: 100, pagination: false });
    for (const doc of old.docs) if (!keep.has(String(doc.id))) {
      await payload.delete({ ...local, collection: "media" as CollectionSlug, id: doc.id });
      console.log("retired old placeholder: " + String(doc.id));
    }
  } finally {
    await db.destroy?.();
  }
}

admit();
seed().then(() => process.exit(0), (error: unknown) => { console.error(error instanceof Error ? error.message : "Seed failed."); process.exit(1); });
