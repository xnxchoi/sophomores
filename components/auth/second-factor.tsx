"use client";

import { useState } from "react";
import { isSixDigitCode } from "@/lib/content/auth-code";
import { AuthAlternate, AuthSubmit } from "./auth-styles";
import { AuthPanel } from "./auth-panel";

export function TwoFactorCard({
  onSubmit
}: {
  onSubmit?: (input: { code: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <AuthPanel title="Two-factor code" description="Enter the six-digit code.">
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSixDigitCode(code)) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onSubmit?.({ code });
        }}
      >
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="code-field"
          aria-label="Code"
        />
        {invalid ? <p>Enter 6 digits.</p> : null}
        <AuthSubmit>Verify</AuthSubmit>
      </form>
    </AuthPanel>
  );
}

export function PasskeyButton({ onPasskey }: { onPasskey?: () => void }) {
  return (
    <AuthAlternate onClick={onPasskey}>Use a passkey</AuthAlternate>
  );
}
