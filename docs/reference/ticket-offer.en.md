# Sophomores ticket offer and operations brief

**Template revision:** 0.1 · **Last updated:** 2026-11-06

[한국어](ticket-offer.ko.md) · [English](ticket-offer.en.md) · [Policy draft](commerce-policy-drafts.md) · [Runbook](../deployment/member-auth.local.md#portone-next-steps--short-execution-plan) · [Brand voice](../design/brand-voice.md)

Internal, fillable business record; not public terms, legal approval or permission to activate sales. No event, date, venue or price is approved by this template.

These two files represent ONE offer record. Either language may be edited first; synchronize matching field IDs and offer versions, then record parity review before approval or use. Neither language silently takes precedence. Resolve discrepancies together.

Replace blanks with confirmed facts and evidence. Optional or inapplicable items may read “N/A — reason”; silence is not a decision. Repeat variant/band rows only when needed. For repeated variant fields and references, append `[variant ID]` to the stable field ID (for example, `TICKET.02[variant ID]`); use the same composite reference for price, fee and discount scopes. Unresolved customer-facing commitments block release.

**Existing approved decision:** an account with verified email and phone may buy; club approval is separate. This is eligibility direction, not proof of an activated checkout or admission entitlement.

**Capability boundary:** PortOne local payment/recovery work does not establish selected-PG acceptance, enabled payment methods, ticket issuance, retrieval, redemption or refund execution. Confirm each proposed promise separately. Payment success alone is not a valid admission ticket.

## 01. Document control


| Field ID  | Decision / value                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `CTRL.01` | Accountable offer owner / editor / operational backup: Sean Choi                                                           |
| `CTRL.02` | Status: draft / under review / approved / retired; approval evidence and date: Draft                                       |
| `CTRL.03` | Offer version / effective-from timestamp / offers or sales it applies to: Effective from November 8th, until December 11th |
| `CTRL.04` | Language synchronization reviewer / date / outstanding differences: Nathan Choe                                            |


## 02. Event identity and schedule


| Field ID   | Decision / value                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `EVENT.01` | Stable event code / customer-facing title / short factual description: \[To fill\]                            |
| `EVENT.02` | Organizer legal name / seller relationship / accountable event lead: \[To fill\]                              |
| `EVENT.03` | Event date(s) / doors open / start / end; each as an ISO 8601 timestamp with offset: \[To fill\]              |
| `EVENT.04` | IANA timezone / overnight or multi-day handling / late-arrival boundary (inclusive or exclusive): \[To fill\] |


## 03. Venue and access


| Field ID   | Decision / value                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `VENUE.01` | Venue name / exact address including floor or room / map URL / entrance directions: \[To fill\]                             |
| `VENUE.02` | Venue capacity / usable event capacity / reserved or unavailable places: \[To fill\]                                        |
| `VENUE.03` | Verified accessibility / accommodation request contact and timing / known limitations: \[To fill\]                          |
| `VENUE.04` | If remote or hybrid: platform, access delivery, technical requirements and fallback; otherwise N/A with reason: \[To fill\] |


## 04. Ticket variants and inventory


| Field ID    | Decision / value                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `TICKET.01` | Variant ID / SKU / display name: repeat the following fields per actual variant: \[To fill\]                   |
| `TICKET.02` | Included entitlement / exclusions / valid event or session / seated or standing / seat assignment: \[To fill\] |
| `TICKET.03` | Per-variant capacity / shared pool ID and total / allocation rules preventing double counting: \[To fill\]     |
| `TICKET.04` | Reentry / transfer eligibility, limit, deadline and process / purchaser-attendee relationship: \[To fill\]     |


## 05. Sale window and purchase limits


| Field ID  | Decision / value                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `SALE.01` | Sale opens / closes: offset ISO timestamps + IANA timezone; explicitly include or exclude each boundary: \[To fill\] |
| `SALE.02` | Sold-out override / early closure authority / reopening and waitlist policy, if applicable: \[To fill\]              |
| `SALE.03` | Minimum and maximum per order / per-account cumulative limit / how variants share limits: \[To fill\]                |
| `SALE.04` | Window-crossing checkout, pending payment and inventory reservation expiry treatment: \[To fill\]                    |


## 06. Price and payment


| Field ID   | Decision / value                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRICE.01` | Per TICKET.01\[variant ID\]: currency code / unit price in major currency units / decimal precision: \[To fill\]                                                                              |
| `PRICE.02` | Tax included or added / every mandatory fee and its per-ticket, per-order or other basis / mandatory total formula and sample quantity calculation; specify \[variant ID\] scope: \[To fill\] |
| `PRICE.03` | If applicable: discount eligibility, amount or rate and per-ticket, per-order or other basis, period, stacking and limits; specify \[variant ID\] scope: \[To fill\]                          |
| `PAY.01`   | Proposed payment methods / selected PG / acceptance evidence and restrictions (not credentials): \[To fill\]                                                                                  |
| `PAY.02`   | Technical mapping reviewer: convert PRICE.01 to currency-specific integer minor units; validate totals and supported scope: \[To fill\]                                                       |


All monetary amounts in this record, including fees, discounts and refunds, use the specified currency’s major units, not runtime integers. Current catalogue support is KRW/USD, maximum quantity 1–6 and one configured offer; variants, pooled inventory or other rules here are requirements to assess, not implemented features. Never paste API keys or channel secrets.

## 07. Fulfillment and retrieval


| Field ID     | Decision / value                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `FULFILL.01` | Actual issuance trigger / delivery method / delivery timing / accountable issuer: \[To fill\]                                    |
| `FULFILL.02` | Where buyers retrieve tickets / availability and limitations / delivery failure or lost-email assistance: \[To fill\]            |
| `FULFILL.03` | Manual fallback: availability, owner, hours, identity checks and expected response; N/A requires reason: \[To fill\]             |
| `FULFILL.04` | Required implementation and acceptance evidence before promising any QR, wallet, self-service or automated delivery: \[To fill\] |


## 08. Admission rules


| Field ID   | Decision / value                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ENTRY.01` | Valid ticket definition / admission verification method / redemption owner / cancellation or reversal invalidation: \[To fill\] |
| `ENTRY.02` | Attendee identity checks / accepted documents / age eligibility and verification / guest rules: \[To fill\]                     |
| `ENTRY.03` | Transfer admission checks (TICKET.04) / late arrival / no-show treatment / refused-entry process: \[To fill\]                   |


## 09. Cancellation and refunds


| Field ID    | Decision / value                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REFUND.01` | Approved refund-policy version (POLICY.01) / event-specific exceptions / legal reviewer: \[To fill\]                                                         |
| `REFUND.02` | Organizer cancellation: refund scope, fees, notification, request or automatic process and owner: \[To fill\]                                                |
| `REFUND.03` | Reschedule or material venue/program change: options, response window, notice and non-response handling: \[To fill\]                                         |
| `REFUND.04` | Buyer cancellation bands: complete the table below; add rows only as needed: \[To fill\]                                                                     |
| `REFUND.05` | Calculation basis: event reference timestamp / elapsed hours or calendar days / IANA timezone / boundary rule: \[To fill\]                                   |
| `REFUND.06` | Request receipt channel and authoritative receipt timestamp / outage and out-of-hours receipt handling: \[To fill\]                                          |
| `REFUND.07` | Refundable base / mandatory fee and tax treatment / discounts / partial quantity allocation / rounding unit and rule: \[To fill\]                            |
| `REFUND.08` | Acknowledgement deadline / decision deadline / approved refund execution deadline: trigger, calendar or business days, owner: \[To fill\]                    |
| `REFUND.09` | Expected time until refund reaches customer, source and communication owner; distinguish from operator refund execution and statutory deadlines: \[To fill\] |
| `REFUND.10` | Approval authority / actual execution method and capability / failed or partial execution escalation: \[To fill\]                                            |



| Band ID   | Receipt interval: exact start/end and inclusion | Refund rate or amount and basis |
| --------- | ----------------------------------------------- | ------------------------------- |
| `BAND.01` | \[To fill\]                                     | \[To fill\]                     |


Cover every relevant receipt time once, including exact cutoffs and on/after-event requests; no overlapping or missing bands. Check boundary examples. Do not copy Hideaway percentages or a three-day deadline without explicit approval. Preserve applicable statutory rights; this record cannot waive them.

## 10. Customer support


| Field ID     | Decision / value                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `SUPPORT.01` | Approved support email or intake URL / responsible team and named owner / coverage and timezone: \[To fill\]  |
| `SUPPORT.02` | Response target / event-day urgent route / escalation owner and trigger: \[To fill\]                          |
| `SUPPORT.03` | Minimum order reference and identity evidence; do not request full card number, CVC or passwords: \[To fill\] |


## 11. Approved policies and public copy


| Field ID    | Decision / value                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `POLICY.01` | Approved terms / privacy / refund document URLs, versions, approval evidence and effective dates: \[To fill\]                          |
| `COPY.01`   | Approved short description / inclusions summary: reference EVENT and TICKET, do not add promises: \[To fill\]                          |
| `COPY.02`   | Approved CTA and destination / price, date and refund disclosures use field references above, not parallel editable facts: \[To fill\] |
| `COPY.03`   | Public copy reviewer / approved language-specific copy location and version: \[To fill\]                                               |


## 12. Release review and open decisions


| Field ID     | Review / evidence                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `RELEASE.01` | Seller disclosures and required registration/contact gate: owner, evidence, date: \[To fill\]                                        |
| `RELEASE.02` | Selected PG / permitted methods and offer review: reviewer, evidence, date: \[To fill\]                                              |
| `RELEASE.03` | Legal and policy approval / public-copy approval / bilingual parity: reviewers, evidence, dates: \[To fill\]                         |
| `RELEASE.04` | Technical and operational acceptance of sale, totals, issuance, admission and refund promises: evidence and limitations: \[To fill\] |
| `RELEASE.05` | Unresolved field IDs / decision owner / due date / release blocker or N/A rationale: \[To fill\]                                     |


Approval of this record does not authorize provider calls, publication, deployment or real-money transactions. Those require separately scoped permission. The policy draft’s proposed effective date is not the event date.

## 13. Change log and sold-offer preservation


| Revision / date  | Changed field IDs / reason                             | Owner / approval / parity evidence |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| 0.1 / 2026-11-06 | Initial unfilled bilingual template; no offer approval | \[To fill\]                        |


`HISTORY.01` — Before changing a sold offer, preserve the approved bilingual offer and linked policy/copy versions, sale effective interval and an immutable snapshot reference associated with affected orders. Record who receives changed terms, notice/consent handling and remedy; never silently overwrite sold terms. \[To fill\]