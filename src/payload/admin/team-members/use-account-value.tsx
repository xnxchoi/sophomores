"use client";

import { Button, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Account = { name?: string | null; image?: string | null };

/**
 * Reads the linked member's account as the signed-in staff user (users read access is staff-only), asking
 * for just the field needed. Nothing is fetched until staff press the button.
 */
function useLinkedAccount() {
  const { config } = useConfig();
  const user = useFormFields(([fields]) => fields.user?.value);
  const id = typeof user === "object" && user && "id" in user ? String(user.id) : typeof user === "string" || typeof user === "number" ? String(user) : null;
  return async (field: keyof Account): Promise<Account | null> => {
    if (!id) return null;
    const response = await fetch(`${config.serverURL}${config.routes.api}/users/${encodeURIComponent(id)}?depth=0&select[${field}]=true`, { credentials: "include" });
    return response.ok ? ((await response.json()) as Account) : null;
  };
}

/** Under Display name: copies the account's name into the override, for staff to review before publishing. */
export function UseAccountName({ path }: { path: string }) {
  const t = useTranslations("Staff.schema");
  const { setValue } = useField<string>({ path });
  const readAccount = useLinkedAccount();
  const [busy, setBusy] = useState(false);
  return (
    <Button buttonStyle="secondary" size="small" disabled={busy} onClick={async () => {
      setBusy(true);
      const name = (await readAccount("name"))?.name?.trim();
      if (name) setValue(name);
      setBusy(false);
    }}>
      {t("teamUseAccountName")}
    </Button>
  );
}

/**
 * Under Portrait: returns the roster to the account's own image. It clears any uploaded portrait and ticks
 * "Use account image"; nothing is copied, and the image only shows once the entry is saved and published.
 */
export function UseAccountImage({ path }: { path: string }) {
  const t = useTranslations("Staff.schema");
  const portrait = useField<unknown>({ path });
  const approved = useField<boolean>({ path: "useAccountImage" });
  if (approved.value && !portrait.value) return null;
  return (
    <Button buttonStyle="secondary" size="small" onClick={() => { portrait.setValue(null); approved.setValue(true); }}>
      {t("teamUseAccountImageButton")}
    </Button>
  );
}
