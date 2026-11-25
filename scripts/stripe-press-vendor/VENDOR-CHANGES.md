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
