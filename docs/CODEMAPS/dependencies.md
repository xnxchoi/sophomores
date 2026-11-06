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

<!-- AUTO-GENERATED: ui-composition-dependencies BEGIN -->
## UI composition dependency boundary

**Last updated:** 2026-11-05. Generated from `package.json`, installed package
metadata, and imports in `components/ui/{badge,form,sidebar,tooltip,button,label,separator}.tsx`.
The existing port/deployment notes above are preserved, not a new readiness audit.

| Dependency | Installed version | Current role |
| --- | --- | --- |
| `@base-ui/react` | 1.9.0 | Direct `useRender` composition, plus existing Button, Separator and Tooltip APIs; modern Badge also uses `mergeProps`. Already installed, not added by this batch. |
| `react` | 19.3.1 | `Children.toArray` resolves nullable/Flight content before local single-host validation; pending content follows React suspension. |
| `@radix-ui/react-slot` | 1.3.3 | Still declared/installed, but no direct production imports remain. Retention in the manifest is not a new dependency-removal authorization. |
| `@radix-ui/react-label` | 2.1.17 | Still declared/installed, but no direct production imports remain; the maintained Label implementation is native/Base UI. |
| `vaul` | 1.1.2 | Intentionally retained authentication surface owner. Not part of, or a follow-up task for, this composition migration. |

Zero direct Slot/Label imports does **not** mean the repository or dependency tree
is Radix-free: other Radix wrappers and transitive dependencies remain. Do not
remove their packages or migrate Vaul under this scope. Base UI owns cloning,
prop/event composition and refs; no replacement Slot facade was introduced.

The composition batch changes no package scripts, dependencies, environment
variables, routes or infrastructure. Existing unrelated package/lockfile work
must be reviewed separately; clean-checkout/frozen-install readiness is not
established by the installed-dependency checks. In particular, Form already
imported `react-hook-form`, but its manifest/lockfile restoration is separate
uncommitted work and is not made canonical by this migration.

See the [frontend ownership map](frontend.md#ui-composition) and
[focused test/fixture instructions](../../README.md#ui-composition-current-scope-and-focused-checks).
<!-- AUTO-GENERATED: ui-composition-dependencies END -->

<!-- AUTO-GENERATED: portone-dependencies BEGIN -->
## PortOne dependency boundary

**Verified:** 2026-11-06. Generated from `package.json`, installed SDK metadata,
and imports in `lib/tickets/portone/runtime.ts` and
`components/tickets/portone-checkout.tsx`.

| Dependency | Exact manifest / installed version | Current use |
| --- | --- | --- |
| `@portone/browser-sdk` | 0.1.13 | Direct V2 `requestPayment` call from the checkout component. Browser success is not trusted payment confirmation. |
| `@portone/server-sdk` | 0.19.0 | `Webhook.verify` on the raw signed request body. Payment lookup uses a fixed-origin REST GET with a five-second deadline. |

These are the two approved SDK additions, not a general dependency upgrade or
clean-checkout/security acceptance claim. The integration adds no package script.
The later payment-safety slice adds registered migration
`20261106_000000_payment_safety` and offline schema/type updates,
not another dependency. It remains disabled by default and accepts only sandbox
configuration. New `PORTONE_*` configuration is owned by
`lib/tickets/portone/config.ts`; the historical port-only environment statement
above does not describe this later integration.

The exact reviewed TEST store/channel pair and public policies remain unset.
Approved same-entity seller data/public mobile contact are populated, but the
non-mobile checkout requirement still fails. Credentials, provider settings,
calls, real payment acceptance, and deployment are
separate approval/acceptance gates. See the
[backend map](backend.md#portone-checkout-slice--updated-2026-11-06) and
[canonical runbook](../deployment/member-auth.local.md#portone-checkout--current-source-scope-2026-11-06)
for source ownership, configuration and the next-step plan.
The separately approved local migration and real-adapter index/CAS/hold checks
have since passed without provider calls. The existing database volume and
credentials were preserved while its container binding changed to loopback-only.
<!-- AUTO-GENERATED: portone-dependencies END -->
