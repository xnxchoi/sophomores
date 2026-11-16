# SPH-WALLET-ACTIVATION-20261116: handback (rounds 1–7)

**State, round 7 (task_67c7bdefd45c, 2026-11-17): the added jump fixed (red first), and the welcome card redesigned as states rather than sentences, from the Antigravity prototype with the coordinator's corrections. Every state was re-rendered with frame sequences of the arrival and of "added" (`render-r7/`); the gates are green on `ce0850c3`.** The round-7 section replaces round 6's welcome copy and layout. Everything else below still holds.

**State, round 6 (historical) (task_7d92d4e801b2, 2026-11-16): every listed fix done, the affected states re-rendered (`render-r6/`), gates green on `f175d42`. This is the last fix round before the owner.** Round 6 changes the shared member client, the catch-up sweep, the welcome page and the account tray. The sections below still hold where round 6 doesn't replace them.

**State, round 5 (historical) (task_72cd0e6e6507, 2026-11-16): all nine Santa fixes done, every state re-rendered, gates green on `3dceb88`. Waiting for the custodian's Santa pass.** The round-4 section below still holds for the Safe scheme and the settlement; round 5 changes the welcome page, the account tray and the shared member client.

**Round 4 state (historical) (task_4059bb2b1057, 2026-11-16): done, gates green. Waiting for the custodian's two-reviewer Santa pass.** The round-4 section below replaces the activation design described in the earlier sections: no passkey owns a wallet, and `/account/activate` is gone.

## Round 7 (task_67c7bdefd45c): the added transition, and the card designed instead of written

The owner rejected the round-6 card: too wordy, no UI discipline. Part A fixes the "added" jump. Part B was replaced mid-round (coordinator `msg_e181d69c0ba7`): design the states, don't write them. It was then held for, and rebuilt from, the Antigravity prototype (`msg_414f708dcdb9`). The prototype was a visual baseline only; the card was re-implemented on top of part A, with the coordinator's binding corrections.

| Commit | What |
| --- | --- |
| `e6c3feab` | The formatter's reflow of `welcome.tsx` only, committed alone so the part-A red run is against clean code. |
| `6c72b865` | **Part A.** The added body eases its own height and opacity in while the offer collapses, in the same beat. No `popLayout`, no `mode="wait"`. |
| `15592e65` | **Part B.** The states designed: Signet mark, one passkey control, a three-beat arrival, theme tokens, no body paragraphs. Tests assert states, not wording. |
| `ce0850c3` | Part B tuning from the live render: on hold dims clearly, a busy control keeps full strength, the confirmation waits for the leaving control, the check fades in with its stroke, and the display face. |
| (this commit) | Captures (`render-r7/`), the part-A red logs (`evidence/r7-*`), and this section. The `render-r6/` PNGs are superseded (history keeps them). |

### Part A: the added transition

- **Cause.** On "added", the exiting offer and the entering "Next time…" body were mounted together. The body entered in flow at full height (opacity only), so the card grew about 28 px without easing, then the text slid up.
- **Fix (`6c72b865`).** The added body got its own `Eased` (height and opacity) reveal, running concurrently with the offer's height collapse. The card's height changes in one eased beat.
- **Test, red first.** `adding a passkey never grows the card un-eased…` (`tests/membership/welcome-dom.test.tsx`).
  - A MutationObserver records the inline height each element mounts with, at insertion and before any animation frame.
  - Every element that enters on "added" and stays in the card must either mount at `height: 0px` (an eased reveal) or take the control's own 48 px cell (`[data-welcome-slot].grid.min-h-12`).
  - Red on `e6c3feab`: `"Next time, you can sign in by unlocking this device." entered the card's flow at full height` (`evidence/r7-partA-red-e6c3feab.log`).
  - After the part-B refactor, the same test was re-run against `e6c3feab`'s component and catalogue. It is still red, for the same element (`evidence/r7-partA-red-after-refactor.log`).
  - Two changes after the first red, both kept:
    - the text check accepts both "Passkey added." and "Passkey added";
    - only elements still in the card count (the progress sweep mounts and unmounts inside one press).
- **Part B supersedes the body.** The added state no longer has a body at all. The control itself resolves in its own cell, so the card doesn't change height on "added" (see the live series below).

### Part B: design choices (one line each)

- **One quiet display line.** "Welcome" in Narcissian Nectare, normal weight, 48 / 60 px. It's the only large type, per 04c's "two type voices, loud once". `font-serif` resolves to Georgia here, so the face is named directly (`font-[family-name:NarcissianNectare,serif]`, the family next/font registers).
- **Small uppercase labels.** SIGNET, PASSKEY, the state words and "1 SAVED": 11 px, tracked 0.18em, `text-muted-foreground`, on the theme's `font-mono` token. **Finding:** that token is self-referential (`--font-mono: var(--font-mono)` in `globals.css`), so it currently falls back to the inherited sans (Suit), which is 04c's label default anyway. Fixing the token is outside this branch.
- **The Signet is a mark, not a sentence.** It's a 56 px ring and seal, and **a placeholder** (`data-placeholder="signet-mark"`; see the decisions below). Shade, opacity and motion carry the state:
  - pending breathes (the seal at 30→75 % opacity and 88→100 % scale, a 2.6 s mirrored cycle);
  - issued settles solid (it lands once, from 72 % scale, after the beat arrives);
  - on hold dims (ring 22 %, seal 10 %, still);
  - none, unverified and restricted are a dashed ghost ring with no seal.
- **One passkey control.** All its states share one 48 px grid cell, so nothing outside the cell moves:
  - idle: "Add a passkey";
  - waiting: a sweep across the button, which stays at full strength rather than greying as if unavailable;
  - unknown: "Check again", secondary, with the same sweep while checking;
  - unsupported: a dashed, muted slot reading "This browser can't use passkeys";
  - added: an outlined confirmation whose check draws in.
  - A leaving control is inert and stops its sweep at once.
- **At most one short line.** It appears only for cancelled, rate-limited, not added and unknown. It eases in below the control (the card grows 36 px, eased) and nothing is reserved when it's empty, so the old empty band under the button is gone.
- **Arrival in three beats.** Greeting, Signet, passkey: a 0.13 s stagger after a 0.08 s lead, each beat over 0.7 s from 10 px below with 4 px of blur, on an expo-like ease-out (`[0.16, 1, 0.3, 1]`). It runs once, on mount: a refresh with new server data doesn't replay it (tested).
- **Durations tuned per element, not a token.** Speed follows mass (04c):
  - colour and opacity swaps are the quickest (control exit 0.16 s, entry 0.32 s);
  - the height of a line is 0.42 s;
  - the beats are 0.7 s;
  - the seal settles in 0.9 s.
  - Exits are shorter than entries and unstaggered. The confirmation waits 0.14 s so the leaving control is nearly gone before it appears, and the check draws 0.3 s in.
  - Full motion; no reduced-motion gate (the source test still enforces this).
- **Theme tokens.** Colours come from the theme: `border-border`, `bg-card`, `text-foreground`, `text-muted-foreground`, and the primary control in `bg-foreground text-background`. They follow the light and dark modes; no new colours.
- **Shared components.** The shared account controls are reused through two small local wrappers that only swap in the theme tokens.
- **Way back.** "Account" with a left chevron at the top left, a 48 px target.
- **Secondary routes stay secondary.** "Get the book" is a text link in the Signet row, not a second full-width button, so the card keeps one clear control.
- **Hit targets.** Every control and link measures 48 px in the live render, including the restricted page's mailto link (now `py-[15px]`).
- **Focus.** On "added" the pressed button leaves, so focus moves to the confirmation. That confirmation fills a live region mounted before it.
- **SSR.** The beats render hidden until hydration (motion's initial state). That's the trade-off of a staged entrance: with JavaScript unavailable the card is empty. Noted, not changed.

### Strings, before → after (`messages/en.json`; `ko.json` mirrors every key change with `""`)

`Customer.components_membership_welcome`:

| Key | Before | After |
| --- | --- | --- |
| `title` | Welcome | Welcome (unchanged) |
| `intro` | Here’s where your membership stands. | *removed* |
| `signetLabel` | *(new)* | Signet |
| `signetPending` | Your Signet is on its way. You don’t need to do anything. | Pending |
| `signetIssued` | Your Signet has been issued. | Issued |
| `signetOnHold` | Your Signet is on hold while a review or return of your membership purchase is open. You don’t need to do anything here. | On hold |
| `signetNone` | This account doesn’t have a membership yet. Membership comes with the book, and your Signet appears here once you’ve bought one. | None yet |
| `signetRestricted` | *(new)* | Restricted |
| `signetUnverified` | *(new)* | Unverified |
| `goToShop` | Go to the shop | Get the book |
| `unverifiedBody` | Your email isn’t verified yet. Sign out from your account and verify your email, then come back here to see your membership and add a passkey. | Sign out and verify your email to continue. |
| `passkeyHeading` | Sign in with a passkey | *removed* (the PASSKEY label) |
| `passkeyLabel` | *(new)* | Passkey |
| `passkeyCount` | *(new)* | {count} saved |
| `passkeyBody` | Add a passkey to this device, and you can sign in by unlocking it. Your phone is the best place for one, since it goes everywhere with you. Passkeys are optional. | *removed* |
| `passkeyBodyExisting` | You already have a passkey. If it’s on another device, you can add one here too. Your phone is the best place for one, since it goes everywhere with you. | *removed* |
| `passkeyBodyAdded` | Next time, you can sign in by unlocking this device. | *removed* |
| `addPasskey` | Add a passkey | Add a passkey (unchanged) |
| `waiting` | Waiting for your passkey… | Waiting… |
| `checking` | Checking… | Checking… (unchanged) |
| `checkAgain` | Check again | Check again (unchanged) |
| `added` | Passkey added. | Passkey added |
| `notAdded` | The passkey wasn’t added. Try again. | Passkey not added. Try again. |
| `errorCancelled` | The passkey request was cancelled or timed out. Try again when you’re ready. | Cancelled. Try again. |
| `errorUnsupported` | This browser can’t use passkeys. Open this page on your phone instead. | This browser can’t use passkeys |
| `errorRateLimited` | Too many attempts. Wait a few minutes, then try again. | Too many tries. Wait a moment. |
| `errorUnknown` | We couldn’t confirm the passkey yet. This page checks again in a few minutes. | Checking… |
| `errorUnknownManual` | We couldn’t confirm the passkey yet. Check again in a few minutes before you add another. | Not confirmed yet. Check again. |
| `signInBody` | Sign in to see your membership. | *removed* (the button says it) |
| `signIn` | Sign in | Sign in to see your membership |
| `unavailableTitle` | This page isn’t available right now | Can’t load this right now |
| `unavailableBody` | We couldn’t load your membership. Try again in a moment. | *removed* |
| `restrictedTitle` | This account is restricted | *removed* (the Signet row says Restricted; the greeting stays) |
| `restrictedBody` | Your membership isn’t available while this account is restricted. If you think this is a mistake, contact <email>concierge@sophomores.co</email>. | Contact <email>concierge@sophomores.co</email>. |
| `tryAgain` | Try again | Try again (unchanged) |
| `backToAccount` | Back to your account | Account |
| `accountLink` | Your membership | Your membership (kept: the tray's link must read clearly out of context) |

`MemberAuth` (account tray), and the matching literals in `_shared/session.ts`:

| Key | Before | After |
| --- | --- | --- |
| `notices.passkey-not-added` | The passkey wasn’t added. Try again. | Passkey not added. Try again. (identical to the welcome page's, per round 6; tested) |
| `notices.passkey-unconfirmed` | We couldn’t confirm the passkey yet. Check again in a few minutes before you add another. | Passkey not confirmed yet. Check again in a few minutes. (The tray has no automatic check, so the timing stays.) |
| `checkPasskeyAgain` | Check again | Check again (unchanged) |

No existing Korean text was touched: every welcome key in `ko.json` was `""`, and the structure is identical (checked).

### Tests

The welcome DOM suite was rewritten to assert which element and which state is shown (`data-signet-state`, `data-welcome-control`, the 48 px cell, focus, live regions). Strings are read from the catalogue. Every behaviour the round-6 tests protected is kept:
- unknown stays unknown until it's confirmed;
- the automatic checks run five times, then hand over to the member;
- unverified shows no Signet state, no shop and no passkey;
- restricted is distinct from no membership, and its mailto link is 48 px;
- unsupported doesn't grow the card after hydration;
- the live regions are mounted before they fill;
- there's no reduced-motion gate;
- there are no reloads.

The suite has 19 tests, all passing. Two harness lessons:
- **DOM objects in assertions.** An absence check passed a DOM node to `assert.equal`, and building the failure diff blew past the 4 GiB guard. Every absence check now compares booleans, as AGENTS.md requires.
- **Mocked timers.** In the mocked-timer test, each tick now lets the started check settle (`setImmediate`). Otherwise the checking sweep spun across ten fake minutes.

The tray's render test reads its not-added wording from the catalogue.

### Live render (`render-r7/`)

- **Setup:**
  - a guarded `next dev` (6 GiB) on port 3427, via `scripts/member-auth-preview.ts --in-place`;
  - a fresh disposable PostgreSQL 16 container, `sphmrs-wallet-render-r7`, on loopback port 55499, migrated with the branch's migrations and seeded through the Local API (no direct SQL);
  - dark mode;
  - one Orca tab, viewport pinned to 1600×900.
- **Stills:** `<state>-{390,1280}.png` for 17 states.
- **Card heights:** the 390 / 1280 heights below are measured. The card top is 112 px in every state, and `scrollWidth` equals the viewport.

| State | Capture | Card 390 / 1280 |
| --- | --- | --- |
| Signet pending, passkeys saved / none saved | `pending-passkey`, `pending-no-passkey` | 418 / 447 |
| Signet issued / on hold / none | `issued`, `on-hold`, `none` | 418 / 447 |
| Unverified email / restricted | `unverified`, `restricted` | 333 / 362 |
| Signed out | `signed-out` | 212 / 241 |
| Unavailable (database stopped) | `unavailable` | 311 / 352 |
| Waiting / unsupported / added / lost after store (reads added) | `flow-waiting`, `flow-unsupported`, `flow-added`, `flow-lost-after-store` | 418 / 447: **the same as idle** |
| Cancelled / rate-limited / unknown (one line) | `flow-cancelled`, `flow-ratelimit`, `flow-unknown` | 454 / 483: the line eases in |
| Not added (a lost request the client settled as not added) | `flow-not-added` | 454 / 483: the line eases in |

- **Frame sequences** (`seq-{arrival,added}-{390,1280}.mp4`, a strip `…-frames.png`, and the per-frame series `….json`):
  - **How they were made.** The tab's animation frames were throttled to about one a second (the display was asleep), so a real-time recording wasn't possible. Instead:
    - the frame's clock is frozen and stepped 1000/30 ms at a time;
    - `requestAnimationFrame`, `performance.now` and the WAAPI animations follow that clock, with motion's `play()` and `startTime` made inert;
    - each step is shot.
    - The arrival is a client-side navigation into `/welcome`, so the clock is in place before the card mounts.
  - **Result:**
    - **Arrival.** The beats stagger as designed. At 300 ms the opacities are 0.89 / 0.59 / 0.00, and every beat reaches 1.00 by about 900 ms.
    - **Added.** The control fades out in about 130 ms, then the confirmation fades in and the check draws.
    - **The card's height is flat in every frame** of all four sequences: 418.4 px at 390 and 447 px at 1280. The passkey cell holds 48 px.
- **Dev overlay.** The one issue is the pre-existing `Customer.navigation.music` message, as in round 6. The unavailable state shows 45, all from the stopped database.

### Gates (`ce0850c3`, run once)

| Gate | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`, 4 GiB guard) | **0 errors** (peak 1.6 GB) |
| Suite (`node tests/run-unit.mjs`, 4 GiB) | **3081 tests: 3033 pass, 2 fail, 46 skipped.** The two failures are the known deferred-styling ones from round 6 (`deferred styling: article grid…`, `deferred styling: verification loops…`), outside this branch's scope. |
| DB proofs (`tests/support/database-proof.mjs`, 3 GiB, disposable PostgreSQL) | **Wallet 10/10**, Sunday membership 7/7, guest invite 4/4, signer 8/8. Containers removed. |
| `git diff --check` | clean |

Every guarded run ended with `remaining=[]`.

### Interruptions and honesty notes

- **Headroom stops.** The guard stopped the dev server twice on system headroom (peaks 4.4 GB and 3.9 GB, under its 6 GiB cap; the pressure was system-wide). I restarted it each time with at least 15 GiB available. No limit was raised.
- **One workload per checkout.** The guard allows one guarded workload at a time, so each Local API account edit (dropping a passkey, unverifying, suspending) was done with the dev server stopped and then restarted.
- **zsh argument splitting, again.** A zsh loop passed no flow mode, so eight first flow captures all took the "added" path. I deleted them and re-shot through an `sh` script. The extra passkeys went only to the disposable render account, which is why its count reads "13 saved" in some flow stills.
- **The 330 s settle path wasn't re-shot live.**
  - The first try was reset mid-wait. My own handback write under `.tmp/` (inside the project) most likely set off the dev server's refresh and replaced the view.
  - On the re-run, the lost request settled straight to not added instead of staying unknown, so the 330 s wait never happened.
  - The not-added state it ends in is captured (`flow-not-added`), and round 6 captured the settle live. The DOM tests cover the timing: the first check after the window closes, then five checks before handing over to the member.
- **A blank capture.** One early on-hold capture was taken before hydration, while the server was failing, and showed an empty card. The capture script now waits until every beat is at full opacity.
- **Focus.** `orca tab switch --focus` was used once, on this worktree's tab, to try to get full-rate frames. It didn't help, because the display was asleep.
- **Ports and shared processes.** Port 3000 was never used. The other session's dev server (`nav-restore`) was left alone.

### Decisions left to the owner

- **The Signet mark.** The ring and seal are a placeholder (`SignetMark`, `data-placeholder="signet-mark"`), chosen to carry state by form only. The real mark, its proportions, and whether it relates to `BrandMark` are the owner's call. No wordmark was used or changed.
- **The mono label face.** The theme's `--font-mono` token defines no face, so labels render in the inherited sans. Whether labels should use a real mono face, and which one, is open (04c allows either).
- **The unknown state's line.** The binding copy is "Checking…", shown beside a "Check again" button while the page re-checks by itself. It's honest, but the button and the line both talk about checking; the owner may prefer a single signal.

## Round 6 (task_7d92d4e801b2): Santa fixes (Codex FAIL, Opus FAIL on `e588b95`)

The last fix round before the owner. Every item below has a test. `package.json` and the lockfile are unchanged. The red runs for items 1–3 and 6–8 were watched in the session, but their logs weren’t kept, so they are not evidence here. Item 4 and the committed-but-lost case in item 1 are characterization tests (green on first run). The one red log kept is for the last fix, `2ff2188`: `.tmp/r6/item5-mailto-red.log` (uncommitted) shows both new assertions failing on the previous code ("no button to press" and "a 44 px hit area"), and the same file passed 17/17 after the fix.

### Commits

| Commit | Fix |
| --- | --- |
| `c9694ec` | Prettier formatting left in the tree from round 5 (whitespace only, checked file by file). |
| `04a5252` | **1. Passkey reconciliation ordering** (`client.ts`). |
| `9647061` | **4. `/link-social` keeps its phone gate** (test only). |
| `fa44f56` | **2. Catch-up starvation.** |
| `0ff529d` | **3, 5, 6, 7. The welcome page:** restricted and unverified states, unknown until settled, eased layout, one "not added" wording. |
| `bb38605` | **8. The account tray's unknown result** and Check again. |
| `ba3c664` | **Advisor follow-ups.** A session without its account row reads unavailable, and a lost passkey is re-checked a bounded number of times. |
| `2ff2188` | **5 (finished) and a hit target found by the render.** The unsupported message takes the button's slot, and the restricted page's mailto link is 44 px tall. |
| `f175d42` | The `render-r6/` captures: 19 states, 38 PNGs. The `render-r5/` PNGs are deleted because they show superseded copy; git history keeps them. |
| docs commit | This section. |

### 1. Passkey reconciliation ordering (blocking)

- **The baseline comes first.** `addPasskey` awaits `passkeyCount()` before registration starts. If that read fails, nothing starts: rate-limited and unauthenticated are rethrown as they are, and anything else is "unavailable". No prompt opens.
- **An unchanged count stays unknown until registration has settled.** `verify-registration` consumes a challenge that expires 300 s after it is issued, and refuses an expired one. So 300 s after the verify request is sent (plus 30 s of margin; `PASSKEY_SETTLE_MS`), a lost request can no longer commit.
  - When the verify response is lost, the client compares the count with the baseline. Higher means added.
  - The same count before `settlesAt` is unknown. The error carries `pendingPasskey: { baseline, settlesAt }`.
  - The same count after `settlesAt` means not added. A failed read never settles.
  - `confirmPasskey(pending)` gives the welcome page and the tray this check later.
- **Tests that drive the real client** (`tests/member-auth/passkey-outcomes.test.ts`, with the installed `passkeyClient()` and `@simplewebauthn/browser`):
  - registration waits for a delayed baseline;
  - a failed baseline stops before the prompt;
  - a verify that committed but whose response was lost reads added;
  - an unchanged count stays unknown inside the window;
  - a commit that lands late, after the first check, reads added;
  - after the window closes, an unchanged count reads not added;
  - a failed count read never settles.

### 2. Catch-up starvation (blocking)

- **Cause.** Each bounded cohort was read from the start. A held member at the front of the cohort was skipped, but never moved past, so `limit` held members could starve everyone behind them.
- **Fix.** `catchUpKeyGrantTargets` sorts by `beneficiaryUser`, takes `after` (`greater_than`), and returns `cursor` (the last member it read). `scripts/member-wallet-catch-up.ts` passes the cursor back in. It stops when nothing is left, or when the cursor is missing or unchanged, and is still bounded to 20 passes. Each member is counted once.
- **Regression** (`tests/commerce/keys/member-wallet.test.ts`), with limit 1, one older held member and one newer eligible member:
  - through the function and through `runMemberWalletCatchUp`, the result is `{ moved: 1, members: 2, passes: 2 }`;
  - a rerun gives `{ moved: 0 }`.
  - `member-wallet-catch-up-command.test.ts` covers the cursor being carried, a stalled cursor stopping, and the bound.
  - `member-wallet.db.test.ts` adds the same starvation case on PostgreSQL.

### 3. Suspended and unverified accounts (blocking)

- **Suspended reads restricted.** `readWelcome` reads the user (`disableErrors`). `membershipStatus: "suspended"` gives `{ state: "restricted" }`: the heading "This account is restricted", what it means, and the concierge address. There is no Signet sentence and no passkey offer.
- **A session with no account row** reads unavailable rather than guessing.
- **Unverified email:** `signet` is `null`, so neither the Signet sentence nor the shop link appears, and "none" is never claimed. The page says only what to do: "Your email isn’t verified yet. Sign out from your account and verify your email, then come back here to see your membership and add a passkey."
- **The read test** that recorded the wrong classification (unverified as "none") is fixed. `tests/member-auth/welcome/read.test.ts` now covers unverified → `signet: null`, suspended → restricted, and a missing user → unavailable.

### 4. `/link-social` keeps its phone gate (blocking)

`tests/member-auth/passkey-without-phone.test.ts` now loops `/list-accounts` and `/link-social` in both the local and the canonical FORBIDDEN assertions, with a fresh verified-email session.
- **Local.** Google is configured in the test, so `/link-social` gets past "not configured" and meets the phone gate.
- **Member control.** A phone-verified member passes the same hook, which shows the refusal is the phone gate.
- These are characterization tests: the gate already held, so they were green on first run.

### 5. Eased layout changes (blocking)

- **"Added" collapses the offer** with `motion/react` `AnimatePresence`: the offer's height eases to 0 and the added body fades in. The lead message eases its height in. There is no reduced-motion gate.
- **Unsupported no longer grows the card after hydration (finished in ``2ff2188``).** In round 6's first pass, the message was a line below a disabled button. At 390 it wraps to two lines, so the card still grew 24 px after hydration (eased, but still growth). Now the message takes the button's place, in a `min-h-12` slot that holds the button's 48 px. That is two lines of `text-sm leading-6`, so it holds at narrower widths too. This replaces round 5's "button disabled" treatment: there is no disabled button. Live: the card is 487 / 479 px, the same as idle at both widths (`flow-unsupported`). The capture removes `PublicKeyCredential` after load and presses Add a passkey, which runs the same swap; the on-mount path is covered by the DOM test. `2ff2188` also reflows the DOM test file (the formatter hook); the only change in `welcome.tsx` is the swap and the link padding.

### 6–8. Wording, the result slot and the tray

- **6.** "Not added" has one wording everywhere: "The passkey wasn’t added. Try again." The separate failed message is gone.
- **7. "Passkey added." leads**, in a live region above the body, and nothing is reserved for it before it appears.
  - Below the button, idle states reserve only one line (`min-h-6`, 24 px).
  - Between the button and Back to your account there are now 56 px, box to box: 12 px spacing, the 24 px slot and the card's 20 px section spacing. Before, there were 95 px. Back to your account's own 48 px hit area makes the visible gap to its text about 68 px.
  - A result that wraps to two lines at 390, for example cancelled at 511 px against idle at 487 px, eases its second line in. That is intended: it appears after the member acts.
- **Unknown results.**
  - The page reads "We couldn’t confirm the passkey yet. This page checks again in a few minutes." It checks by itself after `settlesAt` and then every 60 s, at most 5 times.
  - After that it stops promising: "…Check again in a few minutes before you add another." Check again replaces Add a passkey until the result settles.
- **8. The account tray** shows the same unknown message. Its Add a passkey becomes Check again while one is pending, and a second add is refused while pending.
  - Code: `session.ts` (`passkeyPending`, `checkPasskey`, notices `passkey-unconfirmed` and `passkey-not-added`), `account-view.tsx` and `account-study.tsx`.
  - Tests: the controller and render tests.
- **Copy** is in `messages/en.json`, reviewed with the ux-writing skill at the end of round 6 (every round-6 key: restricted, unverified, the unknown and not-added results, and the tray's notices and Check again). The review changed nothing:
  - **Timing.** "Checks again in a few minutes" matches the real schedule: the first check about 5.5 minutes after the lost request, then every minute, up to five times.
  - **Contact.** The restricted page's `concierge@sophomores.co` is the documented support channel (`docs/To-Do List.md`).
  - **Unverified.** The unverified next step repeats the tray's existing instruction for the same state ("Sign out and verify your email before continuing."). `messages/ko.json` mirrors the keys with `""`. No Korean text was changed.

### 9. Captures

- **The second "Issue" from round 5 didn't reproduce.** Every round-6 capture shows 1 issue. Exception: unavailable shows 5, the database errors while it is stopped.
  - The one issue is the pre-existing `MISSING_MESSAGE: Could not resolve Customer.navigation.music`. It comes from the site menu (`src/components/shell/site-menu.tsx`), which this branch doesn't touch; the dev log has no other browser error.
  - I couldn't identify round 5's second issue after the fact. Its logs show only a motion "opacity not animatable" warning after an `/account` → `/welcome` return, and the code that produced it was rewritten this round.
- **The stray white dot** was the site's decorative cursor (`rp__cursor`), drawn at the frame centre. The capture script now hides it for the shot (capture-only; the page is unchanged). Every capture was checked by eye on a contact sheet.
- **Other fixes to the capture script.** The host page behind the frame is black, where it showed white corners around the tray. The script also refuses to shoot when the browser viewport is too narrow for the frame; this guard caught a viewport reset that had truncated the first 1280 captures.

### Live render (`render-r6/<state>-{390,1280}.png`)

**Setup.**
- A guarded `next dev` (6 GiB, `--node-old-space-mib 3072`) ran via `scripts/member-auth-preview.ts --in-place` on port 3427.
- The database was a fresh disposable PostgreSQL 16 container, `sphmrs-wallet-render-r6` (loopback port 55499). It was migrated with the branch's migrations, seeded through the Local API, and had 0 phone bindings. No direct SQL was run.
- Accounts were set up after sign-in through the Local API with the server stopped (`.tmp/r6/set-user.mts`): an unverified email, a suspended account, and a passkey removed.
- Sign-in and registration used an in-page software authenticator. Failures were injected in the page by wrapping `fetch` or `navigator.credentials`.
- After the session, the container and its volume were removed and the browser tab was closed.

| State | Capture | Card height at 390 / 1280 | What it proves |
| --- | --- | --- | --- |
| Signed out | `signed-out` | 194 / 210 | Sign in stores the return intent |
| Signet pending, has a passkey | `pending-passkey` | 487 / 479 | Idle: one-line slot only |
| Signet pending, no passkey | `pending-no-passkey` | 487 / 479 | Idle, "Add a passkey to this device" |
| Signet issued | `issued` | 487 / 455 |  |
| Signet on hold | `on-hold` | 535 / 503 |  |
| No membership | `none` | 603 / 571 | Go to the shop |
| Unverified email | `unverified` | 242 / 234 | **New:** no Signet sentence, no shop, no passkey offer; says what to do |
| Suspended account | `restricted` | 242 / 234 | **New:** restricted; the mailto link is a 44 px target |
| Unavailable (database stopped) | `unavailable` | 318 / 278 | Try again, in place |
| Waiting for the prompt | `flow-waiting` | 487 / 479 | Busy, disabled; same height as idle |
| Added | `flow-added` | 347 / 363 | "Passkey added." leads above the body; the offer collapses |
| Cancelled | `flow-cancelled` | 511 / 503 | Result below the button; two lines at 390 ease in |
| Browser without passkeys | `flow-unsupported` | 487 / 479 | **Same height as idle:** the message takes the button’s slot |
| Rate-limited | `flow-ratelimit` | 511 / 479 |  |
| Verify stored, response dropped | `flow-lost-after-store` | 347 / 363 | Count above the baseline reads added |
| Verify dropped, inside the window | `flow-unknown` | 511 / 503 | Unknown; Check again; "checks again in a few minutes" |
| Then, after the window (page checked by itself) | `flow-settled-not-added` | 487 / 479 | "The passkey wasn’t added. Try again." |
| Account tray, verified email, no phone binding | `account-entry-no-phone` | n/a (tray) | Continue registration, Add a passkey, Your membership |
| Account tray, lost add-passkey | `account-unknown` | n/a (tray) | **New:** unknown message and Check again |

- Every card top is 112 px, every control is at least 44 px, and `scrollWidth` equals the viewport.
- **Settled not added.** A lost registration stayed unknown, and the page then checked by itself after the 330 s window: "The passkey wasn’t added. Try again." after 339 s, with no reload.
- **Tray unknown.** The `/account` frame's `fetch` was patched before its scripts ran (better-auth captures `fetch` when its client is created), so `verify-registration` was dropped. The tray then showed the unknown message and Check again, and the account's passkey rows didn't change.

### Gates (once, on `f175d42` (code as of `2ff2188`); the closing docs commit changes no code)

| Gate | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`, 4 GiB, 2048 MiB old space) | **0 errors** (peak 2.44 GB). The stale `tsconfig.tsbuildinfo` was moved aside first. |
| Default suite (`tests/run-unit.mjs`, 4 GiB) | 3079 tests: **3031 pass, 2 fail** (only the known deferred-styling tests: article grid; CSS clocks), 46 skipped |
| DB proofs (`tests/support/database-proof.mjs`, 3 GiB) | Wallet proof (port 55498): **10/10**, including the new starvation case. Also Sunday membership 7/7, guest invite 4/4, signer 8/8. Containers removed. |
| `git diff --check` | clean (`e588b95..HEAD`) |

Every guarded gate ended with `remaining=[]`.

### Interruptions this round

- **Headroom stop.** The guard stopped the dev server once, on system headroom, during the first 330 s wait (peak 4.5 GB against 6 GiB). I waited for at least 16 GiB free and ran it again.
- **Viewport reset.** The browser viewport twice shrank to 878 px wide. The first time it truncated the 1280 flow captures; I re-shot them and added the guard, which caught the second reset.
- **zsh argument splitting.** zsh doesn't split unquoted words, so two capture loops of mine passed wrong arguments. I deleted those files and re-shot them through a `sh` script. The extra passkeys they added went only to the disposable render account.
- Every guarded job ended with `remaining=[]`. Port 3000 was never used. The other session's dev server (`nav-restore`) was left alone.

### Not done / out of scope

- **Screens that list passkeys** still show at most 10 (better-auth's page). This is for the auth owner.
- **The payment result page** has no welcome link.
- **The NFC tap handler** that opens `/welcome` is a later slice.
- **`Customer.navigation.music`** is missing from the catalogue, in the site menu. That belongs to another owner.

## Round 5 (task_72cd0e6e6507): Santa fixes (Codex FAIL, Opus PASS on `6ebd2e5`)

Every behaviour change was red first. The red logs are kept, uncommitted, under `.tmp/r5/*-red.*`. `package.json` and the lockfile are unchanged.

### Commits

| Commit | Fix |
| --- | --- |
| `f250f02` | **Codex 1, shared client.** The member client keeps passkey cancellation and lost-response evidence, and settles lost results against the server. |
| `2b32f52` | **Codex 2.** The account tray offers Add a passkey and Your membership to any verified-email account. The primary action comes first. |
| `a95985c` | **Opus 3.** `scripts/member-wallet-catch-up.ts` is the explicit catch-up command. |
| `bbff080` | **Opus 8.** Stale comments are gone (`intents.ts`, `wallet/access.ts`). |
| `d8ceaf0` | **Codex 1 (page) and Opus 4–7.** The welcome page: unknown results, in-place retry, return after sign-in, copy, shared controls. |
| `702b836` | **Advisor follow-up.** Provider and magic-link sign-ins also return to `/welcome`. Checkout keeps its gate. |
| `8e4743f` | **Found by the live render.** Passkeys are counted on the server, because better-auth's list stops at 10. |
| `bbd839d` | The catch-up summary counts members checked, not members attached. |
| `5d110c6`, `3dceb88` | The `render-r5/` captures. `3dceb88` also carries Prettier's reformatting of five round-5 files (line wrapping and one semicolon; no behaviour change, checked by a whitespace-insensitive comparison). |
| docs commit | This section's final numbers. |

### 1. Real passkey outcomes (Codex, blocking)

- **Cause.** better-auth 1.7.12's passkey plugin returns WebAuthn failures as `{ code }` and drops the DOMException. simplewebauthn 13.3 wraps `NotAllowedError` as `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`. The plugin also swallows a failed verify request: as `UNKNOWN_ERROR` when adding, and as `AUTH_CANCELLED` when signing in. So a cancel read as a failure, and a lost sign-in read as a cancel.
- **Evidence kept at the boundary** (`accepted` in `src/lib/member-auth/client.ts`). The plugin hands our fetch hooks to its verify request only, so `onRequest` and `onResponse` show where a passkey attempt stopped:
  - **No verify request sent.** The failure happened in the WebAuthn prompt. There, the bare passthrough code is simplewebauthn's wrapper for `NotAllowedError`, so it reads as cancelled.
  - **Verify sent but never answered.** The transport was lost. The outcome is unknown, never a failure.
- **Contract change.** A bare `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY` now counts as cancelled, but only before any verify request is sent. After the verify request is answered, it stays a failure. A passthrough code that carries a non-`NotAllowedError` cause is still not cancelled. `tests/member-auth/member-auth-ui-client.test.ts` was updated to match.
- **Settling unknowns in the client.**
  - **Adding.** The client reads a baseline count before the passkey can be verified, then reads again after the loss. A higher count means added; the same count throws "unavailable" (not added). If either read fails, the result is still `network` (unknown).
  - **Signing in.** The client re-reads `/api/member/status`. Signed in means success; not signed in means failure; a failed read means unknown.
  - Both the welcome page and the account tray get this, because they share the client.
- **Tests through the client boundary.** `tests/member-auth/passkey-outcomes.test.ts` drives the installed better-auth `passkeyClient()` and `@simplewebauthn/browser` against a scripted WebAuthn API and server. It covers cancel (adding and signing in), abort, lost (added, not added, unknown, no baseline), a server refusal, and success. A dependency upgrade that changes either mapping fails there.
- **Welcome page.** An unknown result replaces Add a passkey with **Check again**, so no second passkey is made before the first is settled. Check again compares `/api/member/passkey-count` with the page's last server count: higher reads "Passkey added.", the same reads "The passkey wasn't added. Try again.", and a failed read stays unknown.
- **Found by the live render (`8e4743f`).** The first live run stored a passkey (DB rows 11 → 12, verify answered 200) but showed "We couldn't add the passkey."
  - `list-user-passkeys` goes through the payload-auth adapter's `findMany`, whose default is `limit = 10`. The welcome read was also capped, by its 50-row page.
  - Counting now uses the Payload total (`countPasskeys` in `welcome/read.ts`), served by the new `/api/member/passkey-count`. It returns a count only, for the session's account.
  - The same live check then passed with 13–15 passkeys.
  - The same cap means any screen that lists passkeys shows at most 10. That is outside this slice; noted for the auth owner.
- **Known limit (account tray).** When both confirming reads fail, the tray's add-passkey and sign-in show the shared "We couldn't connect. Check your connection and try again." It doesn't use the welcome page's unknown wording, and there is no Check again in the tray.

### 2. Account entry without a phone binding (Codex, blocking)

- **Tray.** The tray's verified-email branch without a phone binding (`account-view.tsx`) now shows Add a passkey (secondary, after Continue registration) and the `memberAction` (Your membership). `session.addPasskey` needs `authenticated && emailVerified`, not `member`. An unverified email gets neither.
- **Checkout keeps its gate.** The `ticket-checkout` presentation shows neither. `/link-social` is untouched.
- **Order.** In the member branch, Add a passkey (primary) now comes before Your membership (secondary).
- **Tests.** `tests/member-auth/member-auth-ui-render.test.tsx` covers the no-phone account, the member account, checkout and an unverified email. `tests/member-auth/member-auth-ui-controller.test.ts` covers adding a passkey without a phone binding, and refusal for an unverified email.

### 3. The catch-up command (Opus)

- **`scripts/member-wallet-catch-up.ts`** runs `catchUpKeyGrantTargets` by hand only, with no timer or scheduler.
  - It needs `--confirm-member-wallet-catch-up` and a configured owner and lock. Both checks run before it connects to the database.
  - It repeats while members remain, stops on a pass that attaches nothing, and is bounded to 20 passes.
  - Re-running changes nothing.
- **Tests.** `tests/commerce/keys/member-wallet-catch-up-command.test.ts`.
- **Smoke run on the render database** (`.tmp/r5/cu*.log*`). Setup: one paid intent was seeded as if paid before the owner was configured, and a held member was also present.
  - Without the flag, it refused (exit 1).
  - With the flag and no owner, it refused with "not configured".
  - With the owner configured, it printed "1 Signet intents attached; 2 members checked". The catch-up member went from `awaiting_wallet` to `pending`, with a target and one wallet. The held member's intent stayed `awaiting_wallet`.
  - A rerun printed "0 Signet intents attached".
  - The guard reported exit 137 with "leader exited leaving children" on the confirmed runs, `remaining=[]`. This is the same tsx artifact as the round-4 Local API scripts.
- **Operator step: run it once, as soon as the custody owner (`MEMBER_WALLET_OWNER_ADDRESS`) is first configured.** Run it again after any period in which payments settled without it. The command line is in the file's header.

### 4–7. The welcome page (Opus)

- **4. In-place retry.** "Try again" calls `router.refresh()` inside a transition and shows "Checking…" while it is pending. A refreshed server view replaces the page's view without a reload. Live: with the database stopped, Try again stayed in place; after the database restarted, Try again brought the page back to the welcome state on the same URL.
- **5. Return after sign-in.** Sign in on `/welcome` stores a return intent. It is kept in `localStorage`, so a magic link opened in a new tab still works, and it expires after 30 minutes. Once `WelcomeLink` mounts in the signed-in tray, it sends the member back to `/welcome` once. `/account/continue`, where provider and magic-link sign-ins land, now carries the welcome link too.
  - Live: Sign in on `/welcome` led to `/account` with the intent stored. After signing in, `/account/continue` redirected to `/welcome` and the intent was cleared.
- **6. Copy.** Written with the ux-writing skill, in `messages/en.json`; `messages/ko.json` mirrors the keys with `""` (all its values were already empty). These are still placeholders until the design reset reaches this page.
  - **Heading.** "Sign in with a passkey". The offer names "this device" and says the phone is the best place for one, so a desktop isn't called a phone.
  - **After adding.** "Passkey added." The body becomes "Next time, you can sign in by unlocking this device." with no button.
  - **Unsupported browser.** Shown up front, with the button disabled.
  - **Unverified email.** "Passkeys need a verified email. Verify your email from your account, then come back here to add one." No button.
  - **On hold.** "…while a review or return of your membership purchase is open." This matches `keyGrantHold`: a cancellation request, an admission review, return or revocation, or a payment review.
  - **No membership.** The text says membership comes with the book (ADR-0013), followed by **Go to the shop** (`/shop`).
- **7. Shared controls.** `AccountButton`, `AccountPrimaryButton` and `AccountTextButton` gained `asChild` (the installed `@radix-ui/react-slot`, so links get the same styling). The local `ActionButton` and `ActionLink` are gone.
- **Tests.** `tests/membership/welcome-dom.test.tsx` (rewritten) and `tests/member-auth/welcome/read.test.ts` (`emailVerified` in the view, and a 60-passkey count).

### 8–9. Comments and captures

- **8.** Two stale comments were replaced: `intents.ts` now describes `lockMemberWallet` and the attach it returns, and `wallet/access.ts` describes wallet records only.
- **9. Captures.** Every capture is 390×844 or 1280×800, in `render-r5/`: 18 states, 36 PNGs. The `render-r4/` PNGs are deleted because they show superseded copy; git history keeps them.
- **The round-4 "Email and phone confirmed" capture can't be explained after the fact.** That state needs a row in `canonical_member.phone_bindings`. The round-4 handback says no binding was written, and its database was deleted, so I can't check where the row came from. The round-5 render database has **0** phone bindings. Its tray capture (`account-entry-no-phone`) shows the branch fix 2 is about: Continue registration, Add a passkey, Your membership.

### Live render (`render-r5/<state>-{390,1280}.png`)

**Setup.**
- A guarded `next dev` (6 GiB, `--node-old-space-mib 3072`) ran via `scripts/member-auth-preview.ts --in-place` on port 3427.
- The database was a fresh disposable PostgreSQL 16 container, `sphmrs-wallet-render-r5` (loopback port 55499). It was migrated with the branch's migrations. Afterwards I removed the container and its volume.
- It was seeded through the Local API (`.tmp/r5/seed.mts`): wallets only via the settle-side attach, intents via their real hooks. No direct SQL was run, and the database had 0 phone bindings.
- Sign-in used the existing better-auth passkey endpoints, with an in-page software authenticator, which also handled registration. Failures were injected in the page by wrapping `fetch` or `navigator.credentials`.
- The unverified and no-passkey accounts were set up through the Local API after sign-in, with the server stopped (`.tmp/r5/set-user.mts`).

| State | Capture | Card height at 390 / 1280 | What it proves |
| --- | --- | --- | --- |
| Signed out | `signed-out` | 194 / 210 | Sign in stores the return intent |
| Signet pending, has a passkey | `pending-passkey` | 511 / 503 | "add one here too" offer |
| Signet pending, no passkey | `pending-no-passkey` | 511 / 503 | "Add a passkey to this device" offer |
| Signet issued | `issued` | 511 / 479 | |
| Signet on hold | `on-hold` | 559 / 527 | Names the membership purchase, not an order |
| No membership | `none` | 627 / 595 | Go to the shop |
| Unverified email | `unverified` | 483 / 451 | No passkey offered; says what to do |
| Unavailable (database stopped) | `unavailable` | 318 / 278 | Try again, in place |
| Waiting for the prompt | `flow-waiting` | 511 / 503 | Busy, disabled |
| Added | `flow-added` | 379 / 395 | Offer ends; no button |
| Cancelled (authenticator throws `NotAllowedError`) | `flow-cancelled` | 511 / 503 | **Now reads cancelled** (round 4 read failed) |
| Browser without passkeys | `flow-unsupported` | 535 / 503 | Up front, button disabled |
| Rate-limited (429 in the page) | `flow-ratelimit` | 511 / 503 | |
| Verify stored but its response dropped | `flow-lost-after-store` | 379 / 395 | **Reads "Passkey added."** DB rows went 13 → 14 and 14 → 15; verify answered 200 |
| Verify dropped before sending | `flow-lost-not-added` | 511 / 503 | Settled by count as not added |
| Verify dropped, and the confirming count read fails | `flow-unknown` | 511 / 503 | Unknown; Check again replaces Add a passkey |
| Then Check again | `flow-check-not-added` | 511 / 503 | "The passkey wasn't added. Try again." |
| Account tray, verified email, no phone binding | `account-entry-no-phone` | n/a (tray) | Continue registration, Add a passkey, Your membership |

- Every card top is 112 px, every control is 48 px (Switch account 44 px), and `scrollWidth` equals the viewport.
- The result line fits the reserved slot without moving the card. The added state shrinks deliberately, because the offer and button go away.
- **Also checked live, not captured:**
  - Sign in on `/welcome` led to `/account` with the intent stored; `/account/continue`, once signed in, then went to `/welcome` and the intent was cleared.
  - With the database stopped, Try again stayed in place. Once the database was back, Try again restored the welcome state on the same URL.
  - `/api/member/passkey-count` returns 401 when signed out and the database total when signed in. Its first request after compiling hit a dev-only first-compile error, like round 3's challenge-hook artifact.
- The red "Issues" badge is Next's dev overlay. It is the pre-existing `MISSING_MESSAGE: Customer.navigation.music`, plus the database errors in the unavailable state.

### Gates (once, on `3dceb88`; the closing docs commit changes no code)

| Gate | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`, 4 GiB, 2048 MiB old space) | **0 errors** (peak 2.47 GB). The stale incremental `tsconfig.tsbuildinfo` was moved aside first, as in round 4. |
| Default suite (`tests/run-unit.mjs`, 4 GiB) | 3068 tests: **3020 pass, 2 fail** (only the known deferred-styling tests: article grid; CSS clocks), 46 skipped |
| DB proofs (`tests/support/database-proof.mjs`, 3 GiB) | Wallet proof (port 55498): **9/9**. Also Sunday membership 7/7, guest invite 4/4, signer 8/8. Containers removed. |
| `git diff --check` | clean (working tree, and `6ebd2e5..HEAD`) |

### Interruptions this round

- **Headroom stops.** The guard stopped my dev server three times on system headroom ("system headroom exhausted"), never on its own cap: peaks were 3.8–4.5 GB against 6 GiB. Each time another worker was running a full suite or dev server. One stop also came from a zsh loop bug of mine that sent wrong arguments; I deleted those captures and re-shot them.
- **Memory-pressure block.** From about 19:30 the kernel memory-pressure level stayed at 2, so the guard reported 0 GiB and refused all work. I escalated (msg_8eacc812e55d). The coordinator said to wait, not raise limits, and go first. The level returned to 1 at 19:43.
- **Lost browser tab.** The Orca browser tab used for captures had been closed in the meantime, so I opened a new one.
- **Usage cap.** The session then hit its usage cap and was restarted. I resumed from the last finished step (the no-passkey member set up). The only changes on disk were Prettier's, described above.
- Every guarded job ended with `remaining=[]`. The checkout was never quarantined.

### Not done / left

- The custodian's two-reviewer Santa pass.
- The account tray's unknown wording, and a Check again in the tray (known limit above).
- Screens that list passkeys still show at most 10 (better-auth's page), for the auth owner.
- The NFC tap handler that opens `/welcome` is a later slice.

### Dependencies (no change this round)

- `@safe-global/protocol-kit` is used only by `tests/member-auth/wallet/safe.test.ts`, to pin the Safe address.
- `@simplewebauthn/server` is no longer imported anywhere.

Both belong to a later dependency cleanup. `package.json` was not changed.

## Round 4 (task_4059bb2b1057): the wallet we control, created at payment, and the first-tap welcome page

Spec: `spec-round4.md`. Owner decisions of 2026-11-16 are Gate 1. This branch merges into `codex/auth-payment-nfc`, not `main`, and I did not merge it.

### Commits

| Commit | What |
| --- | --- |
| `c2ad084` | Merged `codex/auth-payment-nfc` into this branch (no rebase). |
| `ffab03f` | The custody-owned member Safe is created at settlement. The passkey-as-owner path is gone. `/welcome` replaces `/account/activate`. The member-wallet migration was regenerated after key-grant hardening. |
| `7610d71` | Passkeys need a verified-email account, never a phone binding. The coordinator relayed this owner decision of 2026-11-16 mid-run. A member can register, list and sign in with a passkey without a phone binding. `/link-social` and member checkout keep the phone gate. |
| `b4f4a6e` | DB test: a settlement waits on the member's wallet lock, then reuses the wallet that another transaction created. |
| docs commit | The round-4 captures and this section. |

### The Safe scheme (fixed before the first live Signet)

Changing **any** of these values changes every member's address, and it strands Signets that have already been granted. They live in `MEMBER_SAFE_SCHEME` in `src/lib/member-auth/wallet/safe.ts`.

| Item | Value |
| --- | --- |
| Owner set | `[MEMBER_WALLET_OWNER_ADDRESS]`: exactly one owner, the custody key we hold. No passkey or member key is an owner. |
| Threshold | 1 |
| Salt rule | `saltNonce = uint256(keccak256(utf8("sophomores:member-safe:v1:" + memberID)))`, using the Payload `users` id. |
| Safe version | 1.4.1 |
| Proxy factory | SafeProxyFactory 1.4.1, `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` |
| Singleton | SafeL2 1.4.1, `0x29fcB43b46531BcA003ddC8FCB67FFE91900C762`. This is the SDK's default on every chain except Ethereum mainnet. |
| Fallback handler | CompatibilityFallbackHandler 1.4.1, `0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99` |
| Initializer | `setup([owner], 1, 0x0, 0x, fallbackHandler, 0x0, 0, 0x0)` |
| Address | CREATE2 from the factory. The salt is `keccak256(keccak256(initializer) ‖ saltNonce)` and the init code is the SafeProxy 1.4.1 creation code plus the singleton. |
| Chains | Base Sepolia 84532 (test, the default) and Polygon 137 (live). On any other chain, settlement stays `awaiting_wallet`. |

- **Offline, no network.** Viem computes the address, inside the settle transaction. Nothing reads a chain, signs, sends or deploys. The Safe goes on chain only when it first has to act. The DB proof isolates the transport and logs "computed offline; no network call".
- **Pinned.** `tests/member-auth/wallet/safe.test.ts` pins the offline address to the Safe SDK's own `predictSafeAddress` for fixed inputs. It also pins the contract addresses to the installed `safe-deployments` package, and the proxy creation code to the factory's deployed code (`fixtures/safe-proxy-factory-1.4.1.json`).
- **One approved fetch.** The SafeProxy creation code came from `https://unpkg.com/@safe-global/safe-contracts@1.4.1/…/SafeProxy.json` and the factory artifact from `…/SafeProxyFactory.json`. Both were fetched on 2026-11-16 with the coordinator's approval. Their sha256 values are recorded in `safe.ts` and in the fixture. No other network access happened, and there was no RPC, email or `.env`.

### Wallet at payment

- When a membership payment settles, the settle transaction takes the member+chain wallet lock. It creates the member's one active `member-wallets` record for the Safe above, and it attaches the Signet intent: `awaiting_wallet` becomes `pending`, with the Safe as the target. The existing attach and lock rules apply. Replaying the settle changes nothing.
- **Owner not configured, or invalid.** Settlement still succeeds and the intent stays `awaiting_wallet`. The hold-release hook and the catch-up sweep create missing wallets the same way once the owner is configured.
- **Database guarantees.** A member can't have a second active wallet, and two members can't share one Safe (unique `active_slot` and `wallet_key`). A wallet can't be retired, retargeted, removed or written without the capability.
- **Migration.** One additive migration, `20261116_074049_member_wallets`. It follows `20261115_203239_key_grant_hardening` and creates only `member_wallets`, with its indexes and the locked-documents relation. The challenge table and the passkey columns are gone, since they were never deployed. `src/payload-generated-schema.ts` is untouched.

### Passkey-as-owner removed

These are deleted: the routes `api/member/wallet/{bind,register}/{options,verify}` and `api/member/wallet/status`; the wallet activation service; the WebAuthn credential checks; the wallet read and HTTP layers; the `member-wallet-challenges` collection; the activation UI (`wallet-activation.tsx`, `wallet-activation-link.tsx`); and their tests and WebAuthn fixture. Nothing kept needed them. `tests/member-auth/wallet/collections.test.ts` asserts that the wallet record has no passkey fields and that the bind path is gone.

### The welcome page

- **Route: `/welcome`.** The NFC card's first tap opens it, so the path is short and sits outside the account it serves, as Gemini's NFC proposal named it. The account page links to it through "Your membership", shown in the signed-in member view. `/account/activate` was never deployed, and after this change nothing links to it, so I added no redirect. Requested on the render server, it returns 404.
- **Gate.** Only a signed-in member. The page reads the session, the Signet's status and the number of passkeys. Reading never writes, and no address, key, target or credential ID leaves the server.
- **States kept.** Signed out; unavailable; and welcome with a Signet that is pending, issued, on hold or absent ("This account doesn't have a membership yet"). Each comes with or without existing passkeys. The add-passkey results are added, cancelled, unsupported, rate-limited, failed and unknown. All the activation states (activation required, incompatible, approval pending, re-authentication) are removed.
- **Passkey step.** "Add a passkey" registers an ordinary sign-in passkey through the better-auth passkey plugin, via the shared member client (`addPasskey`). No wallet code is involved.
- **Copy.** The copy lives in `messages/en.json` under `Customer.components_membership_welcome`. `messages/ko.json` mirrors the same keys in the same order, all `""`. **The welcome's wording and look are placeholders until the design reset reaches this page.** They are kept deliberately plain.
- **Styling.** Tailwind only. Every control is 48 px high.

### Acceptance

| # | Criterion | Result |
| --- | --- | --- |
| 1 | A settled payment creates exactly one active wallet and moves the intent to `pending` with that Safe. Replay changes nothing. With no owner, the intent stays `awaiting_wallet`. Proven against disposable PostgreSQL. | **Met.** `tests/commerce/keys/member-wallet.db.test.ts`, 9/9 on PostgreSQL 16, covering settle, replay, the lock wait, no owner and then the sweep, holds, uniqueness, capability and anonymised deletion. |
| 2 | No path registers a passkey as a wallet owner. The welcome page adds a sign-in passkey and works with or without existing passkeys. | **Met.** The routes and service are deleted and asserted gone. `tests/membership/welcome-dom.test.tsx` passes 10/10. In the live render, adding a passkey wrote a `passkeys` row (two added for the flow member). The no-passkey member renders the welcome. |
| 3 | Live render of every state at 390 and 1280 px under `render-r4/`. | **Met for every state the live flow can produce** (14 states, 28 captures). Two copy lines can't be produced live because of finding 1: the cancelled and unknown add-passkey results. A DOM test covers them instead. The Santa pass is the custodian's. |

**Test-first evidence** (red logs kept under `.tmp/r4/`, uncommitted):

- `mw-red`: 3 of 8 failed (settle creates the wallet, hold release, sweep).
- `coll-red`: 3 of 5 failed (created active and custody-owned, write-once, no passkey owner).
- `safe-red`: all 6 failed (SDK parity, canonical addresses, creation code, pinned address, salt, no network).
- `pk-red`: 4 of 5 failed (passkeys without a phone binding).
- `welcome-read-red`: failed because the module was missing.

All of them then passed.

### Live render (`render-r4/<state>-{390,1280}.png`)

**Setup.**
- A guarded `next dev` server (6 GiB, `--node-old-space-mib 3072`) ran via `scripts/member-auth-preview.ts --in-place` with `PREVIEW_AUTH_MODE=public`, on port 3427.
- The database was a disposable PostgreSQL 16 container, `sphmrs-wallet-render-r4` (loopback port 55499). It was migrated with the branch's migrations. Afterwards I removed the container with `docker rm -f -v` and its named volume `sphmrs-wallet-render-r4-data` with `docker volume rm`. `rm -v` alone kept the named volume, which let me restart the same seeded data for the extra captures.
- `MEMBER_WALLET_OWNER_ADDRESS` was the throwaway `0x1111…1111`.
- **Seed.** Payload's Local API (`.tmp/r4/seed.mts`). Wallets were created only through the settle-side `attachForMember`, and key-grant intents through the Local API with their real hooks.
- **Sign-in.** The existing better-auth passkey endpoints, with an in-page software authenticator. That authenticator also served passkey registration for the add flows.
- **No direct SQL** was written this round. Since `7610d71` there is no phone binding to insert.
- **No-passkey member.** Its only passkey was deleted through the Local API after sign-in, with the server stopped.
- **Unavailable state.** The render database was stopped while the server ran, then started again.

| State | Captures | Card top / height at 390 | at 1280 |
| --- | --- | --- | --- |
| Signed out | `signed-out` | 112 / 194 | 112 / 210 |
| Signet pending, has a passkey | `pending-passkey` | 112 / 487 | 112 / 479 |
| Signet pending, no passkey | `pending-no-passkey` | 112 / 487 | 112 / 479 |
| Signet issued | `issued` | 112 / 487 | 112 / 455 |
| Signet on hold | `on-hold` | 112 / 511 | 112 / 479 |
| No membership | `none` | 112 / 487 | 112 / 479 |
| Unavailable (database down) | `unavailable` | 112 / 318 | 112 / 278 |
| Add passkey: waiting | `flow-waiting` | 112 / 487 | 112 / 479 |
| Add passkey: added | `flow-added` | 112 / 487 | 112 / 479 |
| Add passkey: cancelled (shows the generic failure, see finding 1) | `flow-cancelled` | 112 / 487 | 112 / 479 |
| Add passkey: browser without passkeys (two-line message) | `flow-unsupported` | 112 / 487 | 112 / 479 |
| Add passkey: rate-limited (`generate-register-options` answered 429 in the page) | `flow-ratelimit` | 112 / 487 | 112 / 479 |
| Add passkey: verify response lost (`verify-registration` rejected with a `TypeError` in the page; shows the generic failure, see finding 1) | `flow-verify-lost` | 112 / 487 | 112 / 479 |
| Account page, signed in: "Your membership" link | `account-entry` | n/a (account tray) | n/a |

- At both widths, every control is 48 px and `scrollWidth` equals the viewport. A result line appears in the reserved status slot without moving the card. That includes the two-line "This browser can't use passkeys…" at 390 px. Every add-passkey state matches the height of its starting state: 487 px at 390 and 479 px at 1280.
- **Results that can't be produced live.** Two copy lines never appear in the real flow, because of finding 1:
  - `errorCancelled` ("The passkey request was cancelled or timed out…");
  - `errorUnknown` ("We couldn't confirm the passkey was added. Reload this page…").

  Both are covered only by `tests/membership/welcome-dom.test.tsx`, "each add-passkey outcome reads in the reserved status slot; an unknown result stays unknown", which injects the client errors directly.
- The red "Issues" badge in the corner is Next's dev overlay. It reports `MISSING_MESSAGE: Customer.navigation.music` from `src/app/(site)/client-layout.tsx`. That key is missing on `codex/auth-payment-nfc` too, so it predates this slice. In the unavailable state the overlay also counts the database errors.

### Findings for the custodian

1. **A cancelled add-passkey reads as a failure, not a cancellation.** When the authenticator throws `NotAllowedError`, the page shows "We couldn't add the passkey. Try again." It should show "The passkey request was cancelled or timed out…". The cause:
   - `@simplewebauthn/browser` 13.3.0 wraps `NotAllowedError` as `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`, with the DOMException as its `cause`.
   - `@better-auth/passkey` 1.7.12 `addPasskey` returns `{ code, message }` and drops `cause`.
   - The shared member client (`actionFailure` in `src/lib/member-auth/client.ts`) deliberately refuses to infer cancellation from a bare passthrough code (`tests/member-auth/member-auth-ui-client.test.ts`, "passkey cancellation cannot cross operation boundaries…").

   - **It is wider than this page.** The sign-in branch of the same `client.mjs` (lines 26–35) also returns `{ code: err.code }` without `cause`. A cancelled passkey **sign-in** on the shared sign-in sheet therefore also maps to "unavailable", not "passkey-cancelled". This is a defect in the shared auth contract.
   - **The unknown result is lost the same way.** better-auth's `$fetch` (`throw: false`) turns a network failure on `verify-registration` into an error object. The client then reports it as "unavailable", and the welcome page shows "We couldn't add the passkey. Try again." (`flow-verify-lost`). The page's "unknown, reload to check" result is unreachable. If the server had stored the passkey before the response was lost, the member would be told it failed.

   I did not change this shared auth contract inside this slice. Two decisions belong to the auth-mechanism owner: whether a bare passthrough code may count as cancelled, and how a lost verify response should surface.
2. **Typecheck and incremental state.** The typecheck ran out of heap at the mandated 2048 MiB twice. The cause was the incremental `tsconfig.tsbuildinfo` from 16:52, which predated the dev server's regenerated `.next/dev/types` (the `next-env.d.ts` imports). I moved it aside to `.tmp/r4/tsconfig.tsbuildinfo.stale`. The full check then passed at the same limit, peaking at 2.44 GB. The limit was not raised.

### Interruption and recovery

- The first round-4 worker exited mid-run, after committing `ffab03f`, `7610d71` and `b4f4a6e`, and with eight captures done. Its guarded dev server ended with exit 137 and `cleanup_uncertain`. The guard therefore quarantined the checkout (exit 75 on the next launch).
- I checked every PID the quarantine recorded: supervisor 76865, group 76948, and 77028, 77058 and 77078. None was alive, and no `next` or `tsx` process belonged to this checkout. I then moved the two marker files to `.tmp/r4/quarantine-archive/`, with a `review.txt`, and relaunched.
- I reused the earlier worker's render database and seed, and finished the remaining captures: the no-passkey member, unavailable, the add-passkey states, and the account entry.
- Every later guarded job exited cleanly (`remaining=[]`). Dev-server peaks were 4.40, 4.00 and 4.02 GiB, all under 6 GiB. Each workload ran alone.

### Gates (once, on `b4f4a6e`; the docs commit changes no code)

| Gate | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`, 4 GiB, 2048 MiB old space) | **0 errors** (see finding 2) |
| Default suite (`tests/run-unit.mjs`, 4 GiB) | 3051 tests: **3003 pass, 2 fail** (the known deferred-styling tests: article grid; CSS clocks), 46 skipped |
| DB proofs (`tests/support/database-proof.mjs`, 3 GiB) | Wallet proof (port 55498): **9/9**. The other proofs also passed: Sunday membership 7/7, guest invite 4/4, signer 8/8. Containers removed. |
| `git diff --check` | clean (working tree, and `a0bd38f..HEAD`) |

### Not done / left

- The custodian's two-reviewer Santa pass.
- Finding 1, for the auth-mechanism owner: cancelled and lost-response passkey results collapse into the generic failure, on sign-in as well as on add-passkey.
- The NFC tap handler that opens `/welcome` is a later slice, as the spec says.

**Round 3 state (historical): paused 2026-11-16: owner is re-laying the membership flow (wallet created at payment, passkey optional); round 3 items 1 and 2 done, DB proof not run, Santa round 3 not started.** It merges into `codex/auth-payment-nfc`, not `main`.

- Branch `codex/wallet-activation-20261116`. Orca created it as `xnxchoi/…`; I renamed it as my first action, as the coordinator asked.
- Base `4657dbb`. The candidate commit follows this file.
- Worktree `orca/workspaces/sphmrs/wallet-activation-20261116`.
- `src/lib/commerce/keys/contracts.ts` is **untouched** (`keyGrantChains` is unchanged, per the coordinator's 2026-11-16 note).

## What was built

| Scope item | Where |
| --- | --- |
| Collections | `src/payload/collections/member-wallets/` and `member-wallet-challenges/`, registered in `commerceDomainPlugin` next to the key-grant intents. Settlement reads wallets, so every config that settles has them; this includes the DB-proof fixture. |
| Migration | One additive migration: `src/payload/migrations/20261115_201256_member_wallets.{ts,json}`, plus its index entry. It replaces `20261115_180919_member_wallets`, which was never merged. It was regenerated in place, offline, by `payload migrate:create` against the key-grant snapshot. I hand-normalised only the `down` order (`IF EXISTS`, constraints before tables, as in the key-grant migration) and the whitespace (`git diff --check`). |
| Types | `src/payload-types.ts` regenerated, with additions in the two new collections only; generator formatting is kept, not Prettier's. `payload-generated-schema.ts` (root and `src/`) is **byte-identical**. |
| WebAuthn | `src/lib/member-auth/wallet/credentials.ts` (via `@simplewebauthn/server`). ES256 only, with user verification required. Keys are decoded with the library's COSE helpers and checked on-curve with `node:crypto`. |
| Safe prediction | `src/lib/member-auth/wallet/safe.ts` (via `@safe-global/protocol-kit`). Read-only RPC. The SDK's two derivations must agree. A config hash covers chain, version, salt, verifier, proxy factory, singleton, coordinates, owner and address. No deploy, sign or send path exists; a static test guards this. |
| Activation service | `src/lib/member-auth/wallet/activation.ts`: register options/verify, bind options/verify. `bind/options` offers every passkey the member can bind with, and `bind/verify` accepts any one of them (round 3). Challenges are single-use and bound to purpose, member and session. Identity comes from the fresh canonical session on every call. Eligibility (verified email, not suspended, a live member intent whose payment succeeded) is rechecked at completion. |
| Attach | `src/lib/commerce/keys/activation.ts`, called from `recordKeyGrantIntents`. Details below. |
| Routes | `src/app/api/member/wallet/{status,register/options,register/verify,bind/options,bind/verify}/route.ts` through `wallet/http.ts`. Same-origin only; 16 KiB JSON bodies; per-member rate limit; private, no-store responses. GET status never activates. |
| Page | `src/app/(site)/account/activate/page.tsx` and `src/components/commerce/wallet-activation.tsx`. |
| Links | Account page: `wallet-activation-link.tsx`. Ticket payment confirmation: `portone-payment-result.tsx`, paid state. Shop order confirmation: `payment.tsx`. |
| Copy | `messages/en.json`: `Customer.components_commerce_wallet_activation`, two keys in `components_tickets_portone_payment_result`, and `PageMetadata.activateMembership`. `messages/ko.json` mirrors these with `""` in the same positions. No existing Korean text changed. |

### Attach and the lost-wakeup rule

Both sides take the same lock first, `member-wallet:<member>:<chain>`; per-intent `key-grant:<operationKey>` locks come after it. Activation then writes the wallet and scans; settlement records its intents and attaches them if a wallet is active. Whichever transaction commits first, the other sees its rows.

- **Activation.** Under that lock it writes the active wallet, then attaches each eligible `awaiting_wallet` intent. Each attach sets the write-once target `{chainID, lock, recipient: Safe}` and moves the intent to `pending`, through `withCommerceWrite` and the existing intent hook.
- **Settlement.** It takes the lock before recording intents, then attaches to an already-active wallet.
- **Lock order.** No path takes reservation or admission locks after the wallet lock.
- **Untouched rows.** Held intents (admission under review, revoked or returned; payment review hold; cancellation requested) and cancelled intents are not touched.
- **No recovery path.** Nothing retires a wallet or replaces a target; the wallet hook refuses both.
- **Config can't fail a payment.** Invalid wallet configuration is logged and read as unconfigured, so it can never fail a settlement (tested).

### Route choice: `/account/activate`

The page sits under the account it belongs to, and the path names the one thing the page does. That matches ADR-0005's call to action ("Activate your membership"). It is short, needs no IDs, and is unrelated to how the wallet works, so it survives future recovery or NFC changes.

### Owner decisions applied during the slice

- **Chain (coordinator, 2026-11-16: live chain is Polygon).** The chain comes from `MEMBER_WALLET_CHAIN_ID` and defaults to the test network (84532). A chain is accepted only if `WALLET_RPC_BY_CHAIN` lists a read-only RPC for it, and today only 84532 → `https://sepolia.base.org` is listed. Nothing is named after Base.
- **New environment variables:**
  - `MEMBER_WALLET_LOCK_ADDRESS` (required; without it activation is unavailable);
  - `MEMBER_WALLET_CHAIN_ID` (optional);
  - `MEMBER_WALLET_RPC_URL` (optional; must equal the listed RPC).

## Acceptance

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Registration and bind | `tests/member-auth/wallet/activation.test.ts`, using real ES256/RS256 signatures from a software authenticator (`webauthn-fixture.ts`). An ES256 wallet passkey registers, binds once and attaches; replaying the assertion is rejected. A reused ES256 sign-in passkey binds. Registration and bind challenges can't stand in for each other, and an unknown challenge is rejected. RS256 is rejected both for registration and for reuse, with the sign-in passkey left intact. Another member, or another session of the same member, is rejected. |
| 2 | One wallet | Same test file: the same wallet replays to `{replay: true}` with no new prediction. While a wallet is active, register is refused (`WALLET_ACTIVE`); once one is active, `bind/options` offers only that wallet, so another passkey is refused at verify (`INVALID_CHALLENGE`), and a challenge issued before activation for a different passkey is refused at verify (`WALLET_CONFLICT`). The PostgreSQL proof shows the database refusing a second active wallet. |
| 3 | Attach | `tests/commerce/keys/activation.test.ts` (fake storage) and `tests/commerce/keys/wallet-activation.db.test.ts` (**disposable PostgreSQL**, real settle path). Activation attaches the eligible intent. A settlement started while activation holds the lock waits on it, and attaches immediately after activation commits. Held (admission review) and cancelled intents are untouched. Catch-up attaches once the hold clears. A wallet can't be retired, retargeted or written without the capability. |
| 4 | Page and links | `tests/commerce/ui/wallet-activation-dom.test.tsx`: every state renders with its next step; approve and create flows; cancelled, incompatible and unsupported prompts; conflict and expired sign-in; account link (including the sign-in-again return); ticket payment confirmation link; shop confirmation link. |

### Test-first evidence

**Genuinely red first:**
- the settlement attach: `activation.test.ts` before the `intents.ts` change gave 3 tests, 1 pass, 2 fail (`state` undefined, expected `pending` / `awaiting_wallet`);
- the invalid-config tolerance fix.

**Written before their tests:** the wallet modules, collections, page and DB proof. Mutation runs stand in for red. Each mutation below was restored afterwards.

| Mutation | Result |
| --- | --- |
| Challenge never consumed | 2 fail |
| Member and session check removed | 1 fail |
| Purpose check removed | 1 fail |
| Conflict guards removed | 1 fail |
| Settlement-side attach disabled (DB proof) | 3 fail; the Sunday proof still passes |
| Activation links removed | 1 fail |
| Config tolerance removed | 1 fail |
| ES256 algorithm checks removed | Survived. The COSE EC2 type and curve checks still reject RSA, so this is defence in depth, not a gap. |

## Security review fixes (coordinator msg_f47abd9fbd31)

I wrote the tests first. Against the committed `31ddea3` source, the new tests gave 37 tests: 24 pass, **13 fail**. Each new behaviour failed except item 7 (explained below). Every new test passes on the fixed code.

1. **MEDIUM: held intents stranded.**
   - *Release hook.* `commerce-admissions` has an `afterChange` hook. When `benefitReview` goes from true to not-true, it calls `attachForMember`, which takes the member+chain lock and attaches in the same transaction. The DB proof releases the hold through the Local API, and the intent becomes `pending` with its target.
   - *Explicit sweep.* `catchUpKeyGrantTargets` is the explicitly invoked sweep. Each member runs in a short transaction of its own. It returns `{moved, members, more}`, and `more` replaces the silent stop at `MAX_ROWS`.
   - *Combined sweep.* `sweepWalletActivation` runs this catch-up together with the purge (item 5).
   - *No other release path.* Nothing in code clears an admission review hold today, and a payment review hold can't be reset by design. So the hook covers the admission release, and the sweep covers anything else.
2. **MEDIUM: wallet-key collision (raw 503, squatting).**
   - *Uniqueness model.* `walletKey` is no longer unique.
     - `activeWalletKey` is unique and nullable, and is set only on active rows, so a Safe can be active for one member at most.
     - `memberWalletKey` (`<member>:<walletKey>`) is unique and required, so there is one pending row per member per key.
     - The collection hook checks that both values are derived correctly.
   - *Pre-checks.* Register and bind both check before writing and return `WALLET_CONFLICT` (409). A unique-index race is also mapped to `WALLET_CONFLICT`, never a storage error.
   - *Squatting.* A squatter's pending row doesn't block the real owner.
   - *Tests.* Fake storage and PostgreSQL both cover this: a pending duplicate is allowed, and a second active row is refused by the database.
3. **LOW: burn on failure.** Register and bind verify now consume the challenge first, atomically, in their own transaction under the member lock. This happens before any signature check, so a failed verification can't be retried with that challenge.
4. **LOW: fresh session at every step.** `principalOf` checks the fresh-session window in every method, including `registerVerify`, `bindOptions` and `bindVerify`.
   - The page now sends a stale session in `approval_pending` or `activation_required` to "Sign in again".
5. **LOW: bounded growth.**
   - *Caps.* At most 5 open challenges and 3 pending wallets per member; the next request gets `LIMIT_REACHED` (429).
   - *Purge.* `sweepWalletActivation` purges expired challenges and pending wallets older than 7 days, and also reports `more`. Deletes are server-only: for challenges only when expired, for wallets only when pending.
   - *Status rate limit.* The status GET is rate-limited per signed-in member (31st call → 429).
   - *N+1 read.* The reader batches its reads (user, intents, payments `in`, admissions `in`, wallets, passkeys). A test shows the query count is the same for 2 and 20 intents.
6. **LOW: `member_id` NOT NULL with ON DELETE SET NULL. Choice: nullable (anonymised).** `member` is now nullable on both collections.
   - *Wallets.* A wallet record is evidence for keys already issued to its Safe, so deleting a user keeps the row with `member_id` NULL. RESTRICT would have blocked account deletion. The DB proof deletes a user and finds the wallet still `active` with a null member.
   - *Challenges.* They follow the same rule and are purged by the sweep.
   - *New creates.* A new create still requires a member.
7. **INFO: expiry at consume.** The consume step re-reads the challenge under the lock and refuses it if it has expired, in the same transaction that marks it consumed.
   - *Not genuinely red.* The test passed on the old code too, because the old code already checked expiry before verifying. The change is that the check now happens at consume time, under the lock.

**Migration.** Regenerated in place as one additive migration (`20261115_201256_member_wallets`), replacing the unmerged `20261115_180919` one. Its JSON snapshot shows `member_id` nullable, `wallet_key` not unique, and unique `active_wallet_key` and `member_wallet_key`. The `down` order and whitespace are normalised as before. `payload-types.ts` was regenerated, and `payload-generated-schema.ts` is unchanged.

## Round 3 (task_d25b2a9b27eb)

Each change has its own commit with its test, and both tests were red first.

| Item | Commit | Change |
| --- | --- | --- |
| Codex a: offer every passkey | `f6e4d18` | `bind/options` takes no input. It offers every credential this member can bind with, each with its own Safe candidate, in one challenge. `bind/verify` accepts any one of them. Details below. |
| Render finding | `4d4bff2` | The two-line status slot is reserved only in states whose buttons can report a result. "Signed out" and "Nothing to activate" offer links only, so they no longer show an empty 60 px band (signed out at 1280 px: 374 → 314 px). |
| Re-shoot | docs commit | All stale PNGs deleted. Every state re-shot at 390 and 1280 px in one pass from `4d4bff2`. See "Live render" below. |

### Every compatible passkey (Codex a)

- **What is offered.**
  - Once a wallet is active on the chain, only that wallet is offered (a replay, with no new prediction).
  - Otherwise: every pending wallet passkey on the chain, then every ES256 sign-in passkey, deduplicated by credential ID and capped at `MAX_BIND_CREDENTIALS` (10).
  - "User verification": the options require it (`userVerification: "required"`) and verify enforces it (`requireUserVerification`). Stored sign-in passkeys carry no UV flag, so this is checked on the assertion itself.
  - "Not revoked": the row still exists. Sign-in passkeys have no revoked field (removal deletes the row), and wallets are only pending or active.
  - Predictions for sign-in passkeys run in parallel, outside any transaction. If any prediction fails, the request fails (`UNAVAILABLE`) rather than silently dropping a passkey.
  - Under the member lock, a candidate whose Safe is already active for another member is dropped; if none is left, `WALLET_CONFLICT`. With no passkeys at all, `UNKNOWN_CREDENTIAL`; with passkeys but none ES256, `INCOMPATIBLE_CREDENTIAL`.
  - After a new wallet passkey is registered, its bind challenge still offers only that new passkey, because the member approves with it next.
- **The challenge.** It stays single-use and bound to purpose, member and session. The offered set is stored in the challenge's existing `candidate` json column, with `candidateDigest` a SHA-256 over the sorted `credentialID:configHash` pairs. Verify picks the candidate whose credential ID equals the response, rechecks the digest and that candidate's config hash, then runs the unchanged active/pending/verify path. A credential outside the set is `INVALID_CHALLENGE` (the challenge is burned).
- **No migration.** The challenge's `credentialID` column is now unused on bind challenges (left null). Dropping it belongs in the schema-freeze migration.
- **Behaviour change.** "Another passkey while a wallet is active" used to fail at options (`WALLET_CONFLICT`); now options offer only the active wallet, and the other passkey fails at verify (`INVALID_CHALLENGE`). A challenge issued before activation for another passkey still fails with `WALLET_CONFLICT`.
- **No page picker.** The browser's own chooser already lists every offered credential and offers "use another device". The page can't tell which device holds which passkey, and sign-in passkeys have no name to show, so a page picker would add a step without information. The page no longer sends a credential ID.
- **Test (red first).** `bind options offer every compatible passkey, and verify accepts whichever one the member picks`, in `tests/member-auth/wallet/activation.test.ts`. Red on behaviour: `UNKNOWN_CREDENTIAL`. It seeds two ES256 sign-in passkeys, one RS256 passkey and a pending wallet passkey, then checks:
  - exactly the three compatible credentials are offered, and user verification is required;
  - another session is refused without burning the challenge;
  - a passkey added after the options were issued is refused, and that burns the challenge;
  - the member then picks the second sign-in passkey, and that passkey's Safe becomes the active wallet;
  - the used challenge can't be replayed.
- **Live.** The `activation-required` render member has two ES256 passkeys. Every Approve in the render offered both (`allowCredentials` length 2), and the success bound the second one (`credentialSource` `sign_in_passkey`, intent `pending`). Each bind challenge row held a two-entry JSON array in PostgreSQL.

### ADR-0012 copy check

ADR-0012 makes the event ticket the door entry; the Signet key is the membership. I searched `messages/en.json` for any string that pairs a key, passkey, membership, wallet or token with door, entry, check-in, admit, scan or venue wording, and listed every string that mentions the key. None says or implies that the wallet key gets the member in at the door. The activation copy only says the key is issued to the passkey. **The copy is unchanged.**

### Re-shoot (round 3)

All PNGs from rounds 1 and 2 were deleted. Every state was shot at 390 and 1280 px in one pass from `4d4bff2`, on a guarded dev server on port 3417 against disposable PostgreSQL 16 (port 55494, removed afterwards), seeded through Payload. Every card top is 112 px; every control is 48 px; `scrollWidth` equals the viewport everywhere.

| State | Captures | Card top / height at 390 (Δ vs baseline) | at 1280 (Δ) |
| --- | --- | --- | --- |
| Signed out | `signed-out-{390,1280}` | 112 / 298 (-192) | 112 / 314 (-168) |
| No entitlement | `no-entitlement-{390,1280}` | 112 / 322 (-168) | 112 / 314 (-168) |
| Activation required, two ES256 passkeys (baseline) | `activation-required-{390,1280}` | 112 / 490 (+0) | 112 / 482 (+0) |
| Activation required, no passkey (createBody) | `create-new-{390,1280}` | 112 / 430 (-60) | 112 / 422 (-60) |
| Incompatible (RS256 only) | `incompatible-{390,1280}` | 112 / 406 (-84) | 112 / 422 (-60) |
| Approval pending | `approval-pending-{390,1280}` | 112 / 442 (-48) | 112 / 434 (-48) |
| Key pending | `key-pending-{390,1280}` | 112 / 254 (-236) | 112 / 270 (-212) |
| Key issued | `key-issued-{390,1280}` | 112 / 230 (-260) | 112 / 246 (-236) |
| On hold | `on-hold-{390,1280}` | 112 / 278 (-212) | 112 / 270 (-212) |
| Reauth (session over 15 min) | `reauth-{390,1280}` | 112 / 406 (-84) | 112 / 398 (-84) |
| Unavailable (no lock address) | `unavailable-{390,1280}` | 112 / 382 (-108) | 112 / 374 (-108) |
| errorUnknown with Check again (verify response dropped in the page) | `flow-approve-unknown-{390,1280}` | 112 / 550 (+60) | 112 / 542 (+60) |
| Cancelled approval (two-line message) | `flow-approve-cancelled-{390,1280}` | 112 / 490 (+0) | 112 / 482 (+0) |
| Success, in place | `flow-approve-success-{390,1280}` | 112 / 254 (-236) | 112 / 270 (-212) |
| Signed-in account entry | `account-entry-signed-in-{390,1280}` | n/a (account tray, no activation card) | n/a |

- The cancelled approval kept the card at 112 / 490 (390 px) and 112 / 482 (1280 px): the two-line message fits the reserved slot with no jump. The unknown result grows by 60 px because "Check again" is added; the top stays put.
- **Setup notes.** As in round 1, one synthetic `canonical_member.phone_bindings` row per render member was inserted by direct SQL on the disposable database (not a Payload collection). The account's delete-passkey endpoint refused (403), so the no-passkey member's passkey was deleted through Payload's Local API with the server stopped. "Unavailable" needed a restart without `MEMBER_WALLET_LOCK_ADDRESS`. The dev-only challenge-hook artifact from round 1 recurred (503) and cleared after touching a server component, as before. Next restarted itself near its 3 GiB heap limit (the guard's cap); the guard's peak was 5.92 GiB, under 6 GiB. One focused test ran while the dev server was up, against the one-workload rule.
- **Capture caveat.** In `activation-required-390` and `flow-approve-cancelled-390` the site's cursor dot sits over "Create a new passkey instead"; that member has since activated, so those two weren't re-shot.
- The "Live render" and round-1 "Re-render" sections below describe earlier captures that no longer exist; this table supersedes them.

### Gates (round 3, on `4d4bff2`)

| Gate | Result |
| --- | --- |
| Typecheck | 0 errors |
| Default suite | 3062 tests: **3014 pass, 2 fail** (the known deferred-styling tests), 46 skipped |
| DB proof | **not run** (paused by the coordinator) |
| Diff check | clean |

## Santa round 2 (task_fb23f7b54675): partial, stopped at the time box

Each item below has its own commit; the tests for item 1 and for Codex items b–d were red before the fix.

### Done

| Item | Commit | Change |
| --- | --- | --- |
| 1. Accuracy (code) | `2c3e011` | An active wallet with no paid membership left (refunded or cancelled) now reads `not_eligible` ("Nothing to activate"), not `key_pending`. |
| 2. Account view | `e7d1232` | The entry reports whether activation is due (`onDue`). While it is due, "Activate your membership" is the one primary action: "Add a passkey" turns secondary and the "Passkeys are optional…" note is hidden. The page passes `walletActivation`; `TicketAccountEntry` owns the entry. |
| 3. Ticket payment result | `94a5af2` | The result shows the state-driven `WalletActivationLink`, so a member who already activated sees nothing. The now-unused `activateMembership` and `activateMembershipHint` keys are removed from `en` and from `ko` (both were `""` in `ko`). |
| — | `34dc7c1` | The payment-result fetch-count test now excludes the entry's own status read. |
| Minor | `7030985` | Announced once: the focused heading reads the title and the live region gives the outcome (the body). A sibling that is only unavailable shows `cursor-not-allowed`; only the busy button shows `cursor-wait`. |
| Codex b–d | `4298de9` | **b.** "Check again" stays mounted through its own check and after a failed re-check. **c.** A lost verify response that the re-read confirms (`key_pending` / `key_issued`) clears the unknown-result error. **d.** Needing to sign in again counts as a state change, so focus moves to the heading and the live region announces it. |

**Gates on `4298de9`:**

| Gate | Result |
| --- | --- |
| Typecheck | 0 errors |
| Default suite | 3060 tests: **3012 pass, 2 fail** (the known deferred-styling tests), 46 skipped |
| Diff check | clean |
| DB proof | not rerun (the custodian ran all four on `2806a0e`; since then the only server change is the `read.ts` rule, which the unit tests cover) |

### Not done (next session)

- **Codex a.** Only the first credential is offered. Offering every compatible credential, or letting the browser choose, needs `bind/options` to accept more than one credential, or a picker. This is a mechanism change.
- **Item 4, the re-shoot.** Not started. It needs the dev server, and I couldn't start a long workload after 06:45.
  - The existing renders in `render/` are **stale against the final copy** and should be deleted and re-shot together, in one pass from the final commit.
  - The states to shoot are listed in the round-2 brief, with card top and height recorded against activation-required.
  - The handback's states table is still the round-1 version.

## Santa round 1 fixes (task_935046eae45b)

Tests came first where the behaviour was testable. Against `90ed287`, the new tests gave 27 tests: 21 pass, **6 fail**. After the fixes, the focused suites pass 79/79.

1. **Layout jump.**
   - *Card anchored.* The card is anchored to the top (`items-start`; no `items-center`, no `min-h-[70svh]`).
   - *Status slot.* The slot reserves two lines (`min-h-12`) wherever actions exist.
   - *Message length.* I measured every message live at 390 px. Two of the new messages ran to three lines, so I shortened both, and every message now fits two lines.
   - *Live result.* On success at 390 px the heading stays at 173 px before and after.
2. **Announcement.** On every state change, focus moves to the h1 (`tabIndex -1`). The status region always stays mounted, and it announces the new state's title (for example "Membership activated").
3. **Dead end.** "Check again" shows whenever `errorUnknown` shows. A refresh that changes the state clears the stale error; after a failure, the error is kept.
4. **Accurate copy:**
   - a `bind/options` or `register/options` failure says "We couldn't start the passkey request. Nothing has changed…";
   - a cancelled approval adds "If your passkey is on another device, open this page there." (only one credential is offered, so the other-device case is explained rather than built);
   - the persistent three-pending cap has its own server code, `PENDING_LIMIT` (409), and copy; the challenge cap and the rate limit say "Wait a few minutes";
   - `WALLET_ACTIVE` now re-reads the status and shows the real state, never a conflict line;
   - the hold copy is cause-neutral: "Your key can't be issued while this order has an open request or review. You don't need to do anything here."
5. **Account entry.**
   - *Placement.* `WalletActivationLink` now renders inside the signed-in member view, through a new `memberAction` slot (page → `TicketAccountEntry` → `MemberAccountStudy` → dialog → flow → view), instead of being appended below the tray.
   - *Refresh on sign-in.* The entry mounts only once the member is signed in, so it reads the new session's status after an in-place email-code sign-in.
   - *Tests.* A render test shows it appears for a signed-in member and never for an anonymous one.
6. **Two prompts.** The create copy says "You'll be asked to approve with it right after". Before the second prompt opens, the status reads "Passkey created. Approve with it once more to finish." (committed synchronously with `flushSync`, so it is on the page first).
7. **Shop confirmation.** It shows the state-driven `WalletActivationLink`, which renders only while this member has activation to do. A confirmed order with no membership to activate shows nothing.

**Reported auth test** ("chooser closes and reopens while focused account actions preserve real email-code state"): I couldn't reproduce it. On this branch at `90ed287` it passed alone and in its file (37/37), and it passed again in the full suite after these changes.

### Re-render (`render/`)

All captures are against seeded disposable PostgreSQL, signed in through the existing passkey endpoints:

| Capture | What it shows |
| --- | --- |
| `activation-required-{390,1280}` | the activation-required state |
| `approval-pending-{390,1280}` | the approval-pending state |
| `flow-approve-result-390` | success in place: heading still at 173 px, focus on the h1, status "Membership activated" |
| `flow-approve-error-{390,1280}` | cancelled approval |
| `flow-approve-rejected-1280` | a rejected verify; heading stays at 181 px and the card height is unchanged |
| `account-entry-signed-in-{390,1280}` | the entry inside "Account ready" (48 px link, no horizontal scroll) |

**Capture caveats:**
- The `flow-approve-error-*` shots show the earlier three-line wording. I shortened it to two lines afterwards; the new wording was measured live but not re-shot.
- There is no 1280 success shot: the pending-wallet fixture key was rejected by verify. The 1280 success destination looks like `key-pending-1280`.
- The `on-hold-*` captures predate the new hold copy.

**Follow-up.** In the signed-in view, "Activate your membership" and "Add a passkey" are now both primary buttons. Demoting "Add a passkey" needs a change to the auth view's button rule, which I didn't make.

### Gates (round 1)

| Gate | Result |
| --- | --- |
| Typecheck | 0 errors |
| Default suite | 3054 tests: **3006 pass, 2 fail** (the known deferred-styling tests), 46 skipped |
| Diff check | clean |
| DB proof | not rerun. The only server change is the `PENDING_LIMIT` code, which the unit tests cover. |

## Gates (final revision)

All gates ran guarded, one workload at a time.

| Gate | Command | Result |
| --- | --- | --- |
| Focused tests | wallet, keys, wallet UI DOM tests; 4 GiB | 119 tests: **118 pass, 0 fail, 1 skipped** (the DB-gated suite) |
| Typecheck | `tsc --noEmit`; 4 GiB, `--node-old-space-mib 2048` | exit 0, **0 errors** |
| Default suite | `node tests/run-unit.mjs`, no flags; 4 GiB | 2928 tests: **2883 pass, 2 fail, 43 skipped**. The 2 failures are the known deferred-styling suites (`article grid`, `CSS clocks`). |
| DB proof | `node tests/support/database-proof.mjs`; 3 GiB | exit 0. Sunday membership proof **5/5**; wallet activation proof **8/8** (adds the hook release, the pending/active uniqueness check and the anonymised-delete check). PostgreSQL 16, disposable loopback containers, removed afterwards. |
| Formatting / diff check | Prettier on changed TS; `git diff --check` against the base, with new files included via `git add -N` | **clean** |

One DB proof run failed first, on my new uniqueness check only: it assumed rows sort by status text, but the enum sorts `pending` first. The query now orders by `status::text`; the rerun gave 8/8.

## Live render

All seven states were rendered against real data, at 390 px and 1280 px. The captures are in `render/` (PNG, 64 colours, 11–24 KB each).

### Setup

- **Database.** A disposable loopback PostgreSQL 16 container (`sphmrs-wallet-render-20261116`, port 55494), migrated with the branch's migrations. It was removed afterwards with `docker rm -f -v`.
- **Seed.** Payload's Local API, through `withCommerceWrite` and `withWalletWrite`. One member per state, each with an ES256 sign-in passkey from a software key (RS256 for the incompatible member):

  | Member | Seeded as |
  | --- | --- |
  | no entitlement | no paid order |
  | activation required | paid, awaiting wallet |
  | incompatible | RS256 passkey only |
  | approval pending | pending wallet passkey |
  | key pending | active wallet, pending intent |
  | key issued | active wallet, granted intent |
  | on hold | admission `benefitReview` true |

- **Server.** A guarded `next dev` (6 GiB) via `scripts/member-auth-preview.ts --in-place` with `PREVIEW_AUTH_MODE=public`, on port 3417.
- **Sign-in.** The existing passkey sign-in endpoints (`/api/auth/passkey/*`), with an in-page software authenticator signing in the browser. No auth code was edited.
- **One direct SQL insert (recorded per the Payload-native rule).** The passkey sign-in policy also needs a verified phone binding, and `canonical_member.phone_bindings` is not a Payload collection. Without a binding, sign-in returned 403 "This authentication request is unavailable." On the disposable render database only, I inserted one synthetic binding per render member (`policy_version` `local-skt-zoho-arc-v1`, random hash and challenge ID). No Payload table was edited by hand.

### States (`render/<state>-{390,1280}.png`)

Every state rendered, with 48 px controls and no horizontal scroll (`scrollWidth` equals the viewport at both widths).

| State | Captures | What shows |
| --- | --- | --- |
| No entitlement | `no-entitlement-*` | "Nothing to activate", with View tickets and Back to your account |
| Activation required | `activation-required-*` | "Approve with passkey", "Create a new passkey instead" and Back |
| Incompatible credential | `incompatible-*` | "Your saved passkey can't hold a key…", with Create passkey |
| Approval pending | `approval-pending-*` | "Your passkey is ready. Approve with it once more…" |
| Key pending | `key-pending-*` | "Membership activated", "Your key will be issued…" |
| Key issued | `key-issued-*` | "Membership activated" (issued copy) |
| Review/refund hold | `on-hold-*` | "Your key is on hold", "You don't need to do anything yet." |

### Buttons

- **Approve** (activation-required member), with a virtual authenticator in the page that signs the real challenge (`render/flow-approve-result-390.png`). The sequence was:
  1. `bind/options` returned 200, after about 10 s of read-only Base Sepolia prediction;
  2. one WebAuthn `get`;
  3. `bind/verify` returned 200;
  4. the page moved in place to "Membership activated".
  - In the database the wallet was active and the intent was `pending` with its target.
- **Cancelled create** (incompatible member; the authenticator throws `NotAllowedError`) (`render/flow-create-cancelled-390.png`). `register/options` returned 200, then "The passkey request was cancelled or timed out. Try again when you're ready." appeared in the reserved status slot. The button stayed in place.

### Defects the render found (fixed)

1. **Left-aligned card.** At 1280 px the card sat in the left column; `main` now centres it (`justify-center`).
2. **Status line pushed the back link.** The status slot moved into the actions group (`min-h-6` where actions exist, `sr-only` otherwise), so a result line no longer reflows the card.

### Dev-only artifact seen during the button check (not a product defect)

The first Approve attempts failed with 503. A temporary, uncommitted server log showed the cause: the challenge collection refused the write as "Wallet challenges are server owned". In `next dev` (webpack), compiling a route on demand re-evaluates `wallet/access.ts`, but the cached Payload instance keeps collection hooks from the earlier module instance. Payload reloads its config only on a `serverComponentChanges` HMR event. The two WeakMaps then differ.

Evidence that this is dev-only:
- After warming every route and touching one server file (which made Payload reload), the same flow passed (above).
- A plain Node run of `createWalletActivation` (bind options → bind verify) against the same database returned `{status: "active", attached: 1}`.
- `withCommerceWrite` uses the same pattern, so a production build (one module graph) should not see this.
- **Not verified:** I didn't run a production build.

Two other first-compile flakes looked the same (a 401 and a 503 on the first hit of a newly compiled route, from a better-auth session lookup). They also cleared once the routes were warm.

### Notes on the captures

- **Dev overlay.** The "1 Issue" badge comes from the shell's pre-existing `MISSING_MESSAGE Customer.navigation.music`; it's not from this page.
- **Cursor.** The white dot is the site's own SVG cursor.
- **Headroom.** One dev server was stopped by the guard for *system* headroom, after hot-reload recompiles. I didn't raise any limit. I made the source edits first, waited for headroom, and then captured without editing.
- **Servers.** All servers are stopped, and the render container is removed.

## Shared changes outside the new modules (reviewers please check)

- `src/lib/commerce/access.ts`: `rateCommerceCustomer` is exported. It is reused, keyed `member-wallet:<id>`.
- `src/lib/member-auth/http.ts`: `accept` is exported as `acceptMemberRequest`. `readMemberBody` takes an optional `maxBytes`; the default stays 2048.
- `src/lib/commerce/keys/intents.ts`: takes the wallet lock first, creates intents with an explicit `state: "awaiting_wallet"`, and attaches to an active wallet.
- `src/lib/commerce/domain.ts`: registers the two collections.
- `src/app/(site)/account/page.tsx`: adds `<WalletActivationLink />`. That component is client-only and reads `/api/member/wallet/status`, so the account page still loads no session or database code (`member-public-capabilities-boundary.test.ts`). My first, server-rendered version broke that test; the final revision passes it.
- `tests/commerce/core/payment-postgres-fixture.ts`: `seedAttempt` takes an optional existing customer. `tests/support/database-proof.mjs`: new proof entry on its own container and port (55493).
- `withWalletWrite` (`src/lib/member-auth/wallet/access.ts`) copies the `withCommerceWrite` pattern on purpose. It is a separate least-privilege scope, so commerce code can't write wallets and wallet code can't write commerce rows except through `withCommerceWrite` for the intent attach.

## Not built / follow-ups

- **Spec follow-ups.** The activation link in the payment email, and the card's first tap.
- **Sweep scheduling.** `sweepWalletActivation` (catch-up plus purge) is explicitly invoked and nothing schedules it yet. Hold releases on admissions attach immediately through the hook. Running the sweep from the worker or a job is left for integration, so the Unlock slice's `dispatchKeyGrants` proof is untouched.
- **Lock address.** It comes from `MEMBER_WALLET_LOCK_ADDRESS` until the Unlock slice's committed lock file lands.
- **Live-chain RPC.** Add the Polygon (137) read-only RPC to `WALLET_RPC_BY_CHAIN` at integration.
- **Provisional Safe values.** Safe `1.4.1` and salt `"0"` are provisional and need owner approval (plan, open questions). Changing either changes every address.
- **Options failure copy.** If `bind/options` fails (for example, the RPC is unavailable), the page says "We couldn't confirm the result. Check again." Nothing has happened at that point, so clearer wording is a copy follow-up.
- **Payment-result alignment.** The payment-result page still uses the same left-aligned column the activation page had; it was not changed here.
- **First credential only.** The page offers only the first compatible credential. If that passkey lives on another device, the member sees "cancelled or timed out". A picker, or a clearer message, is a follow-up.
- **Sign-in again.** It signs out and returns to `/account`. A session flag makes the account link re-check after the in-place sign-in, and the member then follows the link back. A direct return to `/account/activate` would need the account page to support a return path; I recorded this rather than built it.
- **Hold copy.** "Your order is being reviewed…" also covers a requested cancellation of an already-dispatched key. That slot has no defined refund wording yet.
- **No support channel.** The hold state has no support contact to point to.
- **Browser support.** The browser side uses the native WebAuthn JSON APIs (`parseCreationOptionsFromJSON` / `toJSON`), because `@simplewebauthn/browser` is not a direct dependency and installs were frozen. Older browsers see the "unsupported" message.
- **Lost-passkey recovery.** None built, per the spec.

## Process notes

- **Install.** The spec's literal install command was rejected by the guard, which requires an absolute `--log`. The one real install was the same command with an absolute log path. Nothing was symlinked or written into the shared `node_modules`.
- **Network.** One read-only prediction against `https://sepolia.base.org` during design confirmed that the SDK path works and that both derivations agree. Every test mocks the predictor; there is no RPC in the suite or the DB proof.
- **Docker.** I started Docker Desktop for my first DB proof, quit it to recover headroom for the render, started it again for the final proof and quit it afterwards. No proof containers of mine remain.
  - **Possible interference with another worker.** After the final proof, the container list showed `sphmrs-guest-invite-20261116`, the parallel guest-invite slice's proof container. Docker was therefore also in use by that worker, and I stopped Docker Desktop twice without knowing.
  - The first final-proof attempt found Docker half-up ("already running", with engine 500 errors). This may have been that worker's start, or my earlier stop.
  - If that worker's DB proof failed around these times, my Docker stops are the likely cause. It should simply rerun.
- **Evidence.** Only sanitized evidence is committed (this file, two earlier screenshots and the `render/` captures). Raw logs stayed in an untracked local `.tmp/`.
- **Docker (render pass).** I ran the render container and the final DB proof on Docker. Before quitting Docker Desktop I checked `docker ps`, and no container was running.
- **Remaining processes.** None that I own: the dev server is stopped, and the render and proof containers are removed.
