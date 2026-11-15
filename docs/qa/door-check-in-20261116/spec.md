# SPH-DOOR-CHECK-IN-20261116-01 — the door: staff scan a guest's Unlock QR, or find them by name

Slug `door-check-in-20261116`, branch `codex/door-check-in-20261116`, based on
`codex/auth-payment-nfc` at the commit that adds this file (your identity base). This is
mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.

Read first:
- `AGENTS.md` and `docs/qa/batch-20261112/shared-rules.md` (the overrides below win);
- `docs/adr/0007` (the door trusts our database), `0002`, `0004`, `0011`;
- `docs/qa/auth-payment-nfc/unlock-qr-verification.md`, which is your design for QR verification;
- `src/lib/commerce/guests.ts` (`checkInGuest`), `src/lib/commerce/guest-invites.ts`;
- `src/payload/collections/commerce-admissions/`;
- `src/payload/admin/commerce/{admission-controls,event-manifest}.tsx`;
- `src/lib/auth/access.ts` (`isCmsStaff`);
- `src/lib/commerce/keys/*` (key-grant intents carry `chainID`, `lock` and `tokenID`).

## Owner decisions this builds on

- The door works from our admissions list; the chain is the ownership record behind it (ADR-0007).
- Guests get their key from Unlock as an emailed QR. Staff scan it, and it is checked against our
  admissions list. If that fails, staff find the guest by name and mark them admitted, and the
  action is logged.
- Both paths use up the same admission row once, atomically. That is our replay protection;
  Unlock has none.
- Door staff are CMS staff (`isCmsStaff`), not a customer field.
- Members check in by card tap after launch. Card tap is out of scope here; leave a clear seam.

## Scope

1. **Verify the QR on the server.** Decode `data` and `sig` from the scanned URL, then run
   viem's `verifyMessage` over the exact `data` string, never re-serialised, and ignore the URL's
   host. Accept only signer addresses pinned in configuration, including earlier ones. Map
   `network + lockAddress + tokenId` to one admission, through the key-grant record that holds
   that token. Treat an unknown network, lock or token, a bad signature, or an unpinned signer
   as a refusal with a reason code. Never fall back to a chain read at the door.
2. **One check-in action.** It uses the admission once, atomically, under the existing admission
   lock, and reuses or extends `checkInGuest` rather than adding a parallel path. A second scan
   of the same admission is refused with "already checked in" and its time. Held, revoked and
   refunded admissions are refused. Every attempt is logged: who, which method (QR or name),
   result and time. Use one append-only collection under `src/payload/collections/`, with one
   additive migration and regenerated `src/payload-types.ts`. Do not regenerate
   `src/payload-generated-schema.ts`.
3. **Name lookup fallback.** Staff search the event's admissions by guest or member name, then
   confirm a check-in, which is logged with the name method.
4. **The door page.** A staff-only page for the event's door, behind CMS staff sign-in. It has:
   - an event picker;
   - a scan input;
   - name search;
   - a clear result for each outcome: admitted, already checked in (with time), refused (with
     reason), and not found;
   - a running count.

   Scanning:
   - use the browser's `BarcodeDetector` where it exists;
   - always offer a text field that accepts a pasted or hardware-scanner URL;
   - **install no QR library**. If `BarcodeDetector` is missing on iPhone Safari, say so in the
     handback, name one package with an exact version at least two weeks old, and the custodian
     asks the owner.

   UI rules:
   - put the page where the repo's staff or admin surfaces live, and say why;
   - load the `ux-writing` skill for copy; copy goes in `messages/en.json`, with
     `messages/ko.json` mirrored using `""`;
   - Tailwind only;
   - hit targets of at least 44 px, because door staff use a phone one-handed.

## Overrides of the shared rules

- **Dependencies.** Run exactly one install, in your own worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log <absolute path>/.tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`.
- **Providers.** None: no RPC, Locksmith or email calls. Use signature fixtures you generate with a
  throwaway in-test key, and pin that key's address in the test configuration only.
- **Database.** For the proof, the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`
  is allowed. Docker may be started if it isn't running. Never stop it while another container is
  running: check `docker ps` first, and quit Docker only if you started it and nothing else remains.
- **Resources.** Another worker may run at the same time. Keep 10 GiB of headroom, and use an
  absolute `--log` path. Use 4 GiB and `--node-old-space-mib 2048` for the typecheck and the
  suite, 6 GiB for the dev server, and 3 GiB for the DB proof. Run one workload at a time; if the
  guard stops a run for headroom, wait and retry, and never raise a limit.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/`.

1. A valid QR from a pinned signer for a known admission checks in once. A second scan is refused
   with the first check-in's time.
2. A bad signature, a re-serialised payload, an unpinned signer, or an unknown network, lock or
   token is refused with its code. Nothing is consumed.
3. Held, revoked and refunded admissions are refused.
4. A name check-in uses the same admission once, and every attempt is logged.
5. Two concurrent scans of one admission: exactly one succeeds. Prove this against disposable
   PostgreSQL.
6. Live render: a guarded dev server against disposable PostgreSQL, seeded through Payload's
   Local API with an event, admissions and a staff user. Capture the door page at 390 px and
   1280 px in each outcome state, and save small PNGs under `docs/qa/door-check-in-20261116/render/`.
   The custodian then runs a two-reviewer Santa pass on them.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the DB proof;
- `git diff --check`, which must be clean.

Persist the handback as `docs/qa/door-check-in-20261116/handback.md`. Commit sanitized evidence
only. Then send one `worker_done`. Report any unmet criterion plainly.
