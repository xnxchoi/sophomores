import { cache } from "react";
import { headers as requestHeaders } from "next/headers";
import { getPayload } from "@/payload";
import type { User } from "@/payload-types";
import { isReviewCopyRequest } from "./review-editor-policy";

export const getSession = async () => {
  if (isReviewCopyRequest()) return null;
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.getSession({ headers });
  } catch {
    return null;
  }
};

export const currentUser = cache(async (): Promise<User | null> => {
  if (isReviewCopyRequest()) return null;
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    const session = await payload.betterAuth.api.getSession({ headers });
    return (session?.user as unknown as User) ?? null;
  } catch {
    return null;
  }
});

export const getDeviceSessions = async () => {
  if (isReviewCopyRequest()) return null;
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.listSessions({ headers });
  } catch {
    return null;
  }
};

export const getUserAccounts = async () => {
  if (isReviewCopyRequest()) return null;
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.listUserAccounts({ headers });
  } catch {
    return null;
  }
};
