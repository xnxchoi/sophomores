"use client";

import { useState } from "react";

export function SignInCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4 border border-border px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.({ email, password });
      }}
    >
      <h2 className="text-2xl font-light tracking-tight">Sign in</h2>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="border-b border-border bg-transparent py-2 outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border-b border-border bg-transparent py-2 outline-none"
        />
      </label>
      <button type="submit" className="border border-border px-4 py-3 text-sm">
        Continue
      </button>
    </form>
  );
}
