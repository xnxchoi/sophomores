"use client";

import { useState } from "react";
import { isSixDigitCode } from "@/lib/content/auth-code";

export function TwoFactorCard({
  onSubmit
}: {
  onSubmit?: (input: { code: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className="flex flex-col gap-4 border border-border px-6 py-8"
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
      <h2 className="text-2xl font-light tracking-tight">Two-factor code</h2>
      <label className="flex flex-col gap-1 text-base">
        Code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="border-b border-border bg-transparent py-2 text-base outline-none"
        />
      </label>
      {invalid ? <p className="text-base">Enter 6 digits.</p> : null}
      <button type="submit" className="border border-border px-4 py-3 text-base">
        Verify
      </button>
    </form>
  );
}

export function PasskeyButton({ onPasskey }: { onPasskey?: () => void }) {
  return (
    <button type="button" className="border border-border px-4 py-3 text-base" onClick={() => onPasskey?.()}>
      Use a passkey
    </button>
  );
}
