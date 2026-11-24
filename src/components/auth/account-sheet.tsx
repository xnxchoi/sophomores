"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { MemberAccountDialog } from "@/components/Authentication/member-auth/account-study";
import type { MemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { createMemberClient, type MemberClient } from "@/lib/member-auth/client";
import { memberSignInNext } from "@/lib/member-auth/paths";
import { ActivePrivatePortal } from "./private-page-guard";
import { AccountSheet, type AccountSheetFlow as Flow, type AccountSheetOpen as Open } from "./use-account-sheet";

type Sheet = { open: boolean; flow?: Flow; generation: number };
// A new generation remounts the dialog closed: whatever was typed into it (an email, a phone number, a code) is gone.
const disposed = (current: Sheet): Sheet => ({ open: false, generation: current.generation + 1 });

/**
 * The in-place sign-in sheet (owner, 24 Nov: "Sign-in buttons should in general be modal-togglers"). One sheet per
 * layout. Sign-in buttons keep a real href to the sign-in page (memberSignInHref), so they work without JavaScript and
 * with a modifier-click; a plain click opens this sheet over the page instead. Once the member is confirmed the sheet
 * closes and the page refreshes in place, so its own state (an invitation) stays in the app; a page that can't carry
 * its state over a sign-in shows its own next step instead (onMember: the NFC tap). Social sign-in returns through the
 * sign-in page to this page when it is on the closed return list, else to shop home.
 *
 * It follows the page it opened over (Review-A, 24 Nov): on a private page it portals into that page's guard host, so
 * the page's concealment hides and blocks it too (left, tab hidden, rechecking, a different member); a navigation or a
 * pagehide disposes it, so a typed email or phone is never shown again on another page or after a back-forward restore.
 */
export function AccountSheetProvider({ children, client: clientOverride }: { children: ReactNode; client?: MemberClient }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheet, setSheet] = useState<Sheet>({ open: false, generation: 0 });
  const [openedAt, setOpenedAt] = useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setSheet((current) => (current.open ? disposed(current) : current));
  }
  const trigger = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);
  const onMember = useRef<(() => void) | undefined>(undefined);
  const next = memberSignInNext(pathname);
  const client = useMemo(() => clientOverride ?? createMemberClient(undefined, undefined, "sign-in", next), [clientOverride, next]);
  const open = useCallback<Open>((flow, from, member) => {
    trigger.current = from;
    confirmed.current = false;
    onMember.current = member;
    setSheet((current) => ({ open: true, flow, generation: current.generation + 1 }));
  }, []);
  useEffect(() => {
    // Synchronous, so the page is stored in the back-forward cache without the sheet or anything typed into it.
    const dispose = () => flushSync(() => setSheet((current) => (current.open ? disposed(current) : current)));
    const restored = (event: PageTransitionEvent) => { if (event.persisted) dispose(); };
    window.addEventListener("pagehide", dispose);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("pagehide", dispose);
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  const onSnapshot = useCallback((snapshot: MemberSnapshot) => {
    if (confirmed.current || !snapshot.status?.member) return;
    confirmed.current = true;
    setSheet((current) => ({ ...current, open: false }));
    if (onMember.current) onMember.current();
    else router.refresh();
  }, [router]);
  return (
    <AccountSheet.Provider value={open}>
      {children}
      <ActivePrivatePortal>
        <MemberAccountDialog
          key={sheet.generation}
          open={sheet.open}
          onOpenChange={(value) => setSheet((current) => ({ ...current, open: value }))}
          returnFocusRef={trigger}
          client={client}
          initialFlow={sheet.flow}
          onSnapshot={onSnapshot}
        />
      </ActivePrivatePortal>
    </AccountSheet.Provider>
  );
}
