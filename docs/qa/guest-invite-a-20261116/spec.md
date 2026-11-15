# SPH-GUEST-INVITE-A-20261116-01 — paid guest invite, member pays, with the 48-hour hold

Slug `guest-invite-a-20261116`, branch `codex/guest-invite-a-20261116`, based on
`codex/auth-payment-nfc` at the commit that adds this file (your identity base). This is
mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.

Read first: `AGENTS.md`, `docs/qa/batch-20261112/shared-rules.md` (the overrides below win),
`docs/adr/0002`, `0007`, and the Codex plan `docs/qa/auth-payment-nfc/paid-guest-invite-plan.md`.
Use its interpretation-A parts as your design; where it and this spec differ, this spec wins.

## Owner decisions this builds on

- The guest invite is a separate paid product that skips the membership gate. It never grants
  membership. Unused invites are refunded, and offline corrections are made by hand.
- A member sends the invite and chooses who pays: the member or the invited guest. **This slice
  builds only "the member pays".** The invitee-pays path is a later slice; design the invite
  record so that adding a payer later needs no migration of existing rows.
- An unpaid invite holds a place for 48 hours, then lapses and the member is told. Nobody is
  charged, and the member can send a new one.
- Guests are email-only: Unlock emails each guest their QR key (ADR-0007). The door checks our
  admissions list.
- One unit per buyer, card only.

## Scope

1. **Product.** A guest-invite SKU beside the membership offer. Change the catalogue's
   "exactly one match" rule in `src/lib/commerce/catalogue.ts` so the shop still shows the
   membership offer unchanged. You own `catalogue.ts` for this slice.
2. **Invite record.** It names the guest (name and email), the inviting member and the event,
   and has states pending payment, paid, lapsed, used and refunded. It lives under
   `src/payload/collections/`, with one additive migration and regenerated `src/payload-types.ts`.
   Do not regenerate `src/payload-generated-schema.ts`.
3. **Checkout.** The inviting member pays through today's account checkout. Settlement marks the
   invite paid, creates the guest admission against event capacity, and must not run the
   membership grant for this SKU.
4. **The 48-hour hold.** An unpaid invite holds a place for 48 hours. An explicitly invoked
   function lapses due invites and releases their places (no scheduler yet), and records a
   "member to notify" marker. No email sending in this slice.
5. **Keep today's account-bound guest claim working** (`src/lib/commerce/guests.ts`).
6. **Guest key: don't build it.** Do not edit `src/lib/commerce/keys/*` or the key-grant intent
   collection; a parallel slice is editing them. Record in the handback exactly what the guest
   key needs, such as a `guest_email` intent at settlement and an event lock.

## Overrides of the shared rules

- **Dependencies.** Run exactly one install, in your own worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log .tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`.
- **Providers.** None: no PortOne, RPC, email or `.env`.
- **Database.** For the proof, the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`
  is allowed. If Docker Desktop isn't running, you may start it, and you must quit it afterwards.
- **Resources.** Other workers may run at the same time. Keep 10 GiB of headroom. Use 4 GiB and
  `--node-old-space-mib 2048` for the typecheck and the suite, and 3 GiB for the DB proof. Run
  one workload at a time.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/`.

1. A member buys an invite for a named guest. Settlement marks it paid, admits the guest against
   capacity, and leaves everyone's membership status unchanged. Replaying the settle changes nothing.
2. An unpaid invite holds a place. After 48 hours the lapse function releases it once, and a
   second run changes nothing. A paid invite never lapses.
3. The shop still shows the membership offer exactly as before, and today's guest claim still works.
4. Prove settlement and lapse against disposable PostgreSQL, including a rollback.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the DB proof;
- `git diff --check`, which must be clean.

Persist the handback as `docs/qa/guest-invite-a-20261116/handback.md`. Commit sanitized evidence
only. Then send one `worker_done`. Report any unmet criterion plainly.
