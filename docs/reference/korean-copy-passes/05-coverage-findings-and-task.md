# End-to-end coverage, final checks and consolidated task

2026-11-11 · Editorial review checkpoint, not translated runtime acceptance

## What “end-to-end” means here

Route/state-level editorial coverage of the active customer journey, including
explicitly held states and reachable retained callbacks. This is **not** a
key-by-key translation of the entire catalogue, visual QA, provider/device
acceptance, execution of checkout, or evidence that unresolved copy is complete.
The loop may finish its coverage while product/authority/UX gates remain open.

## Route coverage

All 19 `src/app/(site)/**/page.tsx` entries were inventoried. An empty route
means `/`; dynamic placeholders remain placeholders, not invented live URLs.

| Route / surface | Coverage / owner | Disposition |
| --- | --- | --- |
| `/` | Pass 2 B37/B38; E01–E04 below; seller labels pass 3 | Operational controls only. Teaser/landing prose and actual seller facts remain content-owner material. |
| `/account` | Pass 1 A01–A46 | Email, provider, phone, setup and recovery; explicit holds preserved. |
| `/account/continue` | Pass 1 A20/A46; pass 4 D41 | Same-account re-entry, not automatic activation or guaranteed draft recovery. |
| `/shop` | Pass 1 inline entry; pass 3; pass 4 | Approved-offer boundary, account gate, delivery, quantity and explicit payment. |
| `/tickets` | Same as `/shop` | Verified current alias; not the retained ticket-selection component. |
| `/shop/payment` | Pass 4 D01–D16/D42/D43 | Same attempt, authoritative order, uncertain/review/unsupported states. S5/T004 held. |
| `/tickets/payment` | Pass 4 D35–D40 | Retained but **publicly routed** result; server states and same-attempt recovery included. |
| `/shop/orders/[id]` | Pass 4 D17–D28 | Order admission reads, names, private links, clipboard, locks and unknown writes. |
| `/shop/invitations/claim` | Pass 4 D29–D34 | Token handling, account continuation, known/unknown errors and success authority; T005/T010 held. |
| `/me/settings` | Pass 2 B01–B03/B20/B24 | Hub and dynamic metadata; protocol status IDs not silently translated. |
| `/me/settings/general` | Pass 2 B04–B07 | Locale selection versus persistence, fixed theme and no invented notification-language guarantee. |
| `/me/settings/account` | Pass 2 B08–B12 | Read fields, locks, verification authority and current-device sign-out. |
| `/me/settings/security` | Pass 2 B13–B24 | Passkeys, list errors, destructive actions, other sessions and provider-result gates. |
| `/essays` | Pass 2 B25–B35; E05–E11 | Search/reading/bookmark/notification/media/credits and visible auth showcase exception below. |
| `/essays/[slug]` | Same as `/essays` | Source selects actual published/fallback post; no translated article body or fabricated slug. |
| `/privacy` | Pass 3 C26–C30 | Navigation/labels and missing-policy gate. Substantive legal content excluded. |
| `/terms` | Same policy component | Same labels/ownership; no legal rewrite or approval. |
| `/refund` | Same policy component | Same labels/ownership; no invented cancellation/refund entitlement or deadline. |
| `/[...not_found]` + site not-found | Pass 2 B36 | Source returns notFound; real home link exists in Missing surface. No ornamental new error heading required. |

## Shared operational controls / coverage corrections

Source inspected: `teaser/story.tsx`, `teaser/invitation-dialog.tsx`,
`UX/Tour/InterfaceTour.tsx`, `radio/{track-player,play-pause,tape-counter}.tsx`,
`arc/copy-button/{copy-button,use-copy-feedback}.tsx`,
`sections/credits-rail.tsx`, `notifications/notification-list.tsx` and actual
`reading/reading-stage.tsx` imports/callbacks. Paths are under `src/components/`.

These are additional drafts/holds, not edits to existing labels or editorial prose.

| ID | Necessary task / source | Korean candidate / disposition | Qualification |
| --- | --- | --- | --- |
| E01 | Story playback / System | 이야기 재생 / 일시정지 / 처음부터 다시 재생 | Use actual play/pause/replay actions, not a new sequence or reduced-motion path. |
| E02 | Story navigation / System | 이야기로 이동 / 이야기 목록 / {label}, 전체 {total}개 중 {position}번째 | Preserve actual label/order/count; no translation of authored chapter titles without scope. |
| E03 | Close narrative invitation; `closeInvitation`, `closeWithSymbol` | 초대장 닫기 / 닫기 × | Dismisses the narrative dialog, not cancelling an RSVP or private admission claim. Modal prose remains with teaser content owner. |
| E04 | Interface tour when mounted; `Interface.tour` | 이전 / 다음 / 안내 닫기 / 안내 마치기 | No forced next action beyond the actual tour. Do not translate feature descriptions into promises about placeholder account/session controls. |
| E05 | Radio transport; `Interface.radio` | 재생 / 일시정지 / {seconds}초 뒤로 / {seconds}초 앞으로 | Read actual dynamic step. The label describes an action, not verified playback or delivery. |
| E06 | Radio elapsed/remaining; `counter` | {elapsed} 재생, {remaining} 남음 | Conditional on an established actual duration. Otherwise HOLD remaining-time copy. Preserve actual formatted values; metadata fallback is not verified remaining playback, F55. |
| E07 | Generic copy; `Interface.copy` | 복사 / 복사했어요. | Success only after clipboard resolves; if failure, do not invent manual selection when the actual value is hidden. Existing generic error may need a contextual remedy. F56. |
| E08 | Full notification list; `Interface.notifications` | 알림이 없어요. / 읽음 / 읽음으로 표시 | This list is all notifications, distinct from unread-panel empty B25. Marking read is not deleting or proving the person read the message. |
| E09 | Credits portrait; `Interface.credits` | 제작진 / 사진 닫기 | Do not translate actual contributor names/roles or recast them as staff authority. Actual context may prefer another content-owner term; owner review remains needed. |
| E10 | Visible AuthCards showcase; ReadingStage mounts with optional callbacks absent | HOLD — no functional signup/login/reset/two-factor promises | These are reachable on essays, not silently excluded as dead demos. Buttons call missing optional callbacks; account-created/reset-email-sent claims are unsupported. F53. |
| E11 | Reading bookmarks/highlights; ReadingStage local state setters | HOLD durable-save wording; see B34/B35 | Actual consumer changes local React state only. No persistence call is shown; don't imply saved across reload/devices. F54. |

### Corrected coverage assumptions

- Initial inventory called AuthCards “demos, not customer passwordless entry.”
  Deeper consumer inspection found them **mounted without callbacks** on the
  public reading surface. Their functional copy is now explicitly held, F53;
  no claim that they are unreachable or working customer auth is retained.
- The reading callback exists but is local state only, strengthening earlier
  F23's optional-callback concern to concrete persistence gate F54.
- Some retained code is unreachable in the inspected production import graph,
  but `/tickets/payment` is not. Its public callback is included, F46.

## Exclusions — explicit, not counted as finished translation

| Excluded content | Reason / boundary |
| --- | --- |
| Staff/Payload admin, preview `/login` and `/logout`, internal API responses | Separate authentication/operational audience; customer passwordless copy must not inherit preview credentials or admin grants. |
| Developer studies, old `src/hideaway` surface, standalone disconnected verification preview | Not the active customer member flow. Shared controls used by registration are covered where actually imported. |
| Retained TicketSelection / PortOneCheckoutButton | No current route caller found; do not bulk translate as active checkout. Fixed account-return link and public legacy result are separately covered. |
| CMS post/teaser/About/product/event prose, artist/author names, actual seller/legal text | Existing content owners and approval rights remain. No blanket English-to-Korean publication. |
| PageMetadata brand titles and internal protocol/status/token values | Not automatically translated. Do not render an ad hoc wordmark or alter exported/API values. |

## Combined findings index

Detailed evidence, source anchors and candidate applicability remain in passes
1–4. Preserve failures that were repaired as well as unresolved and borderline
ones; reviewer PASS does not erase them.

| Group | IDs | Status / required next step |
| --- | --- | --- |
| Account/proof/locale | F01–F07 | Whole-flow provisional-account wording; copy placement repaired but live check pending; receiver/recovery authority; forced-English/local-passkey/trial boundary gates. |
| First review escapes | F08–F12 | F08 visibility assertion corrected but source composition held; F09 readiness-vs-event and F10 controls repaired; F11 help qualification repaired; F12 exhausted-code composition borderline. |
| Settings/storage of state | F13–F20 | Locale persistence, handle/email-change policy, phone-proof authority, passkey false-empty/result mapping/destructive confirmation and other-session result classification. |
| Navigation and reading | F21–F26 | Wrong all-notifications destination/account menu actions; bookmark persistence; unknown-only error scope clarified; empty/fallback referents remain live checks. |
| Purchase before payment | F27–F33 | Commercial-policy alignment; unknown cart mutation; absent incompatible-cart remedy; postcode/context and structured field validation; T010 perk/registration and publication/policy gates. |
| Payment/order/invitation | F34–F48 | Financial classification and safe recovery, cleanup versus success, retirement/refund terms, operator path, fulfillment, entitlement eligibility, unknown writes, token retention, typed claim result/product facts, public legacy callback and hardcoded return copy. |
| Second review escapes | F49–F52 | Refresh condition, generic-read guessed prerequisite, bearer-possession precision and original-link-first recovery repaired; underlying T010/T005/live gates remain. |
| Deeper coverage findings | F53–F56 | Reachable unwired AuthCards; local-only reading saves; actual-duration/media error handling; contextual generic-copy failure remedy. |
| Drift/acceptance/evidence | F57–F59 | Owner English/source drift requires implementation-time revalidation; no live/production or new owner approval inferred. Repaired document/read-evidence checks retained. |

| Additional ID | Severity / evidence | Gate |
| --- | --- | --- |
| F53 | P1: ReadingStage mounts SignIn/SignUp/ForgotPassword/TwoFactor/Passkey components without their optional callbacks; form descriptions promise actions that do not execute. | Decide hide/showcase/real-functional routing separately; don't translate false working-auth promises. |
| F54 | P2: ReadingStage bookmark/highlight handlers only update local state; callback presence does not establish persistence. | Decide local-only meaning versus durable implementation before a stored-success promise. |
| F55 | P2: Radio initializes duration from track metadata and stops on load/play errors without visible recovery; timer may be based on fallback metadata. | No guaranteed remaining-time or playback-success wording; define actual error/remedy if needed, not an invented button. |
| F56 | P2: Generic CopyButton value may not be visible/selectable. | A universal “select and copy” remedy would be false in some consumers; use only real available manual fallback. |
| F57 | P2: English catalogue hash changed during this run while other owner work continued. | No overwrites/restores; candidates are source-snapshot-bound and must be checked against final contracts before implementation. |
| F58 | P1: No browser, provider, database, payment, claim, carrier or production flow was executed. | Draft semantic coverage is not implementation completeness, owner acceptance, live visual acceptance or release readiness. |
| F59 | P2 / repaired: final table initially had inconsistent columns; filtered reviewer reads required bounded re-reads; a literal intake-heading assertion became stale after custodian assigned T011. | Structure repaired; complete inputs restored; verify the retained task body and registered ID without overwriting normal custodian edits. No runtime defect implied. |

## Learning and architecture handling

Continuous-learning-v2 current project was inspected before writing anything.
Existing content-first/unknown-result/approval-scope instincts were reused rather
than duplicated. Two new **project-only, confidence 0.7** source-reading guards
were dry-run imported, then imported from `learning-instincts.md`: shared ready
state is not a new completion event, and refresh is a distinct mounted-token
loss case. No global promotion, observer/hook setup, model dispatch or migration.

Council's isolated Skeptic/Pragmatist/Critic voices unanimously supported
committing owned pass artifacts, not onboarding the entire untracked shared
To-Do board. Raw positions and the Architect's pre-council position are in
`00-run.md`. No ADR directory existed. No new architectural choice was made;
system design/ADR proposals remain with their owners and approval gates. The
ADR skill is not a reason to create a record for ordinary phrasing.

## Final checks / restart evidence

Final round: both fresh reviewers PASS on E01–E11, route/exclusion coverage,
findings index and the single task snapshot. No material semantic blocker was
found within the explicitly conditional/draft/HOLD scope. A suggestion to update
future-tense execution statements was applied only after verifying execution.

Doc-only security review passed for the seven pass/learning Markdown files and
unchanged historical calibration document before these final factual status
updates. No credential/private bearer/customer-record disclosure was found.
Deterministic table, local-link, unique-row and file-size checks passed after
repairing F59. The four journey passes contain 157 state/context rows; this final
shared-controls supplement adds 11, for **168 rows**, including held references
and gates—not 168 approved/translatable runtime strings.

`messages/ko.json` remains byte-identical to the start, SHA-256
`44d2db28c98fac07dab9fea96771546390cbe79988ff4cddb35a967c1cf7a2e8`.
English changed from owner WIP hash `862df37d82d580f609622a2b2d59c3f9be08a80290a36616473e15c924ac3c18`
to observed `d772015544d91ccde611b5c49ef780c461c91ff9bb7c226ffcd1b881cec9d098`
during the loop; none of this loop's commits stages that file or runtime source.
Claim UI's generic catch and ReadingStage's callback behaviour were rechecked
before final coverage, rather than assuming English WIP fixed those gates.

Every candidate remains local and unimplemented.
Finding status describes the source/behaviour at inspection time, not a claim
that concurrently edited implementation cannot already have repaired it.
T011 triage must revalidate each gate against the final owner candidate before
creating duplicate implementation work. Editorial end-to-end coverage reached
approximately 04:59 KST, before the 06:18:57 hard stop; this is not a production
readiness assessment or authorization to enter a deployment/dependency phase.
No dependency audit/install or application build was needed for a documentation-
only scope. No blocked test was hidden as passed; no physical-memory quota proof
is inferred from a heap limit or root-tree RSS sum.

## Single task snapshot — exact intended To-Do intake

The following block is the **one** consolidated intake item requested by the
owner. It was appended once at 2026-11-11 04:55:00 KST, initially line 1031,
without replacing existing bytes or staging the previously untracked shared
board. Exact block SHA-256 is
`d6137c88f7732a38ead528254e7fae60460af82a4412d9b5622fdfb6be9d52b5`.
Links inside the block are relative to `docs/To-Do List.md`. The committed
snapshot is the durable source if the custodian later moves/formats the item.

At 04:57:14 KST the custodian registered this as **T011 — Korean UX copy
finalization**, preserved the original F01–F59 body, and moved it into the active
registry. The incoming heading became “Original incoming capture.” A subsequent
literal-heading assertion failed for that expected maintenance change; it was
replaced by registered-ID plus exact retained-body verification. No duplicate
task was appended and no custodian changes were overwritten.

```markdown
## Incoming task — Korean UX copy finalization (KOCOPY-20261111)

**Implementation:** ( ). **Phase:** end-to-end editorial/state review complete;
final Korean copy, source fixes and live acceptance remain pending.
**Owner/delegation:** copy calibration chat; registry ID/priority assignment is
for the To-Do custodian. **Priority:** P1 risk triage proposed for money/identity/
false-action items; final wording is downstream. This is ONE intake task, not
duplicate implementations of T001/T004/T005/T006/T007/T010.

**Evidence:** [run/checkpoint](reference/korean-copy-passes/00-run.md),
[account/proof](reference/korean-copy-passes/01-account-and-verification.md),
[settings/navigation](reference/korean-copy-passes/02-settings-navigation-reading.md),
[offer/delivery](reference/korean-copy-passes/03-offer-delivery-checkout.md),
[payment/orders/claim](reference/korean-copy-passes/04-payment-orders-invitations.md),
[coverage and complete findings index](reference/korean-copy-passes/05-coverage-findings-and-task.md).

**Work to resolve, including failures/borderline items retained after repair:**
- [ ] F01–F12: confirm provisional-account semantics, phone/helper visibility,
  active locale propagation, receiver recovery and bound-phone conflict path;
  preserve repaired shared-state/event, task-control and refresh/help distinctions.
- [ ] F13–F20: distinguish locale persistence from selection; resolve handle/
  email-change recourse, authoritative phone proof, passkey lookup/result/safety
  states and other-session revocation before successful/empty-state claims.
- [ ] F21–F26: repair real navigation/sign-out actions and notification destination;
  verify reading persistence, unknown-only branches and empty/WebGL referents.
- [ ] F27–F33: align purchase/entitlement policy; expose safe fresh cart state and
  incompatible-cart resolution; clarify manual postcode/structured field errors;
  defer guest-registration/perk and seller/legal claims to their actual owners.
- [ ] F34–F48: coordinate same-attempt payment recovery, retirement terminology,
  operator/fulfillment routes, entitlement/claim eligibility, typed known-vs-
  unknown results, private-token retention and the reachable legacy callback.
- [ ] F49–F52: retain the repaired refresh-versus-leave case, generic-read retry,
  bearer-risk precision and original-link-first recovery; recheck T010/T005 drift.
- [ ] F53–F56: resolve publicly mounted unwired AuthCards, local-only saves,
  metadata/media-error timing and generic-copy consumers without selectable text.
- [ ] F57–F59: revalidate final source/English drift; obtain owner Korean review,
  explicit runtime scope and real browser/device/provider acceptance where needed;
  preserve repaired artifact/read-evidence checks rather than hiding their failures.

**Acceptance:** preserve exact owner-approved references; complete necessary
content and real next actions before tone/economy; use task-critical Korean
controls without bulk translating names/content. Two independent semantic
reviews are not owner/live acceptance. Keep confirmed/unknown/failed and proof/
membership/admission/fulfillment distinct. Do not implement held policies through
copy, promise contact/delivery/refunds or overwrite owner English/Korean work.

**Next action:** custodian triages this linked finding set against existing
owners, then routes bounded source/interaction and final-copy acceptance slices.
No provider, dependency, credential, deployment or publication permission is
created by this record. Runtime catalogues and UI were not edited by this loop.
```
