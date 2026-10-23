import localFont from "next/font/local";

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
export const Hyd=localFont({src: [
    {
      path: "public/assets/fonts/HA/H-A-Reg.woff2"
    }
  ],
  variable: "--font-hyd"
})
 export const Suit = localFont({
  src: [
    {
      path: "public/assets/fonts/SUIT-Variable.woff2"
    }
  ],
  variable: "--font-suit"
});
 export  const NarcissianNectare = localFont({
  src: [
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2",
      weight: "400",
      style: "normal"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-Italic.woff2",
      weight: "400",
      style: "italic"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-Medium.woff2",
      weight: "500",
      style: "normal"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-MediumItalic.woff2",
      weight: "500",
      style: "italic"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-Bold.woff2",
      weight: "700",
      style: "normal"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-BoldItalic.woff2",
      weight: "700",
      style: "italic"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-SemiBold.woff2",
      weight: "600",
      style: "normal"
    },
    {
      path: "public/assets/fonts/Narcissian-Nectare/NarcissianNectare-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic"
    }
  ],
  variable: "--font-narcissianNectare",
  fallback: ["blase"]
});