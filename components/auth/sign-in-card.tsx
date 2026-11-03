"use client";

import { useState } from "react";
import { DrawnField } from "./drawn-field";


export function SignInCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="port-rule flex flex-col gap-5 rounded-2xl border bg-faded-black px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ email, password });
      }}
    >
      <h2 className="font-serif text-4xl font-light tracking-tight">Sign in</h2>
      <DrawnField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <DrawnField label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button type="submit" className="port-control port-sheen inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-light tracking-wide">
        Continue
      </button>
    </form>
  );
}
