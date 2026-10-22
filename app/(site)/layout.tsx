import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/teaser.css";
import "@/styles/teaser-responsive.css";
import "@/styles/teaser-accessibility.css";
import { message, serif } from "@/fonts";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://sophomores.co"),
  title: "sophomores — experienced. not finished.",
  description:
    "A private social club. A first night. Something is taking shape.",
  robots: { index: false, follow: false } // Draft: enable only after release approval.
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${message.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
