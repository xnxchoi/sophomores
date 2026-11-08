import type { ComponentProps } from "react";
import { cn } from "cn";

export default function EditorButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "min-h-9 rounded border border-white/25 px-3 text-xs hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40",
        className
      )}
    />
  );
}
