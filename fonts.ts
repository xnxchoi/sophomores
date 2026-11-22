import localFont from "next/font/local";

// Each loader only defines a CSS variable, set on <html> with `.variable` (never `.className`); the
// "Typography roles" @theme block in src/styles/globals.css maps the roles (sans, serif, display, mono,
// heading) to these variables. Geist Mono comes straight from the installed `geist` package where it is used.

export const message = localFont({
  src: "./public/fonts/manrope/Manrope-Regular-latin.woff2",
  variable: "--font-manrope",
  weight: "400",
  display: "swap"
});
export const serif = localFont({
  src: "./public/fonts/nib-reference.woff2",
  variable: "--font-teaser-serif",
  display: "swap"
});
export const Hyd = localFont({
  src: [
    {
      path: "./public/fonts/HA/H-A-Reg.woff2"
    }
  ],
  variable: "--font-hyd"
});
// Korean behind Helvetica in the sans role. Not preloaded: the browser fetches it when a page shows Hangul.
export const Suit = localFont({
  src: [
    {
      path: "./public/fonts/SUIT-Variable.woff2"
    }
  ],
  variable: "--font-suit",
  preload: false
});
export const Pretendard = localFont({
  src: [
    {
      path: "./public/fonts/Pretendard/PretendardGOVVariable.woff2"
    }
  ],
  variable: "--font-pretendard",
  preload: false
});
export const NarcissianNectare = localFont({
  src: [
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2",
      weight: "400",
      style: "normal"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Italic.woff2",
      weight: "400",
      style: "italic"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Medium.woff2",
      weight: "500",
      style: "normal"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-MediumItalic.woff2",
      weight: "500",
      style: "italic"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-Bold.woff2",
      weight: "700",
      style: "normal"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-BoldItalic.woff2",
      weight: "700",
      style: "italic"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-SemiBold.woff2",
      weight: "600",
      style: "normal"
    },
    {
      path: "./public/fonts/Narcissian-Nectare/NarcissianNectare-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic"
    }
  ],
  variable: "--font-narcissianNectare"
});
