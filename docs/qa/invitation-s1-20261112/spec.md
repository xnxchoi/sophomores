# SPH-T005-S1-20261112-01 — invitation page: known causes, copy and success screen

> **HELD 2026-11-13.** The owner reframed the product as a token, not an invitation (registry T002), and moved T002 Unlock ahead of this work. The copy, deadline and refusal wording below are superseded. Do not dispatch. The behaviour contract (typed-code parsing, latch levels, unknown-result retry) is kept for the redraft.

Slug `t005-s1-20261112`, branch `codex/t005-s1-20261112`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with two changes. Your identity
base is **the main commit that adds this file**. Persist your handback as
`docs/qa/invitation-s1-20261112/handback.md`. Owner decisions: registry T005, "Owner
direction, invitation page (2026-11-12)". Design facts:
[outcome matrix](../t005-c-20261112/outcome-matrix.md).

**Owned paths:**

- `src/components/commerce/invitation-claim.tsx`
- the `Customer.components_commerce_invitation_claim` object in `messages/en.json`,
  and nothing else in that file
- `tests/commerce/ui/guests.test.tsx` and `tests/commerce/ui/guests-dom.test.tsx`
- `tests/fixtures/commerce-copy-preview.tsx`
- `tests/support/commerce-copy-preview.mjs`, scenario plumbing only
- `docs/qa/invitation-s1-20261112/` (handback and evidence)

No server, contract, `checkout.tsx`, `order-admissions.tsx` or `messages/ko.json`
change. `ko.json` has no `Customer` object, so it must stay byte-identical.

## Behaviour

1. **Typed refusals.** On a non-OK response, read the JSON body and run
   `guestClaimRejectionSchema.safeParse({ code: body.code, status: response.status })`.
   Never map by status alone: 409 and 403 each carry several meanings. A typed refusal
   shows its own message, and the accept button is removed for it. Latch placement
   follows the [carry-forward LOWs](../batch-20261112/dispatch.md):
   - **Link-level** (INVALID, EXPIRED, UNAVAILABLE): latch in `InvitationClaim`, so it
     survives the identity remount.
   - **Account-level** (CONSUMED, ACCOUNT_NOT_ELIGIBLE, EVENT_ALREADY_BOUND): latch in
     `ClaimInvitation`, so it clears on an `identity.generation` change. Add no
     account-switch control and send no automatic request.
2. **Unknown result.** Everything else shows the unconfirmed message and re-enables
   the button: `CLAIM_RESULT_UNKNOWN`/503, 401, 429, an untyped 403, a code/status
   mismatch, an unparseable body, a network error, or a malformed success body. The
   owner allowed this retry. B makes a same-account, same-link replay safe.
3. **Local link states.** No POST is made in these.
   - No fragment: the missing message.
   - A fragment that fails the existing shape check: the incomplete message.
   - The first-frame read state renders no text, but keeps its slot so nothing jumps.
4. **Page intro.** Replace the two paragraphs (registration, email code) with the
   single keep-open line. Do not state that registration is required.
5. **Success.** Show the headline and subline, then a full-width two-column table
   (Tailwind only, semantic rows), then the existing `/` link. Clear the mounted link
   once, as now. Remove the old benefit sentence and the "admission and redemption are
   separate" line.

## Copy and keys

Replace the namespace with nested keys named by situation and purpose. Location comes
from the nesting. Delete the old keys after confirming that no source or test consumer
remains; leave historical `docs/qa` ledgers alone. Strings:

| Key | English |
|---|---|
| `link.missing` | Open the invitation link from the message you received. |
| `link.incomplete` | This invitation link looks incomplete. Open it again from your message, or copy the whole link. |
| `link.keepOpen` | Keep this page open until you're done. If it closes or refreshes, open your invitation link again. |
| `accept.action` | Accept invitation |
| `accept.pending` | Accepting… |
| `refusal.invalid` | This invitation link doesn't work. If you were sent a newer link, use that one. |
| `refusal.expired` | This invitation has expired. Invitations for this event are closed. {SUPPORT} |
| `refusal.used` | This invitation has already been used. |
| `refusal.unavailable` | This invitation is no longer available. {SUPPORT} |
| `refusal.accountIneligible` | This account can't accept this invitation. |
| `refusal.alreadyHasTicket` | This account already has a ticket for this event. The invitation hasn't been used, so it can still go to someone else. |
| `unconfirmed` | We couldn't confirm the result. Try again. |
| `success.title` | {HEADLINE} |
| `success.subtitle` | {SUBLINE} |
| `success.included.drinks.label` / `.detail` | Four drinks / During Part I |
| `success.included.transport.label` / `.detail` | Shared transport / From Part I to Part II |
| `success.continue` | {CONTINUE} |

The custodian fills `{SUPPORT}`, `{HEADLINE}`, `{SUBLINE}` and `{CONTINUE}` from owner
decisions before dispatch. No string may contain "claim", "gift" or "guest package".

## Acceptance

1. **Behaviour:** DOM tests cover each of the six typed codes (own message, button
   removed, latch at the stated level, including an A→B identity change), every
   unknown path in item 2 (unconfirmed message, button enabled), both local link states
   (no POST) and success (table rendered, link cleared once). Rewrite the existing
   generic-path assertions in `guests-dom.test.tsx` to the new contract; do not delete
   coverage.
2. **Integrity:**
   - Only the owned namespace changes in `en.json`, and `ko.json`'s hash is unchanged.
   - Full typecheck exits 0. Run it at most twice, at `--max-gib 3.5 --node-old-space-mib 2048
     --min-headroom-gib 10 --timeout 600`, with `node_modules/.bin/tsc --noEmit
     --incremental false`.
   - The default suite (`node tests/run-unit.mjs`, shared limits) shows only the 2
     known deferred-styling failures.
3. **Live render:** add one preview-harness scenario per state. Capture desktop
   (1280 wide) and touch (390 wide) screenshots of success, each refusal, unconfirmed
   and both link states. Store them under the evidence folder, with controls at
   least 44 px tall.

Completion gates, run by the custodian rather than the executor: a specialist review,
two independent Santa reviews, the custodian's own live render check and owner wording
approval. Commit as new commits only. Send one `worker_done`.
