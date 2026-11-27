import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's primary button (Arc primary: the ink as the fill, 44 px tall, medium weight) as a plain
 * <button type="submit">. This is the one sanctioned exception to the core Button rule (Cordy, 27 Nov): core Button
 * needs the cursor and device providers and client JS, and these pages run none. The native form posts on its own.
 */
export function SubmitButton({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <button
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-preview-accent bg-preview-accent px-4 text-sm leading-6 font-medium text-preview-on-accent transition-[border-color,box-shadow,background-color,outline-color] duration-200 ease-out hover:bg-preview-accent/90 active:bg-preview-accent/85 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-preview-accent",
        className
      )}
      type="submit"
    >
      {children}
    </button>
  );
}
