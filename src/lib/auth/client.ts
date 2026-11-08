import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  emailOTPClient,
  magicLinkClient,
  phoneNumberClient,
  multiSessionClient,
} from "better-auth/client/plugins";

const getClientBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
};

export const authClient = createAuthClient({
  baseURL: getClientBaseURL(),
  plugins: [
    passkeyClient(),
    emailOTPClient(),
    magicLinkClient(),
    phoneNumberClient(),
    multiSessionClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
