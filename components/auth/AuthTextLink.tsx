import type { ReactNode } from "react";

export function AuthTextLink({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex items-center">
      <a
        href={href}
        className="relative z-10 transition-colors duration-200 hover:text-foreground"
      >
        {children}
      </a>
      <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-px w-full origin-right scale-x-100 bg-border/80 transition-transform duration-300 group-hover:scale-x-0" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-px w-full origin-left scale-x-0 bg-foreground/80 transition-transform duration-300 group-hover:scale-x-100" />
    </span>
  );
}
