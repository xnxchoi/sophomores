# Sign-in provider marks

Owner decision, 2026-11-16: the sign-in buttons stay monochrome except where a
provider's guideline requires otherwise. Each mark is the provider's own published
artwork, never redrawn. `published/` holds the files exactly as downloaded on
2026-11-16; `public/auth-providers/` holds the served copies.

| Served file | Published file | Source | Change |
| --- | --- | --- | --- |
| `apple-logo.svg` | `apple-siwa-left-aligned-black-medium.svg` (`Logo - SIWA - Left-aligned - Black - Medium.svg`) | Apple Design Resources, `https://devimages-cdn.apple.com/design/resources/download/Logo-Sign-in-with-Apple.dmg`, linked from `https://developer.apple.com/design/resources/` | None. |
| `google-g.svg` | `google-dark-icon-square-android-web.svg` (`Android + Web/SVG/Dark/Theme=Dark, Show text=No, Shape=Square, Platform=Android+Web.svg`) | `https://developers.google.com/static/identity/images/signin-assets.zip`, linked from Google's Sign in with Google branding guidelines | Root `viewBox` set to the 20 × 20 "G" area (`10 10 20 20`). The paths are untouched. |
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
