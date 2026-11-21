# Handoff to Codex: the /welcome card design (2026-11-17)

## Why this is being handed over

The owner rejected every version of the `/welcome` card design. Their words, as said (2026-11-16 and 17):

- On round 6 (paragraph copy): "it looks fucking retarded… The biggest gripe I have is the fucking wordiness. Oh my god, where is the UI discipline here? Are you not using like the skills and the plugins that you have?"
- On what was actually wrong: "it's not the copywriting that's the problem here… I'm talking about the choice to fucking dump words instead of the fucking proper UI design that would mix a combination of sequence animations, typography, colors, shades opacity, a lot of fucking things that you could do."
- On round 7 (the redesign, below): "Bad fucking bad… It's all bad really bad."

### How the custodian (Claude) got it wrong

- **It started from the mechanism, not the design.** The page was built as a mechanism slice. The briefs said the look and wording were "placeholders until the design reset reaches this page". So for six rounds the workers built a functional card that explained each state in sentences. None of them was told to load the installed UI and motion skills.
- **The reviews never tested design quality.** The two-reviewer passes checked rules and correctness, so wordiness and the lack of visual design passed several rounds.
- **The fixes stayed shallow.** When the owner objected, the first fix was to cut the copy. That was the wrong fix. The second fix was a design draft from the frontend model, built by a worker. It went to the owner without the custodian first judging it against the site's design direction. It was generic: a ringed dot, small mono labels, a white button and a serif "Welcome" on a dark card.
- **Process failures alongside, which cost the owner time and tokens:**
  - it attributed a requirement to the owner that the owner never set;
  - it reported problems without making their urgency clear;
  - it ran too many review rounds.

Treat everything visual on the current card as rejected. Don't iterate on it.

## What you're designing

The page is `/welcome`: the member's welcome, opened by the NFC card's first tap, and from the account page.

Its jobs:
1. **A welcome.**
2. **The membership token (the Signet).** Its state: on its way, issued, on hold, none, restricted, or email not verified.
3. **Adding a passkey on this phone.** It is optional and recommended; the phone is "the device most likely to be important and accompanying the users at all times" (owner).

The owner's direction is to show state through design, not words: "sequence animations, typography, colors, shades, opacity". Words should be the last resort.

Read before designing:
- `docs/reference/commerce-experience/04c-direction.md` and `04c-site-records/motion/` on `feature/product-production` (the agreed site direction and motion references). Also `05-design-requirements.md` there, if present.
- `docs/design/identity.md` and `docs/design/brand-voice.md`.
- `AGENTS.md`: the UI, motion, Tailwind-only, copy and Korean rules. Monochrome applies to sign-in and verification surfaces; check with the owner whether it applies here.
- The owner's saved preferences:
  - full motion, with no reduced-motion paths;
  - no fixed animation durations: tune each one, with references showing the character, not the numbers;
  - before redesigning, look at live references and their interactions.

The owner's mark for the Signet, its colour and its typeface aren't decided. Ask the owner instead of inventing them. Showing two or three directions before building is better than building one.

## What already works and should stay

Branch `codex/wallet-activation-20261116`, HEAD `cf1aa812` (pushed). Worktree `orca/workspaces/sphmrs/wallet-activation-20261116`. It merges into `codex/auth-payment-nfc`, never into `main`.

These parts were reviewed and passed. Keep them:
- **Wallet at payment.** A settled membership payment creates the member's Safe, owned by our key, and attaches their Signet grant.
  - `src/lib/commerce/keys/member-wallet.ts`, `src/lib/member-auth/wallet/safe.ts`
  - The scheme and its proofs are in `docs/qa/wallet-activation-20261116/handback.md` (round 4).
- **The catch-up command.** `scripts/member-wallet-catch-up.ts`, with a cursor.
- **Passkeys don't need phone verification.** Checkout and `/link-social` keep the phone gate.
- **Passkey outcome checks.** `src/lib/member-auth/client.ts`: the baseline count, the unknown state and Check again, using `/api/member/passkey-count`.
- **The welcome read model.** `src/lib/member-auth/welcome/read.ts`: the states listed above, including restricted and unverified.
- **The tests for all of the above.** On `ce0850c3`: typecheck clean, suite 3033 of 3081 (only the 2 known deferred styling failures), wallet DB proof 10/10.

Redo:
- `src/components/membership/welcome.tsx`: the whole visual design, including the arrival sequence and the passkey control's states.
- Its copy in `messages/en.json` (`Customer.components_membership_welcome`), with `ko.json` mirrored and the Korean filled.
- The welcome entry in the account tray, `src/components/Authentication/member-auth/account-view.tsx`, if it has to match.

The round-by-round history and every string's before and after are in `docs/qa/wallet-activation-20261116/handback.md`. The renders are in `render-r5/` to `render-r7/`, including frame sequences of the arrival and the "added" transitions. Use them as examples of what not to do.

## Rules that still bind

- **One writer per worktree.** Before you start, confirm with the owner that the Claude worker in this worktree has been stopped.
- **Port 3000 and the DevTools browser are shared.** Check before you start a preview; this worktree used port 3427.
- **Guarded workloads only** (`scripts/resource-guard.py`), with at least 10 GiB of headroom.
- **Copy goes in `messages/en.json`;** `ko.json` mirrors it.
- **Inspect the live render yourself** before calling it done.

## Open owner decisions

- The Signet mark.
- Whether the welcome is monochrome like sign-in, or uses the site's colour.
- The label typeface.
