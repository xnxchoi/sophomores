"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { LinkUnderlined } from "@/components/core/Link/Link";
import { AuthSubmit } from "./auth-actions";
import { AuthPanel } from "./auth-panel";
import { DrawnField } from "../ui/input";

export function SignInCard({
  onSubmit
}: {
  onSubmit?: (input: { email: string; password: string }) => void;
}) {
  const t = useTranslations("AuthCards");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthPanel
      title={t("signIn")}
      description={t("useTheEmailAndPasswordForThisAccount")}
    >
      <form
        className="flex flex-col gap-5 text-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.({ email, password });
        }}
      >
        <div className="my-3">
          <DrawnField
            label={t("email")}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="my-3">
          <DrawnField
            label={t("password")}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <LinkUnderlined href="#reset" className="text-[12px]">
              {t("forgotPassword")}
            </LinkUnderlined>
          </div>
        </div>
        <AuthSubmit>{t("continue")}</AuthSubmit>
      </form>
    </AuthPanel>
  );
}
