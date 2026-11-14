import { cache } from "react";
import { headers as requestHeaders } from "next/headers";
import { getPayload } from "@/payload";
import type { User } from "@/payload/payload-types";

export const getSession = async () => {
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.getSession({ headers });
  } catch {
    return null;
  }
};

export const currentUser = cache(async (): Promise<User | null> => {
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
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.listSessions({ headers });
  } catch {
    return null;
  }
};

export const getUserAccounts = async () => {
  try {
    const payload = await getPayload();
    const headers = await requestHeaders();
    return await payload.betterAuth.api.listUserAccounts({ headers });
  } catch {
    return null;
  }
};
