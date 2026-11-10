# Pass 1 — account entry, email and phone verification

Editorial candidates · 2026-11-11 · No runtime translation or publication

## Source and task boundaries

`/account` and `/account/continue` mount `TicketAccountEntry` →
`MemberAccountStudy`; `/shop` and `/tickets` use `CommerceAccountGate` with
inline email lookup. `/tickets` is a current alias to `/shop`, not proof that
retained ticket-selection components own checkout. Preview-admin password
login, AuthCards demos and standalone disconnected verification studies are
not customer passwordless entry.

Read: `account-view.tsx`, `account-study.tsx`, `_shared/session.ts`,
`account-recovery-view.tsx`, `phone-step.tsx` under
`src/components/Authentication/member-auth/`; `account-phase-views.tsx`;
`phone-verification-trial.tsx` registration branches; catalogue namespaces
`MemberAuth`, active `AuthPhase`, registration `VerificationTrial` and reused
`Verification` controls/help. Anchors are source paths/keys, not stable line claims.

Necessary journey: choose login/create → identify email → explicit code send →
enter proof → only missing setup → fresh phone proof → explicit finish → fresh
authoritative account state. Phone proof alone is not completed registration,
identity or age verification. Do not fill every boundary into every short message.

## Candidate messages and task-critical controls

All rows are **drafts**, except references explicitly marked owner-accepted.
Labels apply only to their described Korean task, not a site-wide translation rule.

| ID / surface | Source anchor / necessary content | Korean candidate | Supported next action / qualification |
| --- | --- | --- | --- |
| A01 chooser | `chooseLogInOrSignUpToContinue`; choose entry route | 로그인하거나 가입해 주세요. | Controls: 로그인 / 가입하기. No social-introduction metaphor. |
| A02 email entry | `enterYourEmail`, `emailAddress` | 이메일 주소를 입력해 주세요. | Field: 이메일 주소. Control: 계속하기. The action identifies the completed email; it does not send a code while typing. |
| A03 invalid email | `enterAValidEmailAddress` | 이메일 주소를 확인해 주세요. name@example.com처럼 입력해 주세요. | Show at the field; example is a format illustration, not a required mailbox domain. |
| A04 email lookup busy | `checkingEmail` | 이메일 주소를 확인하고 있어요. | Existing busy slot; no invented account-match outcome. |
| A05 email lookup unavailable | `weCouldntCheckThisEmailTryAgain` | 이메일 주소를 확인하지 못했어요. 다시 시도해 주세요. | Retry checks the same entered address; no code sent by lookup. |
| A06 existing email route | `sendSignInCode` | 로그인 코드 받기 | Explicit send action; not a promise that email has arrived. |
| A07 new email route | `createAccountSendCode` | 가입 코드 받기 | **Borderline:** provisional account creation versus completed membership must remain clear in the whole flow; see F01. |
| A08 code entry | `emailHeading`, code field | 이메일로 받은 코드를 입력해 주세요. | Field: 인증 코드. Control: 코드 확인하기. No delivery-time promise; destination is the actual entered address. |
| A09 wrong code | owner S1 | 입력한 코드가 맞지 않아요. 메일을 다시 확인해 주세요. | **Owner reference, verbatim.** Do not silently add a six-character formula. |
| A10 expired code | accepted expiry sample | 코드가 만료됐어요. 새 코드를 받아 다시 입력해 주세요. | **Owner accepted, verbatim**, only when sending is available. Control: 새 코드 받기. |
| A11 exhausted code | `failures.attempts-exhausted` | 새 코드를 받아 다시 입력해 주세요. | Old code is disabled; no invented cause such as blaming this user's mistypes. Sending must be available, otherwise use wait state. |
| A12 resend wait, reader already trying to resend | `resendIn`, remaining value | {seconds}초 후에 다시 요청해 주세요. | Context supplies intent; actual dynamic value. Not an email-arrival promise. **Tentative**, not treated as accepted by “continue.” |
| A13 cooldown shown to all code-entry readers | same slot, intention not established | 새 코드가 필요하면 {seconds}초 후에 다시 요청해 주세요. | Conditional is necessary here; do not direct every reader to replace usable proof. One countdown location. |
| A14 send email failed | `failures.delivery-failed` | 메일을 보내지 못했어요. 이메일 주소를 확인한 뒤 다시 요청해 주세요. | Supported edit-address/resend actions, not a diagnosis that the user entered it wrong. |
| A15 connection failure | `failures.network` | 연결 상태를 확인한 뒤 다시 시도해 주세요. | Only the typed network branch; do not use this diagnosis for generic timeout. |
| A16 non-payment timeout | `failures.timeout` | 결과를 확인하지 못했어요. 다시 시도해 주세요. | Only the account action slot with supported retry, never a repeat-charge instruction. |
| A17 Google did not complete | `failures.provider-denied` | Google 로그인을 마치지 못했어요. 다시 시도하거나 다른 방법으로 로그인해 주세요. | Do not claim denial reason, cancellation or lack of any account change. |
| A18 passkey did not complete | `failures.passkey-cancelled` | 패스키 로그인을 마치지 못했어요. 다시 시도하거나 다른 방법으로 로그인해 주세요. | Passkey and email alternatives must actually be available. |
| A19 magic link requested | `notices.magic-link-sent` | 이메일로 받은 로그인 링크를 열어 주세요. | No delivery guarantee, expiry promise or automated-opening claim. |
| A20 setup reauthentication | accepted registration continuation | 가입을 계속하려면 다시 로그인해 주세요. | **Owner accepted, verbatim.** Does not claim why reauthentication occurred or that progress is saved. |
| A21 number entry | `VerificationTrial.numberPrompt` | 인증할 휴대폰 번호를 입력해 주세요. | Field: 휴대폰 번호. Control: 계속하기. Prepares a challenge; does not send MMS. |
| A22 number format | reused `Verification.invalidPhone` | 010으로 시작하는 11자리 휴대폰 번호를 입력해 주세요. | Matches current Korean-mobile normalization; do not imply foreign-number support. |
| A23 prepare busy | `creating` | 인증 메시지를 준비하고 있어요. | Existing busy feedback, not completed verification. |
| A24 prepared message | registration pending; composer/manual details | 입력한 번호의 회선으로 인증 메시지를 보내 주세요. 받는 주소와 메시지 내용을 먼저 확인해 주세요. | **Conditional candidate, F08:** requires actual protocol details in composer or accessible fallback. Initial registration hides ChallengeCard; fallback appears conditionally. No claim details are already visible. Never translate protocol content. |
| A25 composer action | reused `openMessages` | 메시지 앱 열기 | Opens compose attempt; does not send automatically. |
| A26 composer fallback | `registration.composerHelp` | 받는 주소와 메시지를 확인해 주세요. 자동으로 채워지지 않았다면 직접 입력해 주세요. 입력한 번호의 회선으로 MMS를 보내야 해요. 이메일이나 iMessage로 보내면 번호를 인증할 수 없어요. | Help disclosure, not a permanent status. Retain separate device/carrier MMS-to-email support and charge warning in the complete help composition; manual entry cannot repair unsupported service. |
| A27 copying failed | reused `copyFailed` | 내용을 선택해 직접 복사해 주세요. | Adjacent copy action identifies the text; explicit manual remedy without assuming its position. F02 retained as repaired wording risk. |
| A28 waiting for message | registration status pending | 인증 메시지를 기다리고 있어요. | Supported active auto-check, no delivery/verification guarantee. Manual check label: 인증 상태 확인. |
| A29 untrusted carrier evidence | `registration.state.review` | 번호를 확인하지 못했어요. 입력한 번호의 회선으로 MMS를 보냈는지 확인해 주세요. | No assertion that number is wrong. If retry is offered, instructions must match trusted carrier method. |
| A30 check status failed | `registration.error.status` | 인증 상태를 확인하지 못했어요. ‘인증 상태 확인’을 눌러 다시 확인해 주세요. | Source pauses automatic checks; button retries existing challenge, not a new message. |
| A31 receiver unavailable | `registration.error.receiver` | HOLD — no final candidate | Existing no-resend boundary and service-availability retry need context; log F03 rather than invent notification/timing. |
| A32 prepare failed | `registration.error.create` | 인증 메시지를 준비하지 못했어요. 다시 시도해 주세요. | Retry only if prepare action is available; no phone-proof grant implied. |
| A33 verification expired | `registration.state.expired` | 새 인증 메시지를 준비해 다시 보내 주세요. | New challenge needed; old protocol message cannot be reused. Control: 다시 시작하기. |
| A34 verification consumed | `registration.state.consumed` | 새 인증 메시지를 준비해 주세요. | Do not confuse consumed proof with active account; source's reset path must be available. |
| A35 verification cancelled | `registration.state.cancelled` | 다시 인증하려면 새 메시지를 준비해 주세요. | Conditional restart, not forced repetition of an intentionally cancelled task. |
| A36 cancel outcome unknown | `registration.error.cancel` | 취소 여부를 확인하지 못했어요. 다시 시도하거나 인증 시간이 끝날 때까지 기다려 주세요. | Does not falsely say cancelled; challenge still has original expiry. |
| A37 phone verified before binding | registration verified heading/completion | 번호를 확인했어요. ‘가입 마치기’를 눌러 주세요. | Only when valid phone proof and finish action are available; not proof membership is already active. |
| A38 final binding busy | `finishing`, `finishingRegistration` | 가입을 마무리하고 있어요. | Keep existing busy action disabled; do not promise success. |
| A39 final action | `finishRegistration` | 가입 마치기 | Explicit binding/finalization action, not an upward swipe or automatic grant. |
| A40 proof expired after verification | `verificationExpiredTryAgain` | 인증 시간이 지났어요. 휴대폰을 다시 인증해 주세요. | Current proof no longer usable; must restart supported verification, not silently bind stale proof. |
| A41 phone conflict | `failures.phone-conflict` | HOLD — no final candidate | Source's “use another number” conflicts with bound-phone recovery questions; preserve T007 authority, F04. |
| A42 recovery email/phone format | recovery form validation | 계정에 등록한 휴대폰 번호와 연락받을 이메일 주소를 확인해 주세요. | These are unverified input claims, not proof of ownership or an account-email change. |
| A43 recovery timeout | historical tentative S2 | HOLD — S2 remains tentative | Do not automatically promote an unapproved receipt/response formulation. Proposed follow-up receipt is a separate accepted sentence below. |
| A44 recovery receipt | owner handoff | 저희가 요청을 확인한 뒤, 남겨 주신 이메일로 안내해 드릴게요. | **Owner accepted, verbatim for proposed workflow only.** No extra heading or phone-proof instructions. Implementation and operation remain separately gated. |
| A45 recovery submit control | `requestStaffReview` | 복구 요청 보내기 | Explicit send, no contact-time guarantee. |
| A46 registration completed | confirmed registration-finalization event only | 가입을 마쳤어요. | **Not for shared `status.member` branch**: returning-member login also reaches it. Hold shared ready-branch wording pending task-specific completion/navigation, F09. No ticket/admission grant implied. |

## Findings ledger (retain even if subsequently resolved)

| ID | Severity / state | Finding and next owner/gate |
| --- | --- | --- |
| F01 | P2 / borderline | New-email send creates provisional account context, not completed membership. Korean control must be checked with the whole inline account path. No isolated label approval. |
| F02 | P2 / repaired before review | A27 initially used a positional cue across multiple copy controls/details. Removed it; final live slot still needs visual acceptance before implementation. |
| F03 | P1 / deferred | Receiver offline retry lacks a clear availability event; never encourage repeated MMS or promise active notification. Existing phone pilot/device acceptance remains required. |
| F04 | P1 / deferred | Phone-conflict recourse touches same-account bound-phone recovery. Do not invent another-account/different-number policy; T007/system owner decides. |
| F05 | P2 / source implementation gate | `MemberPhoneStep` explicitly seeds `VerificationProvider initialLocale="en"`. Korean sample quality does not establish that locale reaches live registration. No runtime change here. |
| F06 | P2 / implementation gate | Optional local passkey cannot be promised to transfer to hosted site. Preserve source local boundary when finalizing passkey-related copy; not included in general customer claim. |
| F07 | P1 / scope gate | Trial-labelled/preview-only verification strings share some helpers with active registration. Never transplant disconnected-study/privacy guarantees into real intake. |
| F08 | P1 / failed first review; implementation gate | Both reviewers found A24's initial details-visibility claim false. Corrected qualification; current registration initially hides ChallengeCard and reveals fallback conditionally. Live instruction/composer accessibility remains pending. |
| F09 | P1 / failed first review; repaired scope | A46 initially treated all fresh member state as just-completed registration. Returning login can share it. Restricted the candidate to confirmed finalization; shared ready-branch wording remains held. |
| F10 | P2 / failed first review; repaired | Added missing task-critical Korean Continue/code-field/Verify controls to A02/A08/A21. Whole-flow/live label acceptance remains pending. |
| F11 | P2 / borderline; repaired help qualification | A26 initially forced manual entry even when prefilling succeeded. Now conditional; original device/carrier capability and charges disclosures must remain accessible separately. |
| F12 | P2 / borderline | A11's task instruction relies on disabled old input and surrounding state. Verify the final exhausted-code composition conveys unusability without gratuitous diagnosis or extra status stacking. |

## Review record

Round 1: both reviewers FAIL. Material findings F08/F09/F10 and borderline
F11/F12 retained above; narrow corrections applied. Fresh round 2: both PASS,
all A01–A46 reviewed; no remaining material semantic blocker within the explicit
draft/conditional/HOLD scope. Full-file output filtering interrupted one read;
bounded re-reads restored coverage before either final verdict. F12 and live
gates remain, rather than being erased by reviewer agreement.
A reviewer PASS is semantic draft vetting only, not owner acceptance, runtime
testing or readiness.
