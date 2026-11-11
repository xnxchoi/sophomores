# Provider port

Port Hideaway as written. Do not reshape it to fit Sophomores during this phase. A later pass may adapt it. Until then, a reader must be able to see where the Hideaway port ends and where Sophomores wiring begins.

The saved copy of this plan is `docs/plan.md`. Branch: `port/hideaway`. Hideaway originals stay in `src/hideaway`.

## Fidelity

A target can land at one of three depths. The depth is chosen before the port starts.

- **Full.** The target and the imports it needs are brought over as Hideaway wrote them.
- **Partial.** Only the agreed portion is brought over. That portion stays faithful.
- **Frontend only.** The interface is brought over as written. Logic past a cauterization is left pending, or swapped for a Sophomores call directly under the commented original.

Whichever lines remain are the original form and methods. Do not rewrite them into a local variant and leave no seam.

## Cauterization

A cauterization is a cut made only after a discussion. It is not a silent skip.

When a target's imports would require something this site does not have, and that something is a new Payload collection, a database change, or server code the frontend does not already call, pause and say so. Name the Hideaway symbol, the file, and what backend it needs. Do not port that backend to finish the frontend.

After the discussion, if the decision is not to port that part yet, mark every site found in that session which depends on the same missing part:

- Leave the Hideaway call in the file.
- Comment it out.
- A swap, when the discussion asked for one, sits on the next line. The original stays above it, commented.
- Do not delete the original.

One commit holds one cauterization. Gather every site that needs the same missing part, then commit that set alone. The message names the missing Hideaway dependency, where it was cut, and that the original calls remain commented.

A later discovery of another site with that same dependency is a new commit. Its message points at the earlier cauterization commit and says this site needs the same thing. Do not amend the earlier commit once later commits exist or once it has been pushed. Amending would hide when the second site was found and would rewrite a commit that already described a finished cut. If the second site is found in the same session, before that cauterization commit exists, it belongs in the one commit.

## Dependencies

If Hideaway's `package.json` lists an external library this repo does not have, and the approved target imports it, add that dependency. Stop only when the add has a conflict that cannot be resolved. A new library is not a cauterization. A new Payload collection is.

## Placement

Follow Hideaway's folders. Do not invent a Sophomores bucket for ported code.

`src/lib` is the wrong bucket. Hideaway keeps auth under `src/lib/auth`. Collections live in `src/payload`. Providers, stores, components, utilities, constants, hooks, and types are their own top-level folders. The earlier port put menu state, theme, slots, fixtures, mappers, transport, confetti, highlights, and header motion in `src/lib/content`, and put collections in `src/lib/payload`. Those move to the Hideaway path when their target is ported. Sophomores-only systems that Hideaway never had, such as phone verification and PortOne, stay where they are.

`src/components/shell/` is the same mistake. It holds partial copies in the wrong folders. Each piece goes where Hideaway already put it.

| Shell file now | Hideaway location to follow |
|---|---|
| `cursor.tsx` | `components/core` cursor, plus the cursor provider |
| `site-menu.tsx`, `menu-button.tsx`, `menu-frame.tsx`, `menu-gradient.tsx`, `menu-shaders.ts` | `components/UX/Menu` |
| `page-motion.tsx` | `components/UX/Transition` |
| `site-theme.tsx` | `providers/Theme` and `providers/HeaderTheme` |
| `site-scroll.tsx` | the scroll owner in the Hideaway provider stack |
| `ticker/` | `components/core/TickerCrownAnimated` |
| `site-header.tsx`, `header-actions.tsx` | `components/Shells/Header` |
| `header-panels.tsx` search and notifications | leave out for now |

Search and notifications stay out of this pass. Comment out the header parts that open those panels. Do not port `SearchBarProvider` or `NotificationProvider` yet.

This table is a placement map, not an approved port list.

## What gets ported

A Hideaway provider is in scope when the current site needs it for a function the site already has, or a function we intend to keep. The shell already performs menu open/close/preview, page motion, cursor, theme, and scroll. Those are the chrome candidates. Each one still needs a target and a depth before any code moves.

## How a target is chosen

Do not start a port from this file alone. For each candidate, stop and ask:

1. Is this the target?
2. Which depth: full, partial, or frontend only?
3. Which imports does that depth pull in, including any new package dependency?
4. Where would a cauterization fall, if the graph reaches Payload, the database, or other server code?

Frontend-only work inside the agreed cut can proceed. A backend boundary pauses until the discussion above decides the cut.

A faithful menu port does not keep `useSiteMenu` and rename it. Either leave the menu provider out, or bring `components/UX/Menu` in as Hideaway wrote it. A faithful link port pulls posts, transitions, and the rest of that chain. The link copy at `src/components/core/Link` stays unwired until that depth is accepted.

## How an approved target is ported

- Do not change the Hideaway implementation unless the instruction says to.
- Bring in only the fields the chosen depth needs, in a provider shaped so later fields can be added without restructuring it.
- At a cauterization, follow the commit rule above.
- Do not add a backend collection, field, or route to finish a frontend port.
- A ported collection goes to `src/payload/collections/<slug>/`, where Hideaway put collections. Components, providers, stores, utilities, constants, hooks, and types stay on the Hideaway path they came from. Nothing ported from Hideaway is added under `src/lib` or `src/components/shell`.

## Decisions

Pass 1 is a provider pass. Each row is a provider. Components are not targets. A component moves only when a provider in this table needs it, and only after that provider is the one the frame mounts.

`RP_Pro` is one module. It exports several providers. The cuts below name which of those providers stay.

| Provider | Where it lives | Depth | Cut |
|---|---|---|---|
| `DeviceProvider` | `src/providers/RP_Pro.tsx` | Port | None. It reads the client device. |
| `HAStoreProvider` | `src/providers/RP_Pro.tsx` | Port | None. This is the UI store the other providers read. |
| `CursorProvider` | `src/providers/RP_Pro.tsx` | Port | None. The cursor store does not query Payload. |
| `MenuProvider` | `src/providers/RP_Pro.tsx` | Port | The menu still has links. `MotionLink` is a string-`href` substitute and does not resolve a Payload reference. That substitute is the cut. The menu component is not this row. |
| `SearchBarProvider` | `src/providers/RP_Pro.tsx` | Out | Commented out in `RP_Pro`. `useSearchBar` is commented at each call site. |
| `ThemeProvider` | `src/providers/Theme` | Port | `useSearchBar` is commented. `AdminThemeProvider` stays in the same module. |
| `HeaderThemeProvider` | `src/providers/HeaderTheme` | Port | It only sets the header's theme. It does not load the header global. |
| `TransitionProvider` | `src/providers/TransitionProvider.tsx` | Port | `pageGroups` entries for paths this site does not have are commented. Lenis scroll lives here. There is no separate scroll provider. |
| `MobileProvider`, `MiddleMan` | `src/providers/MiddleMan.tsx` | Port | Viewport size no longer imports image collection slugs. |
| `NotificationProvider` | Hideaway `providers/Notifications` | Out | Do not mount it. |
| `Voyageur` | Hideaway `stores/Routing/RP_Voyageur.tsx` | Out | Do not import it. The frame should stop mounting the copy. Path checks that need a page type stay local. |
| `QueryProvider` | This site's data reads | Site function | Do not port Hideaway's React Query client. Keep the reads this site already uses. |
| `SessionProvider` | `currentUser` in `src/lib/auth/server.ts` | Site function | Do not port `RP_SessionProvider`. Membership stays on the Sophomores session. |
| `TooltipProvider` | Hideaway `components/ui/tooltip` | Hideaway primitive | Import Hideaway's tooltip styling and animation. Do not replace it with the Base UI tooltip. |
| `PortalProvider` | Hideaway `components/UX/Transition/Portaller` | Hideaway primitive | Import Hideaway's portal styling and animation. |
| `TourProvider` | Hideaway tour components | Hideaway primitive, site function | Import the tour's styling and motion. What the tour explains, and when it runs, stay this site's. |

The header document as a Payload global is a backend target, not a provider. It is not part of this table.

## Priority

1. The providers in the table above, one at a time, until the frame mounts the ported module for that row.
2. A component that belongs to one of those providers, only after that provider is mounted.
3. Further imports only after that depth's fan-out is accepted. A backend boundary pauses until the cut is decided and, if declined, committed as one cauterization.

## Status

The frame no longer mounts `Voyageur`. `SearchBarProvider` and `NotificationProvider` stay out. `QueryProvider` and `SessionProvider` stay this site's functions. `TooltipProvider`, `PortalProvider`, and the tour's styling and motion are Hideaway primitives. `HeaderThemeProvider`, `PortalProvider`, and Hideaway's tooltip provider are mounted on the frame. The frame renders `RP_Menu`. The header button toggles `MenuProvider`. The two Reading and Index links stand in for the header global. No other pass is open.
