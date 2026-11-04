import { useFieldContext } from "@/components/UX/Tour/form-context";
import { cn } from "@/lib/utils";
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { ChangeEvent, useCallback } from "react";
export default function TextField({
  placeholder,
  className,
  autoComplete,
  ...props
}: Omit<HTMLMotionProps<"input">, "value" | "onBlur" | "onChange">) {
  const field = useFieldContext<string>();
  const errors = field.state.meta.errors;
  const handleChanger = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(e.target.value);
    },
    [field]
  );
  return (
    <div className="flex flex-col gap-1">
      <m.input
        className={cn(
          "w-full rounded-full border bg-transparent px-5 py-3.5",
          "text-[15px] text-foreground placeholder:text-muted-foreground/35",
          "transition-colors duration-150 focus:outline-none",
          "autofill:bg-transparent",
          errors.length > 0
            ? "border-red-400/50 focus:border-red-400/70"
            : "border-foreground/15 focus:border-foreground/45",
          className
        )}
        placeholder={placeholder}
        value={field.state.value}
        onChange={handleChanger}
        onBlur={field.handleBlur}
        autoComplete={autoComplete}
        {...props}
      />
      {errors.length > 0 && (
        <m.span
          className="px-2 text-xs text-red-400/80"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {errors[0].toString()}
        </m.span>
      )}
    </div>
  );
}
