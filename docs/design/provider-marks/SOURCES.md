# Sign-in provider marks

Owner decision, 2026-11-16: the sign-in buttons stay monochrome except where a
provider's guideline requires otherwise. Each mark is the provider's own published
artwork, never redrawn. `published/` holds the files exactly as downloaded on
2026-11-16; `public/auth-providers/` holds the served copies.

| Served file | Published file | Source | Change |
| --- | --- | --- | --- |
| `apple-logo.svg` | `apple-siwa-left-aligned-black-medium.svg` (`Logo - SIWA - Left-aligned - Black - Medium.svg`) | Apple Design Resources, `https://devimages-cdn.apple.com/design/resources/download/Logo-Sign-in-with-Apple.dmg`, linked from `https://developer.apple.com/design/resources/` | None. |
| `google-g.svg` | `google-dark-icon-square-android-web.svg` (`Android + Web/SVG/Dark/Theme=Dark, Show text=No, Shape=Square, Platform=Android+Web.svg`) | `https://developers.google.com/static/identity/images/signin-assets.zip`, linked from Google's Sign in with Google branding guidelines | Root `viewBox` set to the 20 × 20 "G" area (`10 10 20 20`). The paths are untouched. |
| `google-g-light.svg` | `google-light-icon-square-android-web.svg` (`Android + Web/SVG/Light/Theme=Light, Show text=No, Shape=Square, Platform=Android+Web.svg`, downloaded 2026-11-23) | Same Google archive as above | Root `viewBox` set to the 20 × 20 "G" area (`10 10 20 20`), as for the dark file. The paths are untouched. Used on light pages; the dark file on dark ones. |
| `kakao-symbol.svg` | `kakao-login-complete-en.svg` | `https://developers.kakao.com/tool/images/resource/preview/login-complete-en.svg`, on Kakao's resource page `https://developers.kakao.com/tool/resource/login` | Root `viewBox` set to the speech-bubble symbol (`43.5 16 14 14`). The paths are untouched. |

Guidelines read on 2026-11-16 (read-only GETs):

- Apple: Human Interface Guidelines, Sign in with Apple,
  `https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple`
  (its JSON data, `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sign-in-with-apple.json`).
- Google: Sign in with Google branding guidelines,
  `https://developers.google.com/identity/branding-guidelines`.
- Kakao: Kakao Login design guide,
  `https://developers.kakao.com/docs/latest/en/kakaologin/design-guide`.

Apple's artwork is used under the Apple Design Resources licence included in the
download. Kakao publishes its button resources as PNG and PSD downloads plus the SVG
preview above; the preview is its only published SVG.

Sizing, re-read 2026-11-23 (Apple HIG JSON above, read-only GET):

- Apple's only hard minimums are size and margin: width 140 pt, height 30 pt, margin 1/10 of the button height.
- The title is a proportion, worded as a requirement: "Regardless of the font you choose, the title and button height of
  your custom button need to use the same proportions the system uses. Using the system font, for example, the title's
  font size would be 43% of the button's height — in other words, the button's height should be 233% of the title's font
  size, rounded to the nearest integer."
- The sign-in step keeps Continue, Apple and Google on one text size (owner, 23 Nov: one scale outranks the 43%
  figure; coordinator ruling). At 48 px and 14 px the Apple title is 29% of the height, so this is a known departure from
  that proportion, not from a minimum.
