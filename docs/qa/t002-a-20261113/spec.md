# SPH-T002-A-20261113-01 — reframed token model and local P2 contract (design only)

Slug `t002-a-20261113`, branch `codex/t002-a-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these changes:

- Your identity base is **the main commit that adds this file**.
- This assignment is Markdown-only. Do not run any Node workload or create a
  `node_modules` symlink.
- Persist your handback as `docs/qa/t002-a-20261113/handback.md`.

**Read first:**
- registry T002, especially "Owner reframe" and "Owner answers, 2026-11-13";
- T001 "Settled" and T010;
- [blueprint](../../reference/unlock-integration-blueprint.md) §§1, 3–5 and 8;
- [account/token supplement](../../reference/ticket-account-planning-20261110.md) D1–D5,
  §6 and §7;
- current source in `src/lib/commerce/{guests,ecommerce,returns,reservations}.ts`,
  `src/lib/commerce/_shared/`, `src/lib/commerce/portone/adapter.ts` and
  `src/lib/payload/collections/commerce-{admissions,claims}/`.

**Owned paths:** `docs/qa/t002-a-20261113/` only. Do not edit the registry, the
blueprint, the supplement, any source file or any catalogue. Write proposed amendments
to those documents as text inside your design file.

## Deliverable: `docs/qa/t002-a-20261113/model.md`

1. **Model reconciliation.** Build a table of each owner reframe decision and answer.
   For each, give the existing D1–D5, blueprint or T001/T010 statement it confirms,
   amends or contradicts, the current-source behaviour it touches (`file:line`), and a
   disposition: *adopt*, *amend (with proposed wording)* or *held for owner*. Cover at
   least these:
   - one perpetual, event-independent membership token per account;
   - event access purchased per event, with the count sold as the cap;
   - per-event entitlement rules;
   - gifts as unactivated tokens, available to whoever holds the bearer first;
   - no link expiry and no claim cutoff;
   - no refund before activation;
   - no transfer after activation, with recovery only through Sophomores;
   - a page after activation;
   - whether a separate event credential or lock still exists, against D5's
     membership-plus-event model.

   Name the three unconfirmed interpretations recorded in T002 and state what each
   option changes. Do not resolve them yourself.
2. **Launch-event mapping.** For the first sale, state what one purchased unit
   delivers: membership token, event access, the drinks/transport package, or a
   combination. Cover the self and gift cases, the repeat buyer, and the buyer who
   already holds a token. Mark every choice that is not settled by an owner
   statement as a proposal.
3. **P2 contract: provider-free, implementation-ready.** Propose one smallest local
   slice for a later separate assignment. Give:
   - owned files;
   - the record and state model: a token entitlement separate from event admission,
     with states such as unactivated, activated, recovery and unknown issuance;
   - a fake-issuer interface that follows blueprint §4's deferred-issuance contract:
     operation identity, unknown outcome and no blind regrant;
   - test-first cases (one per account, concurrent first orders, replay, gift
     activation races, an already-holding account, return before and after
     activation);
   - schema or migration needs, flagged for separate approval;
   - one to three acceptance criteria.

   No chain, SDK, RPC or network choice.

## Acceptance

1. Every decision and answer in registry T002 appears in the reconciliation table with
   a disposition. Every conflict cites both the document and the source line. Nothing
   settled by an owner is reopened, and nothing unsettled is presented as settled.
2. The P2 contract can be dispatched as written. Its acceptance criteria are checkable
   without a database, provider or network, and any schema change is flagged rather
   than assumed.
3. The handback lists changed files, the diff hash, link and anchor checks (run with a
   standard-library checker, with the actual output), and open owner decisions limited
   to items that block P2.
