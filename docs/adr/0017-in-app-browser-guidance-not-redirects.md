# 0017: In-app browser guidance stays user-controlled

- Status: accepted under delegated design authority
- Date: 2026-11-18

## Context

The inherited S7 queue calls for a messaging-app browser escape, following The Hideaway. Its actual `EscapeInAppBrowser` uses the detected-browser store, a modal and an explicit clipboard action. Its clipboard failure is silent. Sophomores already has the same browser classification and standard Button/Motion components; a second detector or package is unnecessary.

## Decision

Reuse the detected-browser store and explicit copy-link interaction, with a dismissible nonmodal semantic panel rather than a forced modal or automatic external-browser redirect. Hide it while the site menu is open and keep it below authentication dialogs. Dismissal lasts for the mounted public layout, without writing visitor preferences.

On ordinary public routes, read the current URL only when the visitor presses Copy page link; never persist, log or forward it to an external service. On `/shop/invitations/claim`, do not offer current-page copying: the owning claim component deliberately strips the private token from the address on mount. Instead direct the visitor to copy the buyer's original link from their message into their own browser. Never reacquire or persist the bearer in the global shell. Warn that invitation links are private. Show real copied/failure feedback on supported routes and keep retry available. Do not claim a browser was opened or that a provider flow will succeed.

## Alternatives

- Forced modal on every in-app entry: follows the reference literally, but unnecessarily interrupts readable public pages. Retained only as a possible future response to an actually demonstrated blocking flow.
- Automatic browser-specific URL schemes: rejected because behavior varies and this would move private URLs without a fresh explicit choice.
- New UA detector or package: rejected; existing `useDeviceInfo` already classifies the browser through the installed/shared detection code.
- Silent clipboard failure: rejected; a blocked clipboard must not appear to be a successful copy.

## Consequences And Reassessment

Independent source review caught two implementation defects before handoff: the first version incorrectly assumed invitation fragments remained in the address, and the scrollable overlay lacked Lenis wheel isolation. Both were corrected with invitation-specific original-link instructions and a native-scroll exemption/overscroll containment. These are source fixes, not proof of device acceptance.

Browser detection is heuristic and this guidance does not establish provider or physical-device acceptance. Verify actual in-app, ordinary browser, clipboard-blocked, phone safe-area, keyboard and dialog/menu overlap behavior during live/device review. Keep user-controlled continuation available.

Reassess if observed in-app behavior requires a more specific escape path, if existing classification misses a supported app, or if a verified provider contract offers a reliable browser handoff. Do not infer such capability from the browser name alone.

## Restore

Remove `InAppBrowserHelp` from ClientLayout and its owning component/catalogue namespace to restore the earlier behavior. There is no persisted URL, storage preference, credential or backend state to undo. Preserve the separately frozen Help/shop/policy source batch.
