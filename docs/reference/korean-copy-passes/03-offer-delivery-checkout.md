# Pass 3 — offer, delivery and checkout before payment

Editorial candidates · 2026-11-11 · No catalogue or runtime edits

## Sources and necessary content

Read `src/components/commerce/{offer,checkout,shipping-address}.tsx`, address
schema in `src/lib/commerce/contracts.ts`, `/shop` and `/tickets` route ownership,
and `_commerce/policy-page.tsx`. Product title/description/images, event title,
schedule, seller facts and legal sections are CMS/content-owner material, not a
second local translation catalogue. KR address shape is not proof of approved
delivery coverage. Do not invent product, price, stock, shipping or refund facts.

Task: understand an approved offer, enter delivery details and choose a quantity
before explicit payment. This is not admission activation or ownership proof.
The source may be changing in parallel; current English strings are observations,
not new owner approval of their commercial promises.

## Candidates

All new rows are drafts; conditional/HOLD rows cannot be lifted into runtime.

| ID / surface | Anchor / necessary content | Korean candidate | Actual action / gate |
| --- | --- | --- | --- |
| C01 offer unavailable | `purchasingIsNotOpen`, no offer | 현재는 구매를 진행할 수 없어요. | No invented sold-out reason, opening date, notification or active-preparation claim. No supported next task, so do not manufacture a CTA. |
| C02 product/price labels | offer price/delivery/schedule | 코인 1개 가격 / 배송비 / 발송 일정 | Values remain approved CMS amounts/schedule, not locally authored predictions. “Delivery” here is a fee, not a delivery-time promise. |
| C03 event labels | offer event/admission | 행사 / 입장 | Preserve actual event name/date; no translation of names or invented access tier. |
| C04 account limit | `upToThreeCoinsPerAccountForThisRelease` | 이번 판매에서는 계정당 코인을 최대 3개까지 구매할 수 있어요. 이전 구매와 진행 중인 예약도 포함해요. | Conditional on actual enforced release allowance. Not lifetime limit, stock guarantee or one-per-event ownership rule. F27. |
| C05 admission inclusion | `admissionIncludesEvent` | 코인 1개에 {event} 입장 1회가 포함돼요. | Only if approved offer supports it. Purchase success is not already-issued/claimed/activated admission. Product rights remain owner-managed. |
| C06 order section/total | checkout labels | 주문 내역 / 합계 | Actual payable snapshot and shipping arithmetic, not a proof of settled charge. |
| C07 quantity controls | add/removeOneCoin | 코인 1개 추가 / 코인 1개 줄이기 | Accessible labels; current count shown separately. Disabled states preserve maximum/available stock/session/payment lock. |
| C08 quantity-change uncertain | quantity catch | 수량 변경 결과를 확인하지 못했어요. | HOLD final next-step instruction until fresh quantity can be established; immediate repeated increment may duplicate an unknown update. F28. |
| C09 incompatible release in cart | `yourCartContainsADifferentReleaseResolveItBefore` | HOLD — no usable correction route established | Source disables changes but exposes no clear cart-clear/switch action in this component. Don't instruct an absent control or destructive discard. F29. |
| C10 release unavailable | `thisReleaseIsUnavailable` | 이 상품은 현재 구매할 수 없어요. | No claim that it will restock or is permanently sold out. No payment action while unavailable. |
| C11 unavailable address search | owner S3 | 주소 검색을 사용할 수 없어요. 배송지를 직접 입력해 주세요. | **Owner reference, verbatim.** Manual path remains usable; postcode is a separate required field, see C12/F30. |
| C12 manual postcode instruction | required five-digit postcode | 우편번호 5자리를 입력해 주세요. | Supplemental field-specific draft, not a silent rewrite of S3. Actual helper/error placement needs owner/live approval. |
| C13 recipient field | `recipient` | 받는 분 이름 | Shipping recipient, not attendee identity/account proof. No automatic synchronization claim. |
| C14 delivery contact | `deliveryPhone` | 배송 연락처 | Shipping schema accepts its actual number format; do not transplant 010-only auth requirements. |
| C15 postal/base address | `postcode`, `address` | 우편번호 / 주소 | Both required for manual fallback. Existing postcode is above the fallback message; do not promise all fields are below. |
| C16 detail/instructions | optional fields | 상세 주소(선택) / 배송 요청사항(선택) | Optional in current contract. Do not ask for all fields indiscriminately or promise instructions will always be fulfilled. |
| C17 search control | `searchAddress`, `closeSearch` | 주소 검색 / 검색 닫기 | Toggle search only; closing doesn't discard the entered shipping address. |
| C18 address-search selection | selected valid result | 상세 주소가 필요하면 입력해 주세요. | Contextual optional instruction, not mandatory detail. Vendor owns search/branding; address result is not silently verified delivery coverage. |
| C19 address incomplete/invalid before prepare | payment prepare address guard | 배송지 정보를 확인해 주세요. | HOLD field-specific completion until structured errors identify what's missing/invalid. Do not require optional detail/instructions or ask user to pay again. F31. |
| C20 session checking | checkout identity boundary | 계정을 확인하고 있어요. | Existing wait state; preserves current caller context while rechecking authority. |
| C21 session unconfirmed | `yourSessionCouldNotBeVerifiedYourInputsAre` | 계정을 확인하지 못했어요. ‘계정 다시 확인’을 눌러 주세요. | Control: 계정 다시 확인. Current wrapper retains inputs during this check; don't broaden to cross-account/session recovery. |
| C22 account loading | `loadingYourAccount` | 계정을 불러오고 있어요. | Same compact busy slot; no confirmed identity yet. |
| C23 return from expired session | authoritative account boundary | 가입/로그인 reference from pass 1 as appropriate | Don't reset caller selection or claim order/payment lost. The correct re-entry state depends on fresh authority, not an invented session-expiry cause. |
| C24 quantity/address locked by retained payment | checkout paymentLocked | HOLD — wait/lock purpose needs same-attempt state | Must explain resolving existing attempt without encouraging new charge or pretending address edits affect an existing immutable payment snapshot. Payment scope in pass 4/T004. |
| C25 post-purchase guest benefits | `admissionGuestNamesCanBeAssignedAfterPurchaseEach` | HOLD — no final commercial sentence | Current optional-registration/perk language conflicts with owner-required recipient-registration work. Do not invent self/gift allocation or drink/transport guarantees; T001/T010 own it. F32. |
| C26 seller/policy labels | offer disclosure and policy nav | 판매자 정보 / 구매 약관 / 개인정보 및 배송 안내 / 취소·반품·환불 안내 | Labels only; do not draft unapproved legal text or invent rights/timeframes. |
| C27 seller factual fields | business name/representative/registration/address/contact | 상호·대표자 / 사업자등록번호 / 주소 / 연락처 / 통신판매업 신고번호 | Actual seller values are content-owner facts, not test fixtures. Presence doesn't prove public-sales readiness. |
| C28 policy effective date | `effectiveDate` | 시행일 | Keep actual approved date; do not invent legal effect through translated label. |
| C29 policy absent | `unavailable` | HOLD final buyer direction | Public purchase must not rely on missing policy. A neutral unpublished-state note does not substitute for actual approved policy or authorize purchase. F33. |
| C30 policy return action | `/tickets` current shop alias | 상품 안내로 돌아가기 | Source route currently resolves to shop; avoid implying it lists already-issued tickets or completed purchases. |

## Findings retained

| ID | Severity / status | Finding and required owner/gate |
| --- | --- | --- |
| F27 | P1 / policy-alignment gate | Quantity cap is a release purchase rule, not one-per-account-per-event entitlement. Verify whole disclosure against T001 before public copy. |
| F28 | P1 / unknown-outcome gate | Quantity mutation catch alone does not prove it failed before taking effect. Need authoritative refresh before repeated increment/decrement instruction. |
| F29 | P1 / absent remedy | Incompatible cart disables quantity controls without an exposed resolution path here. Don't write “resolve it” as if a usable recovery action exists. |
| F30 | P2 / borderline | Owner S3 omits explicit manual postcode need; preserve it verbatim and assess supplemental field-specific instruction with actual layout. Never imply all fields sit below the message. |
| F31 | P2 / classification gate | Generic address guard cannot identify missing/invalid field; actionable field-level copy requires structured validation and actual visible helpers, not a guessed list. |
| F32 | P1 / deferred product promise | Checkout English still describes optional guest registration/perks while owner T010 direction requires recipient registration/continuation. New Korean commercial copy held to system/content owner. |
| F33 | P1 / policy gate | Missing seller/policy/product publication cannot be repaired by a friendly unavailable message. Existing launch milestones and explicit approvals remain governing. |

## Review record

Round 1: both fresh reviewers PASS, all C01–C30 checked. No additional semantic
blocker was found within the explicit draft/conditional/HOLD scope. F27–F33
remain product/interaction/live gates. This pass does not claim real checkout,
address-provider, locale or policy acceptance.
