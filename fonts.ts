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
