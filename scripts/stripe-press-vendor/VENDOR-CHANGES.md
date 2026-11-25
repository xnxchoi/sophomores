# Changes to stripe.press's code (everything else is verbatim)

Applied by `patch.py` to copies in `chunks/`; each must match exactly once.

1. `0bl3vphd9w8zl.js` (module 48585, texture manifest): `o()` no longer rewrites .jpg/.png to .ktx2. We have no KTX2
   textures; the manifest's paths load through their plain image loader (3fe65 module, `/\.ktx2/` switch).

Harness-only (not code changes): `harness/main.js` is our one module (990001); it mounts BookStack (76489 `I`). The
harness server maps `/3d/book.glb` to the owner's model and every `/images/...` texture to our own files.

Model (owner, 25 Nov, "let's do b for now"): `fix-model.py` writes `assets/book-rest.glb` from the owner's book.glb:
root pose cleared, cover bones back to bind pose (their code reads the loaded bone rotation as the closed cover),
`crash` renamed `spine`. Retire it when the owner re-exports at rest.

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
