import { authClient } from "@/lib/auth/client";
import type { PasswordlessLoginClient, LoginAttempt } from "@/lib/passwordless-login";

export function createBetterAuthLoginClient(): PasswordlessLoginClient {
  let activeEmail = "";

  return {
    begin: async (email: string, _signal: AbortSignal): Promise<LoginAttempt> => {
      activeEmail = email;
      // Registered customers can authenticate with discoverable passkey or email OTP
      return {
        id: `login-${Date.now()}`,
        methods: ["passkey", "otp"] as const,
      };
    },
    passkey: async (_flowId: string, _signal: AbortSignal): Promise<"authenticated" | "cancelled"> => {
      try {
        const res = await authClient.signIn.passkey();
        if (res?.error) {
          const msg = res.error.message?.toLowerCase() || "";
          if (res.error.status === 401 || msg.includes("cancel") || msg.includes("abort")) {
            return "cancelled";
          }
          throw new Error(res.error.message || "Passkey verification failed");
        }
        return "authenticated";
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error?.name === "NotAllowedError" || error?.name === "AbortError") {
          return "cancelled";
        }
        throw err;
      }
    },
    requestOtp: async (_flowId: string, _signal: AbortSignal): Promise<void> => {
      if (!activeEmail) throw new Error("Email required to request sign-in code.");
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: activeEmail,
        type: "sign-in",
      });
      if (res?.error) {
        throw new Error(res.error.message || "Failed to send sign-in code.");
      }
    },
    google: async (_signal: AbortSignal): Promise<void> => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/me/settings",
      });
    },
  };
}
