import type { ComponentProps } from "react";

/**
 * The site's underlined field (DrawnField `steady`, src/components/ui/input.tsx) as server markup: the label sits above,
 * the rule draws in from the left on focus and stays drawn with a value. Pure CSS, so it works with no script. DrawnField
 * itself is not imported: its module pulls client primitives into a page that loads none.
 */
export function Field({ label, id, ...props }: { label: string; id: string } & ComponentProps<"input">) {
  return (
    <div className="relative pt-7 pointer-coarse:pt-6">
      <input
        {...props}
        id={id}
        placeholder=" "
        className="peer m-0 block h-10 w-full rounded-none border-0 border-b border-preview-border bg-transparent p-0 pb-2 text-base leading-6 font-normal text-preview-foreground outline-none transition-[border-color,box-shadow,background-color,outline-color] duration-200 ease-out placeholder:text-transparent autofill:shadow-[inset_0_0_0_100px_var(--color-preview-surface)] autofill:[-webkit-text-fill-color:var(--color-preview-foreground)] pointer-coarse:h-11"
      />
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-px origin-right scale-x-0 bg-preview-foreground transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.32,1)] peer-focus:origin-left peer-focus:scale-x-100 peer-not-placeholder-shown:origin-left peer-not-placeholder-shown:scale-x-100" />
      <label
        htmlFor={id}
        className="absolute top-0 left-0 m-0 text-sm leading-5 font-normal text-preview-muted transition-colors duration-300 peer-focus:text-preview-foreground"
      >
        {label}
      </label>
    </div>
  );
}
