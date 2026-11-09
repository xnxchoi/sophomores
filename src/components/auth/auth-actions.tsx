import type { ReactNode } from "react";
import { Button } from "../core/Button";

/** Hideaway `h-14` under a 10px root is 35px. Provider `h-12` is 30px. */
export function AuthSubmit({ children }: { children: ReactNode }) {
  return (
    <Button
      type="submit"
      className="inline-flex h-[35px] min-h-[35px] w-full items-center justify-center gap-2 rounded-md border border-faded-fg/65 bg-off-fg/30 px-4 py-3 text-[12px] font-light tracking-wide whitespace-nowrap text-faded-fg uppercase shadow-sm transition-colors duration-300 hover:bg-off-bg/50 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </Button>
  );
}

export function AuthAlternate({
  children,
  onClick
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="inline-flex h-[30px] w-full items-center justify-center gap-2 rounded-md border border-faded-fg/65 bg-off-bg/30 px-4 py-3 text-[12px] font-medium whitespace-nowrap text-faded-fg shadow-sm transition-colors duration-300 hover:bg-faded-bg/65 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </Button>
  );
}
