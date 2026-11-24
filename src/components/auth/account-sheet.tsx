"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MemberAccountDialog } from "@/components/Authentication/member-auth/account-study";
import type { MemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { createMemberClient, type MemberClient } from "@/lib/member-auth/client";
import { memberSignInNext } from "@/lib/member-auth/paths";
import { AccountSheet, type AccountSheetFlow as Flow, type AccountSheetOpen as Open } from "./use-account-sheet";

/**
 * The in-place sign-in sheet (owner, 24 Nov: "Sign-in buttons should in general be modal-togglers"). One sheet per
 * layout. Sign-in buttons keep a real href to the sign-in page (memberSignInHref), so they work without JavaScript and
 * with a modifier-click; a plain click opens this sheet over the page instead. Once the member is confirmed the sheet
 * closes and the page refreshes in place, so its own state (an invitation, an NFC tap) stays in the app. Social
 * sign-in returns through the sign-in page to this page when it is on the closed return list, else to shop home.
 */
export function AccountSheetProvider({ children, client: clientOverride }: { children: ReactNode; client?: MemberClient }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheet, setSheet] = useState<{ open: boolean; flow?: Flow; generation: number }>({ open: false, generation: 0 });
  const trigger = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);
  const next = memberSignInNext(pathname);
  const client = useMemo(() => clientOverride ?? createMemberClient(undefined, undefined, "sign-in", next), [clientOverride, next]);
  const open = useCallback<Open>((flow, from) => {
    trigger.current = from;
    confirmed.current = false;
    setSheet((current) => ({ open: true, flow, generation: current.generation + 1 }));
  }, []);
  const onSnapshot = useCallback((snapshot: MemberSnapshot) => {
    if (confirmed.current || !snapshot.status?.member) return;
    confirmed.current = true;
    setSheet((current) => ({ ...current, open: false }));
    router.refresh();
  }, [router]);
  return (
    <AccountSheet.Provider value={open}>
      {children}
      <MemberAccountDialog
        key={sheet.generation}
        open={sheet.open}
        onOpenChange={(value) => setSheet((current) => ({ ...current, open: value }))}
        returnFocusRef={trigger}
        client={client}
        initialFlow={sheet.flow}
        onSnapshot={onSnapshot}
      />
    </AccountSheet.Provider>
  );
}
