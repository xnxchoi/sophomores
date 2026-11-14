# Sophomores — reference integration specification

> Archived development evidence. Relocated 2026-10-22; dated observations, source line numbers, review decisions, and test counts below are historical, not current release acceptance. Generated local screenshots and downloaded benchmark bundles are not retained here; reproduce QA against the current app before relying on them.

Status: design/implementation contract with isolated local studies implemented; validation snapshot in §13 and latest pacing revision in §14. Not an approved production release.
Latest user review: the current intro and ticket studies are rejected. Do not integrate those executions or treat local verification as design approval. The invitation step transitions were judged too fast; the current revision is limited to calming their pacing. Acceptance of the selected references is distinct from acceptance of these implementations.
Prepared: 2026-10-03, Asia/Seoul. Workspace: `<home>/Projects/soph-co`.
Scope: reference analysis, narrative architecture, isolated frontend study, and gated production contracts.
Owner boundary: this document only; other sessions own current site visuals and implementation.

## 1. Capability and decision status

A visitor should recognize Sophomores as a private social club for experienced, unfinished people, understand that its first expression is a night together, and take one unambiguous next step. The experience must integrate an Analogue-inspired introductory hero, Má-inspired multi-step preregistration, an Analogue-pricing-inspired ticket-commerce experience, and a core video feature with spatial entry/exit, without borrowing agency procurement logic or a reference site's identity.

- **Confirmed request:** study all three references, adapt rather than reproduce them, specify integration, then create. 
- **Confirmed constraint:** no 3D tilt in the immersive form; preserve concurrent work.
- **Current implementation fact:** the existing invitation is preview-only; no registration service is connected.
- **Confirmed hero requirement:** the Analogue introduction must become the hero on some page. Homepage placement and fusion with the existing visuals remain undecided; the hero itself is not optional.
- **Confirmed commerce requirement:** the pricing adaptation is ticket commerce. Ticket quantity/type/inclusions govern the experience once confirmed; project timelines are not the primary model, and blue is not a signature requirement.
- **Confirmed video requirement:** video is a core feature, implemented as a reusable actual video component with Motion enter/exit; a text pane is not an acceptable final substitute.
- **Confirmed runtime ownership:** all DOM/UI animation and transitions use Motion (`motion/react`); all new WebGL study rendering uses React Three Fiber/Three and related approved tooling. No GSAP, bespoke animation engine, or separate CSS animation timeline.
- **Shared renderer boundary:** do not edit the existing raw `FlameBackdrop` renderer owned by other sessions. If the study mounts that light, adapt its shader equations into an isolated R3F `StudyLight` rather than mounting a second raw renderer; parent owns that implementation. Native video playback is media, not a WebGL animation controller.
- **Route proposal:** `/invitation` owns preregistration; hero and ticket-commerce route placement remain decisions, not reasons to omit either capability.
- **Working assumption:** preregistration means notification of launch/ticket availability, not an attendance application, reservation, membership decision, or purchase.
- **Unanswered product decision:** the user has been asked to confirm that meaning; notification is not approved policy.
- **Design status:** the first attached generated visual draft was explicitly rejected; all generated alternatives remain unapproved. Do not derive a green wash or racing-green requirement from historical memory.
- **Hero fusion decision:** implement the required introductory hero in the isolated study; resolve the final page and fusion before replacing shared homepage work. Ground fusion in the approved luminous/prismatic flame and source light behavior; neither green wash nor blue wash is mandated.
- **Implementation state:** the user has directed continuation of the original job. The isolated study continues across the required hero, form, ticket-commerce interaction, and reusable video component. No live network transactions, homepage replacement, invented final offers, or blanket palette redesign are authorized by this slice.
- **Historical execution update (2026-10-03):** `/studies`, `/studies/intro`, `/studies/invitation`, and `/studies/tickets` existed at the checkpoint recorded in §13. They are not current route claims; see the 2026-11-02 ticket-route correction in §13.1.
- **Release state:** live collection, publishing, email, payment, and infrastructure changes remain separately gated.

### 1.1 Evidence labels

`OBSERVED` means browser behavior reported by the reference-capture agent today, with adjacent screenshots.
`CURRENT` means inspected local source; because other sessions are active, re-read before integrating.
`PROPOSED` means a design/engineering decision in this document, subject to validation.
`BLOCKED` means a missing fact or permission prevents that production capability from shipping.
Reference observations are not performance measurements, cross-browser guarantees, or source-code audits.

## 2. Identity, product, and persuasion

`CURRENT`: `../../src/lib` labels the copy provisional and identifies the club and unfinishedness theme.
`CURRENT`: `../../src/lib` favors curiosity, company, discovery, and reduced credential performance.
`CURRENT`: `README.md:78–84` distinguishes the ticket-sale opening from the event and keeps release facts provisional.
Historical September 30 planning favored “out of spec,” willingness to look foolish, and simple encounters with meaning underneath; it is background, not current launch authorization.
The older December 18 event date and twenty-hour deadline must be reconfirmed rather than imported into current UI.
Restored brand-vault templates provide material/typographic context, not reliable facts about locations, members, manufacture, or business operations.
No completed brand-discovery checkpoint was found; do not manufacture a brandbook or call this a completed interview.
The user's reference-selection monologue is private working thought, not a public-copy sample to imitate verbatim.

### 2.1 The difference that governs adaptation

An agency must establish delivery competence, scope, commercial return, and confidence in a supplier.
Sophomores must establish an appealing room, social permission, a recognizable sensibility, and clarity about the invitation.
The first product is an experience with other people, not a service estimate or proof that visitors are exceptional.
Do not transpose case-study authority, project-week estimates, “high achiever” admission rhetoric, or price-defense narratives.
“Private” is not permission to invent selectivity, screening, scarcity, or acceptance criteria.
Mystery may surround programme details; it must not obscure what an action does or whether anything has been purchased.

### 2.2 Editorial operating rules

- Lead with a tangible proposition before a sequence of rhetorical questions.
- Let curiosity and unfinishedness carry the distinction; avoid generic rebellion or motivational promises.
- Make participation feel possible without requiring a visitor to perform individuality.
- Use short headings, plain action labels, and specific practical facts once confirmed.
- Video is a core deliverable, but watching it is optional for the visitor; it must not gate comprehension, preregistration, or ticket selection.
- Public-facing copy remains a draft until reviewed; do not attribute new language to the founder.
- Preserve brand specificity without universal-appeal claims or demographic assumptions.

## 3. Reference evidence and transfer decisions

External reference images 01–18 are retained in `design/references/` at the repository root. Local captures 20–38 mentioned below are historical generated outputs, not retained design sources. They are research evidence, not licensed production assets.
Sources: [https://analogueagency.com](https://analogueagency.com) ; [https://masaigon.space](https://masaigon.space) ; [https://analogueagency.com/about-us/pricing](https://analogueagency.com/about-us/pricing) .

### 3.1 Analogue home: atmosphere becomes an object, then evidence

`OBSERVED`: the opening used compact centered emotional-decision copy over blue/white inward-radiating video light.
On scroll, a longer product/service proposition became progressively legible while the same light persisted.
Further movement exposed white margins and a contained rounded video frame, followed by off-white explanatory material and casework.
Reverse scroll restored the visual relationship rather than presenting unrelated scenes.
Evidence: `01-analogue-hero.png`, `02-analogue-transition.png`, `03-analogue-first-section.png`, `04-analogue-handoff-mid.png`, `05-analogue-handoff-landed.png`, `06-analogue-reverse.png`.
Some captures use different widths because browser work was concurrent; do not derive exact geometry, timing, frame rate, or easing from them.

**Transfer:** one continuous light field becomes a bounded piece of the story, then gives way to concrete information.
**Do not transfer:** the agency's emotional-purchase thesis, studio positioning, project proof, copy, or video asset.
**Sophomores job:** recognition → permission to remain curious → the place that curiosity can take physical form.
**Integration:** the introductory hero is mandatory on some page. Prototype continuity with the existing approved flame; final page placement and fusion remain unresolved, not the requirement to build it.
**Validation:** viewers should understand the first-night proposition earlier than in the current serial-question flow.

### 3.2 Má: a private-feeling ritual of one question at a time

`OBSERVED`: fullscreen organic/grained red, teal, and purple environments, serif display, plain sans controls.
Journey: intro → exploration → share-story entry → fullscreen introduction → Get started → four numbered steps.
Step 1 selected a recipient or custom recipient; step 2 collected a letter with a 1,000-character counter.
Step 3 allowed up to two emotion choices; step 4 requested name, location, pronoun, and email.
The capture used a generic recipient, harmless test text, and one emotion; back navigation to step 2 preserved text.
No identifying fields were filled and nothing was submitted. Final sending, validation, delivery, and success behavior are unobserved.
Evidence: `07-masa-entry.png`, `09-masa-form-start.png`, `10-masa-question-one.png`, `11-masa-question-two.png`, `12-masa-question-three.png`, `13-masa-final-step.png`.
Accessibility-tree observations included an unnamed close control, a Menu-labelled container, and placeholder-like field labels; these are not patterns to copy.

**Transfer:** focused pacing, progressive disclosure, a stable environmental identity, legible progress, and reversible steps.
**Do not transfer:** letter/recipient/emotion collection, pronouns, location, compulsory self-expression, or 3D tilt.
**Sophomores job:** a low-pressure invitation with only the information necessary for its confirmed purpose.
**Integration:** a directly addressable `/invitation` route; home links enter it without forcing a long scroll replay.
**Validation:** an optional expressive step must be skippable and must earn its place; a one-field notification flow must not become a five-step questionnaire merely for theatre.

### 3.3 Analogue pricing: manipulable scope and a theatrical aside

`OBSERVED`: saturated blue, five project presets, large quote/project-week figures, and Gantt-like scope blocks.
Identity-plus-landing settled at 22k; flagship ecommerce settled at 50k and 20 weeks.
An initial accessibility snapshot showed an intermediate 13 during number animation; intermediate frames are not settled product values.
These numbers belong to the reference business and must never enter Sophomores' model.
`OBSERVED`: an explicit explanatory trigger opened a roughly square, rounded archival video of Jobs; playback was audible and native controls were not visible.
Burned-in words were visible and the DOM reported zero text tracks; neither fact proves the complete absence of captions.
The settled parent used perspective; backdrop dismissal revealed a tilted/translated receding film over the visible page.
Evidence: `14-pricing-initial.png`, `16-pricing-video-open.png`, `17-pricing-video-exit.png`.
`18-pricing-video-entry-motion.png` is too early/blank to establish entry choreography and is not accepted motion evidence.
No complete transcript, verified quotation, provenance, precise angles, or source timing was established.

**Transfer:** ticket type/quantity/inclusion choices produce a clear price breakdown; the core video appears as an authored media object with Motion entry/exit.
**Do not transfer:** a B2B project estimate, project-weeks as the primary interaction, signature blue, fabricated prices/promises, control-free media, or assumed archive rights.
**Sophomores job:** understandable ticket value and purchase intent, with the film expressing conviction rather than defending unconfirmed pricing.
**Required adaptation:** build a ticket-commerce model, not a narrative selector, personality score, or itinerary substitute.
**Study boundary:** explicitly labelled development fixture data may demonstrate arithmetic and states; fixtures are not actual offers and cannot become public final tiers without approval.
**Release boundary:** actual prices, types, quantities, inclusions, fees, availability and terms must be confirmed before real tickets are offered.

### 3.4 Current Sophomores baseline

Evidence: `20-sophomores-current-hero.png`, `21-sophomores-hero-scroll.png`, `22-sophomores-bridge.png`.
Observed snapshot: luminous circular backdrop, stretched monospaced masthead, purple notification, then a large blurred serif question and story card.
The principal hypothesis is that serial questions delay the value proposition; this is a design hypothesis, not measured abandonment evidence.
Existing flame, typography, and active work remain available ingredients; the study must not freeze them as immutable screenshots.

## 4. Information architecture and feature inventory

Proposed home order: **experienced/not finished → permission to remain curious → what that becomes in a room → first-night practical truth → invitation**.
Home provides a complete readable path without requiring visitors to watch video or enable motion; this does not make those implementation requirements optional.
The Analogue introductory hero must lead some page; whether that is home or a separate launch/event page remains open.
The dedicated invitation is a preregistration surface, not a second manifesto. Ticket commerce is a separate required capability; final inline or dedicated-route placement remains open.


| ID      | Capability                                                        | Placement                                                   | Priority and gate                                                    |
| ------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| NAR-01  | Immediate club/first-night proposition                            | Opening viewport                                            | Required; draft copy review                                          |
| NAR-02  | Analogue-inspired intro hero and continuous light-to-frame bridge | Hero on a page; homepage undecided                          | Mandatory; final fusion/placement unresolved                         |
| NAR-03  | Concise permission-to-room narrative                              | Home middle                                                 | Required; no invented event details                                  |
| EVT-01  | Practical event/ticket truth                                      | Before primary invitation                                   | Required release gate; facts unresolved                              |
| INV-01  | Immersive route and step navigation                               | `/invitation`                                               | Required study; no live collection                                   |
| INV-02  | Validation, review, edit and recovery                             | Invitation                                                  | Required before production                                           |
| INV-03  | Durable notification registration                                 | Server boundary                                             | Blocked: purpose, policy and provider approval                       |
| TKT-01  | Ticket type/quantity/inclusion selection and totals               | Event/ticket surface; route undecided                       | Required; fixture-only until commercial facts confirmed              |
| TKT-02  | Authoritative quote and payment handoff                           | Server/checkout boundary                                    | Required for live commerce; provider/terms/price approval gate       |
| FILM-01 | Reusable actual video component with Motion spatial reveal        | Core feature near permission/first night; visitor-triggered | Required now; honest missing-media state and development fixture     |
| FILM-02 | Original tribute film                                             | FILM-01 media                                               | Required final content; sources, clearances, editorial approval gate |
| SYS-01  | Reduced motion and motion pause                                   | All surfaces                                                | Required                                                             |
| SYS-02  | Responsive/a11y/performance evidence                              | All surfaces                                                | Required before integration                                          |


## 5. Visual and interaction specification

### 5.1 Shared visual contract

Extend existing tokens and approved luminous/prismatic flame integration rather than creating a parallel brand system or imposing a green wash.
The study may scope its own composition variables, but changes to root tokens require integration-owner review; all new palette and hero aesthetic proposals remain provisional.
Preserve serif/monospaced contrast where it serves meaning; choose readable plain form text over display typography for inputs.
Use existing palette material as context, not a mandate to reproduce restored-template institutional motifs.
No prestige crests, invented founding dates, member portraits, venue photography, or testimonials as filler.
Focus indicators must remain visible against changing light; essential text needs a stable contrast surface.
Every direction must show the same content and critical states so comparisons test composition rather than differing promises.
Visual options are variants of this contract, not three unrelated industries or three new product concepts; rejected mocks do not invalidate the user's selected reference mechanics.
All DOM/UI animation, including totals, controls, step transitions, hero progress and video entry/exit, uses Motion and shared tokens; no competing animation clock.
New WebGL rendering uses R3F/Three; Motion may drive exposed scene parameters while R3F owns the rendering lifecycle. Preserve source shader equations in the isolated adaptation without editing the shared raw renderer. Native video remains browser media playback.

### 5.2 NAR-02 proposed scroll storyboard

Ranges below are **proposed normalized local chapter progress**, not measurements of Analogue.
Scroll remains native/reversible; no mandatory hold, wheel capture, autoplay scroll, or timed reading gate is introduced.


| Progress  | Story job    | Proposed treatment                                                                                 |
| --------- | ------------ | -------------------------------------------------------------------------------------------------- |
| 0.00–0.20 | Recognition  | Stable, readable club proposition over full-bleed light; immediate invitation link                 |
| 0.20–0.42 | Permission   | First statement yields to one concise supporting thought; no invisible essential copy              |
| 0.42–0.70 | Continuity   | Same light field becomes visually bounded within a pre-laid-out frame; surrounding surface appears |
| 0.70–0.86 | Concreteness | Frame settles; copy connects the sensibility to being together in a room                           |
| 0.86–1.00 | Handoff      | Ordinary document flow takes over; first-night facts/action are readable without another puzzle    |


Do not animate CSS width, height, margin, or document geometry; use transform/opacity on isolated layers.
Prototype the bounded-frame effect with explicit transforms and masking by static containers; do not scale readable text with the frame.
Reverse must derive from the same progress mapping, not trigger independent entry/exit timers.
On narrow/short screens, reduce travel and preserve readable text; a shorter static bridge is acceptable.
Reduced-motion and global-pause modes render all statements in ordinary order without transforms or hidden content.
Avoid a large blurred text phase that conceals the only statement of the product.

### 5.3 INV-01 proposed steps under the notification assumption

1. **Context:** explain exactly which notification is offered and that it is not a ticket or reservation.
2. **Contact:** one visible labelled email field; name is omitted unless its necessity is established.
3. **Review:** show the address, purpose and applicable privacy notice; allow Edit and explicit final action.
4. **Result:** display a truthful local-preview or server-acknowledged state; never conflate the two.

Context can share the contact screen if testing finds a separate introduction burdensome.
Do not add pronouns, location, employment, biography, or emotional disclosure merely because the reference collects them.
No automatic advance on choice or input; Continue is explicit and keyboard-operable.
Back preserves in-memory entries; refresh clears prototype entries and explains this behavior.
Close/leave while dirty offers a clear keep-editing/discard choice without a trap; no PII persists by default.
Use 100dvh with natural overflow, safe-area padding and reachable controls when a mobile keyboard opens.
Progress announces step names, not only numbers; optional steps do not imply an incomplete application.

### 5.4 TKT-01 ticket-commerce interaction

The primary interaction is ticket selection: confirmed ticket type, quantity, and permitted inclusions/add-ons, producing a legible monetary breakdown.
Do not invent final tier names, prices, discounts, included drinks, access rights, scarcity, reservation promises, or admission guarantees.
Until facts exist, use clearly labelled local development fixtures, visibly marked “Demo data — not an actual offer”; do not wire them to checkout.
The fixture catalogue is an injected test source distinct from a production catalogue; production fails closed if approved catalogue data is absent.
Represent money in integer minor units with explicit currency and catalogue version; totals derive from data, never animation frames.
Validate integer quantity against confirmed per-order limits and inventory; invalid/zero/oversized quantities cannot proceed to purchase.
Show subtotal, applicable fees/taxes, inclusions and final payable amount according to confirmed commercial rules; never conceal an unknown fee as zero.
Announce settled totals once via a polite region; animate display with Motion, stable regions and tabular numerals without delaying input.
Changed choices invalidate a prior quote. Sold-out, price-changed, expired-quote and unavailable-catalogue states preserve choices where valid and explain the next action.
Do not make a project timeline or blue background the feature's identity. The invitation form remains distinct from a purchase contract.

### 5.5 FILM-01 proposed entry/exit storyboard

The video feature is mandatory and accessible from a plainly labelled play action; watching is optional and must not be a checkout/preregistration gate.
Build a reusable component around an actual HTML video element, with source/poster/caption/transcript configuration and Motion enter/exit; text is not a substitute implementation.
Missing approved media produces an honest empty production state, without a fake Play promise; an owned/licensed local development fixture can verify real playback and controls.
Proposed entry: overlay opacity and isolated panel transform converge over the shared slow token (currently 0.6s).
Proposed spatial envelope: perspective 1200px, at most 8 degrees rotation and 24px translation, ending flat; tune through actual media/browser evaluation.
Proposed exit: shorter, approximately normal token (currently 0.35s), receding toward the trigger's visual area.
These values are original starting parameters, not reverse-engineered reference timing or angles.
The form has no such perspective/tilt; film-object motion is separately scoped.
Reduced motion uses opacity only, at most 0.2s; global pause also removes spatial motion.
Use native or equivalently accessible play/pause, mute/volume, seek, captions and fullscreen controls.
Media loads only on explicit open; audible playback requires a clear user gesture and resilient rejected-play handling.
Closing pauses media immediately; reopening must have a defined resume/restart choice, not accidental audio.

## 6. State machines and invariants

### 6.1 Invitation state machine

`context → contact → review → submitting → accepted | pending_confirmation | retryable_error | rejected`.
Study adapter instead transitions `review → preview_complete`; it must never enter production accepted states.
`contact.invalid → contact` with inline error and focus; `review.edit → contact` preserves the current address.
`submitting` accepts one in-flight attempt; repeated activation cannot create additional requests.
`retryable_error.retry → submitting` reuses the same intent/idempotency key while the payload is unchanged.
Changing payload creates a new intent/key; using one key with different payload must be rejected server-side.
`accepted` means durable registration acceptance, not sent email, confirmed attendance, or purchased ticket.
`pending_confirmation` exists only if a confirmed double-opt-in policy requires it.
Dirty leave: `editing → leave_prompt → editing | discarded`; Escape closes the prompt before leaving the flow.

### 6.2 Film state machine

`closed → opening → loading → ready → playing | paused | failed → closing → closed`; absent approved source enters `media_unavailable`, not fictitious playback.
Close remains available during opening/loading/error; rapid open/close retargets or cancels prior animation.
On close: pause playback, release modal/scroll state after exit, restore focus to a surviving trigger.
On hidden document: pause playback and decorative rendering; never resume audible playback unexpectedly.
Only one modal may own focus/scroll lock; film and invitation overlays cannot nest arbitrarily.

### 6.3 Ticket state machine

`catalogue_loading → selecting | catalogue_unavailable`; study fixtures use an explicit `demo` mode that cannot enter checkout.
`selecting → quoting → quote_ready | sold_out | price_changed | retryable_error`; changed choices invalidate quote readiness.
`quote_ready → checkout_pending → payment_pending → paid | failed | cancelled | expired`, with reconciliation for indeterminate outcomes.
Only verified server/provider evidence may enter `paid`; a return URL, animated total, local fixture or preregistration receipt cannot prove payment.
Quote and payment creation are separately idempotent; duplicate/reordered provider notifications must not duplicate charges, inventory consumption or tickets.

### 6.4 Cross-cutting invariants

- There is one truthful primary action and no implicit purchase or membership commitment.
- User input never appears in query strings, telemetry, console logs, screenshots committed as fixtures, or localStorage.
- A failed provider request cannot be presented as a sent email.
- Choice animations do not change underlying business data or validation rules.
- All UI animation runs through Motion; no GSAP or bespoke timing engine is introduced.
- New study WebGL runs through R3F/Three; shared raw FlameBackdrop remains untouched and native video does not become a scene clock.
- Ticket arithmetic is deterministic, currency-aware and server-authoritative in production; demo values never become actual offers implicitly.
- Reduced-motion and static modes preserve the same information and available actions.
- Existing story autoplay pauses whenever an integrated modal owns attention.

## 7. Production interface contract — blocked until decisions

This is a proposed future boundary, not permission to create a database, connect credentials, send email, or take payment.
Resolve notification purpose, controller, retention, lawful basis/consent wording, provider, and double-opt-in policy first.

### 7.1 Request/response proposal

`POST /api/launch-notifications` accepts JSON with `email`, `purposeVersion`, and applicable `consentVersion`; optional marketing consent is separate and defaults false.
Use an `Idempotency-Key` header scoped to this operation; proposed key replay window is 24 hours, subject to operator approval.
Validate content type, bounded body size, maximum field lengths, schema version, email syntax and expected origin server-side.
Trim surrounding email whitespace and normalize the domain; do not blindly remove dots/tags or silently reinterpret addresses.
Client-side validation improves feedback but is never authoritative.
Success response exposes only a request identifier and truthful accepted/pending state; no account/membership existence detail.
Duplicates return the same neutral acknowledgement shape without revealing registration history.
`400/422`: actionable field/schema problem; `409`: same idempotency key with different payload; `429`: bounded retry advice.
`503`: unable to accept durably; client retains input in memory and offers explicit retry.
Network timeout is indeterminate, not rejection; retry the same key before claiming a new request was created.

### 7.2 Persistence and delivery proposal

Minimum record: internal ID, event/list purpose ID, protected email, purpose/notice versions, creation time, status and consent evidence when applicable.
Separate optional marketing permission from the requested launch notification; neither implies attendance or membership.
Proposed lifecycle: `pending_confirmation → active → unsubscribed | expired`, with confirmation omitted only under approved policy.
Define uniqueness per normalized address and purpose; do not use raw email or an unsalted public hash as an observable identifier.
Atomically persist the registration, idempotency record and delivery outbox before acknowledging durable acceptance.
Delivery worker retries transient provider failures with bounded backoff; dead letters require operator visibility.
Provider receipt and registration acceptance are distinct states; no frontend claim of delivery without corresponding evidence.
Unsubscribe/confirmation links use expiring, purpose-bound unpredictable tokens with single-use semantics where appropriate.
Encryption/access controls, retention deletion, export/deletion handling, audit access and provider processing terms are release requirements.

### 7.3 Security and observability

Require HTTPS in production, same-origin/origin validation, non-permissive CORS, and CSRF protection appropriate to the chosen cookie/action architecture.
Add rate limits at ingress and operation level; idempotency is not abuse prevention.
Do not select a CAPTCHA/tracking provider without privacy, cost and accessibility review.
Log request IDs, coarse outcome categories, latency and retry counts; never email, free text, tokens, or full bodies.
Optional analytics may count invitation starts, step exits and accepted outcomes only after approved privacy policy; no identity joins by default.
Provide operator procedures for outages, queue backlog, deletion requests and accidental activation; secrets remain server-only.

### 7.4 Ticket quote/payment contract — separately blocked

Local implementation status (2026-11-01): `../../src/lib` provides a
local/test-only quote service using an injected server-owned catalogue and
canonical membership eligibility. It reserves nothing and returns
`checkoutAvailable: false`. No public quote/checkout route, commercial catalogue,
order creation, payment, or ticket issuance is activated. The endpoint contracts
below remain proposals, not claims of implemented APIs. See the
[local auth and quote runbook](../deployment/member-auth.local.md).

Proposed catalogue includes approved version, currency, ticket-type IDs, unit amounts, inclusion IDs, quantity limits, sale window and availability policy; all commercial content requires owner confirmation.
`POST /api/ticket-quotes` accepts catalogue version and selected IDs/quantities, never a client-trusted total; server revalidates price, eligibility rules if any, fees and availability.
Return a quote ID, authoritative line items/total, expiry and explicit reservation semantics; do not imply inventory is held unless an actual hold exists.
`POST /api/ticket-checkouts` accepts a valid quote and idempotency key; selected provider and production activation require separate approval.
Revalidate before checkout; stale catalogue, expired quote or unavailable inventory requires an explicit updated offer, not silent charging at a new price.
Use provider-hosted/tokenized payment; never collect or log card credentials in the study. Verify signed provider events and reconcile indeterminate outcomes server-side.
Before marking paid or issuing tickets, match provider merchant/account, internal order, currency, exact payable amount and final captured/succeeded status; authorization alone is insufficient. Reject mismatched events, deduplicate event IDs and make replay/out-of-order processing monotonic and idempotent.
Reserve/consume inventory atomically against approved capacity; concurrent quotes/checkouts must never oversell. Define hold lifetime and quote-versus-hold semantics before activation.
If payment succeeds after a hold expires, reconcile against current capacity before issuance; do not blindly issue or silently drop the payment. Enter an operator-visible paid/unallocated state and execute the approved reacquisition/refund compensation policy. That policy is a release blocker, not an invented promise.
Order, inventory/hold, payment and ticket-issuance records require a defined transaction/recovery policy; payment confirmation and ticket issuance are separate states.
Refund/cancellation, fees/taxes, currency, inventory expiry, accessibility/admission terms and operator support are blocking commercial decisions, not defaults to invent.

## 8. Accessibility, responsive and performance acceptance

 

- Production field targets: p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; local lab results are not field proof.
- Initial film transfer: zero media bytes until explicit open; responsive poster allowed only with a defined budget.
- New invitation client-JS increment: aim ≤60KB gzip excluding already-shared framework packages; review measured bundle impact.
- New image/poster assets: avoid eager full-resolution media on mobile.
- No recurring decorative work in hidden tabs; offscreen flame should use existing activity controls.
- Investigate interaction long tasks above 50ms and sustained animation frame misses; record device/viewport and traces.
- Disable optional spatial effects on constrained devices before sacrificing input responsiveness.
- No new animation, state, form, or 3D dependency unless existing packages demonstrably cannot meet the requirement.

## 9. Implementation plan and concurrent-work safety

### Phase A — confirmed capabilities and unresolved placement

Record that generated alternatives are unapproved and the first attached draft was rejected. Do not generate more alternatives in this turn without a new request.
Carry forward all four required adaptations: introductory hero on a page, immersive form without tilt, ticket commerce, and real video with Motion reveal.
Resolve final hero fusion/page placement separately; do not use unresolved homepage placement to omit the mandatory hero from the study.
Preserve this evidence set; do not overwrite source screenshots with later captures or imply they are licensed assets.
Complexity: medium; dependencies: reference evidence and minimal product intent; risk: incompatible commercial assumptions.

### Phase B — additive local reference-integration study (continues now)

Proposed ownership: `../../src/app`, `../../src/components`, `../../src/lib`, route-scoped styles, and `tests/invitation-study-*`. Confirm the actual names with implementation owners; this document does not grant ownership of their files.
Implement the required introductory hero in the isolated study without replacing home; build the immersive form, ticket model with labelled demo fixtures, and reusable actual video component with a testable media fixture/missing-asset state.
Do not modify home, root layout/styles, current hero/story/choreography/flame files, dependency manifests, secrets, or other sessions' output.
Write RED tests for form transitions, truthful preview, ticket arithmetic/mode isolation and actual media lifecycle; implement GREEN before visual polish.
Use Motion for all UI animation, current shared tokens, TanStack Form/Zod where justified, and accessible existing primitives after checking their APIs; no GSAP or bespoke animation engine.
Use the parent-owned isolated R3F `StudyLight` adaptation when current light is mounted in the study; retain shader equations and existing visibility/pause safeguards without editing the shared raw renderer.
Read installed Next guides required by `AGENTS.md`, and current Context7 docs for library-specific implementation.
Do not run production build against another session's active `.next`; agree a process/output boundary before starting a server/build.
Complexity: medium/high; dependencies: confirmed reference-specific scope, not approval of rejected mocks; risk: global CSS leakage, fake offers and incidental collection.

### Phase C — independent evaluation and bounded repair

Separate evaluator exercises the actual study; generator addresses findings. Maximum three initial repair cycles, then surface a plateau.
Require source review for React/TypeScript/security-relevant changes and browser verification after fixes.
No evaluator should mark its own untested repair as evidence; distinguish screenshot, interaction, source and production claims.
Complexity: medium; dependencies: Phase B; risk: attractive but unusable motion or untested mobile keyboard behavior.

### Phase D — coordinated integration, then separately approved activation

Re-read current files immediately before a narrowly owned integration change; concurrent visuals may have changed.
Coordinate edits to `../../src/components`, `../../src/lib`, chapter tests and global styles only after study acceptance.
Fix the inherited `.teaser main` pointer-events restriction for the actual form surface; do not disable pointer events globally.
Current no-form/count tests must change deliberately with product behavior, not be deleted simply to make tests pass.
Decide the hero's final page and fusion, and the ticket surface's final route, before shared-site integration; the required capabilities themselves are already committed.
Keep collection and checkout disabled until their production gates below are met; publishing remains separately approved.
Complexity: high for production registration/commerce, medium for page integration; dependencies: Phase C and approved purpose, catalogue, payment and policy facts.

###  10. Test matrix and evaluation gate


| Layer       | Required evidence                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | Immutable transitions, email/schema bounds, back/edit retention, preview/production distinction, ticket minor-unit arithmetic/quantity bounds, idempotency intent rules                                                                                                                                                              |
| Component   | Labels, progress/error announcements, submit lock, dialog lifecycle, reduced motion, real video playback/controls/failure/close, catalogue-unavailable and demo-mode boundaries                                                                                                                                                      |
| Integration | Future durable write/outbox transaction, duplicates, rate limits, origin rejection, provider retry; payment merchant/order/currency/amount/status mismatch, duplicate/out-of-order events, atomic final-ticket competition, expired holds and issuance recovery                                                                      |
| E2E study   | Direct entry, mandatory introductory hero, complete preview, invalid input, back/edit, refresh, dirty leave, ticket demo selection/totals, keyboard, actual fixture video open/play/pause/close/rapid toggle                                                                                                                         |
| E2E release | Approved sandbox only: registration recovery; ticket price changes, concurrent final-ticket purchases, expired holds/late payment, indeterminate payment, cancellation, paid-but-issuance-failed recovery and duplicate/out-of-order provider events; no real charges, user submissions or external emails without separate approval |
| Visual      | Selected source comparison at desktop/tablet/mobile/short-height; reverse bridge; frame/text continuity; no clipping                                                                                                                                                                                                                 |
| Performance | Bundle delta, network waterfall, LCP/CLS/interaction trace, hidden/offscreen pause behavior                                                                                                                                                                                                                                          |


Coverage target: ≥80% lines/functions/branches for new logic with meaningful failure cases; explicitly scope measurement.
Existing `test:coverage` includes only `../../src/lib`; a green result does not cover the proposed new library or browser experience.
Source-render tests do not prove keyboard usability, focus restoration, fluid motion, playback behavior or visual fidelity.

Evaluator rubric: narrative/product fit 25%, coherence/originality 25%, craft/motion 20%, functional/a11y quality 30%.
Target weighted score ≥8/10, no dimension below 7, and no unresolved critical/high functional, privacy or accessibility defect.
Hard failures override score: omitted mandatory hero/ticket/video feature, text-only substitute for video, fake offers/payment success, misleading registration success, inaccessible controls, blocked scrolling, non-Motion UI animation, data leakage, or unlicensed release assets.
Formative user checks: can a viewer state what Sophomores is, what the first offer is, and what the CTA does without watching the film?
Record answers and friction, not just an evaluator's aesthetic preference; do not invent conversion uplift from a local study.

## 11. Film editorial and asset-rights gate

Proposed film arc: the risk of looking foolish → choosing to try → an invitation to share that openness in a room.
Avoid a generic genius montage, celebrity endorsement implication, or a claim that attending makes someone a visionary.
Use original writing/recordings or cleared material; attribution alone does not establish permission.
Maintain a ledger: asset/quotation, creator, original context, source, exact excerpt, license/permission, territory/term, modifications and approval.
Verify every quotation against its original source; do not fabricate a Jobs quote from the reference's premise.
Confirm music, footage, likeness, font, and subtitle/translation rights as separate applicable concerns.
Reference site video, fonts, images and implementation assets must not be downloaded or transplanted into the release.
Until clearance exists, production shows an honest missing-approved-media state; the reusable actual video component still ships as code and is tested with an owned/licensed local fixture. A text pane/storyboard is not the final video substitute.

## 12. Open decisions and release checklist

Blocking product facts: registration meaning; event date/time/timezone; ticket opening; venue disclosure; age/access restrictions; capacity/admission policy; actual ticket types/prices/currency/inclusions/fees/quantity limits/refund terms.
Blocking data facts: necessary fields; controller/contact; privacy notice; retention; marketing separation; confirmation and unsubscribe policy.
Blocking production facts: registration/payment provider and storage choice/authorization; inventory/payment recovery; ownership of operations; final film/material clearances; publication approval.
Design decisions: mandatory hero's final page and fusion; ticket surface placement; calibrated film motion; which current chapters remain meaningful. None makes hero, ticket commerce or real video optional.

- [ ] Analogue-inspired introductory hero is built on some page; homepage placement/fusion resolved before shared-home integration, without treating rejected mocks as approval.
- [ ] Required hero/form/ticket/video study status is reported accurately; missing approvals are distinguished from missing implementation.
- [ ] Ticket-commerce adaptation uses confirmed commercial facts or unmistakable non-offer demo fixtures; no narrative-selector substitute, invented final tiers, signature-blue assumption or timeline-first model.
- [ ] Reusable actual video component and Motion entry/exit are tested with media; missing production media is honest, not replaced by a text pane.
- [ ] All UI animation uses Motion, with no GSAP/bespoke engine or competing animation timeline.
- [ ] New WebGL study rendering uses R3F/Three; isolated source-light adaptation preserves equations and leaves the shared raw renderer untouched.
- [ ] Home proposition and CTA meaning understood in formative checks.
- [ ] No reference-industry assumptions or invented event facts in public copy.
- [ ] Dedicated invitation works directly and does not depend on long home choreography.
- [ ] All required states, keyboard/touch behavior and reduced-motion equivalents verified.
- [ ] Independent evaluation clears the rubric and hard-failure gates.
- [ ] Existing homepage/concurrent work preserved; integration ownership and rollback recorded.
- [ ] Live collection contract, privacy, durable acceptance and operator recovery approved/tested before activation.
- [ ] Ticket catalogue/terms and sandbox payment evidence pass; atomic capacity, verified amount/order/status, late-payment compensation, issuance recovery and checkout rollback are approved/tested before live payment activation.
- [ ] Film, fonts and images cleared or replaced; metadata/publishing changed only with approval.

Handoff: continue the isolated study implementing all four required adaptations: introductory hero, immersive form, ticket commerce and reusable actual video with Motion entry/exit. Preserve concurrent home work and source light behavior; use truthful no-network form states and clearly labelled non-offer ticket/media fixtures. Final hero fusion/placement, live registration/payment and release require their explicit product, policy, asset and operational decisions.

## 13. Implemented local studies and validation snapshot

Update: 2026-10-03, Asia/Seoul. Implementation paths below were inspected locally; browser and test results in this section were reported by the parent/orchestrator, not rerun by this document's author.
This section records an implementation checkpoint, not acceptance of the visual direction, commercial offer, final film, or production integration.

### 13.1 Available surfaces

**Current ticket-route correction — 2026-11-02, Asia/Seoul:** the table below is a historical study snapshot. Current source has no `/studies/*` pages, and `../../src/components` is unrouted legacy study code. The active ticket entry is now `/tickets`, owned by `../../src/app` and `../../src/components`; it is a non-indexed selection preview, not a ticket sale. Its default has no approved catalogue or price. Explicitly injected test catalogues/quote adapters are for local fixtures only; checkout remains disabled and no reservation is created.

Selection continuity is owned by `../../src/lib` and `../../src/components`; return navigation is an explicit fixed `/tickets` link while provider callbacks remain `/account/continue`. This source correction is not release acceptance. Storage, commercial and fixture boundaries are in [the local authentication runbook](../deployment/member-auth.local.md).


| Surface               | Implemented local scope                                                                                                          | Remaining boundary                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/studies`            | Index linking the opening, ticket, and invitation/film studies                                                                   | Not a replacement homepage                                                                  |
| `/studies/intro`      | Mandatory introductory hero study; reference/current-light R3F comparator; native scrolling into the first section               | Final page placement and visual fusion unresolved                                           |
| `/studies/invitation` | Notification-assumption preview form with no submission/persistence; reusable actual reference-video dialog                      | Registration meaning and production policy unresolved; reference clip not a Sophomores film |
| `/studies/tickets`    | Quantity interaction with unknown actual price, explicitly labelled sample values, and the reusable film dialog opening in place | No checkout, confirmed price, capacity or offer; reference film is not our authored film    |


Historical source boundaries at that checkpoint: `../../src/app`, `../../src/components`, `../../src/components`, `../../src/components`, and their corresponding `../../src/lib` study modules. These paths are not the current ticket-flow ownership map above.
`../../src/components` is the isolated R3F source-light adaptation; the currently shown light reuses snapshot artwork/equations. It is not newly approved artwork or a newly approved palette.
DOM motion/transitions remain Motion-owned; study WebGL is R3F/Three-owned; no GSAP or bespoke animation engine is permitted. Native video playback is not a scene controller.
`../../src/lib` identifies the public reference clip and labels it local comparison only, not cleared for a Sophomores release.
“No-network form” means no form submission or personal-data transfer; opening the externally hosted reference video still fetches media. Do not claim the entire study is offline or makes zero network requests.
The player is actual media, not a text-pane replacement. Its presence does not complete FILM-02's original production-film and asset-clearance requirements.
Ticket sample data remains a development demonstration, never an actual price, purchasable offer, final tier, inclusion promise or reservation.

### 13.2 Browser evidence reported by the orchestrator

Browser viewports exercised: desktop 1440×900, mobile-sized 390×664, and tablet-sized 768×1024.
These are browser viewport checks, not physical-phone/tablet or exhaustive cross-browser certification.

- Form: required-field errors and focus, skip/back value retention, consent behavior, and honest clear/completion states exercised.
- Actual reference video: readiness reached `readyState = 4`, playback was exercised, and three opens were tested.
- Dialog: Escape dismissal, focus restoration and scroll locking exercised; deliberately blocked media URL produced failure and retry behavior.
- Runtime: live reduced-motion changes and R3F readiness checked.
- Browser-found repair: primary-button text contrast was corrected after white text became unreadable.
- Browser-found repair: overlapping intro statements were corrected by using function-form Motion transforms to avoid the observed native-acceleration behavior.

Final viewport evidence: `35-local-tickets-desktop.png`, `36-local-intro-sophomores.png`, and `37-local-sophomores-bridge.png`. The last two show the existing-light R3F comparator rather than the reference footage. Keyboard wrapping was retested in the optimized build in both directions; Tab from the return action reached Close and Shift+Tab from Close reached the return action. Temporary viewport, media-preference and blocked-URL overrides were cleared before handoff.

These checks establish the reported paths only. They do not prove final production media accessibility/rights, payment, registration delivery, field performance, or physical-device behavior.
Ticket-page embedding was separately opened in the optimized local build: the modal title, visible player, close action and restored trigger were checked in that context. Keyboard-edge wrapping was added after the native dialog allowed focus to leave for browser chrome.
The static visual review also identified the reference light's bright core behind the proposition. Its black scrim was strengthened from 0.23 to 0.5 opacity; this is a stable contrast treatment, not a claim of full WCAG certification or measured field contrast across every moving frame.

### 13.3 Automated verification status

- Scoped study suite: **33 tests passed**.
- Measured study-library coverage: **99.5% lines, 95.62% branches, 100% functions**; not whole-app/component/WebGL coverage.
- Final isolated-snapshot full suite: **64 tests passed**, zero failures.
- Final nonincremental TypeScript check, scoped ESLint, and optimized Next/Turbopack build: **passed**. All four study routes were prerendered successfully.
- Production registration/payment, provider delivery, deployment, field metrics and physical-device checks: **not performed/claimed**.

### 13.4 Preview checkpoint and remaining acceptance

The reported standalone preview snapshot is at `/var/folders/rl/33kyl2tn74vcr_r3j0_0hl5r0000gn/T/sophomores-reference-study-a6625e63`, on port **3220**.
The temporary path is a local preview checkpoint, not a durable deployment artifact, production host, or proof that the latest shared-source change is already reflected there.
The original served snapshot included the ticket-film integration, synchronized intro opacity mapping, button-contrast repair, live reduced-motion subscriptions, and keyboard-edge wrapping. The latest pacing revision now runs via a dedicated development server in that same isolated snapshot, not another session's dev server. Do not use the older standalone output for the latest pacing.
Restart only this snapshot, after checking that port 3220 is free: change directory to the snapshot above, then run `rtk proxy ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3220`. The live preview is loopback-only at `http://127.0.0.1:3220/studies/invitation`.
Shared source remains in `<home>/Projects/soph-co`; the preview is deliberately a frozen snapshot and will not track other sessions' subsequent visual changes. No shared homepage, renderer, package manifest, lockfile or application configuration was edited for this study.
Do not stop or rebuild another session's process/output directory; only the owning agent may update its preview process and record the resulting revision.
Remaining product gates: hero fusion/page placement, preregistration purpose, actual ticket catalogue/terms, original film and asset rights, privacy/service/payment approvals, then coordinated homepage integration if chosen.
The source-backed specification and local studies continue; no production publishing, personal-data submission, real payment, or shared-homepage replacement is implied by this checkpoint.

## 14. Invitation pacing revision after user review

The current intro and ticket executions were rejected; neither was redesigned or integrated in this revision. Only invitation step changes were revised.

- Dedicated step timings: 0.38s departure, 0.08s breath, 0.70s arrival, gradual ease-in-out, 8px travel. No change to the film, shader or global motion tokens.
- Progress travels with its corresponding question instead of changing before the outgoing question leaves.
- The stage is inert during transitions; synchronous guards prevent repeated clicks and stale submit/skip/edit events. The external Back to study action stays available.
- Focus moves to the incoming heading only after arrival and removal of inert. Review values clear after departure rather than visibly disappearing during its fade.
- Reduced motion keeps short 0.12s fades without displacement or extra delay; switching preference during an active transition was browser-tested without leaving the form locked.
- Scoped tests, TypeScript, ESLint and independent code review passed. Browser checks covered measured click-to-ready around 1.25s (including automation overhead), forward/back steps, retained email, double-click protection and focus after arrival.
- The current shared-source full test suite also passed (93 tests); other sessions have added tests since the earlier snapshot. This is not a new optimized-build result.
- The prior optimized-build acceptance in §13 describes the baseline, not this revision. The isolated dependency copy required repair before previewing this revision; the cause of missing files was not established. No shared dependency or application configuration was changed.