# Korean copy calibration — content-first revision

Working study · 2026-11-10 · Not approved or published copy

## Current checkpoint

Research and the first six-sample review are complete. Owner feedback now
supersedes the earlier AI assessments. S5 and recovery-system decisions remain
in separate chats. A later owner-accepted recovery sentence is recorded below;
the rejected receipt draft is not its foundation. The expired-code pair was also
accepted as good enough for calibration. Neither scope approves runtime use.
The existing references remain useful, but do not establish our Korean voice.

Neither runtime catalogue, the voice guide nor the About drafts is changed by
this study. English remains the default, but information and controls pertinent
to the reader's current task take priority for Korean delivery. The Korean
fallback breakpoint remains untouched. No publication, commit or deployment is implied.

## The correction: content before delivery

The owner sees improvement, but identifies two separate remaining problems:

1. **Define the content first.** Establish exactly what must be conveyed, prune
   unnecessary information, and leave a clear, coherent meaning. Ambiguity here
   creates fluff. Polishing an ambiguous message does not resolve it.
2. **Then choose the delivery.** The same necessary information may work as one
   sentence, several shorter sentences or a concise expression. Compression
   carries risk and is not the default cure for wordiness.
3. **Assess naturalness separately.** Concise writing can still sound rigid;
   conversational writing can still contain fluff. Neither a polite ending nor
   a shorter sentence is sufficient evidence of natural Korean.

A second sentence needs information worth delivering, not a voice adjective to
justify it. This is not a universal sentence limit, ban on wit or instruction to
compress every explanation.

## Small sample — owner references and unresolved content

These are calibration references, not runtime translations. Keep the owner's
wording rather than having another AI silently polish it.

| ID | Necessary content | Owner reference / current disposition |
|---|---|---|
| S1 | Entered code does not match; check the email. | 입력한 코드가 맞지 않아요. 메일을 다시 확인해 주세요. |
| S2 | Recovery response could not be confirmed; settle what must be explicit about receipt and retry in this form's context. | **Tentative:** 응답을 확인할 수 없어요. 다시 시도해 주세요. The owner explicitly remained unsure; this is not an approved final line. |
| S3 | Address search is unavailable; enter the delivery address manually. | 주소 검색을 사용할 수 없어요. 배송지를 직접 입력해 주세요. |
| S4 | Name editing is unavailable in the relevant flow; contact is the recourse if needed. | 이름 수정은 불가능해요. 필요하면 문의해 주세요. |
| S5 | State the unconfirmed payment outcome AND explicitly tell the reader how to address it using the translated checking control. | **No approved Korean replacement.** Complete both informational jobs; a visible button does not substitute for the next-step instruction. |
| S6 | Ask how the recipient has been. No second message is necessary. | 그동안 어떻게 지내셨나요? |

For S4 the owner also offered 이름은 바꿀 수 없어요 as an alternative
construction. Preserve the first complete example as the reference; the spoken
restart of the contact instruction is not a new finished sentence.
For S6 both added long-conversation lines are removed. Do not convert the
owner's chosen ending into a rule for every question.

## Content to settle before the next wording pass

### S5: a particular payment, not an unspecified status

The active shop flow is `CommerceCheckout` → `CommercePayment`.
For this pilot, use one specific situation:

- The payment window has returned. The app has not obtained usable server
  confirmation for **that payment**. It cannot claim failure or no charge.
- Its identifiers are retained. **Check payment** asks the server to verify the
  same payment and, if appropriate, complete the existing order. It does not
  open a new payment window.
- The reader needs to know that completion is unconfirmed and which existing
  action to use before attempting another charge. Whether every part needs
  stating in the message depends on the actual screen and adjacent control.

Source: `src/components/commerce/payment.tsx:96–121,135–137,201,225–227`.
This is not shipment tracking, a bank-app instruction or an invented payment
history screen. The first round's retained-ticket references did not bind S5 to
a precise active commerce state; that grounding was insufficient.
Do not apply this specific brief to every generic payment error. No replacement
Korean was proposed at that checkpoint. Source inspection is not fresh payment/UI acceptance.

### S2: settle the form's informational need

The recovery form's timeout branch has not obtained a validated receipt; a retry
is available. It does not establish either rejection or successful intake.
Source: `src/components/Authentication/member-auth/account-recovery-view.tsx:95–128`.

Decide what the user needs to know in that form's context, including whether
receipt uncertainty must be explicit in this message. Then compare deliveries.
The owner's tentative example does not settle that question or make recovery
retry language suitable for payments.

## Reference cases

Evidence: the quoted fragments below appear in the named first-party page's
text. These are documented examples, contrasts and editorial passages—not fresh
observations of the brands' live apps. Published dates are given where the page
provides one. The analysis is ours, not a claim of demonstrated conversion gains.

| # | Source/context | Brief original example | What is useful; limit on transfer |
|---|---|---|---|
| 1 | [Toss Place: UX writing](https://docs.tossplace.com/guide/front-integration/plugin/design/ux-writing.html), completion contrast | 결제가 완료되었습니다 → 결제했어요 | The change is a verb construction, not just an ending. Use completion language only after completion is authoritatively known; it cannot describe an uncertain payment. |
| 2 | Same official guide, dense administrative wording | 회원 정보 확인 필요 → 회원 정보를 확인해주세요 | A noun pile becomes an understandable action. This is a construction reference, not permission to translate every functional label. |
| 3 | Same official guide, input error | 잘못 입력하셨어요 → 번호를 다시 입력해주세요 | Moves attention from blaming the person to a usable correction. Do not imitate the instruction if the actual fault is server-side or unknown. |
| 4 | Same official guide, unnecessary deference | 쿠폰을 가지고 계신가요? → 쿠폰이 있나요? | Removes honorific machinery without becoming rude or adopting 반말. We still need to choose register by relationship and context. |
| 5 | Same official guide, action clarity | 확인 → 주문하기 | The control identifies its consequence. Sophomores' functional control labels remain English by default; this is semantic evidence, not a label-translation task. |
| 6 | [Samsung: Designing Words](https://design.samsung.com/kr/contents/ux-writing/), 2022-11-29, failure explanation | 할 수 없습니다 | The article argues that stating inability is not the problem; withholding a useful explanation or remedy is. A useful counterweight to mechanically positive wording. |
| 7 | Same Samsung article, relationship | User-Friendly는 ‘사용자와 친해지는 것’을 의미하지 않는다. | Usability is not a licence to act like an old friend. Warmth can come from accuracy and consideration. Do not turn this into a ban on personality. |
| 8 | Same Samsung article, empty feature promotion | 스마트한 라이프를 위한 유용한 기능 | The article rejects this example as applicable to almost anything. Removing boilerplate helps more than decorating it with friendlier Korean. |
| 9 | [Toss: eight writing principles](https://toss.tech/article/8-writing-principles-of-toss), 2022-11-15, misleading next step | 다른 곳에서 후불결제 하기 | The article explains that the next screen was actually a brand-request survey. A plausible eventual benefit is not an honest description of the immediate action. This is a documented counterexample. |
| 10 | [Zigzag campaign account](https://partnerlounge.kakaostyle.com/story/1105), June 2021, speaker-specific campaign | 니 맘대로 사세요 | The living/buying ambiguity and mixed register fit a particular performer and campaign. Useful evidence of language-specific invention—not a register or pun to transplant into Sophomores UI. |
| 11 | Same Zigzag account, historical app-update notice | 어우 증말 고쳐도 고쳐도 자꾸 째깐한 버그가 생긴댄다 | Personality has something concrete to work with: recurring bugs and the maker's involvement. Its celebrity impression, dialect and overt performance are much louder than our target. Do not use it in consequential failure states. |
| 12 | [Daangn: online cafe team account](https://careers.daangn.com/blog/post/behind-cafe-team-relay/), 2026-07-14, product retrospective | 카페에 들어오고 싶은 사람들을 저희가 만든 절차가 붙잡고 있었던 셈이었어요. | The maker names its own contribution to a real problem. That admission carries more character than an invented user feeling. It is editorial prose, not an error-message template. |
| 13 | Same Daangn account, opening misunderstanding | 당근이 커피도 파나요? | A real ambiguity supplies the lightness; the article then explains the product. We do not need to invent a joke after the explanation. Do not make operational instructions ambiguous to manufacture wit. |

Method reference, not an additional case:
[Toss's first-UX-writer interview](https://toss.tech/article/1st_uxwriter),
2023-04-14, describes moving from abstract external voice frameworks to collecting
actual internal examples. That supports this small-case workflow; it does not
make Toss's voice our specification.

## What the earlier review missed

Two independent AI reviewers considered the earlier notices credible practical
Korean and the invitation suitable for owner review. Those judgments did not
establish that the content itself was necessary or sufficiently defined.

The owner found S6's entire second message unnecessary, not merely its
conditional construction awkward. Its first sentence still needed a more
natural delivery. S5's meaning was too ambiguous to judge; S2 also retained some
wordiness and rigidity. These findings supersede the earlier positive
assessments. Another sentence-polishing pass would not have fixed that omission.

## Next pass

Keep S1, S3, S4 and S6 as owner wording references and S2 explicitly tentative.
First settle the content in S2/S5; then review natural deliveries of that same
meaning. Reviewers must assess the informational core before register or wit.
Do not reward a friendly or concise sentence for conveying unnecessary content,
and do not override the owner's Korean judgments with reviewer agreement.

No bulk translation, guide rewrite or new sample set follows from this feedback.

## Previous AI review checkpoint — superseded by owner correction below

Status: source inspection and two independent content-first reviews complete;
the owner subsequently found unnecessary specificity and redundant instruction.
Retained as review-failure evidence, not the current recommendation.
S1/S3/S4/S6 remain unchanged owner references; S2's earlier wording remains
tentative and S5 has no approved Korean replacement.

### S2 — recovery request receipt

**Proposed informational core:** We cannot confirm whether the recovery request
was received; the reader can retry submitting it.

The form retains the phone number and contact email after timeout. Its error
appears above the same submit button; only a validated receipt moves the reader
to the receipt step. The surrounding account/ownership warning does not answer
whether this request arrived. Receipt uncertainty therefore earns an explicit
place; the technical timeout explanation does not change the available action.
Do not repeat the ownership warning or promise recovery in this message.

**Superseded AI sample — not approved:**

> 복구 요청이 접수됐는지 확인할 수 없어요. 다시 시도해 주세요.

Source: `src/components/Authentication/member-auth/account-recovery-view.tsx:95–138,149–175`.
This is the timeout sample, not a new general-purpose error message.

### S5 — recheck the payment that just returned

**Proposed informational core:** We cannot confirm completion of this payment;
use **Check payment** to check that same attempt.

The retained attempt exposes both **Check payment** and **Resume same payment**.
The former calls confirmation with the existing identifiers and can finish its
existing order; the latter can reopen the payment window. Naming the checking
control was judged useful by the AI reviewers. Their English-only constraint
and repeated action instruction were subsequently rejected by the owner below.

**Superseded AI sample — not approved:**

> 결제가 완료됐는지 확인할 수 없어요. Check payment를 눌러 이번 결제를 다시 확인해 주세요.

No failure/no-charge claim, bank-app instruction, new payment instruction or
internal order-finalization explanation is needed in this message. The sample
does not claim that checking opens another payment window. This brief is limited
to confirmation uncertainty after the payment window returns, not every error
that can occupy the payment status slot.

Source: `src/components/commerce/payment.tsx:96–121,133–137,139–152,201–203,225–230`;
`src/components/commerce/checkout.tsx:145–148`.

### Review evidence and remaining decision

Both independent reviewers assessed necessity and factual implications before
naturalness. Both recommended retaining these samples for owner review, without
extra timeout mechanics or reassurance. S2's administrative noun and S5's
repeated confirmation language/mixed English control label remain delivery
points for the owner to judge; brevity was not treated as proof of naturalness.
Agreement does not establish that the informational choices or Korean are approved.

**Previous checkpoint:** these two AI samples were submitted for owner review;
the correction below now governs the next bounded wording pass.
**Fragile final pass, in order:** preserve unknown versus failed/received;
distinguish checking the same payment from reopening it; remove any information
that does not earn its place; assess Korean naturalness separately from length.
No live UI, payment/provider or recovery acceptance was run or claimed.

## Latest owner correction — task priority and message/control redundancy

**Correction checkpoint:** owner feedback captured; S2/S5 wording remained open.
No new AI replacement was proposed in this correction record. The subsequent
recalibrated pair below applies it without changing runtime copy.

### Task relevance takes priority over English-default labels

English-default does not mean keeping every functional control in English.
Information pertinent to the reader's current task or objective takes priority
for delivery. **Check payment** is such a control and needs Korean wording in
the Korean experience. This corrects the earlier English-only constraint; it is
not authorization for bulk translation, runtime edits or fallback activation.

### S2 — the form already identifies the request

The owner found **접수됐는지** unnatural here. There is no competing request in
this form, so repeating account recovery does not add useful identification.
Do not insist that preserving the unknown outcome requires the explicit
administrative construction used in the superseded sample.

Exploratory owner wording, not interchangeable approved replacements:

- 요청을 확인할 수 없었어요.
- 요청 확인이 안 됐어요.
- 되지 않았어요. — a spoken ending exploration, not a complete new message.
- 요청이 확인되지 않아요. 다시 시도해 주세요.

The owner also retained **다시 시도해 주세요.** as the retry direction. None of
these formulations felt fully natural to the owner; they indicate a better
direction, not a settled tense, ending or sentence structure.

### S5 — deliver the state AND the explicit next step

The owner explored **결제 확인이 되지 않았어요. 확인 버튼을 눌러 주세요.**
and objected to the tautological purpose “click check payment to check payment.”
The AI incorrectly turned that into permission to remove the next-step
instruction. The owner then explicitly corrected that interpretation.

S5 has TWO necessary informational jobs: convey that payment is unconfirmed,
and tell the reader how to address it. A visible translated button is not a
given instruction to press it. Name the supported control and tell the reader
to use it; avoid repeating its purpose, not the necessary instruction itself.
Review the message/control pair together without making either informational
job disappear. Neither the owner's exploratory sentence nor an exact Korean
button label is approved here. Unknown must not become failure or no charge.

### What this review adds

The AI first repeated an action's purpose, then overcorrected by removing the
instruction itself. Both independent reviewers accepted that incomplete second
version. Neither agreement established informational completeness. Assess the
whole screen, but do not assume a control's presence tells the reader to use it.
Complete the necessary content BEFORE optimizing specificity, repetition,
sentence structure, tone or length. Prune genuinely unnecessary information;
do not prune one of the task's necessary informational jobs.

**Next bounded step:** refine S2 without redundant request identification or
forced receipt terminology; review S5 as a state-message/translated-control pair
with an explicit next-step instruction and no tautological purpose. Assess naturalness separately; do not expand
the set, rewrite owner references or change runtime/guide/About copy.
**Fragile final pass:** complete all necessary content first; prioritize
task-critical Korean delivery; remove only true redundancy; preserve unknown
outcomes; then judge natural Korean.

## Prior recalibrated pair — S5 subsequently deferred

The owner clarified that “apply the recalibration and continue” means continuing
this editorial pass, not implementing runtime changes. Only S2/S5 are advanced.

### S2 — working sample

> 요청을 확인하지 못했어요. 다시 시도해 주세요.

The form supplies which request; the message adds that confirmation was not
obtained and gives the supported retry. It does not claim rejection, receipt or
recovery success. The construction follows the owner's direction without
turning the exploratory alternatives into previously approved copy.

### S5 — working message/control pair

> 결제를 확인하지 못했어요. ‘결제 확인’을 눌러 주세요.

**Button:** 결제 확인

The first sentence supplies the unconfirmed state. The second explicitly tells
the reader which control to press, without restating its purpose. The previous
state-only version omitted necessary content and is superseded. This is still
the same-attempt checking action, not the neighbouring resume action; the
wording does not assert payment failure or no charge. This revised sample has
not been approved by the owner.

### Progress and remaining review

- **Completed:** restored S5's explicit next-step instruction after the owner
  rejected the incomplete state-only version. S2 is unchanged by this correction.
- **Review evidence:** two independent reviewers accepted the earlier state-only
  version; the owner identified its missing informational job. Those reviews do
  not validate this revised sample and must not outweigh the correction.
- **Current:** owner judgment of these exact Korean samples remains pending;
  no universal preference for this construction or sentence length is inferred.
- **Next:** revise only the disputed part after feedback; no sample expansion,
  runtime translation, voice-guide edit or About revision is authorized.
- **Fragile final pass:** deliver both state and explicit next step; unknown
  must not become failure; distinguish checking from resume; remove tautological
  purpose, not the instruction; assess naturalness independently of economy.

S1/S3/S4/S6 remain the owner's unchanged references. No runtime or live UI,
recovery, payment/provider or production acceptance is claimed.

## Previous checkpoint — recovery-receipt draft subsequently rejected

The owner questioned whether an immediate manual recheck belongs in the flow
at all: if no new user input, decision, authorization or changed condition is
required, asking the user to trigger the same check may be an unnecessary step.
If an immediate check would not help, an immediate manual retry instruction
would not help either. Establish the useful condition and appropriate initiator
before deciding which action a message must request. This does not invalidate
complete content delivery; it questions the underlying task model.

**S5: deferred.** A separate local chat owns a read-only decision brief:
[Payment recheck: automatic versus manual confirmation](codex://threads/01a1c623-cf9e-71e3-ad83-92f133762d6d).
Its scope is current behaviour, reasons for manual intervention, bounded
automatic checking if appropriate, stopping conditions, safety constraints and
focused tests. Implementation/provider actions remain unauthorized. Do not
resume S5 wording here before the interaction decision is resolved.

**Next surface: account-recovery receipt.** The owner authorized moving to
other surfaces; this is one bounded new editorial case, not bulk translation.

Source inspected: `src/components/Authentication/member-auth/account-recovery-view.tsx:115–125,179–183`
and the corresponding current `MemberAuth` English messages, read-only.

Previous proposed information inventory — NOT an accepted content brief:
- Receipt is confirmed; do not leave this in the timeout/unknown state.
- Staff review remains pending.
- Ownership has not yet been verified.
- The account has not changed; receipt is not successful recovery.
- Returning to login is available navigation, not a step that completes review.
  Do not invent an instruction to press it, a response time or a contact promise.

The heading/body/control sample in the review chat was subsequently rejected
in full. Both independent reviewers accepted it; their assessment missed the
owner's writing direction and did not establish that every source fact belonged
in the message. Do not reuse or polish that sample as an accepted foundation.

**Completed:** S5 handoff created and observed active; next surface source and
content reviewed. **Current:** owner review of the recovery-receipt sample.
**Next:** revise only this small surface after feedback; retain S2 as tentative
and S1/S3/S4/S6 unchanged. Runtime catalogues, guide and About remain untouched.
**Fragile final pass:** receipt versus recovery; pending ownership verification;
unchanged account; optional navigation versus required task; no invented service
promises; complete necessary content before naturalness or economy.

## Owner correction — active progression, not a backend-state inventory

The owner rejected the recovery-receipt heading and body as rigid, unnatural,
textbook LLM prose. Discard the sample; do not mechanically smooth its endings.
The owner questioned whether this surface needs a heading at all. Removing it
is an editorial option, not an approved runtime/layout change or a universal
ban on headings.

### Writing direction to apply before drafting again

- Prefer active phrasing with a clear actor rather than passive status reports.
- Be proactive: explain what happens next, who will do it, and what the user
  needs to do, if anything. When waiting is relevant, explain the real process
  they are waiting for. Do not make disconnected factual assertions the endpoint.
- Avoid chains of negative clauses, especially the awkward past/present shifts
  the owner called out. Joining multiple things that have not happened does not
  create a coherent explanation or deliver the next step.
- A source field or security boundary is not automatically necessary UI content.
  Establish what the user needs to understand or do; do not turn a backend-state
  inventory into a message and call that completeness.
- Choose sentence structure and length after the content and progression are
  clear. This is not a demand for positive spin, invented reassurance, uniform
  endings, mandatory short sentences or a new humour prohibition.

The owner's examples about staff review and follow-up illustrate the proactive
direction. They are not exact approved copy or evidence that staff have begun
reviewing, that a notification will be sent, or that a service timeline exists.

### Source-grounding for the next content brief

Read-only inspection of `src/lib/member-auth/recovery/service.ts`,
`repository.ts`, `http.ts`, `contracts.ts` and the owning runbook
`docs/deployment/member-auth.local.md` establishes local durable intake plus
restricted staff review metadata. The runbook's lost-email-recovery section
explicitly says the needs-proof state sends no message and that recovery itself
is not implemented by this intake/review flow. These are implementation limits,
not permission to write another list of negative disclaimers for the reader.

Before another receipt draft, establish the actual intended staff/customer
follow-up and next event or user action. Do not cover an undefined process with
an invented promise or with rigid statements of what has not happened.

**Completed:** rejected sample discarded; owner direction recorded separately
from examples and implementation facts. **Current:** reconstruct the content
brief around the real next event/action. **S5:** remains deferred to its separate
interaction chat. **Scope:** documentation/sample-only; runtime catalogues,
voice guide, About drafts and owner references remain untouched.
**Fragile final pass:** meaningful progression; active actor/process; complete
necessary next-step information; natural Korean without chained negatives or
tense stitching; no unsupported service promise; no ornamental heading.

## Accepted reference — recovery email handoff; expired-code sample

The owner directed recovery follow-up to a separate investigation and will
handle its content and system decisions there. Email is the indicated intended
direction, not a verified existing service promise.
[Account recovery: email follow-up and customer next steps](codex://threads/01a1c64a-3c5e-7d93-8749-27a5202060e6)
owns the read-only investigation and decision brief. That chat was observed
active. This editorial chat defers the receipt surface as well as S5; do not
draft either around unresolved behaviour or change runtime copy.

**Accepted calibration surface: expired email verification code.** This sample is
specifically the state where sending a new code is available: cooldown zero,
email OTP enabled, no request pending. Do not transplant it into a disabled or
cooldown state without accounting for the actual supported action.

Source inspected: `src/components/Authentication/account-phase-views.tsx:430–524`
and `src/components/Authentication/member-auth/account-view.tsx:521–529`.
The expired state disables the old code input; the retry control triggers
`onCode` through an explicit user action. It is not automatic sending.

Necessary content: explain expiry, then direct the user to obtain a fresh code
and enter it. Use a task-relevant Korean sending control. No new heading,
negative-state inventory, standalone disclaimer, invented timeline or delivery
promise is needed. The sample is a calibration reference, not a runtime catalogue.

**Owner disposition:** “Good enough” on 2026-11-11, for this exact message/control
pair in the stated available-resend context. Preserve the wording:

> 코드가 만료됐어요. 새 코드를 받아 다시 입력해 주세요.

**Button:** 새 코드 받기

No added heading. This is not authorization for runtime translation,
publication, bulk expansion or a universal sentence/ending formula.

Both independent reviewers checked content/progression before naturalness and
found no material issue; this does not establish owner approval. The owner has
rejected previous samples despite reviewer agreement, so that judgment cannot
substitute for this review.

**Completed:** recovery handoff created; source and next action grounded;
corrections applied to one new sample; owner accepted that pair as good enough.
**Current:** preserve it as a scoped calibration reference, without further
polishing. Deferred interaction/recovery questions remain in their own chats.
S1/S3/S4/S6 remain unchanged owner references; S2 remains tentative. Runtime
catalogues, voice guide and About remain untouched.
**Fragile final pass:** complete state-to-action progression; sending requires
the explicit user action; distinguish available action from cooldown; natural
Korean without passive/status stacking; no decorative heading or service promise.

## Current checkpoint — requesting another email code during cooldown

The owner accepted the expired-code sample and requested the next surface.
This is a distinct resend-cooldown state, not another wording variant for expiry.

Source rechecked: `src/components/Authentication/account-phase-views.tsx:498–519`.
The resend action is disabled while the remaining countdown is positive. The
current code may still be usable; do not imply expiry or failed delivery, or
tell every reader to replace it. A new send remains an explicit user action.

Necessary content: if the reader needs another code, say when they may request
one and direct that next step. The chat sample uses 20 seconds as an illustrative
remaining countdown, not a fixed service delay or delivery promise. Its sending
control remains unavailable during the wait; reaching zero does not send a code.
Do not duplicate the same countdown across multiple copy slots unnecessarily;
exact visual placement is not implemented or accepted by this copy study.

Two independent reviewers found no material content or naturalness issue; owner
review remains pending. Preserve the accepted expired-code reference unchanged.
**Current:** review this one cooldown sample. **Scope:** documentation/sample
only; no runtime, catalogue, voice-guide or About changes. S5 and recovery
follow-up remain deferred to their separate chats.

## Recovery receipt — owner-accepted proposed-workflow wording

On 2026-11-11 the recovery chat relayed the owner's accepted sentence for this
copy-owning chat to preserve verbatim, including punctuation:

> 저희가 요청을 확인한 뒤, 남겨 주신 이메일로 안내해 드릴게요.

The owner rejected adding phone-verification instructions to this receipt;
those belong in the follow-up email. No ornamental receipt heading is approved.
This supersedes the wording deferral only. It is approved copy for the proposed
follow-up workflow, not evidence that recovery emails are implemented/operated,
and not authorization to edit runtime catalogues or publish.

The recovery chat owns the broader system/operational decisions and their
separate task-board record. Do not duplicate or silently change those decisions
here. Do not polish or expand the accepted sentence.

## Completed skill-building checkpoint — source-backed UX writing

Owner requested a reusable UX-writing skill: default English, a Korean branch,
selective adoption of Toss and a lightly verified comparison with Apple. The
primary-source comparison supports shared task/clarity/action/naturalness
principles, not identical brand voices or a historical-influence claim.

**Completed:** primary-source inspection, existing-skill overlap check and skill
creation at `<home>/.codex/skills/ux-writing/`. The shared entrypoint
defaults to English and routes to `references/korean.md` and the original source
document `references/principles-and-sources.md`. `agents/openai.yaml` supplies
normal implicit-discovery metadata. This does not replace the identity/voice guide.

**Validation evidence:** Ruby YAML parsing verified frontmatter/UI metadata;
local reference/scaffold checks passed. Independent English and Korean scenario
probes exercised unknown payments, cooldowns and undefined recovery follow-up.
The first Korean probe recycled a rejected receipt heading and blurred request
availability with receipt of email. Narrow corrections were applied; a subsequent
independent Korean probe preserved request timing and surfaced the missing
follow-up process without inventing a promise, a heading or a required SLA.
These probes check decisions, not universal writing quality or owner acceptance.

**Validation limitation:** the bundled `quick_validate.py` could not run because
PyYAML is missing from available Python interpreters. No dependency was installed
and no substitute module was injected to make that validator appear successful.
The separate metadata/reference checks are not claimed as that validator's run.
**Current:** skill creation complete with the validation limitation disclosed;
use it for subsequent editorial work and refine only from observed failures.
**Fragile final pass:** complete meaning before brevity; actual next step and
actor; task-critical translation; unknown versus failed; no invented follow-up;
no blind import of source-specific conventions; preserve accepted wording and
all runtime/publication boundaries. No runtime or catalogue edits authorized.

## Previous checkpoint — skill audit delegated; resume copy calibration

The owner requested a separate session for thorough creative-writing skill
auditing, review, risk analysis and an autonomous testing/improvement loop.
[Creative-writing skills: autonomous audit and vetting](codex://threads/01a1c68d-8b6d-7d71-a460-97ea8ce82465)
owns that work. Its initial scope is the copy/brand/UX-writing skill family,
with an inventory and explicit scope checks rather than silent expansion into
every graphics/video/plugin workflow. Proposed fixes are tested in isolated
local copies; installed skills are not overwritten without approval. Its local
audit workspace is separate from this checkout and this calibration document.

This chat resumes editorial calibration without waiting for audit completion.
The pending resend-wait sample must distinguish two contexts: if the reader is
already trying to request another code, the request's identity and intention
need not be explained again; a countdown shown to all code-entry users does not
establish that intention. Use only the actual remaining time and direct the
request after it, without promising receipt of email or automatic sending.
The current review uses the first, explicitly supplied context; this is not a
claim that the existing screen detects resend intent.

**Completed:** audit handoff created; current cooldown-control behaviour
rechecked read-only. **Current:** review the pending contextual resend-wait line,
not another tonal variant. **Scope:** sample/documentation-only; owner-accepted
expiry and recovery wording remain verbatim. S5 and recovery-system decisions
remain with their separate chats. No runtime/catalogue/publication changes.

## Current checkpoint — sign in again to continue registration

The owner requested continued calibration. This moves to another defined
surface; it does not promote the pending cooldown line to accepted wording.

Source inspected: `src/components/Authentication/member-auth/account-view.tsx:186–190`
and `MemberAuth.continueRegistrationAfterSigningIn` in the English catalogue,
read-only. The embedded registration flow exposes sign-in again before the
reader can continue setup. The screen does not establish a session-expiry cause
or a promise about stored progress.

Necessary content: connect signing in again to continuing the unfinished
registration. A new sentence about account status, saved data or why the
interruption happened is not needed without a real task/evidence basis. The
sample is one message, not a new heading, control, runtime translation or claim
that signing in itself completes registration.

**Owner disposition:** accepted with “good” on 2026-11-11. Preserve this exact
message for the stated unfinished-registration reauthentication context:

> 가입을 계속하려면 다시 로그인해 주세요.

**Current:** accepted calibration reference; do not silently polish it or infer
acceptance of the separate pending cooldown line. **Scope:** sample/document
only, not runtime implementation or publication. Previously accepted wording
stays unchanged. The skills audit and deferred payment/recovery-system decisions
continue in their own chats.
