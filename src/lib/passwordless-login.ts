import { z } from "zod";

const emailSchema = z.string().trim().max(254).pipe(z.email());
export const loginAttemptSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    methods: z
      .array(z.enum(["passkey", "otp"]))
      .min(1)
      .refine((methods) => new Set(methods).size === methods.length)
  })
  .strict();
export type LoginAttempt = Readonly<{
  id: string;
  methods: ReadonlyArray<"passkey" | "otp">;
}>;

/** Provider adapters own challenge validation, session issuance and OAuth redirects. */
export type PasswordlessLoginClient = {
  begin: (email: string, signal: AbortSignal) => Promise<LoginAttempt>;
  passkey: (
    flowId: string,
    signal: AbortSignal
  ) => Promise<"authenticated" | "cancelled">;
  requestOtp: (flowId: string, signal: AbortSignal) => Promise<void>;
  google: (signal: AbortSignal) => Promise<void>;
};
export type LoginError =
  "invalidEmail" | "unavailable" | "requestFailed" | "passkeyCancelled";
export type PasswordlessLoginSnapshot = Readonly<{
  email: string;
  attempt: LoginAttempt | null;
  status: "email" | "checking" | "choice" | "otp" | "authenticated";
  busy: boolean;
  error: LoginError | null;
}>;

class UnavailableLoginError extends Error {}
const unavailable = async (): Promise<never> => {
  throw new UnavailableLoginError("Customer login is not connected");
};
export const unavailablePasswordlessLoginClient: PasswordlessLoginClient = {
  begin: unavailable,
  passkey: unavailable,
  requestOtp: unavailable,
  google: unavailable
};

export function normalizeLoginEmail(value: string): string | null {
  const result = emailSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function createPasswordlessLoginSession(
  client: PasswordlessLoginClient = unavailablePasswordlessLoginClient,
  onChange: (snapshot: PasswordlessLoginSnapshot) => void
) {
  let current: PasswordlessLoginSnapshot = {
    email: "",
    attempt: null,
    status: "email",
    busy: false,
    error: null
  };
  let generation = 0;
  let disposed = false;
  let pending: AbortController | null = null;
  function update(change: Partial<PasswordlessLoginSnapshot>) {
    if (disposed) return;
    current = { ...current, ...change };
    onChange(current);
  }
  function setEmail(email: string) {
    if (disposed) return;
    generation += 1;
    pending?.abort();
    pending = null;
    update({ email, attempt: null, status: "email", busy: false, error: null });
  }
  async function run(
    task: (signal: AbortSignal, active: () => boolean) => Promise<void>
  ) {
    if (disposed || pending) return;
    const operation = ++generation;
    const abort = new AbortController();
    pending = abort;
    const active = () =>
      !disposed && generation === operation && !abort.signal.aborted;
    update({ busy: true, error: null });
    try {
      await task(abort.signal, active);
    } catch (error) {
      if (active())
        update({
          status: current.attempt ? "choice" : "email",
          error:
            error instanceof UnavailableLoginError
              ? "unavailable"
              : "requestFailed"
        });
    } finally {
      if (active()) {
        pending = null;
        update({ busy: false });
      }
    }
  }
  async function passkey(
    attempt: LoginAttempt,
    signal: AbortSignal,
    active: () => boolean
  ) {
    const result = z
      .enum(["authenticated", "cancelled"])
      .parse(await client.passkey(attempt.id, signal));
    if (active())
      update(
        result === "authenticated"
          ? { status: "authenticated", error: null }
          : { status: "choice", error: "passkeyCancelled" }
      );
  }
  async function begin() {
    if (disposed || pending) return;
    const email = normalizeLoginEmail(current.email);
    if (!email) {
      update({ error: "invalidEmail" });
      return;
    }
    await run(async (signal, active) => {
      update({ email, status: "checking", attempt: null });
      const attempt = loginAttemptSchema.parse(
        await client.begin(email, signal)
      );
      if (!active()) return;
      update({ attempt, status: "choice" });
      if (attempt.methods.includes("passkey"))
        await passkey(attempt, signal, active);
    });
  }
  async function retryPasskey() {
    const attempt = current.attempt;
    if (
      !attempt?.methods.includes("passkey") ||
      current.status === "authenticated"
    )
      return;
    await run((signal, active) => passkey(attempt, signal, active));
  }
  async function requestOtp() {
    const attempt = current.attempt;
    if (!attempt?.methods.includes("otp") || current.status === "authenticated")
      return;
    await run(async (signal, active) => {
      await client.requestOtp(attempt.id, signal);
      if (active()) update({ status: "otp", error: null });
    });
  }
  async function google() {
    await run(async (signal) => {
      await client.google(signal);
    });
  }
  function dispose() {
    disposed = true;
    generation += 1;
    pending?.abort();
    pending = null;
  }
  return {
    setEmail,
    begin,
    retryPasskey,
    requestOtp,
    google,
    dispose,
    snapshot: () => current
  };
}
