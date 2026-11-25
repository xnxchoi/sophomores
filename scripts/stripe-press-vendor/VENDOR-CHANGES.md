# Changes to stripe.press's code (everything else is verbatim)

Applied by `patch.py` to copies in `chunks/`; each must match exactly once.

1. `0bl3vphd9w8zl.js` (module 48585, texture manifest): `o()` no longer rewrites .jpg/.png to .ktx2. We have no KTX2
   textures; the manifest's paths load through their plain image loader (3fe65 module, `/\.ktx2/` switch).

Harness-only (not code changes): `harness/main.js` is our one module (990001); it mounts BookStack (76489 `I`). The
harness server maps `/3d/book.glb` to the owner's model and every `/images/...` texture to our own files.

Model (owner, 25 Nov, "let's do b for now"): `fix-model.py` writes `assets/book-rest.glb` from the owner's book.glb:
root keeps its own offset but loses the saved tilt; cover bones back to bind pose (their code reads the loaded bone
rotation as the closed cover); pages2 back to rest without the stack baked in at export. Retire it when the owner re-exports at rest.

2. `0bl3vphd9w8zl.js` (module 48585, `K(name)`): a texture name that is already a path (starts with `/`) is used as
   that path, so our catalogue can point at our own files without manifest entries.
3. All vendored files: the `TURBOPACK*` globals are renamed `SPTURBOPACK*`, so their runtime never collides with
   Next's own Turbopack runtime on the same page.
4. All vendored files: `"/images/presslogo.png"` (their logo, used as the default page print) → our
   `/assets/three/book/shared/blank.png`.
5. `3fe65qr7ey8j5.js` (module 76246): the model path `"/3d/book.glb"` → `/assets/three/book/book-rest.glb` (our rest copy
   of the owner's model, from `fix-model.py`).
6. `0bl3vphd9w8zl.js` (manifest): the eight `/images/covers/shared/*` paths → our neutral maps in
   `/assets/three/book/shared/*.png`.

Other `/images/...` strings remain in their catalogue and dev code (zine pages, artifacts, test backgrounds); browse with
our catalogue requests none of them (checked in the harness request log).
7. `3aodgiaju4hkl.js` (module 67168, catalogue): if `globalThis.__SPBOOKS` is set (our books in their built shape) the
   exported book list (`I`, `Y`) is ours, and `globalThis.__SPFEATURED` is the featured count (their `isFeatured` count),
   so the scene's featured/shelf indices (t, J, K, segment helpers) follow our catalogue. Set by shop/stripe-scene.tsx
   before their modules first run. With our books, their social-card check (each book needs one of their share images)
   is skipped.
9. `12s2cqzsl56ip.js` (module 50016, spine-row display order `ec`): theirs moves the last `floor((n-2J-1)/2)` books to
   the front so the last featured book `J` (selected when the shelf arrives) sits mid-row; with fewer than `2J+1` books
   it is left at the right end. Ours is the same idea as a rotation putting `J` at `floor((n-1)/2)`: the same order as
   theirs for `n >= 2J+1`, and `J` still mid-row with fewer books (owner, 25 Nov: their carousel starts with the last
   featured book in the middle, ours started at the end).
10. `12s2cqzsl56ip.js` (module 63913, their sound): the same eight exports (`t B J D X G r z`), each forwarding its
    call to `globalThis.__SPSOUND[letter]` and doing nothing when that is unset (every original export already returned
    nothing before its first unlock, so callers are unaffected). The shop sets `__SPSOUND` to our sounds, the owner's
    Kenney files (`src/components/commerce/shop/use-book-sounds.tsx`, slice S). The vendored code has no capture
    listener, Howl, audio path or Web Audio node of its own. Howler (43469), imported only by 63913, is an empty module,
    which also drops its two 48-byte WAV probes. After this no vendored file contains `/audio/` or `.m4a`
    (tests/commerce/ui/vendor-silence.test.ts).

## Inventory: the 21 files `stripe-scene.tsx` loads (`chunks.json` + the runtime)

Module counts from the teardown's module index (`.tmp/stripe-notes/modindex.txt`); roles are what our page uses or
why the scene's graph pulls the file in. All are their shipped code; the changes above are the only edits.

| file | modules | role |
|---|---|---|
| turbopack-2_04ewhudzrza.js | runtime | their Turbopack runtime (globals renamed, change 3) |
| 04ud9hjinltfg.js | 9 | the scene: BookStack 76489, its styles, the spine-row seats 2449 |
| 12s2cqzsl56ip.js | 5 | the live-ref hub 50016; sound 63913 and Howler 43469 (stubbed, change 10) |
| 3aodgiaju4hkl.js | 1 | the catalogue 67168/59915 (ours via change 7) |
| 3fe65qr7ey8j5.js | 18 | the book model and texture loading (76246), basis transcoder glue |
| 0bl3vphd9w8zl.js | 13 | the texture manifest 48585 (changes 1, 2, 6), scroll helpers 73900 |
| 0is2w5i_ynjyj.js | 9 | scroll and hit-rect helpers (50883), debug flags, their product data the graph imports |
| 06y4cpdp__u2p.js | 4 | URL/folio helpers, grain, a dev HUD the graph imports |
| 0_xwvg_h93t1m.js | 15 | geometry and layout helpers, their crash probe |
| 14l5yxhvu5ecr.js | 35 | motion tokens 72646, script loading, shared utilities |
| 1imu45qukg0dp.js | 35 | home layout styles, controls; holds the dormant font path below |
| 0zqma92wkm7ei.js | 11 | locale/format utilities, layout styles, the CriOS viewport follow |
| 248-_vgnwste3.js | 3 | three.js colour/light helpers; the WebP/AVIF probes below |
| 0o8wbxikbqj64.js | 7 | React JSX runtime and styled-components (their CSS-in-JS) |
| 1gsquroxu5z89.js | 2 | react-dom (57647) |
| 02r0qv9ged3vb.js | 10 | loaders and document helpers |
| 0al_0m9d4_k3k.js | 5 | fetch/error utilities |
| 18l0ksfy0ov6e.js | 1 | three.js blend constants |
| 1hkd3mo7rce98.js | 1 | @react-three/fiber attach helpers |
| 29c537hi0sbmc.js | 2 | site metadata the graph imports (not rendered) |
| 0-gkbk5su9wr9.js | 4 | scene diagnostics, their book list constants |

## What else is inside them (named, not shipped as assets)

- **Audio:** none of theirs after change 10; the scene's sound calls reach our module through `__SPSOUND`. three.js's own `Audio` classes stay in `1hkd3mo7rce98.js` (library code;
  nothing on our page constructs them).
- **Font:** `1imu45qukg0dp.js` exports the path `/fonts/SuisseIntlMono-Regular.otf` (with a system mono stack) as a
  constant. We ship no font file; no request for it has been observed yet; the browser proof of the r3 build checks the request log for it.
- **Embedded fixtures (library code):** a 1×1 PNG data URI in `04ud9hjinltfg.js`; WebP and AVIF decode probes in
  `248-_vgnwste3.js`. Format probes, no artwork.
- **Not vendored:** their artwork, textures, fonts, audio and models. Our textures are generated by
  `make-textures.cjs` (seeded, deterministic; receipt in `textures-receipt.json` with each file's SHA-256), the cover
  placeholder by `make-cover.cjs` (a flat board with the word "Placeholder" in the system Helvetica; SHA-256
  0396f9a7f0168f8fd1bef89b5e9c4ee6df3dcd1f36f52b75a4d9372ca1b35afa, font rendering makes it machine-dependent), the model
  is the owner's `book.glb` (and `fix-model.py`'s rest copy), and the sounds are the owner's Kenney "RPG Audio" pack (CC0,
  `public/assets/three/book/audio/PROVENANCE.md`).
- **Redistribution:** copying their code is the owner's direction (25 Nov); it is not a licence from Stripe. The owner
  decides before anything ships publicly.
