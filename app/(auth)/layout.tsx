import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./index.css";

export const metadata: Metadata = {
  title: "sphmrs",
  robots: { index: false, follow: false }
};

export default function PreviewLayout({
  children
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 grid min-h-svh place-items-center bg-preview-surface px-5 py-8 font-sans text-base font-normal text-preview-foreground">
        <main className="w-full max-w-100">
          {children}
          <footer className="mt-8 text-xs text-preview-muted">FOR STAFF ONLY</footer>
        </main>
      </body>
    </html>
  );
}
