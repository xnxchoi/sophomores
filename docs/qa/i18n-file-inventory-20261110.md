# UI message consolidation — reviewed-file inventory

2026-11-10. Static reachability is a review seed, not live acceptance. Validation is reported separately.


## Authentication


| File | Classification / change |
| --- | --- |
| src/components/Authentication/account-phase-views.tsx | Migrated active shared phase presentation to native useTranslations(AuthPhase), including typed failure keys, busy states, fields and accessible labels. No active phaseCopy import remains. |
| src/components/Authentication/_shared/account-phase-copy.ts | Excluded runtime study catalogue: imports remain only in unimported composition-studies.tsx and account-phase-study.tsx. Preserved byte-for-byte; active phase presentation no longer consumes it. |
| src/components/Authentication/_shared/account-phase-types.ts | Reviewed type-only contracts; unchanged. locale remains a compatibility prop but active views obtain translations from next-intl context. |
| src/components/Authentication/member-auth/account-study.tsx | Migrated standalone account entry, chooser chrome and recovery binding-error presentation. BrandMark text untouched. Native locale prop en unchanged. |
| src/components/Authentication/member-auth/account-view.tsx | Migrated member/setup, ticket email entry, alternatives, status/error/notice presentation; countdown uses ICU seconds value. Known typed failures translate by code, not Error.message. |
| src/components/Authentication/member-auth/account-recovery-view.tsx | Migrated complete private intake form, validation, receipt, retries and accessible statuses. Local error state now stores message keys and translates during render. Network diagnostics remain non-presentational. |
| src/components/Authentication/member-auth/phone-step.tsx | Migrated registration completion/recovery chrome; verification-owned UI stays with root. |
| src/components/Authentication/member-auth/account-controls.tsx | Reviewed copy-free reusable controls; unchanged. |
| src/components/Authentication/member-auth/_shared/session.ts | Added optional noticeCode discriminant for five success notices, reset with notice lifetime. Existing notice/error text retained strictly for compatibility diagnostics and existing session consumers/tests. No backend/auth/state-transition changes. |
| src/components/auth/account-forms.tsx | Migrated reachable reading-stage signup/password-reset examples (AuthCards). |
| src/components/auth/second-factor.tsx | Migrated reachable reading-stage factor/passkey examples (AuthCards). |
| src/components/auth/sign-in-card.tsx | Migrated reachable reading-stage sign-in example (AuthCards). |
| src/components/auth/auth-panel.tsx | Reviewed copy-free shell; unchanged. |
| src/components/auth/auth-actions.tsx | Reviewed copy-free controls; unchanged. |
| src/components/auth/drawn-field.tsx | Empty file; unchanged. |
| src/app/(auth)/login/page.tsx | Migrated preview credential page via native async getTranslations; native form action and field names untouched. |
| src/app/(auth)/logout/page.tsx | Migrated preview logout page via native async getTranslations; native navigation/form action untouched. |
| src/lib/member-auth/client.ts | Reviewed; unchanged. Typed Error.message diagnostic strings and user-entered/stored passkey name are not translated or treated as backend contract labels. All owned UI renders known failures by typed failure code. |

## Customer surfaces


| File | Status |
|---|---|
| `src/app/(site)/me/settings/account/page.client.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/me/settings/account/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/me/settings/general/page.client.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/me/settings/general/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/me/settings/layout.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/me/settings/page.client.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/me/settings/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/me/settings/security/page.client.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/me/settings/security/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/shop/invitations/claim/page.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/shop/orders/[id]/page.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/shop/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/shop/payment/page.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/tickets/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/app/(site)/tickets/payment/page.tsx` | Migrated static metadata to canonical English; routing/data wrapper unchanged |
| `src/components/commerce/checkout.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/commerce/invitation-claim.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/commerce/offer.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/commerce/order-admissions.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/commerce/payment.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/commerce/shipping-address.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/reading/article-hero.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/reading/bookmark-button.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/reading/page-links.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/reading/post-archive.tsx` | Reviewed: CMS/slot-owned article values, no remaining interface literals |
| `src/components/reading/post-card.tsx` | Reviewed: CMS/slot-owned article values, no remaining interface literals |
| `src/components/reading/reader.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/reading/reading-stage.tsx` | Reviewed: CMS/slot-owned article values, no remaining interface literals |
| `src/components/settings/ActionField.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/settings/FieldRow.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/settings/LockedField.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/settings/Panel.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/settings/SettingsNav.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/settings/SettingsPane.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/settings/SettingsRail.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/settings/SubRouteHeader.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/shell/cursor.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/header-actions.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/shell/header-panels.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/shell/menu-button.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/shell/menu-frame.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/menu-gradient.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/menu-shaders.ts` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/page-motion.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/site-header.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/site-menu.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/shell/site-scroll.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/site-theme.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/LineFieldMesh.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/TickerCrown.client.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/TickerCrown.tsx` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/field-config.ts` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/useBezelDisplacementTexture.ts` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/shell/ticker/useLaneScheduler.ts` | Reviewed: structural/motion/input primitive; no first-party English interface copy |
| `src/components/tickets/_shared/checkout-intent.ts` | Reviewed: protocol/data module; no UI copy |
| `src/components/tickets/portone-checkout.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/tickets/portone-payment-result.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/tickets/ticket-account-entry.tsx` | Delegated: auth worker owns account presentation |
| `src/components/tickets/ticket-selection.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/tickets/ticket-study.tsx` | Excluded: unimported interaction/marketing study; restored byte-for-byte to HEAD |
| `src/lib/settings/sections.ts` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/lib/content/menu.ts` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/app/(site)/client-layout.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/UX/Menu/MenuButton.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |
| `src/components/UX/DarkMode/Darkmode.tsx` | Migrated interface copy / canonical message-key consumer; CMS/stored values retained |

## Staff and schemas


| File | Classification / outcome |
| --- | --- |
| `src/lib/payload/admin/commerce/admission-controls.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/commerce/order-controls.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/commerce/operation-panel.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/commerce/event-manifest.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/recovery-review.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/staff-login-form.tsx` | Migrated visible copy, accessible labels and feedback to next-intl `useTranslations`; dynamic operational values remain interpolated data. |
| `src/lib/payload/admin/commerce/fields.tsx` | Reviewed: no visible local English copy; component/auth/security ownership unchanged. |
| `src/lib/payload/admin/staff-login.tsx` | Reviewed: no visible local English copy; component/auth/security ownership unchanged. |
| `src/lib/payload/admin/staff-login-plugin.ts` | Reviewed: no visible local English copy; component/auth/security ownership unchanged. |
| `src/lib/payload/collections/account-recovery-requests/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/admins/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/albums/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/bookmarks/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/categories/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/citations/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/commerce-admissions/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/commerce-allowances/index.ts` | Reviewed: no explicit local schema display copy. Auto-derived vendor field labels and stored protocol values unchanged. |
| `src/lib/payload/collections/commerce-claims/index.ts` | Reviewed: no explicit local schema display copy. Auto-derived vendor field labels and stored protocol values unchanged. |
| `src/lib/payload/collections/commerce-events/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/commerce-redemptions/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/commerce-reservations/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/home-page/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/media/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/notifications/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/orders/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/playlists/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/posts/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/tags/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/tracks/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/users/index.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/commerce/_shared/collection.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/commerce/catalogue.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/commerce/ecommerce.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/commerce/portone/adapter.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/payload.config.ts` | Migrated explicit schema labels/descriptions/groups/options via direct canonical English JSON boundary import. Stored names, values, defaults and CMS data unchanged. |
| `src/lib/payload/collections/index.ts`, `src/lib/payload/{index,configuration}.ts`, `src/lib/commerce/domain.ts` | Reviewed registry/config/operational glue; no schema display copy to relocate. Protocol/log errors preserved. |
| `tests/payload/staff-login-availability.test.tsx` | Existing assertions retained; local provider wrapper supplies `messagesByLocale.en`. |
| `tests/commerce/admin/operator-ui-dom.test.tsx`, `tests/member-auth/recovery/review-controls-dom.test.tsx` | Existing assertions retained; local render helper provider persists across rerender. |
| `tests/fixtures/{staff-login,commerce-operator,recovery-review}-preview.tsx` | Added canonical English provider to synthetic preview root; fixture-only copy remains test-owned. |
| `tests/i18n/staff-copy.test.ts` | Added canonical interpolation and staff security/review warning contract assertions; not run. |

## Residual shared interfaces

| Surface / file | Action and preserved boundary |
|---|---|
| `src/components/UX/Menu/MenuButton.tsx` | Already migrated by customer worker to `Customer.menuButton`; not edited here. |
| `src/components/UX/DarkMode/Darkmode.tsx` | Already migrated by customer worker to `Customer.themeControl`; not edited here. |
| `src/components/UX/Menu/index.tsx`, `src/components/ui/button.tsx` | **No final edits**. Reviewer traced FOCUS as protocol, never caption: `src/components/UX/Cursor/index.tsx` lines155–177 excludes FOCUS/DRAG from text branch and selects ring geometry. Original inventory classification was incorrect; do not translate these stored cursor values. |
| `src/components/UX/Tour/InterfaceTour.tsx` | Native useTranslations at tooltip display; previous/close/next/done and target labels/descriptions. Bounds, keys, geometry, animation unchanged. |
| `src/stores/Tour/TourStore.ts` | Preset labels/descriptions now semantic message keys, resolved at display. IDs/shortcuts/placement/store operations unchanged. |
| Other `src/components/UX/Tour/**` | Reviewed, no independent UI copy; unchanged. |
| `src/components/radio/play-pause.tsx` | Play/pause accessible names only; SVG/GSAP unchanged. |
| `src/components/radio/tape-counter.tsx` | Whole timer accessible message with elapsed/remaining placeholders; serialized time values unchanged. |
| `src/components/radio/tape-reels.tsx` | SUPPLY/TAKE-UP labels only; SVG coordinates/type/motion unchanged. |
| `src/components/radio/track-player.tsx` | Rewind/forward accessible names only; audio state/provider calls unchanged. |
| Other `src/components/radio/**` | Track content/metadata and renderer-only files excluded, unchanged. |
| `src/components/notifications/notification-list.tsx` | Empty/read/mark-read UI; title/body/href/IDs untouched. |
| `src/components/sections/credits-rail.tsx` | Credits heading and close portrait only; names/roles/portraits/alts/content/motion untouched. |
| `src/components/arc/copy-button/copy-button.tsx` | Default Copy, Copied/Failed and whole announcements with caller-label placeholder; clipboard hook/state/styles unchanged. |
| `src/app/(site)/_commerce/seller-disclosure.tsx` | Local Korean headings/navigation/unavailable text factually adapted into canonical English; no policy or CMS seller value changes. Fixed lang=ko removed so locale can inherit; native non-async shared useTranslations supported by current docs. |
| `tests/i18n/interface-copy.test.ts` | Test-first source/catalogue contract: ICU time/caller label interpolation, stable tour IDs, display-time translation, unchanged content boundaries. Awaits root English merge and guarded run. |
| `tests/commerce/public-disclosures.test.tsx` | Customer worker owns provider/English assertion update (also covers their PolicyPage changes). |

## Conditional developer interfaces


| File | Classification / result |
| --- | --- |
| `src/components/Warp/dev-controls.tsx` | Migrated control, layer, transport, color, reset, clipboard-feedback and accessible captions to native next-intl hook. Group IDs/React keys unchanged; group legends translate only at presentation. |
| `src/components/Warp/editor/clip-inspector.tsx` | Migrated inspector, timing, easing, preset, keyboard-handle and accessible captions. Existing preset label strings remain select values/IDs; separate `caption` keys render via hook. Coordinate identifiers and Bézier tuples unchanged. |
| `src/components/Warp/editor/domain-timeline.tsx` | Migrated timeline, zoom, lane, selection/easing accessible captions and original-corona reference captions. Row/action/effect/domain IDs, timeline engine, edit bounds, SVG path and all geometry unchanged. |
| `src/components/Warp/editor/draft-transfer.tsx` | Migrated reset, import/export/apply, clipboard/validation feedback and accessible captions. Versioned JSON schema, exported payload and parse behavior unchanged. |
| `src/components/Warp/editor/sequence-editor.tsx` | Migrated shell, transport, clocks/tabs, selection/scene-pick, timing, help and feedback captions. Protocol IDs, keyboard keys, DOM/data attributes, motion/easing/geometry unchanged. |
| `src/components/Warp/editor/{editor-button,numeric-field}.tsx` | Reviewed renderers: no independent caption ownership; unchanged. |
| `src/components/Warp/_shared/sequence-editor.ts` | Typed clip display keys resolve through native hooks at runtime. Custom validation carries structured translation params; native view hooks format feedback, while canonical English diagnostic messages remain compatible. Existing groups/domain/clip IDs, defaults, numeric bounds, issue paths/codes and draft version/shape unchanged. Programmatic character-count RangeError remains diagnostic. |
| `src/components/Warp/_shared/tuning.ts` | Typed control display keys resolve through native hooks at runtime; canonical English diagnostic fields remain compatible; all group/key IDs, numeric bounds/defaults and Motion logic unchanged. |
| `tests/i18n/developer-copy.test.ts` | Added canonical-caption/interpolation, protocol/exported-ID/default/bounds and validation-message regressions before implementation; root receipts reported separately. |
| `tests/warp/{dev-controls,sequence-editor-ui}.test.tsx` | Existing assertions preserved. Local render helper reuses existing `EnglishMessages` wrapper, retaining provider across rerenders. Root's SSR English render helper preserved. |
| `src/components/Devtools/flame-editor/flame-editor.tsx` | Unreachable from active source import closure; direct source search found no active import. Left untouched. |
| `src/components/Devtools/flame-reference/{reference.tsx,historical-renderer.ts}` | Inactive standalone/reference implementation; excluded and untouched. |
| `src/components/Warp/{index,warp-field}.tsx` | Root-owned functional UI; not edited by this worker. |

## Root integration and system interfaces

| File/scope | Classification |
|---|---|
| `src/i18n/{messages,request}.ts` | Canonical catalogue overlay; absent-key fallback only. |
| `src/app/(auth)/layout.tsx`, `src/app/(payload)/layout.tsx` | Native provider boundaries; staff footer caption canonical. |
| `src/lib/phone-verification/i18n.ts`, feature message JSON files | Identical duplicate catalogues retired in favor of root catalogues. |
| Phone verification tray/modal/trial | Canonical default/cancel caption; independent locale control retained. |
| `src/components/layouts/Missing/not-found-screen.tsx`, site not-found metadata | Functional return/error copy canonical; artwork unchanged. |
| Site homepage noscript, `Warp/index.tsx`, `Warp/warp-field.tsx` | System skip/entry/WebGL fallback captions only; marketing and motion untouched. |
| `src/components/teaser/{story,invitation-dialog}.tsx` | Functional chapter/playback/dismiss labels canonical; all narrative/CMS values unchanged. |
| `src/components/teaser/experience.tsx` | Unimported legacy experience; unchanged. |
| `src/hideaway/**`, old snapshots, unimported studies | Reference/quarantined, excluded. |
| Landing marketing, stored CMS product/event/article/seller/policy values | Excluded, remain in existing CMS/content ownership. |
| Native Payload/vendor UI | Vendor-owned, not forked into project messages. |


## Additional explicit exclusions and static boundaries

| File/scope | Classification |
|---|---|
| `src/components/Authentication/phone-verification/{authentication-entry,passwordless-login,verification-study}.tsx` | Unimported legacy study chain; local maps are not active application catalogues. Retained, not silently translated. |
| `src/app/(site)/{account,account/continue,essays,refund,terms,privacy,tickets,tickets/payment,shop,shop/payment,shop/invitations/claim,shop/orders/[id],me/settings,me/settings/account,me/settings/general,me/settings/security}/page.tsx` | Static metadata titles canonical English; names/titles stay English-anchored without adding request-dependent metadata behavior. |
| `src/app/(site)/me/settings/layout.tsx` | Static settings metadata title/description canonical English. |
| Native implicit Payload schema labels generated from field names | Vendor generation, not duplicated project copy maps; explicit project labels are canonical. |
| Standalone unimported flame editor/reference tools | Inactive source, excluded; see developer import evidence. |
