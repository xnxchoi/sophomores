"use client";
import { useFieldContext } from "@/hideaway/components/UX/Tour/form-context";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";
export default function TextArea({
  className,
  maxLength = 200,
  placeholder = "Your passion, work, interests — keep it interesting."
}: {
  className?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const field = useFieldContext<string | undefined>();
  const errors = field.state.meta.errors as unknown as Array<{
    code: string;
    inclusive: boolean;
    message: string;
    minimum: number;
    origin: string;
    path: string[];
  }>;
  console.log(field.state.meta.errors);

  return (
    <>
      <m.textarea
        className={cn(
          "w-full rounded-2xl border bg-transparent px-5 py-4",
          "text-[15px] text-foreground placeholder:text-muted-foreground/35",
          "transition-colors duration-150 focus:outline-none",
          "min-h-[112px] resize-none leading-relaxed",
          errors.length > 0
            ? "border-red-400/50 focus:border-red-400/70"
            : "border-foreground/15 focus:border-foreground/45",
          className
        )}
        placeholder={placeholder}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between px-2">
        {errors.length > 0 ? (
          <m.span
            className="text-xs text-red-400/80"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {errors[0].message}
          </m.span>
        ) : (
          <span />
        )}
        <span className="text-right text-xs text-muted-foreground/35 tabular-nums">
          {field.state.value?.length || 0}/{maxLength}
        </span>
      </div>
    </>
  );
}
