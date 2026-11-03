<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~250 -->

# Dependencies

Package manager: `pnpm@12.16.1`. Payload `3.92.1`. No root `engines` field. Installed Payload packages require Node `^22.23.4 || >=24.22.1`.

## Added for the port

| Package | Version | Used by |
|---|---|---|
| `gsap` | 3.15.0 | MorphSVG play/pause, starliner, header scrub, parallax |
| `@gsap/react` | 2.1.2 | React binding for those timelines |

Howler was already installed and drives `TrackPlayer`. drei `View`, `Environment`, `RenderTexture`, and `Text` drive the shared canvas, the badge, and the cassette display.

`package.json` has no `pnpm.onlyBuiltDependencies` key. The port added no script.

## Assets copied for components that reference them

```
public/assets/fonts/SUIT-Variable.woff2
public/assets/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2
public/assets/fonts/Workbench.ttf
public/assets/badge/badge_compressed.glb
public/assets/starliner-backdrop.svg
public/assets/credits/fixture-author.svg
public/assets/three/tape/player.gltf
public/assets/three/tape/player.bin
public/assets/three/tape/urban_alley_01_1k.hdr
```

Not copied: cassette `Display.mp4`, unused Hideaway faces, plaque and ticket models.

## External services already in the app

PostgreSQL via `DATABASE_URI`. Better Auth via `BETTER_AUTH_SECRET` and `/api/auth/[...all]`. Brevo SMTP keys in `.env.template`. Mapbox key. Member auth and phone verification stay opt-in and default to `disabled`. The port does not read those variables.

No new environment variable was added.
