# Design QA — compact authentication chooser

Previous, separate Blink motion report preserved verbatim at [docs/qa/blink-motion-fidelity-20261003.md](docs/qa/blink-motion-fidelity-20261003.md); its blocked historical verdict is unchanged.

## Findings

No remaining actionable P0/P1/P2 finding in the **chooser presentation / pattern-adaptation** scope after the corrections below. This is not a pixel-match verdict for Apple Notes or an approved custom mock, and is not acceptance of the full authentication procedure.

## Visual truth and comparison scope

- Source: Apple's official HIG Sheets page, actual Notes Format compact sheet screenshot: `artifacts/qa/verification-20261025/apple-sheet-refine/apple-notes-reference.jpg`. The Action Sheets page's actual Mail example was also inspected live.
- Local product specification: `artifacts/qa/verification-20261025/apple-sheet-refine/design-contract.md`.
- Combined comparison input: `artifacts/qa/verification-20261025/apple-sheet-refine/source-implementation-comparison.jpg`, rendered from `comparison.html`. Source and implementation were viewed together, not merely in separate image calls.
- Source capture: JPEG1265×712. Focused Notes sheet crop230×164 at x391/y382, scaled uniformly to380px wide for comparison. Original asset remains unchanged. Its native device density is not inferred from the downscaled documentation image.
- Final implementation: English/Korean JPEG715×890 at the current browser viewport; exact narrow PNG319×560 and390×844 at CSS scale1/DPR1. `viewport-390-final.json` records actual CSS viewport, surface366×260, action52px and loaded font status.
- State/theme: dark, resting chooser, English and Korean, without submitting private data. The products and functional content differ deliberately: Notes formatting vs account entry. **No pixel-fidelity claim is made across those different states or fonts.** The combined panel comparison assesses the full chooser composition and its focused controls, not equality of the surrounding Apple documentation page and product page.

## Required fidelity surfaces

1. **Fonts/typography:** header originally inherited Helvetica Neue while controls used the existing Manrope UI font. Both now share `font-message`. Live computed family and18px/500/-0.36px heading tracking were checked; native browser font status is loaded and messageReady=true. Manrope rather than Apple's SF is an intentional product adaptation; Korean uses platform fallbacks. English and Korean fit at319px without truncation.
2. **Spacing/layout rhythm:** symmetric16px action gutters;32px shell /16px button radii;52px equal action heights; plain24px Or connector. Bare heading has an intentional24px optical inset in72px header rather than mechanically sharing the rounded controls'16px edge. The44px close target sits6px from the surface edges with a28px visual disc. Locale has44px target and8px lower inset. Three-size geometry and actual final images were inspected.
3. **Colors/tokens:** existing neutral dark material, restrained outline/shadow, white primary and dark secondary. Apple Notes yellow and controls are intentionally not copied. No green, gratuitous gradient, fabricated glass illustration or new background media. Hover/focus variants remain from shared controls.
4. **Image/asset fidelity:** no image or logo belongs in the chooser; tray wordmark removed. X and ChevronDown are real Lucide controls from the existing dependency, not handcrafted replacement art. The reference image is evidence, not an asset pasted into the product. The source documentation screenshot is visibly upscaled in the comparison, so it is not used for exact type-raster or sharpness judgments.
5. **Copy/content:** Sign up precedes Log in with matching centered labels, plain Or and no decorative action symbols. Korean action labels remain coherent; exact English Or is retained per user request. No promotional copy was introduced. Locale is a quiet native footer utility, not another heading-row action.

## Comparison history and fixes

- **P1 — unbalanced physical margins:** permanent right scrollbar reservation made nominal padding asymmetric and placed Close19px inward. Chooser-only gutter:auto removes the phantom reservation; measured action gutters16/16, close6/6.
- **P2 — crowded heading:** the first16px all-purpose alignment guide put bare Welcome text too close to the curved edge. Latest user feedback led to an optical24px inset and72px header. Fresh final captures show the extra breathing room.
- **P2 — mixed UI font scopes:** header and action font families differed. Header now uses the established Manrope scope; final live computed/loaded font evidence confirms it.
- **P2 — competing motion timing:** root radius had both CSS300ms and Motion token timing after an incomplete patch. CSS radius timing removed; the same Motion owner now animates geometry/radius, while Vaul alone owns entrance/drag transforms. Reviewed again after correction.
- Capture/debug issues were not counted as design iterations: misleading IAB widget-scaled mobile images were rejected and replaced by explicit CSS-viewport CDP captures in the same chosen browser.

## Interaction and frontend implementation evidence

- Six DOM tests exercise chooser hierarchy, locale switching, removal of wordmark, both flow entries and return focus. Final affected suite:133 tests passed. A transient member-auth integration-copy assertion failed during concurrent edits, then passed when rerun without any edits to that other session’s files. Canonical TypeScript and scoped ESLint passed.
- Earlier fixture-only browser harness passed714×890,390×844,319×560 with stable surface identity, actual geometry, close/Escape from chooser and both forms; no API calls or page errors.
- Final same-browser locale changes and signup→return→login were exercised without account data submission. Immediate snapshot showed focused Login with unavailable-integration notice/disabled Google. No duplicate IDs or console errors were observed in the inspected window. Later state changed during responsive emulation/concurrent local development; the cause was not established. This is **not** long-running persistence proof or evidence of an application motion bug.
- Shared tokens govern tray/fade timing; outgoing content and focused chooser header remain inert; listeners/ResizeObserver clean up. Existing content-size geometry is a deliberate exception to generic transform-only skill advice, because the user requests a real morph and Vaul already owns the root transform. No second drag implementation was added.

## Open questions / unproven areas

- No exact approved custom visual mock exists; acceptance is limited to the explicit local contract plus Apple-inspired compact-sheet anatomy.
- Physical touch drag, physical haptics and Safari are unverified. The chosen IAB rejects Input.dispatchTouchEvent; touch emulation was disabled again and viewport overrides were cleared.
- Revised Back/Cancel semantics, scrolled pending OTP reverse restoration, customer backend/provider success/error and session issuance remain outside this pass. No actual emails, phone numbers, codes or provider credentials were submitted.

## Implementation checklist

- [x] Compare source and rendered implementation together.
- [x] Check all five required fidelity surfaces and explicitly classify intentional source differences.
- [x] Fix asymmetric margins, crowded heading, mixed type scopes and competing radius timing.
- [x] Re-capture final viewport evidence; restore browser emulation settings.
- [ ] Verify physical drag/haptics and Safari separately before claiming those capabilities accepted.
- [ ] Resume paused focused-auth behavior only under its own contract.

## Follow-up polish

No additional decorative treatment is recommended. Prefer user feedback on the actual rendered tray over another arbitrary rearrangement.

final result: passed

Scope of this result: chooser presentation and Apple-pattern adaptation only, not pixel fidelity, physical gestures or completed authentication.

## Final review gate

One concise dual-independent Santa review completed for the final presentation: both reviewers PASS, no blockers. The separate design-qa reviewer and motion/frontend source reviewer also found no remaining scoped blocker. Exact pixel-clone fidelity, physical touch and backend acceptance are explicitly excluded.
