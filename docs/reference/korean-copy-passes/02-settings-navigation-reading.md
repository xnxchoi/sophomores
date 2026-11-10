# Pass 2 — settings, navigation and reading

Editorial candidates · 2026-11-11 · Source inspection, not live acceptance

## Sources and necessary tasks

Read `/me/settings` server gates and `page.client.tsx` under its general,
account and security routes; `src/components/shell/header-panels.tsx` and
header/menu controls; reading bookmark/page-link/reader components; unmatched
route and System catalogue. Settings use the existing `authClient` and user
record; do not assume they share every authority of the customer member flow.

Help readers choose settings, understand a genuine lock, perform supported
credential/session actions, search or read content. Content titles, user names,
passkey names and protocol values remain unchanged. Do not translate editorial
article content, user data, internal roles/status IDs or the brand wordmark.

## Candidates and held claims

All new rows are drafts; HOLD marks missing authority/behaviour rather than a
Korean candidate that can be implemented immediately.

| ID / task | Source anchor / necessary content | Korean candidate | Actual next action / gate |
| --- | --- | --- | --- |
| B01 settings categories | `settingsSections` | 일반 / 계정 / 보안 | General display preferences, account details and credential/session controls remain distinct destinations. |
| B02 settings orientation | settings home blurb | 변경하거나 확인할 설정을 선택해 주세요. | Categories are usable links; no fictitious setting action. |
| B03 return | `backToSettings`, generic navigation | 설정으로 돌아가기 | Task-critical navigation; not a destructive cancel. |
| B04 language selection | general language panel | 사용할 언어를 선택해 주세요. | Options: English / 한국어; don't auto-translate language names or promise all content is translated. |
| B05 selected Korean notice | `languageSetKorean` | 한국어를 선택했어요. | Local selection only. Account persistence and immediate render change are not proven; F13. |
| B06 selected English notice | `languageSetToEnglish` | 영어를 선택했어요. | Same qualification; not “saved across devices.” |
| B07 theme fixed description | fixed theme panel | 현재는 어두운 테마를 사용해요. | No invented change control; HDR optimization/cinematic claims do not help this settings task. |
| B08 account labels | account panels | 로그인 이메일 / 휴대폰 번호 / 계정 식별자 | Read labels, not promises of verified ownership or public visibility. |
| B09 identifier locked | handle renaming reason | 여기서는 계정 식별자를 바꿀 수 없어요. | Do not promise a future event-date feature. No supported correction route supplied; F14. |
| B10 sign-in email locked | bound-registration email | 로그인 이메일을 바꾸려면 별도 확인이 필요해요. | **HOLD, F15:** approved recovery says email remains unchanged unless explicitly requested separately; no actual change-email procedure established. This is a proposed informational direction, not final service copy. |
| B11 phone status | phone panel | HOLD — no verified badge candidate | `user.phone` presence alone currently selects MMS Verified; authoritative proof/locale/live policy must be established, F16. Plain phone label B08 is not an ownership assertion. |
| B12 current device sign-out | account sign-out action | 이 기기에서 로그아웃해요. | Control: 로그아웃. Current handler calls signOut then home navigation; no other-device promise. |
| B13 passkey orientation | security panel | 패스키로 로그인할 수 있어요. 사용 중인 기기의 안내에 따라 추가해 주세요. | **Conditional:** feature and supported device available. No universal biometric/hardware-backed/one-tap guarantee. Control: 패스키 추가. |
| B14 passkey list busy | `checkingPasskeys` | 패스키를 확인하고 있어요. | Existing busy slot; do not announce list loaded yet. |
| B15 no passkeys | empty list | 패스키를 추가해 로그인할 때 사용할 수 있어요. | **Conditional on confirmed empty list only.** Current catch maps lookup error to empty; hold runtime use until distinct failure state exists, F17. |
| B16 remove credential control | `removePasskey({name})` | 패스키 {name} 삭제 | Preserve actual name. Deletion is destructive; required confirmation/recovery implications need separate UI validation, F18. |
| B17 passkey added | `passkeyAddedSuccessfully` | 패스키를 추가했어요. | Only on validated success, not cancellation or unknown network outcome; raw provider-error strings need mapping, F19. |
| B18 unknown add outcome | add catch/error slots | 패스키 추가 결과를 확인하지 못했어요. 목록을 다시 확인해 주세요. | **Unknown-outcome branch only, with an available list-refresh route**; not a confirmed rejection. Current UI lacks explicit list-failure retry. F17/F19/F24. |
| B19 delete failed/unknown | remove catch | HOLD — no final retry directive | Must classify provider result and list state before inviting another destructive request; source ignores resolved error payload, F19. |
| B20 sessions | security session panel | 로그인한 기기 | Display actual session list; do not infer personal device identity from user-agent alone. Current-device label: 현재 기기. |
| B21 revoke other sessions | `signOutOtherDevices` | 다른 기기에서 로그아웃하기 | Consequence applies to other sessions, not this session; no confirmation of result implied by the label. |
| B22 revoke result | `otherDeviceSessionsHaveBeenRevoked` | 다른 기기에서 로그아웃했어요. | **Conditional on authoritative success.** Existing handler ignores resolved error payload and uses initial session state; F20. |
| B23 revoke uncertain | failure slot | 다른 기기의 로그아웃 결과를 확인하지 못했어요. | Unknown-outcome branch only, not confirmed rejection. HOLD final next step until meaningful status-refresh/retry is exposed; no assumption all tokens revoked. F20/F24. |
| B24 authentication method availability | email/Google linked indicators | 연결됨 / 사용 가능 | Different states; do not change provider names or claim that configuration equals linked identity. |
| B25 notification empty | `youAreAllCaughtUp` | 새 알림이 없어요. | No invented relief, humour or required CTA; empty unread list needs no manufactured task. Fixture/connected data boundary must remain distinct. |
| B26 notification dismissal | `closeNotification` | 알림 닫기 | Connected branch marks read; fixture branch only removes locally. Do not label permanent deletion. |
| B27 all notifications action | `seeAll` | HOLD — no “모든 알림 보기” candidate | Source links to `/essays`, not an established inbox; translating the false destination claim would preserve the error, F21. |
| B28 account menu destinations | `ACCOUNT_LINKS`, signOut | HOLD — menu labels do not repair routes | Profile/settings/tickets/posts all point to `/read`; Sign Out only closes panel. Do not promise destination/sign-out effect, F22. |
| B29 search task | search input | 읽고 싶은 글을 검색해 주세요. | Source filters post title/dek; do not promise search of everything/accounts/orders. Control aria: 검색 닫기. |
| B30 no search results | `nothingFoundForQuery` | ‘{query}’ 검색 결과가 없어요. 다른 검색어를 입력해 주세요. | Same input supports change; retain query value, not translate it. No fabricated reason. |
| B31 search section labels | discover/results | 검색 결과 / 둘러보기 | Use only in actual existing groups; not a new headline required for every empty state. |
| B32 menu accessibility | open/close menu | 메뉴 열기 / 메뉴 닫기 / 뒤로 | Preserve back versus dismiss versus task cancellation. Simple visible MENU/BACK may remain English if no task comprehension loss; Korean accessible label still meaningful. |
| B33 reading pagination | `previous`, `next`, `pages` | 이전 페이지 / 다음 페이지 | Follow actual href/navigation and total-page state; no article-content translation. |
| B34 bookmark toggle | `save`, `saved` | 저장 / 저장됨 | **Conditional on owning onToggle persisting state.** Optional callback can no-op; inspect real consumer before a stored-success claim, F23. |
| B35 highlights | `saveHighlight` | 선택한 문장 저장 | Candidate describes task, not proof of persistence; same content-owner/handler gate as B34. |
| B36 missing page | not-found System direction | 페이지를 찾지 못했어요. 홈으로 돌아가 주세요. | Home navigation must exist on actual error surface. Do not copy dramatic editorial error prose into every functional failure. |
| B37 JavaScript unavailable | `System.enableJavaScript` | 이 화면을 보려면 JavaScript를 켜 주세요. | Only noscript boundary; no browser-specific invented setting path. |
| B38 WebGL unavailable | `System.webglUnavailable` | 이 효과를 표시하려면 WebGL이 필요해요. 글과 다음 내용은 계속 볼 수 있어요. | Preserves actual fallback, no instruction to repeat unsupported graphics initialization. Source fallback visibility needs live acceptance. |

## Findings retained for final single task

| ID | Severity / status | Evidence and required gate |
| --- | --- | --- |
| F13 | P2 / source gate | Locale selection sets cookie, catches persistence failure and still announces success. B05/B06 deliberately claim selection only; verify actual rerender/persistence before broader copy. |
| F14 | P2 / policy gap | Handle lock promises availability near event date without a committed implementation/timeline. Do not translate that into a promise. |
| F15 | P1 / deferred | Settings email-change recourse needs approved separate email-change path; T007 recovery does not automatically change email. |
| F16 | P1 / authority gate | Mere phone-field presence selects verified badge in current settings view. Require authoritative proof/status before verification claims. |
| F17 | P1 / source gap | Passkey lookup catch is shown as empty, not failure, and explicit list-retry UI is absent. Copy cannot make false emptiness or an absent control correct. |
| F18 | P1 / interaction gate | Passkey deletion lacks validated destructive confirmation/alternative-login protection. Preserve credential and session safety; no UI implementation in this pass. |
| F19 | P1 / result gate | Add/remove paths can surface raw provider errors; deletion does not inspect resolved error payload. Known failure and unknown outcome need mapped controls/status. |
| F20 | P1 / result gate | Other-session revocation claims success without checking resolved error and uses initial session state. No universal signed-out/guaranteed-success wording. |
| F21 | P2 / wrong destination | “See All” notifications links to essays. Fix destination/interaction separately before a truthful Korean label. |
| F22 | P1 / wrong action | Account menu links are placeholders; its Sign Out just closes the panel. A localized sign-out label would be misleading. |
| F23 | P2 / persistence gate | Bookmark callback is optional; labels alone cannot prove saving works in real consumers. |
| F24 | P2 / borderline; clarified | Reviewers asked to distinguish unknown outcomes from confirmed rejection in B18/B23. Narrowed the row applicability; typed runtime classification still belongs with the source owners. |
| F25 | P2 / borderline | B15's final confirmed-empty composition may need explicit empty-state orientation; do not infer emptiness from failed list fetch. |
| F26 | P2 / borderline | B38's “next content” referent must be clear in the live WebGL fallback. Exact visible fallback is a live acceptance check, not a new rendering change. |

## Review record

Round 1: both fresh reviewers PASS, all B01–B38 checked. Suggestions F24–F26
retained; unknown-only applicability clarified without expanding draft scope.
Conditional/HOLD rows stay unimplemented, even if semantic wording passes review.
