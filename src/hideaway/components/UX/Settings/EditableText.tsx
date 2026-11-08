"use client";

import { cn } from "@/lib/utils";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { SaveStatus, type SaveState } from "./SaveStatus";

type CommonProps = {
  initialValue: string;
  onSave: (next: string) => Promise<void>;
  validate?: (value: string) => string | null;
  emptyHint?: string;
  className?: string;
  disabled?: boolean;
};

type InputProps = CommonProps &
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "onBlur"
  > & {
    multiline?: false;
    maxLength?: number;
  };

type TextareaProps = CommonProps &
  Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "defaultValue" | "onChange" | "onBlur"
  > & {
    multiline: true;
    rows?: number;
    maxLength?: number;
  };

type EditableTextProps = InputProps | TextareaProps;

const sharedFieldClass = cn(
  "w-full border-0 border-b border-border/30 bg-transparent px-0 py-2",
  "text-sm font-light leading-relaxed tracking-tight text-foreground placeholder:text-foreground/25",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "hover:border-border/55",
  "focus:border-foreground/70 focus:outline-none",
  "focus:shadow-[0_1px_0_0_oklch(from_var(--foreground)_l_c_h/0.5)]"
);

export const EditableText = (props: EditableTextProps) => {
  const {
    initialValue,
    onSave,
    validate,
    emptyHint,
    className,
    disabled,
    maxLength
  } = props;

  const [value, setValue] = useState(initialValue);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const lastSavedRef = useRef(initialValue);

  // Sync if the upstream initialValue changes (e.g. after server refresh)
  useEffect(() => {
    setValue(initialValue);
    lastSavedRef.current = initialValue;
  }, [initialValue]);

  const commit = useCallback(async () => {
    const trimmed = value.trim();
    if (trimmed === lastSavedRef.current) {
      setState("idle");
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        setState("error");
        return;
      }
    }
    try {
      setState("saving");
      await onSave(trimmed);
      lastSavedRef.current = trimmed;
      setState("saved");
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setState("error");
    }
  }, [value, validate, onSave]);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement> | FocusEvent<HTMLTextAreaElement>) => {
      void commit();
    },
    [commit]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (state === "error") setState("idle");
    },
    [state]
  );

  const remaining =
    typeof maxLength === "number" ? maxLength - value.length : undefined;
  // Only surface the counter as you approach the limit. Keeps the form
  // visually quiet during normal editing.
  const showCounter =
    typeof remaining === "number" &&
    typeof maxLength === "number" &&
    (remaining <= 20 || remaining <= maxLength * 0.15);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {props.multiline ? (
        <textarea
          {...(props as TextareaProps)}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          rows={(props as TextareaProps).rows ?? 3}
          maxLength={maxLength}
          placeholder={emptyHint}
          className={cn(sharedFieldClass, "resize-none")}
        />
      ) : (
        <input
          {...(props as InputProps)}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={emptyHint}
          className={sharedFieldClass}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <SaveStatus state={state} errorMessage={error} />
        {showCounter && typeof remaining === "number" ? (
          <span
            aria-live="polite"
            className={cn(
              "font-sans text-[10px] tracking-widest tabular-nums",
              // Floor-compliant: ≥ /60 light, /55 dark for informative.
              remaining < 0
                ? "text-rouge-500"
                : remaining < 10
                  ? "text-rouge-500/85 dark:text-rouge-300/85"
                  : "text-foreground/60 dark:text-foreground/55"
            )}
          >
            {remaining < 0 ? `−${Math.abs(remaining)}` : remaining}
          </span>
        ) : null}
      </div>
    </div>
  );
};
