# Pass 4 — payment/result, orders and private invitation claim

Editorial candidates · 2026-11-11 · No provider or transaction actions

## Sources and fixed boundaries

Read active `src/components/commerce/{payment,order-admissions,invitation-claim}.tsx`
and their `/shop/payment`, `/shop/orders/[id]`, `/shop/invitations/claim` routes.
Also read the publicly routed retained `/tickets/payment` and
`src/components/tickets/portone-payment-result.tsx`. Retained ticket selection
and checkout buttons have no current route caller found; do not confuse them
with the active shop flow. `TicketAccountEntry` still has a fixed return link.

Confirmation verifies the SAME attempt and can finalize its existing order.
Resume can open its payment window only after server authorization. Browser
return is not proof of success/failure or no charge. Review holds/conflicts,
retirement and settlement are T004/system-authority decisions, not copy choices.
The specific immediate manual-recheck question S5 remains deferred; this pass
does not silently settle it or reinstate a rejected instruction.

The English/catalogue and claim contracts are being edited in parallel. Known
claim error codes exist in the current contract, while the inspected UI still
funnels non-OK responses into a generic catch. Typed next-step copy must not be
presented as currently wired. Product/registration/claim changes remain T001,
T005, T006 and T010 owner work, not an isolated translation implementation.

## Candidates and held surfaces

All rows are drafts unless an explicit owner reference is marked.

| ID / state | Source / necessary content | Korean candidate | Action / qualification |
| --- | --- | --- | --- |
| D01 unconfirmed return / immediate recheck | payment return and S5 | HOLD — no final message/instruction pair | Manual-versus-automatic recheck remains delegated. Never imply failure, no charge or invite a new payment. |
| D02 start payment | `payByCard`, `preparing` | 카드로 결제하기 / 결제를 준비하고 있어요. | Explicit payment action; no hidden new window or automatic second charge. |
| D03 discovery busy | `checkingExistingPayments` | 이전 결제 정보를 확인하고 있어요. | Does not imply a completed charge or a found unresolved attempt. |
| D04 discovery unavailable | pending lookup error | 이전 결제 정보를 확인하지 못했어요. ‘이전 결제 다시 확인’을 눌러 주세요. | Control: 이전 결제 다시 확인. Source retries lookup, not initiating payment. |
| D05 retained controls | `checkPayment`, `resumeSamePayment` | 결제 확인 / 같은 결제 이어가기 | Distinguish same-attempt confirmation from permitted window reopening. Labels are drafts; do not decide S5 choreography or grant resume through a hold. |
| D06 conflicting browser operation | lock unavailable | HOLD — no immediate retry instruction | A held lock indicates another operation, not proof a payment window is open or settled. Stale discovery/authority must be reconciled, F34. |
| D07 stored record unreadable | invalid retained intent | 저장한 결제 정보를 읽지 못했어요. | HOLD final supported recourse/contact destination; do not clear storage, switch account or start another charge as a fix. F35. |
| D08 storage blocked | sessionStorage unavailable | 결제에 필요한 정보를 저장할 수 없어요. | HOLD browser-specific remedy and same-attempt recovery. Do not recommend clearing browser data or moving devices without preserved server recovery. F35. |
| D09 no unresolved attempt found | ready empty lookup for account | 이 계정에서 이어서 확인할 결제를 찾지 못했어요. | Does not mean no charge/no purchase. Existing 상품 안내로 돌아가기 is optional navigation, not instruction to pay again. |
| D10 validated order confirmation | parsed orderID + matching transaction | 결제를 확인했어요. ‘입장권 관리’에서 이용자 정보를 확인해 주세요. | Link maps to actual `/shop/orders/{orderID}`. No admission issuance/redemption/fulfillment guarantee; final self/gift wording still T001/T010. |
| D11 confirmed order, cleanup failed | same validated result, browser record not cleared | Same D10 success candidate; no extra user-facing failure sentence by default | Browser cleanup is not payment failure. If it blocks the next real task, give that task's supported recovery, not generic repurchase; F36. |
| D12 confirmed order, cart refresh failed | same validated result | Same D10 success candidate; keep known order reference | Do not erase confirmed payment or ask for another charge because cart display is stale. Cart recovery is separately held if needed, F36. |
| D13 failed/retirable attempt | server resume outcome + retire endpoint | HOLD — avoid equating retirement with refund | `cancelThisAttempt` retires a specific validated attempt. Final action term and failure authority require T004 review; no generic “결제 취소” or refund promise. F37. |
| D14 retirement confirmed | matching retired transaction/payment IDs | HOLD pending D13's user-facing meaning | Clear only matching intent; no automatic new payment. A retired attempt does not generically prove refund/absence of charge. |
| D15 review hold/conflict | `reviewHold`, `resolutionConflict` | HOLD — operator/process direction required | Do not offer resume/retire or make support timing/destination up. Must preserve review boundary without a rigid negative inventory. F38. |
| D16 payment status references | order/payment reference labels | 주문 번호 / 결제 번호 | Preserve actual identifier; not a private invitation token. Don't translate, truncate beyond source design or invent a reference. |
| D17 admissions loading | order-admissions loading | 입장권 정보를 불러오고 있어요. | Existing wait; not proof of issued access or nonexistent order. |
| D18 admissions fetch failure | order read catch + retry button | 입장권 정보를 불러오지 못했어요. ‘다시 불러오기’를 눌러 주세요. | Control: 다시 불러오기. Generic read retry, not a claim the account is wrong; known authorization rejection needs its own branch, F50. |
| D19 valid empty admissions list | ready, zero rows | 이 주문에서 표시할 입장권이 없어요. | HOLD any issuance/delivery/charge conclusion and meaningful financial-support next step; F39. |
| D20 guest-name field/save | assign-name and parsed success | 이용자 이름 / 이름 저장 / 이용자 이름을 저장했어요. | Last phrase only on validated success. No admission reassignment or membership grant. |
| D21 locked name | owner S4 | 이름 수정은 불가능해요. 필요하면 문의해 주세요. | **Owner reference, verbatim.** Must fit claimed/checked-in/revoked/review-required branches. Actual correction process/contact stays T006, not invented here. |
| D22 admission status labels | review/checked-in/claimed/revoked/available | 검토 필요 / 입장 확인 | Other labels HOLD pending exact allocation/registration/claim semantics; “claimed” is not physical delivery or entry use. F40. |
| D23 private invitation action | `createPrivateClaimLink` | 초대 링크 만들기 | Only source-supported eligible admission; note current canInvite/nameLocked asymmetry, F41. No one-more-recipient or transferable-admission promise. |
| D24 private-link warning | share + bearer expiry text | 이 링크를 가진 사람은 등록을 시도할 수 있어요. 초대받은 분에게만 보내 주세요. | Includes accidental disclosure, not only intended receipt. Eligibility/account/event checks still apply. No real token in evidence/logs. F51. |
| D25 link expiry | actual expiresAt | 링크 만료: {date}(한국 시간) | Expiry is not a promise of unconditional usability until then; don't invent duration or change actual timestamp. |
| D26 copy link | clipboard write | 초대 링크 복사 / 초대 링크를 복사했어요. | Success only after clipboard promise resolves; no delivery/share claim. |
| D27 copy failure | read-only selectable input | 링크를 선택해 직접 복사해 주세요. | No position assumption or nonexistent extra dialog. |
| D28 update/issue-link uncertain | shared guest-operation catch | 변경 결과를 확인하지 못했어요. 화면을 새로고침해 현재 상태를 확인해 주세요. | Only the order-admissions page's read-on-mount, not fragment-only invitation claim. Don't blindly repeat link issuance, which can rotate a bearer. F42. |
| D29 invitation opening | initial token parsing | 초대장을 열고 있어요. | Does not imply successful claim, identified recipient or entitlement. |
| D30 missing/invalid link | local format validation | 받은 초대 링크를 다시 열어 주세요. 계속 열리지 않으면 구매한 분에게 링크를 다시 요청해 주세요. | Reopen the original first; no assertion expired/used, no unnecessary token generation. F52. |
| D31 leave/redirect caveat | fragment stripped; token mounted only | 이 페이지에서 가입 또는 로그인을 진행해 주세요. 새로고침했거나 페이지를 나갔다면 받은 초대 링크를 다시 열어 주세요. | **Current-flow conditional draft**, not approved future UX. Required resumable registration/no redundant confirmation belong T010; F43/F49. |
| D32 claim action/optional-registration/perks | current account gate + explicit claim | HOLD — no final commercial or CTA copy | Current optional-registration/extra-confirm language conflicts with owner required gift flow. Don't merely translate or erase informed claim intent. F43. |
| D33 claim rejection shared catch | known contract codes, generic UI | HOLD — no speculative list of causes | Known invalid/expired/consumed/held/eligibility/event-already-bound outcomes need typed mapped next steps, not guesses presented as facts. F44/T005. |
| D34 claim succeeded | parsed response, current success branch | HOLD detailed welcome/benefit statement | Validate canonical event-bound result and owner-approved product facts; do not guarantee drinks, transport, ownership or entry from an admissionID alone. F45. Existing home control candidate: 홈으로 돌아가기. |
| D35 legacy `/tickets/payment` checking | retained result checks matching server order | 결제 상태를 확인하고 있어요. | Public return route is still reachable; no automatic resume/window launch. |
| D36 legacy paid | validated server `paid` | 결제를 확인했어요. 결제 번호를 보관해 주세요. | Known status only; no current merchandise/admission issuance guarantee. |
| D37 legacy cancelled | validated server `cancelled` | 이 결제의 취소를 확인했어요. | No inference of refund time, no-charge history or eligibility for another payment. |
| D38 legacy refunded | validated server `refunded` | 이 결제의 환불 처리를 확인했어요. | Server state, not a promise of bank posting time or restored inventory/entitlement. |
| D39 legacy pending/unavailable/held | typed state + shared controls | HOLD — same-attempt recovery and operator direction | Preserve different known/unknown/review states; S5/T004 decision governs whether manual check instruction belongs. No translate-and-ship bypass. F46. |
| D40 legacy missing reference | invalid/missing paymentId | 결제 번호를 확인해 주세요. | HOLD final retrieval/contact remedy; not “no payment occurred.” Optional return label: 상품 안내로 돌아가기. F47. |
| D41 account return-to-tickets link | fixed `/tickets` link in TicketAccountEntry | 상품 안내로 돌아가기 | Destination currently shop alias; no claim old selection/draft was saved or resumed. Hardcoded English/local storage notice remains owner-source work, F48. |
| D42 browser lock API unsupported | `thisBrowserCannotSafelyOpenPaymentUseACurrent` | HOLD — safe browser/recovery direction required | A browser change must not discard an unresolved attempt or imply it is safe to create a new one. Classify separately from another operation holding a lock. F35. |
| D43 same attempt not resumable | `thisAttemptCannotBeReopenedCheckPaymentStatusOr` | HOLD — status-only is not failed/cancelled | Preserve existing reference and financial state; do not promise window reopening or a support outcome. S5/T004 decides the usable next action. |

## Findings retained

| ID | Severity / status | Finding and next gate |
| --- | --- | --- |
| F34 | P1 / state classification | Lock failure is not proof of an open window; multiple payment operations share generic catch. Preserve S5/T004 system ownership rather than invent another immediate retry. |
| F35 | P1 / safe recovery | Unreadable/blocked browser storage lacks an approved actionable recovery/contact route in the isolated surface. Never recommend deleting data or creating a fresh charge. |
| F36 | P2 / borderline | Confirmed success can be obscured by browser cleanup/cart-refresh diagnostics. Keep successful order authority separate, exposing recovery only if it affects a real next task. |
| F37 | P1 / transaction terminology | Internal attempt retirement is not automatically payment cancellation/refund. Must map authoritative financial state and user consequence before final Korean action label. |
| F38 | P1 / review operations | Review hold/conflict needs the actual operator/contact and response process. No supported timing/process inferred from “contact support.” |
| F39 | P1 / fulfillment gap | Empty admissions for a valid order cannot establish no purchase or settled fulfillment. Needs an owner-defined support/reconciliation path if unexpected. |
| F40 | P1 / entitlement semantics | Current claimed/available UI labels span gift, admission and event-bound state. T001/T005/T010 must define typed meaning before final Korean labels. |
| F41 | P1 / eligibility consistency | `nameLocked` explicitly covers checked-in; `canInvite` does not explicitly exclude checked-in. Verify server authority and actual eligibility before presenting create-link as usable. |
| F42 | P1 / unknown write outcome | Generic name/link catch guesses causes. Read fresh state before another write/link rotation; order-page reload advice must never be reused on fragment-only claim page. |
| F43 | P1 / delegated flow | Mount-only invitation token is lost on navigation/refresh; new required gift registration and resumable claim scope is T010. Current copy must not promise retention or require an obsolete extra click. |
| F44 | P1 / known-vs-unknown | Contract rejection enums are ahead of the inspected generic UI. Draft per-outcome guidance only after actual status/code mapping and safe next controls exist; T005 owner work ongoing. |
| F45 | P1 / product entitlement claim | admissionID parse alone does not prove all promised event benefits or active membership. Await canonical response and approved commercial facts before welcome/benefit copy. |
| F46 | P1 / legacy public route | `/tickets/payment` still mounts retained result, even though `/tickets` is shop alias. Include its status/recovery regression cases; don't claim all retained code is unreachable. |
| F47 | P2 / missing reference remedy | No-ref case lacks a defined retrieval/support journey; don't infer absent charge or point to an invented history screen. |
| F48 | P2 / canonical-copy gap | `TicketReturnAction` still contains hardcoded English return/storage text; actual destination now shop alias. Catalogue move/runtime change not authorized here. |
| F49 | P1 / failed first review; repaired | D31 initially covered leaving but omitted refreshing as a distinct mounted-token loss case. Added both explicitly; T010's underlying resumability work remains open. |
| F50 | P2 / borderline; repaired | Both reviewers found purchaser-account checking overemphasized one guessed cause of generic admissions read failure. Existing retry is now primary; known authorization rejection still needs typed handling. |
| F51 | P2 / borderline; repaired | Bearer warning initially spoke only of recipients. “Possessing the link” now also covers accidental disclosure while still not promising claim success. |
| F52 | P2 / borderline; repaired | Reopen an original invitation before burdening the purchaser with a new request; never imply lost mounted memory requires rotating a valid bearer. |

## Review record

Round 1: one reviewer FAIL, one PASS. F49 fixed; both reviewers' borderline
findings F50–F52 retained and narrowly corrected. Fresh round 2: both PASS,
all D01–D43 reviewed; no remaining semantic blocker within the explicit
draft/conditional/HOLD scope. The original failed and borderline checks remain
in the ledger rather than disappearing after a pass.
Held workflow decisions are not “completed Korean copy,” and no actual payment,
claim, admission or device flow was run.
