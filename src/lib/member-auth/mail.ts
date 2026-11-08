import SMTPConnection from "nodemailer/lib/smtp-connection";
import MailComposer from "nodemailer/lib/mail-composer";
import {
  isMemberMailAddress, requireMemberMailConfig, type MemberMailConfig
} from "./mail-config";
import { MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH } from "./paths";

export type { MemberMailConfig } from "./mail-config";
export type MemberMailNotification =
  | { type: "email-otp"; email: string; otp: string; url?: never }
  | { type: "magic-link"; email: string; url: string; otp?: never };
export type MemberMailer = (notification: MemberMailNotification) => Promise<void>;
export class MemberMailUnavailable extends Error {
  constructor() { super("Member email delivery is unavailable."); this.name = "MemberMailUnavailable"; }
}
export type MemberMailMessage = {
  from: { name: "Sophomores"; address: string };
  to: { address: string };
  envelope: { from: string; to: string[] };
  subject: string;
  text: string;
  disableFileAccess: true;
  disableUrlAccess: true;
  xMailer: false;
};
export interface MemberMailTransport {
  sendMail(message: MemberMailMessage): Promise<unknown>;
  close(): void;
}

export function memberSmtpSettings(value: MemberMailConfig) {
  const config = requireMemberMailConfig(value);
  return {
    host: config.host, port: config.port, secure: config.port === 465, requireTLS: true,
    auth: { user: config.username, pass: config.password },
    tls: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true, servername: config.host },
    connectionTimeout: 5000, greetingTimeout: 3000, socketTimeout: 5000,
    dnsTimeout: 3000, maxResponseSize: 16384, logger: false as const, debug: false
  };
}
export type MemberSmtpSettings = ReturnType<typeof memberSmtpSettings>;
type Connection = Pick<SMTPConnection, "once" | "connect" | "login" | "send" | "close">;

/** Use the actual connection's close(), not SMTPTransport.close() which leaves active sends. */
export function createSmtpConnectionTransport(
  settings: MemberSmtpSettings,
  connectionFactory: (options: MemberSmtpSettings) => Connection = (options) => new SMTPConnection(options)
): MemberMailTransport {
  const connection = connectionFactory(settings);
  let closed = false;
  return {
    async sendMail(message) {
      if (closed) throw new MemberMailUnavailable();
      const raw = await new MailComposer(message).compile().build();
      if (closed) throw new MemberMailUnavailable();
      const failed = new Promise<never>((_, reject) => {
        connection.once("error", (error) => { closed = true; reject(error); });
      });
      const sending = (async () => {
        await new Promise<void>((resolve, reject) => connection.connect((error) => error ? reject(error) : resolve()));
        if (closed) throw new MemberMailUnavailable();
        await new Promise<void>((resolve, reject) => connection.login(settings.auth, (error) => error ? reject(error) : resolve()));
        if (closed) throw new MemberMailUnavailable();
        return new Promise<unknown>((resolve, reject) => connection.send(message.envelope, raw, (error, info) => error ? reject(error) : resolve(info)));
      })();
      return Promise.race([sending, failed]);
    },
    close() { closed = true; connection.close(); }
  };
}

function localOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.hostname !== "localhost" || url.origin !== origin ||
      url.username || url.password || url.search || url.hash) throw new Error();
    return url.origin;
  } catch { throw new Error("Member email configuration is invalid."); }
}

const memberSuccessPaths = [MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH];
const memberErrorPaths = [MEMBER_ACCOUNT_PATH];

function exactCallbackPath(value: string): boolean {
  return /^\/[A-Za-z0-9/_-]{1,127}$/.test(value) && !value.includes("//") &&
    !value.split("/").includes("..") && !value.endsWith("/");
}

function safeMagicLink(
  value: unknown,
  origin: string,
  successPaths: readonly string[],
  errorPaths: readonly string[]
): value is string {
  if (typeof value !== "string" || value.length > 4096 || /[\x00-\x20\x7f\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.origin !== origin || url.username || url.password || url.hash ||
      url.pathname !== "/api/auth/magic-link/verify") return false;
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length || !keys.includes("token") ||
      !/^[A-Za-z0-9_-]{20,512}$/.test(url.searchParams.get("token") ?? "")) return false;
    for (const key of keys) {
      if (key === "token") continue;
      if (!["callbackURL", "newUserCallbackURL", "errorCallbackURL"].includes(key)) return false;
      const callbackValue = url.searchParams.get(key) ?? "";
      if (/[\x00-\x20\x7f\\]/.test(callbackValue)) return false;
      const callback = new URL(callbackValue, origin);
      const destinations = key === "errorCallbackURL" ? errorPaths : successPaths;
      if (callback.origin !== origin || callback.username || callback.password || callback.hash ||
        callback.search || !destinations.some((destination) => callback.pathname === destination)) return false;
    }
    return true;
  } catch { return false; }
}

function compose(
  notification: MemberMailNotification,
  config: MemberMailConfig,
  origin: string,
  successPaths: readonly string[],
  errorPaths: readonly string[]
): MemberMailMessage {
  if (!notification || !isMemberMailAddress(notification.email)) throw new MemberMailUnavailable();
  const otp = notification.type === "email-otp" && typeof notification.otp === "string" &&
    notification.otp.length === 6 && /^[A-Z0-9]{6}$/.test(notification.otp) && notification.url === undefined;
  const magic = notification.type === "magic-link" && notification.otp === undefined &&
    safeMagicLink(notification.url, origin, successPaths, errorPaths);
  if (!otp && !magic) throw new MemberMailUnavailable();
  return {
    from: { name: "Sophomores", address: config.from }, to: { address: notification.email },
    envelope: { from: config.from, to: [notification.email] },
    subject: otp ? "Your Sophomores sign-in code" : "Your Sophomores sign-in link",
    text: otp
      ? `Your Sophomores sign-in code is ${notification.otp}. It expires in 5 minutes. Do not share this code.\nIf you did not request it, ignore this email.`
      : `Use this one-time Sophomores sign-in link. It expires in 5 minutes:\n${notification.url}\nIf you did not request it, ignore this email.`,
    disableFileAccess: true, disableUrlAccess: true, xMailer: false
  };
}

function accepted(info: unknown, email: string): boolean {
  if (!info || typeof info !== "object") return false;
  const result = info as { accepted?: unknown; rejected?: unknown };
  return Array.isArray(result.accepted) && result.accepted.length === 1 &&
    result.accepted[0] === email && Array.isArray(result.rejected) && result.rejected.length === 0;
}

export function createMemberMailer(
  config: MemberMailConfig | null,
  origin: string,
  options: {
    deadlineMs?: number;
    magicLinkDestinations?: readonly string[];
    transportFactory?: (settings: MemberSmtpSettings) => MemberMailTransport;
  } = {}
): MemberMailer {
  const allowedOrigin = localOrigin(origin);
  const extraDestinations = options.magicLinkDestinations ?? [];
  if (extraDestinations.some((path) => !exactCallbackPath(path))) {
    throw new Error("Member email configuration is invalid.");
  }
  const successPaths = [...memberSuccessPaths, ...extraDestinations];
  const deadlineMs = options.deadlineMs ?? 10000;
  if (!Number.isFinite(deadlineMs) || deadlineMs < 1 || deadlineMs > 10000)
    throw new Error("Member email configuration is invalid.");
  return async (notification) => {
    let transport: MemberMailTransport | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!config) throw new MemberMailUnavailable();
      const message = compose(notification, config, allowedOrigin, successPaths, memberErrorPaths);
      transport = (options.transportFactory ?? createSmtpConnectionTransport)(memberSmtpSettings(config));
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new MemberMailUnavailable()), deadlineMs);
      });
      const info = await Promise.race([transport.sendMail(message), deadline]);
      if (!accepted(info, notification.email)) throw new MemberMailUnavailable();
    } catch { throw new MemberMailUnavailable(); }
    finally {
      if (timer) clearTimeout(timer);
      try { transport?.close(); } catch { throw new MemberMailUnavailable(); }
    }
  };
}
