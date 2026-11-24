"use client";

import { createContext, type MouseEvent, type ReactNode, type SyntheticEvent, useCallback, useContext, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MemberAccountDialog } from "@/components/Authentication/member-auth/account-study";
import type { MemberSnapshot } from "@/components/Authentication/member-auth/_shared/session";
import { createMemberClient, type MemberClient } from "@/lib/member-auth/client";
import { memberSignInHref, memberSignInNext } from "@/lib/member-auth/paths";

type Flow = "login" | "signup";
type Open = (flow: Flow | undefined, trigger: HTMLElement | null) => void;
const AccountSheet = createContext<Open | null>(null);

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

/**
 * A sign-in button's props: the sign-in page's href (the no-JS and modifier-click path) and a click handler that opens
 * the sheet in place. Outside a provider, the click falls through to the link.
 */
export function useAccountSheetTrigger(flow?: Flow): { href: string; onClick: (event: MouseEvent<HTMLElement>) => void } {
  const open = useContext(AccountSheet);
  const pathname = usePathname();
  const onClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!open || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(flow, event.currentTarget);
  }, [open, flow]);
  return { href: memberSignInHref(memberSignInNext(pathname)), onClick };
}

/** For a sign-in form (the NFC tap's GET form): submitting opens the sheet; without JavaScript the form goes to /sign-in. */
export function useAccountSheetSubmit(): (event: SyntheticEvent<HTMLFormElement>) => void {
  const open = useContext(AccountSheet);
  return useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    if (!open) return;
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    open(undefined, submitter instanceof HTMLElement ? submitter : event.currentTarget);
  }, [open]);
}
