"use client";
import { HA_Textarea as Textarea } from "@/components/ui/textarea";
import { useCharacterLimit } from "@/hooks/use-character-limit";
import {
  ChangeEventHandler,
  ComponentProps,
  useCallback,
  useEffect,
  useId
} from "react";

export const MemoInput = (
  props: Omit<ComponentProps<"textarea">, "onChange"> & {
    onChange: (value: string) => void;
  }
) => {
  const { maxLength = 200, onChange, placeholder, disabled } = props;
  const id = useId();
  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit
  } = useCharacterLimit({ maxLength, initialValue: `${props.value || ""}` });
  const oC: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      handleChange(e);
    },
    [handleChange]
  );
  useEffect(() => {
    onChange(value);
  }, [onChange, value]);
  return (
    <div className={"*:not-first:mt-2"}>
      <Textarea
        placeholder={placeholder}
        className={"min-h-[120px]"}
        value={value}
        onChange={oC}
        maxLength={maxLength}
        id={id}
        disabled={disabled}
      />
      <p
        id={`${id}-description`}
        className="mt-2 text-right text-xs text-off-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="tabular-nums">{characterCount}</span>/
        <span className={"tabular-nums"}>{limit}</span>
      </p>
    </div>
  );
};
