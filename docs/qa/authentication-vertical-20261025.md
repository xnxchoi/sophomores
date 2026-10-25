# Selected vertical account-entry study

- Scope: isolated composition study only. Working authentication, providers and backend unchanged.
- User decision: reject horizontal; continue vertical. Top-edge crowding is a repeated failure, not an acceptable tradeoff.
- Change: vertical only on the study page; distinct padded control rail; first action 80 CSS px below the surface top; close hit target 16 CSS px below the top. Login heading inset 84 CSS px. Focused surface expands from 380 to 440 CSS px at the default viewport.
- Live inspection: 714×812 default viewport and 354×767 narrow viewport; no horizontal overflow. Login/signup, Back, Cancel, Escape and reopening exercised. Back returns to chooser; dismissal remains local to the study. Fields are synthetic, readonly; Continue is disabled.
- Typography: existing message font and regular UI hierarchy; no brand mark. Palette remains monochrome. Existing restrained surface shadow retained; no decorative imagery.
- Motion: same surface eases between anchored chooser and centered form. No reduced-motion gate added. Native touch/haptic output and real authentication are not validated.
- Evidence: `artifacts/qa/verification-20261025/vertical-selected/chooser-final.png`, captured directly via CDP after confirming DOM state `chooser`. Native screenshot output was stale in one capture; `chooser-default.jpg` is not valid chooser evidence.
- Validation: 22 focused tests passed, scoped ESLint passed. No full build or full test suite run. Test watchdog peak 301 MiB; static preview server approximately 26 MiB RSS, with a 256 MiB aggregate cutoff. Next dev stopped at its 2304 MiB aggregate cutoff rather than being kept running.
- Single Santa review: two independent source/screenshot reviewers passed this bounded spacing and presentation change. This is not Apple-level aesthetic approval or production-auth acceptance.
- Design-QA limit: Apple sign-in was inspected as a hierarchy reference, not an approved matching mock. Pixel-fidelity acceptance is not claimed.

## Follow-up: scrollbar-free morph

- Inner overflow remains `auto`; scrollbar painting/width is suppressed, rather than disabling scrolling or reserving a gutter that would change content alignment.
- Live frame sampling: 60 frames in each direction. Transient overflow occurred in 33 forward and 19 reverse frames; every frame retained zero scrollbar gutter and computed `scrollbar-width: none`. Forward sampled chooser/login; reverse sampled signup/chooser while the user explored the live study.
- Evidence: `artifacts/qa/verification-20261025/vertical-selected/morph-scroll/samples.json` and `focused-signup.png`.
- Regression: 23 focused tests passed (297 MiB watchdog peak); scoped ESLint passed. No full build or full-suite run.

## Follow-up: coherent spacing instead of accumulated padding

- Revisited the saved Apple Notes sheet reference for the relationship between surface controls and content; it is a pattern reference, not an approved matching mock.
- Moved language selection into the surrounding study header. Removed the orphaned internal footer. Applied one 24px content inset, 8px gaps around the 20px Or row, and removed nested form padding.
- Chooser is now 380×228 CSS px at the default viewport. First action starts 72px below the top; close hit target starts 22px below the top. The visible close disc aligns with the 24px content edge.
- Live default view and form inspected. Corrected narrow capture is 390×844 at DPR1, with tray x28–362 and locale x293–370; document scroll width390. `chooser-narrow.png` was a transient/mismatched capture and is excluded. Use `spacing-refine/chooser-narrow-viewport.png` instead.
- Evidence: `spacing-refine/{chooser,focused,chooser-detail,chooser-narrow-viewport}.png` under the same artifact directory; `metrics.json` records default-view geometry.
- 24 focused tests passed (306 MiB watchdog peak); scoped ESLint passed. Two independent Santa reviewers passed the bounded spacing correction using the corrected narrow capture. This does not claim finished aesthetic quality or production-auth acceptance.

## Follow-up: refine the original hierarchy and material

- Reference: the user's attached original tray, `codex-clipboard-bb6f48b8-a2ec-4c02-840d-5be05a3a3252.png`. Observed contributors to the cheap impression: mismatched action alignment/icons, a relatively emphatic secondary outline, and tightly packed title typography. These are design hypotheses, not objective proof of taste.
- Restored visible Welcome and the source subtitle, rather than leaving disconnected controls in an empty shell. Kept Sign up first and the plain Or separator, as previously requested; these intentionally differ from the original image.
- Both choices now use `StudyChoiceAction`: identical 52px height, 14px radius, left alignment, 20px inner inset and typography. Removed mismatched action icons. Primary is a softer off-white with no white bevel; secondary has restrained fill and border. Outer material remains monochrome with subtle edge light/shadow, not added glass or gradients.
- Title uses calmer tracking and a deliberate type/body relationship. Language remains outside the tray; no wordmark, new font dependency or authentication behavior was introduced.
- Consolidated the focused input's separated rings into one clearly visible contour. Live focus was confirmed with zero outline offset and matching border/outline colors.
- Accepted evidence under `craft-refine/`: `chooser-desktop-settled.jpg`, `chooser-narrow.png`, `chooser-korean.png`, `focused-settled.jpg`. Exclude `chooser-desktop.png` and `chooser-detail.png`: they are invalid framing/cropping captures, not layout proof. The blue comment marker in an earlier capture is browser annotation chrome, not application UI.
- Live chooser, login, Back and English/Korean narrow text fit checked. Browser emulation cleared and original English view restored. No provider/backend requests or production-auth changes.
- Source and screenshots received one dual-independent Santa review with a focused correction for the input ring. Reviewers passed the bounded refinement; this is not final aesthetic approval or an Apple-level quality claim. No exact pixel-clone acceptance is asserted: action order, icons, separator and material differences are intentional refinements.
- Validation: 26 focused tests passed, including RED/green hierarchy and focus regressions (301 MiB watchdog peak). Scoped ESLint passed (313 MiB peak); no full build or full-suite execution.

## Follow-up: five explicit browser comments

- Latest comments supersede the earlier subtitle, separator and left-aligned-caption experiments. Removed subtitle and Or in both locales, leaving Welcome and the two actions with a 12px gap. Both captions are centered; Sign up stays first.
- Restored the original `SecondaryButton` surface tokens for Log in: white/15 border, white/5 fill and the faint original inset edge, with eased hover/active feedback.
- Close control is concentric with the 28px tray corner: its 44px hit target has equal 6px top/right offsets, placing its center 28px from both edges. The 28px visible disc therefore has equal 14px visual insets. The grabber shares the 28px vertical center. Welcome's 72px top position is unchanged.
- Live geometry measured close center 27.994px from top/right, visible disc insets 13.99/14.00px and grabber center 27.997px. Actual captions compute to centered alignment, and neither subtitle nor separator exists. Login/Back remains functional; scrolling and motion are unchanged.
- Accepted screenshot: `annotation-refine/chooser.jpg` in the same artifact directory. Root inspected the actual render; two independent reviewers passed the five-comment correction. This is not broader aesthetic approval.
- RED captured against the obsolete styling; all 26 focused tests then passed (310 MiB watchdog peak). Scoped ESLint passed (310 MiB peak). No full build, deployment or production-auth changes.
