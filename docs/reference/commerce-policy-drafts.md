# Commerce policies — unpublished adaptation proposal

Review checkpoint · 2026-11-06. **Internal draft, not operative terms or legal approval.**
Proposed effective date: **2026-11-13**, subject to owner approval and applicable notice requirements; the date alone does not activate anything. `../../src/lib` must retain three `null` policy values. No public pages, provider settings or checkout activation are authorized by this document.

## Proposed implementation, before publication

Adapt the same-entity Hideaway root policies into the existing terms/privacy/refund disclosure structure, retaining source provenance and replacing unsupported operational promises. Review the Korean text below and resolve the numbered decisions first; then review complete final policies and matching offer disclosures before any separately approved publication. Do not expose these partial sections as finished policies. English adaptation should follow approved Korean meaning, not introduce additional commitments. Use plain operational language, consistent with `docs/design/brand-voice.md`.

## Proposed Korean sections — owner review only

### 이용약관

**운영자와 적용 범위.** Sophomores는 리스토어드프로젝트(대표 최성윤, 사업자등록번호 753-32-01007)가 운영하는 서비스입니다. 사업장 주소는 서울특별시 송파구 올림픽로4길 15, 7동 705호(잠실동, 아시아선수촌아파트)입니다. 이 약관은 Sophomores의 계정 이용과 티켓 구매에 관한 기본 사항을 정합니다.

**계정과 구매.** 다른 사람의 정보를 도용하거나 서비스 운영을 방해해서는 안 됩니다. 티켓 구매에는 이메일과 전화번호 확인을 마친 계정이 필요합니다. 클럽 가입 승인은 티켓 구매 요건과 별개이며, 계정 확인이나 결제만으로 입장이 보장되지는 않습니다. 입장에는 해당 행사에서 정한 유효한 티켓과 입장 조건이 적용됩니다.

**티켓 안내와 문의.** 행사별 일시·장소, 가격·통화, 구매 수량, 판매 기간, 티켓 제공·입장 방법 및 취소·환불 조건은 구매 전에 안내합니다. 취소·환불 및 계정 탈퇴에 관한 문의는 concierge@hideawayseoul.com으로 접수하는 방안을 제안합니다. 이 연락처를 통한 실제 접수·본인 확인·처리 책임과 처리기간은 운영자 확인 후 최종 약관에 반영합니다.

### 개인정보 처리방침

**처리 목적과 항목 — 소스 기반 초안.** 계정 인증과 관리에는 이메일, 표시 이름, 이메일 확인 여부 및 인증·세션 기록을 처리합니다. Google 로그인 분기는 이름·이메일·프로필 이미지·이메일 확인 여부와 제공자 계정 식별정보를 연결하도록 구현되어 있습니다. 전화번호 확인 분기는 입력한 번호를 정규화한 뒤 해시값과 확인 기록으로 계정에 연결합니다. 해시값은 익명정보라고 단정하지 않습니다. 별도의 로컬 계정 복구 접수 분기는 전화번호 원문과 연락 이메일을 저장하므로, 모든 전화번호가 해시로만 보관된다고 안내하지 않습니다. 패스키에는 공개키·자격증명 식별정보 등을 저장하며 생체정보 원본을 수집한다고 기재하지 않습니다. 티켓 구매 분기는 계정 연결, 수량·금액·통화, 주문·결제 상태 및 거래 식별정보를 저장합니다. 실제 공개 서비스에 적용되는 항목과 필수·선택 구분은 활성화 범위 확인 후 최종 확정합니다. 고객 문의 내용은 제안된 수동 접수 절차가 승인되는 경우 본인 확인과 문의 처리에 사용하는 안입니다.

**권리 행사 접수안.** 개인정보 열람·정정·삭제·처리정지 및 계정 탈퇴 요청은 concierge@hideawayseoul.com으로 접수하는 방안을 제안합니다. 본인 확인 후 요청 범위와 법정 보존 의무를 검토하여 처리 결과를 안내하는 수동 절차입니다. 계정 설정에서 즉시 삭제하거나 모든 거래 기록이 함께 삭제된다고 약속하지 않습니다.

위 두 문단은 일부 초안입니다. 수집의 법적 근거, 필수·선택 구분, 보유·파기, 수탁자·제3자 제공·국외 이전, 보호책임자, 쿠키·로그 및 권리 행사 절차는 아래 확인을 마치기 전 확정할 수 없습니다.

### 취소·환불 정책

**구매자 취소 — 사용자 지정 방향.** 행사 2주 전날 23:59까지 전액 환불하고 이후에는 구매자 사정에 따른 환불을 제공하지 않는 방향입니다. 대화에서 이를 12월 3일 23:59까지 전액 환불, 12월 4일부터 환불 불가로 정리한 뒤 사용자가 진행을 요청했습니다. 연도·시간대와 접수 시각의 판정 방식은 아래 확인 전 실행 가능한 마감으로 확정하지 않습니다. 종전 Hideaway의 단계별 환불률 제안은 이 방향으로 대체합니다.

**별도 예외 검토.** 위 기준은 구매자 사정에 따른 취소 방향이며 법령상 권리를 배제하는 포괄적 환불 불가 선언이 아닙니다. 주최 측 취소 시 전액 환불은 기존 제안으로, 사용자 승인 사항과 구분합니다. 행사 취소·중대한 변경 및 적용 법령에 따른 처리와 고지 사항은 별도로 확정해야 합니다.

**수동 접수·처리안.** 구매자는 concierge@hideawayseoul.com으로 주문 또는 결제 식별정보와 요청 내용을 보내 취소·환불을 신청하는 방안을 제안합니다. 카드번호 전체·CVC·비밀번호를 보내지 않도록 안내합니다. 운영자는 구매자와 거래 상태, 적용 기준을 확인하고 환불 가능 여부·금액·후속 절차를 안내한 뒤 승인된 환불을 처리합니다. 신청 접수는 취소 승인이나 환불 완료를 뜻하지 않습니다. 운영자의 취소 실행과 카드사·결제수단의 실제 환급 완료는 구분하여 안내합니다. 접수 확인, 결정, 취소 실행 및 실제 환급에 관한 기한은 확정 전이며, 무기한 처리를 허용하는 뜻이 아닙니다. 적용되는 법정 기한을 포함해 최종 확인이 필요합니다.

## Current offer direction — user supplied, unpublished

These details supersede earlier “offer not supplied” assumptions. They are commercial direction, not a configured catalogue, policy approval or publication authorization. The rejected fillable offer records are not the input workflow; remaining questions stay here.

| Item | Current direction / remaining boundary |
| --- | --- |
| Schedule | December 18: Part I 20:00–22:30; Part II follows, until 02:00 the next morning. **2026** and **Asia/Seoul** are working interpretations awaiting express confirmation; do not encode runtime timestamps yet. |
| Advance ticket | KRW 88,000; four drink vouchers for Part I, gifts and transport from Part I to Part II. No transport mode or private driver is promised. |
| Onsite ticket | KRW 100,000 (KRW 12,000 more); same drinks, gifts and transport, without the advance song-request perk. |
| Song requests | Everyone registering before the event gets two song-request slots; requests are not guaranteed to be played. Registration mechanism, qualifying action and exact eligibility cutoff remain unspecified; do not equate registration with payment or create a submission workflow. |
| Location / sales | Location TBA; sales open November 13. Opening hour and online closing time are unspecified. Year/timezone confirmation also applies to the sales date. |
| Price changes | Prices are subject to change; this is not authority to reprice already-paid orders retroactively. |
| Buyer cancellation | Full refund through the night before two weeks prior, at 23:59. Accepted calendar cutoff: December 3 at 23:59 inclusive; no buyer-convenience refunds from December 4. Only year/timezone and operational handling of receipt timestamps remain to be confirmed before implementation. |

### 한국어 티켓 카피 초안

12월 18일, Part I은 20:00부터 22:30까지, Part II는 이어서 다음 날 02:00까지 진행됩니다. 장소는 추후 안내합니다. 티켓 판매는 11월 13일 시작합니다.

사전 티켓은 88,000원입니다. Part I에서 사용할 음료 쿠폰 4장, 선물, Part I에서 Part II로 이동하는 교통편이 포함됩니다. 행사 전 등록자에게는 신청곡 두 곡을 요청할 기회를 드립니다. 신청한 곡의 재생을 보장하지는 않습니다.

현장 티켓은 100,000원이며, 같은 음료·선물·교통편이 포함됩니다. 사전 등록 신청곡 혜택은 제공되지 않습니다. 가격은 변경될 수 있습니다.

구매자 사정으로 취소하는 경우 12월 3일 23:59까지는 전액 환불되며, 12월 4일부터는 환불되지 않습니다.

법령상 권리와 주최 측 취소·중대한 변경에 따른 처리는 별도로 적용됩니다.

### English ticket-copy draft

Join us on December 18. Part I runs from 20:00 to 22:30, followed by Part II until 02:00 the next morning. Location to be announced. Tickets go on sale November 13.

Advance tickets are KRW 88,000 and include four drink vouchers for Part I, gifts, and transport from Part I to Part II. Everyone registering before the event gets two song-request slots. Requested songs are not guaranteed to be played.

Onsite tickets are KRW 100,000, with the same drinks, gifts and transport, but without the advance song-request perk. Prices are subject to change.

If you cancel for personal reasons, you will receive a full refund through December 3 at 23:59. No refunds for personal reasons are available from December 4.

Statutory rights and treatment of organizer cancellation or material changes remain separate.

**Publication review, both languages:** confirm year/timezone and operational handling of receipt timestamps, and resolve registration eligibility/mechanism and outstanding offer disclosures. The accepted December 3/4 calendar cutoff is not being reopened; runtime timestamps still require those operational confirmations. These are copy drafts, not final public terms or an approved organizer-cancellation promise.

## Source ledger: adopt, change, exclude

Hideaway paths below are relative to `/Users/seanschoi/WebstormProjects/thehideaway/`; policy base `P` = `src/app/(frontend)/(site)/(pages)/`. These are inspected local public-source files, not a claim that the deployed pages or environment overrides were verified. No credentials or environment files were read.

| Source | Proposed disposition |
| --- | --- |
| `src/constants/business.ts:58–87` | Adopt approved same-entity legal identity and full registered address. Propose retaining public source email `concierge@hideawayseoul.com` for support/privacy/refunds; fallback in source is not proof of inbox operation. Do not adopt Hideaway domain or its weekend-only hours (`89–95`). Mail-order registration is commented out (`59`); do not invent it. |
| `P/terms/terms.ko.tsx:72–83,101–148` | Adopt identity-misuse/service-interference prohibition and pre-purchase/refund disclosure approach. Limit scope to actual account/ticket use. Remove membership/digital-content rules absent a matching offer, unsupported payment-data storage assurances, self-service refund wording and unverified three-business-day promise. |
| `P/terms/terms.ko.tsx:44–64,87–98,157–159` | Hold source 7/30-day amendment notice, age-14 threshold and content licence for explicit applicability/legal review; proposed effective date does not prove sufficient notice. Replace account-settings withdrawal promise with proposed manual requests. Do not import a blanket promotional content licence. |
| `P/privacy/privacy.ko.tsx:53–76,89–111,134–174` | Replace password/Naver/Kakao/Brevo claims with verified source-supported authentication and proposed processor inventory below. Do not copy “no third-party provision,” token-only payment storage, 90-day deletion, 5/3-year records or 3-month logs as verified Sophomores practices. Legal retention and operational enforcement need confirmation. |
| `P/privacy/privacy.ko.tsx:178–210` | Retain access/correction/deletion/suspension request concepts, including legally required preservation exceptions. Remove settings-based deletion assurance; verify destruction procedures before claiming permanent deletion. |
| `P/refund/page.tsx:139–163` | Historical source only: do not adopt its percentage bands; user-specific buyer-cancellation direction above supersedes that proposal. Organizer-cancellation full refund remains a separate unapproved proposal; statutory/material-change exceptions still require review. |
| `P/refund/page.tsx:173–190` | Retain email-request concept only as proposal. Remove payment-history UI, fixed three-business-day execution, 5–7-day card settlement, virtual-account and named wallet promises until methods and deadlines are confirmed. |

## Current-source checks, not provider acceptance

- `../../src/lib`: password login disabled; email magic link and six-character OTP plus passkey integration exist. Google is conditional on configuration. Phone is proof/identification, not SMS authentication (`53–59`). Canonical membership is explicitly local-only and configuration-gated (`../../src/lib`); available code is not a live-service inventory.
- `../../src/lib`: transactional SMTP source targets `smtp.zeptomail.com`, not Brevo. Owner context identifies Zoho CPaaS/ZeptoMail; confirm contracting legal entity, location, transfer details and retention rather than treating the product label as a complete processor disclosure.
- `../../src/lib` and `../../src/lib`: Zoho receiving/polling and hashed phone binding evidence. This is a separate phone-proof path, not proof that CPaaS sends SMS.
- `../../src/lib`: PortOne preparation/reconciliation and purchase eligibility exist; payment verification endpoints are not refund initiation. Selected PG, payment methods, provider activation and refund execution capability remain unconfirmed. Hideaway's PortOne/Toss table is not selection evidence for Sophomores.
- `../../src/lib`: approved seller facts and public `+82 10 4637 9289`; mobile fails the existing non-mobile publication gate. This is a current implementation gate, not a universal statement of law. Policies remain null.

### Data inventory resolved from source

Schema means storage capacity, not proof that every nullable field is populated. Migration files are inspected definitions, not confirmation that a live database applied them. No environment, credentials, database, provider console or browser was inspected for this pass.

| Class | Source-supported handling and boundary |
| --- | --- |
| Account/profile | `migrations/20261026_071140.ts:19–42` defines name, email, verification, image, membership status, locale, staff notes, role-related and legacy phone/tier fields. Email sign-in derives the required display name from the email when absent (`../../src/lib`; `../../src/lib`); this is not evidence of a separate real-name collection form. Legacy phone columns alone do not prove canonical enrollment writes plaintext there. |
| Google mapping and linkage | Installed `@better-auth/core` 1.7.12 `dist/social-providers/google.mjs:57,129–134` maps provider subject to account identity and name/email/picture/email_verified to user fields. Installed `better-auth/dist/oauth2/link-account.mjs:261–288` writes mapped user fields and provider account ID, scope, tokens and token expiry fields; matching columns exist in `migrations/20261026_071140.ts:26–69`. `../../src/lib` configures OAuth-token encryption; do not generalize that to all token columns or promise no OAuth-token storage. This is mapping/write-path evidence, not observed consent or live stored rows. |
| Sessions / authentication | `migrations/20261026_071140.ts:44–92` defines session token, user link, expiry, IP/user-agent; verification identifier/value/expiry; and passkey name, public key, credential ID, counter, device type, backup flag, transports and AAGUID. No biometric sample column appears in that passkey schema. `../../src/lib` configures hashed magic-link/OTP storage, five-minute validity and seven-day session validity; validity is not a retention/deletion promise. |
| Phone proof / canonical binding | `../../src/lib` normalizes phone and HMAC-hashes phone/session/challenge/proof/IP inputs; `crypto.ts:5–9` uses purpose-separated HMAC-SHA256. `migrations/20261101_000000_canonical_members.ts:7–80` defines challenge hashes/state/timestamps/policy, delivery mailbox/message IDs and retry metadata, rate-limit hashes, account-linked phone hash/challenge/policy/verification time and login-intent hashes. `../../src/lib` consumes proof and writes binding. These linkable identifiers are not anonymization. |
| Phone receiving / email delivery | `../../src/lib` fetches and parses original carrier email (phone and challenge), then persists matching state; its repository does not store the original body, while the provider mailbox's own retention is unverified. `../../src/lib` sends recipient email and code/link message via the configured SMTP transport; `mail-config.ts:21–36` requires explicit SMTP mode with ZeptoMail host. Neither source proves delivery or provider-side deletion. CPaaS/ZeptoMail are product names, not verified contracting entities or locations. |
| Local recovery intake | `../../src/lib` normalizes and stores plaintext phone/contact email with a 30-day expires-at value. `recovery/repository.ts:58–62,80–109` also stores status, reviewer, internal note/review history and provides bounded expiry deletion; submissions perform bounded cleanup (`35–43`). `recovery/runtime.ts:6–39` restricts this to local configuration. Do not present this as an activated public recovery service or confuse it with phone-proof hash storage. |
| Orders / payment disclosure | `migrations/20261026_071140.ts:128–139` plus `20261106_000000_payment_safety.ts:7–8` define user link, quantity/amount/currency/status, provider/reference, timestamps and attempt/fingerprint hashes. `../../src/lib` writes those order fields and prepares customer ID plus supplied customer details; `runtime.ts:46–59` supplies email and optional name. This request path is distinct from locally storing card data. Collection option labels mentioning Toss/Stripe/wallets are not evidence those methods or processors are selected/enabled. |
| Cleanup / withdrawal limits | `../../src/lib` provides bounded deletion of challenges more than one day after expiry, deliveries older than one day (subject to lease), and expired rate limits; the inspected caller is an explicit local cleanup CLI (`scripts/phone-verification-local.ts:12–20`), not proof of scheduled execution. `../../src/lib` deletes expired intents/limits opportunistically and consumes intents. `../../src/lib` disables self-service user deletion. The canonical binding's user-delete cascade (`migrations/20261101_000000_canonical_members.ts:48–54`) is not a complete withdrawal workflow. No complete enforced retention/erasure schedule for profiles, OAuth accounts, sessions, orders, mailbox contents, logs or backups is established by this pass. |

**Source review receipt — 2026-11-06:** Astra passed the bounded provenance check
for this inventory and the qualified contact gate; citations were tightened after
review. This is source accuracy for an unpublished draft, not legal completeness,
live configuration verification, policy approval or publication acceptance.

## Blocking owner decisions

1. Approve/adapt the proposed sections and **2026-11-13** date, with legal/notice review; confirm age eligibility and actual service scope. These excerpts are not a legally complete instrument.
2. Confirm `concierge@hideawayseoul.com` handles Sophomores support, privacy and refunds; identify accountable operator/privacy officer, support hours and manual request workflow. Confirm each required acknowledgement, decision and cancellation deadline and processor settlement expectations; do not merely promise “three days.” Staff login and `verify@sophomores.co` are not automatically support channels.
3. Confirm the remaining boundaries of the user-supplied offer above: year/timezone (working 2026 / Asia/Seoul), operational handling of receipt timestamps for the accepted December 3 23:59 / December 4 cutoff, November 13 opening hour and online closing time, location announcement, registration/song-request eligibility and mechanism, delivery/admission, fees, transfers and event change/no-show handling. Do not reopen supplied price, schedule or benefits as unknown. Preserve statutory rights; organizer-cancellation full refund is still only a proposal. Price changes do not authorize retroactive repricing of paid orders.
4. Confirm which source branches above will actually be enabled/public and any additional operational collection (including logs/cookies); the mapped/schema fields above no longer need to be rediscovered by the owner. Supply hosting/database/email/phone/payment contracting legal entities, processing roles, purpose/legal basis, mandatory/optional status, countries/transfer mechanisms and required notices. Approve retention by data class and verify cleanup scheduling, mailbox/backups and withdrawal enforcement; code expiry values alone do not answer these questions. Hideaway's ITEasy, Toss, Brevo and transfer statements are not portable facts. A separately authorized read-only console check may verify configuration/contract facts; it is not authorized by this draft and does not block this source-only inventory.
5. Identify selected PG and its actual contact-number requirement/review feedback before requesting a replacement number; the current mobile contact fails the code gate, not a demonstrated provider rule. Confirm mail-order registration applicability/value. No gate waiver/change or provider/deployment work is authorized here.
