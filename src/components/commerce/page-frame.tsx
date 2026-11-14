import type { ReactNode } from "react";

/**
 * Structural frame for the storefront pages (03c). Heading and main landmark only.
 * Styling is deliberately minimal and provisional: the look waits for level 4.
 */
export function PageFrame({
  title,
  children
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-[70svh] max-w-2xl px-6 pt-32 pb-20 text-neutral-100">
      <h1 className="mb-8 text-3xl font-medium tracking-tight">{title}</h1>
      {children}
    </main>
  );
}
