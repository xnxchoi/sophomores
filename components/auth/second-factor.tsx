"use client";

import { useState } from "react";

import { isSixDigitCode } from "@/lib/content/auth-code";
import { DrawnField } from "./drawn-field";

export function TwoFactorCard({
  onSubmit
}: {
  onSubmit?: (input: { code: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className="port-rule flex flex-col gap-5 rounded-2xl border bg-faded-black px-6 py-8"
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
      <h2 className="font-serif text-4xl font-light tracking-tight">Two-factor code</h2>
      <DrawnField
        label="Code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      {invalid ? <p className="text-base">Enter 6 digits.</p> : null}
      <button type="submit" className="port-control port-sheen inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-light tracking-wide">
        Verify
      </button>
    </form>
  );
}

export function PasskeyButton({ onPasskey }: { onPasskey?: () => void }) {
  return (
    <button type="button" className="port-control port-sheen inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-light tracking-wide" onClick={() => onPasskey?.()}>
      Use a passkey
    </button>
  );
}
