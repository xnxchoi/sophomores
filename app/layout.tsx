import type { Metadata } from "next";
import localFont from "next/font/local";
import "lenis/dist/lenis.css";
import "./globals.css";
import "./teaser.css";
import "./teaser-responsive.css";
import "./teaser-accessibility.css";

const mono = localFont({
  src: "../public/fonts/guida-reference.woff2",
  variable: "--font-teaser-mono",
  display: "swap"
});
const serif = localFont({
  src: "../public/fonts/nib-reference.woff2",
  variable: "--font-teaser-serif",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sophomores.co"),
  title: "sophomores — experienced. not finished.",
  description:
    "A private social club. A first night. Something is taking shape.",
  robots: { index: false, follow: false } // Draft: enable only after release approval.
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
