import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";

// Font roles follow The Hideaway (ADR 0008). Each loader only defines a variable, set on <html> with
// .variable; the @theme block in src/styles/globals.css maps the roles (sans, serif, wide, mono, dots) to
// these variables. More of The Hideaway's faces come over when a ported piece uses them.

export { GeistMono };

export const Suit = localFont({
  src: [{ path: "./public/fonts/SUIT-Variable.woff2" }],
  variable: "--font-suit"
});

export const NarcissianNectare = localFont({
  src: [
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2", weight: "400", style: "normal" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Italic.woff2", weight: "400", style: "italic" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Medium.woff2", weight: "500", style: "normal" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-MediumItalic.woff2", weight: "500", style: "italic" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Bold.woff2", weight: "700", style: "normal" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-BoldItalic.woff2", weight: "700", style: "italic" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-SemiBoldItalic.woff2", weight: "600", style: "italic" }
  ],
  variable: "--font-narcissianNectare"
});

// The Korean serif, behind Narcissian Nectare (which has no Hangul) and as the wide face. Not preloaded:
// the browser fetches it only when a page shows Korean serif or wide text.
export const Blase = localFont({
  src: [
    { path: "./public/fonts/Blase/BlaseLight.otf", weight: "300", style: "normal" },
    { path: "./public/fonts/Blase/BlaseRegular.otf", weight: "400", style: "normal" },
    { path: "./public/fonts/Blase/BlaseMedium.otf", weight: "500", style: "normal" },
    { path: "./public/fonts/Blase/BlaseBold.otf", weight: "700", style: "normal" }
  ],
  variable: "--font-blase",
  preload: false
});

// The dot face for the cursor's label and marquee.
export const Doto = localFont({
  src: [{ path: "./public/assets/fonts/Doto-Regular.ttf", weight: "400" }],
  variable: "--font-doto"
});
