# 0019: Order pages read native owner-filtered records

- Status: accepted under delegated design authority
- Date: 2026-11-18

## Context

The inherited P8/P9 routes were headings behind existing account and UUID guards. The current commerce collection already supports native Payload REST reads: its server-side ACL limits customer reads to their own customer/user relationships. The account hub needs an actual order-history destination, not a link promising a nonexistent list. Payment, refund, membership and fulfillment mechanisms remain with their existing owners.

## Decision

Use the existing native `/api/orders` collection read, with explicit signed-in customer/user filtering, minimal selected fields, depth zero and bounded pagination. The detail request adds the validated UUID filter and selects the saved snapshot and fulfillment fields. Client filtering is not authorization; the unchanged server ACL remains authoritative. Preserve the existing account redirects, UUID guard and old guest-admissions route.

Show the recorded order status and amount without interpreting them as a fresh payment-provider receipt. Legacy records use their documented minor-unit amount and currency; commerce-v1 uses its native recorded amount. Display item/address details only after the existing canonical immutable snapshot schema validates and its customer, currency and total match the record. Keep delivery status separate. Do not invent item names, prices, shipment dates or financial actions when details are unavailable.

Keep request data in component state only, cancel obsolete reads and match responses to account/page/request identity. Clear displayed records on page visibility changes and read again on return. The list selects no address or snapshot fields. The detail view does not log, store or forward private fields. Existing Help/contact information is the supported destination for questions about possible cancellations or returns; no fake request/refund button is introduced.

## Alternatives

- Add a custom order API or direct Local API bypass: rejected because native reads and authoritative access rules already exist; a second endpoint or `overrideAccess` path would unnecessarily widen mechanism ownership.
- Show a list scaffold and move on: rejected because it leaves the agreed account journey unusable despite an existing read contract.
- Reconstruct purchase details from the current offer: rejected because present prices, addresses or product content are not historical order facts.
- Replace the existing admissions route or introduce cancellation/refund mutations: rejected because these are separate mechanism contracts, not necessary for read-only history/detail delivery.

## Consequences And Reassessment

The UI can expose actual order records without changing the schema, ACL, credentials, provider or financial workflows. Historical or inconsistent records may have incomplete details; the UI says so rather than inventing a receipt. Dedicated request/receipt workflows remain unfinished programme scope, not silently replaced by Help.

Independent React review caught focus loss when pagination unmounted its active button during loading. The corrected pager remains mounted across loading/error/empty/success states and announces page feedback. Empty pages with other existing orders are distinguished from an empty account history. These corrections and source/security/API-shape reviews do not establish browser, native ACL, session-transition, financial, provider or physical-device acceptance.

Reassess when the mechanism owner supplies a narrower read projection, a real request workflow, additional supported currencies/statuses or an authoritative receipt contract. Retain actual failed and corrected evidence in the active plan.

## Restore

Restore the two order route scaffolds and remove the new orders component, hub Orders link and corresponding catalogue additions. No order, account, provider, database or financial state is changed by this source batch. Preserve all prior public/cart/account/Team source work and unrelated staged changes.
