import localFont from "next/font/local";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const suit = localFont({
  src: "../../../public/fonts/SUIT-Variable.woff2",
  variable: "--font-port-sans",
  weight: "100 900",
  display: "swap"
});

const nectar = localFont({
  src: "../../../public/fonts/Narcissian-Nectare/NarcissianNectare-Regular.woff2",
  variable: "--font-port-serif",
  weight: "400",
  display: "swap"
});

export default function ReadingLayout({ children }: { children: ReactNode }) {
  return <div className={cn("port-shade", suit.variable, nectar.variable)}>{children}</div>;
}
