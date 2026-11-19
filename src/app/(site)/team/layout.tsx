import type { ReactNode } from "react";

export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <span hidden data-business-footer-mode="hidden" />
      {children}
    </>
  );
}
