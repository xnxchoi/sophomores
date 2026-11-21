# Handoff: the auth custodian role, to the Codex custodian (2026-11-17)

From the Claude auth custodian (peer name `sphmrs-3a`, worktree `.codex/worktrees/main-history-integration/sphmrs`, branch `codex/auth-payment-nfc`). The owner is handing this role to the Codex custodian (Orca terminal "Codex custodian", in the owner's `Projects/sphmrs`).

**Ownership, settled by the owner (2026-11-17):** the main-side custodian and the main owner are one role, and it goes to the Codex custodian. That role also takes this auth-branch custodianship. `AGENTS.md` on `main` (`b77f4a34`) already names the Codex custodian as `main`'s only owner and the plan's only writer.

Read `AGENTS.md` first. Every rule there binds you.

## 1. Your role

You are the custodian and orchestrator of everything about *how* sign-in, phone verification, payment and checkout, Unlock keys (Signet and Tickets), NFC and guest invites work. The owned paths are listed in `AGENTS.md` under "Auth, payment and token mechanisms: one branch".

- **You orchestrate; you don't hand-write the slices.**
  - Cut a worker branch from `codex/auth-payment-nfc` for each slice, in its own worktree.
  - Write a spec (scope, owner decisions, overrides, acceptance, gates) and dispatch the worker through Orca orchestration. Load the version-matched guide first with `orca skills get orchestration`.
  - Specs and handbacks live in `docs/qa/<slug>/`. The existing ones are the pattern.
- **You gate.**
  - Workers prove each behaviour change with a test that fails first.
  - They run the gates once on the final commit: guarded typecheck, the default suite (only the 2 known deferred styling failures), the DB proof, and `git diff --check`.
  - For UI, they capture a live render at 390 and 1280. Then two independent reviewers read the same rubric: the slice must pass both, in at most 3 rounds, before it goes to the owner. The owner pays for every round, so keep rounds few and narrow.
- **You merge.** Reviewed slices merge into `codex/auth-payment-nfc`. Then close the branch: archive it, then delete the branch and its worktree. Finished work reaches `main` only through the main owner, which is now you.
- **You keep the owner's decisions straight.**
  - The plan's History section is the owner's decision ledger. ADRs are in `docs/adr/`, currently 0001–0014.
  - Before acting on any owner add, change or delete, report what it touches and what breaks.
  - Quote the owner. Never attribute your own or a reviewer's requirement to the owner (see §6).

## 2. Where to find things

- **Plan:** `docs/qa/auth-payment-nfc/consolidation.md`. The owner retired the live Claude Docs plan on 2026-11-17, so this repo file is now the plan, and you are its only writer. Its diagrams are `system-map.png` and `journeys.png`, with their sources beside them. Keep it identical on `codex/auth-payment-nfc` and `main`. Read "The flow from zero (16 Nov)" first. It is the reference for the whole membership journey and overrides older items.
- **ADRs:**
  - 0010 live on Polygon, testing on Base Sepolia;
  - 0011 Signet, non-transferable; the lock manager can move one on request;
  - 0012 check-in on Events by Unlock;
  - 0013 social sign-up, and a wallet we control created at payment;
  - 0014 Tickets and guest invites.
- **Handbacks:**
  - `docs/qa/social-signup-20261116/handback.md` (merged);
  - `docs/qa/wallet-activation-20261116/handback.md` (on its branch);
  - `docs/qa/welcome-card-handoff-20261117/handoff.md`: the `/welcome` card design, which the owner rejected. Read it.
- **Signer keys:**
  - In the owner's `~/.config/sphmrs/`, mode 0600. Never print, log or commit them.
  - Test (Base Sepolia, 84532): `base-sepolia-key-granter.env` and `base-sepolia-lock-manager.env`. The test lock is in `tests/commerce/keys/fixtures/base-sepolia-test-lock.json`.
  - Live (Polygon, 137): `polygon-key-granter.env`. Grant signer `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336`, not yet funded.

## 3. State at handoff

| Where | State |
|---|---|
| `codex/auth-payment-nfc` | `b6625795` on origin: 110 commits ahead of `main`, 17 behind. Contains: the Unlock adapter, the paid guest invite (to be reworked), key-grant hardening (cross-process signer lock, fee-bump replacement, on-chain cancel), the checkout fix, social-only sign-up, and the Korean copy for the mechanism slice. Typecheck and suite are green as of the sign-up merge. |
| `codex/wallet-activation-20261116` | `cf1aa812`, pushed, not merged. Worktree `orca/workspaces/sphmrs/wallet-activation-20261116` is clean, and the Claude worker there is stopped. The mechanism parts passed review: wallet at payment, the catch-up command, passkeys without phone verification, passkey outcome checks, and the welcome read model. The `/welcome` card's visual design is rejected; see the welcome handoff. Merging needs the card redone (or the card held back) and the migration checked against the branch tip (`20261116_074049_member_wallets`). |
| `codex/door-check-in-20261116` and `codex/integration-wallet-activation` | Stale. The first was superseded by ADR-0012 and the second by the wallet branch. Archive both and delete them. |
| Scratch review worktrees | Under the Claude session's scratchpad: `santa-s1`, `santa-w4`. Remove them with `git worktree prune` once the Claude session ends. |

## 4. The build plan, in order

1. **The `/welcome` card,** with the welcome handoff. Then merge the wallet branch.
2. **Guest invites and Tickets** (ADR-0014):
   - every Signet holder gets one free launch-event Ticket by airdrop;
   - guest invites stay members-only; the member pays, and every QR goes to the member;
   - the cap is a setting, 2 for now, and must work for any number;
   - unused invites are refundable;
   - capacity is counted by Tickets: at most 1 + cap per member;
   - rework the merged guest-invite code; don't revert it.
3. **NFC card.** It binds to the account. The first tap opens `/welcome`; later taps show membership. The tap-verification design is Gemini's: SUN/CMAC, with the exact package shown to the owner before install.
4. **Refunds in the admin.**
   - Refunding the book cancels its Signet. Signet is a free perk with the book and is never refunded on its own.
   - Unused invites are refundable.
5. **Move a Signet to a member's own wallet** on request: the lock manager calls `transferFrom` (ADR-0011).
6. **Standard checkout to completion,** then delete the I2 reconciliation machinery.
7. **Background jobs:** grants, cancels, confirmations and the catch-up sweep. Cancels must land before doors open.
8. **Sandbox run** of every path, within the 30 PortOne test payments.

## 5. Waiting on the owner

- **Create the wallet owner key.** It owns every member's Safe and is a third secret, kept beside the others. It signs nothing at launch, but every wallet address is computed from it, so it must exist before the first live Signet and can't change afterwards. The owner hasn't said yes yet.
- **Once they have POL:**
  - deploy the Signet lock from MetaMask: never expires, price 0, 1 per person, supply cap 0, transfers off;
  - create the launch event in Unlock's EVENTS app: self-serve sign-up off, tickets non-transferable;
  - add the grant signer to both;
  - fund the signer, about 1 POL.
- **PortOne 바로오픈 application.** The refund policy shows the book with its 7-day withdrawal right, and Signet as a free perk.
- **Live Google sign-in test** on localhost, with the owner's credentials (saved in their `.env.local`; never read or print the values). Apple needs the deployed site. Kakao stays off until it's a Biz app.
- **The Base Sepolia EVENTS test:** what a second scan shows, and that each Ticket gets its own QR email when it is held in a wallet.
- **Design decisions for `/welcome`:** the Signet mark, monochrome or colour, and the label typeface.

## 6. Lessons from this custodian's mistakes

- **UI is design, not words.**
  - Every UI brief loads `ux-writing`, `better-ui`, `make-interfaces-feel-better`, `frontend-design-direction` and the motion skills.
  - It points at `04c-direction.md` and the motion records on `feature/product-production`.
  - Review rubrics fail wordy copy and weak visual hierarchy outright.
  - Judge a design yourself before it reaches the owner.
- **Never present your own or a reviewer's requirement as the owner's.** Cut every fix round to the owner's actual scope.
- **Raise anything that touches an owner rule urgently and on its own.** Don't bury it in a review summary.
- **Give each worker its own DB-proof port.**
  - Used so far: 55491–55499, 55501, 55502. Port 55499 collided once.
  - The guard leaves a `.lock.inflight.json` behind if its supervisor is killed. Clear it only after confirming that nothing from that run is alive.
- **Workers go idle without reading Orca mail.** Write to their `dispatch:` mailbox. If one is sitting at an interrupted prompt, type into its live terminal.
