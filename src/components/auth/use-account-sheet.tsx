"use client";

import { createContext, type MouseEvent, type SyntheticEvent, useCallback, useContext } from "react";
import { usePathname } from "next/navigation";
import { MEMBER_SIGN_IN_PATH, memberSignInHref, memberSignInNext } from "@/lib/member-auth/paths";

// Kept apart from AccountSheetProvider so a sign-in button never pulls the sheet (and its copy) into a page's bundle:
// the provider in the layout owns the sheet; buttons only reach it through this context.
export type AccountSheetFlow = "login" | "signup";
/**
 * Opens the sheet. `onMember` runs once the member is confirmed in it, in place of refreshing the page: for a page
 * whose state can't carry over a sign-in (the NFC tap), which shows its own next step instead.
 */
export type AccountSheetOpen = (flow: AccountSheetFlow | undefined, trigger: HTMLElement | null, onMember?: () => void) => void;
export const AccountSheet = createContext<AccountSheetOpen | null>(null);

/**
 * A sign-in button's props: the sign-in page's href (the no-JS and modifier-click path) and a click handler that opens
 * the sheet in place. Outside a provider, the click falls through to the link.
 */
export function useAccountSheetTrigger(flow?: AccountSheetFlow): { href: string; onClick: (event: MouseEvent<HTMLElement>) => void; onSignInPage: boolean } {
  const open = useContext(AccountSheet);
  const pathname = usePathname();
  const onClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!open || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(flow, event.currentTarget);
  }, [open, flow]);
  // On the sign-in page itself the header's Sign in would only repeat the page (owner, 26 Nov: say "Sign in" once).
  return { href: memberSignInHref(memberSignInNext(pathname)), onClick, onSignInPage: pathname === MEMBER_SIGN_IN_PATH };
}

/**
 * For a sign-in form (the NFC tap's GET form): submitting opens the sheet; without JavaScript the form goes to
 * /sign-in. `onMember`: see AccountSheetOpen.
 */
export function useAccountSheetSubmit(onMember?: () => void): (event: SyntheticEvent<HTMLFormElement>) => void {
  const open = useContext(AccountSheet);
  return useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    if (!open) return;
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    open(undefined, submitter instanceof HTMLElement ? submitter : event.currentTarget, onMember);
  }, [open, onMember]);
}
