"use client";

import { createContext, type MouseEvent, type SyntheticEvent, useCallback, useContext } from "react";
import { usePathname } from "next/navigation";
import { memberSignInHref, memberSignInNext } from "@/lib/member-auth/paths";

// Kept apart from AccountSheetProvider so a sign-in button never pulls the sheet (and its copy) into a page's bundle:
// the provider in the layout owns the sheet; buttons only reach it through this context.
export type AccountSheetFlow = "login" | "signup";
export type AccountSheetOpen = (flow: AccountSheetFlow | undefined, trigger: HTMLElement | null) => void;
export const AccountSheet = createContext<AccountSheetOpen | null>(null);

/**
 * A sign-in button's props: the sign-in page's href (the no-JS and modifier-click path) and a click handler that opens
 * the sheet in place. Outside a provider, the click falls through to the link.
 */
export function useAccountSheetTrigger(flow?: AccountSheetFlow): { href: string; onClick: (event: MouseEvent<HTMLElement>) => void } {
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
