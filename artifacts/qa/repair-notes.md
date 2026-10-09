# Entry and footer repair — 2026-10-02

## Changes
- Entry follows the observed reference phases: centered wordmark hold, docking into header, backdrop reveal/enlargement, then notification/navigation reveal. Second notification follows scrolling.
- Footer lowers the mesh inside a full-viewport canvas, preserving a curved silhouette rather than translating and cropping the canvas.
- Entrance scales geometry instead of the canvas ancestor, avoiding incorrect initial R3F layout measurements.
- Fallback artwork uses separate background properties to avoid React shorthand/longhand conflicts on section changes.

## Verification
- 24 automated tests pass; TypeScript and scoped ESLint pass; production build succeeds.
- Coverage thresholds apply only to deterministic `lib/teaser` helpers/content, not the entire experience.
- Browser checks: fresh entry and settled canvas at 1280×720 and 390×844; footer at those sizes and 390×568; no horizontal overflow at the measured desktop/mobile sizes.
- Mobile navigation and invitation dialog open/Escape/focus restoration checked.
- Source/local mobile footer comparison: `footer-comparison.jpg`. Other screenshots are in this directory. Some diagnostic captures include development UI.
- Source reviews reported no blockers. This is not a claim of exact pixel/timing identity, full accessibility certification, or exhaustive device coverage.

## Restart
Local production preview runs at http://127.0.0.1:3210 using `.next/standalone/server.js`, bound to loopback. Build before restarting that preview; copy `public` and `.next/static` into the standalone bundle. Stop the existing process before taking the port. Do not run build and development against the same `.next` directory concurrently.

## Release boundaries
Not deployed. Ticket-sale date/time remains unconfirmed; no event date is invented. Invitation dialog is local-only: no email collection or reservation. Reference-derived assets/fonts require clearance or replacement before public launch; draft metadata remains noindex. Unrelated flame-backdrop work is not part of these repairs.
