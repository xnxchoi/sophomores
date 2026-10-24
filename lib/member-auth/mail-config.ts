import { z } from "zod";

type Environment = Readonly<Record<string, string | undefined>>;
export type MemberMailConfig = Readonly<{
  host: "smtp.zeptomail.com";
  port: 465 | 587;
  username: string;
  password: string;
  from: string;
}>;

const invalid = () => new Error("Member email configuration is invalid.");

/** Single ASCII mailbox only: never a display name, address list, or header value. */
export function isMemberMailAddress(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 &&
    /^[\x21-\x7e]+$/.test(value) && value.split("@")[0].length <= 64 &&
    z.email().safeParse(value).success;
}

export function loadMemberMailConfig(env: Environment): MemberMailConfig | null {
  if (!env || typeof env !== "object" || Array.isArray(env)) throw invalid();
  const mode = env.MEMBER_AUTH_MAIL_MODE;
  if (mode === undefined || mode === "disabled") return null;
  if (mode !== "smtp") throw invalid();
  const host = env.MEMBER_AUTH_SMTP_HOST;
  const port = env.MEMBER_AUTH_SMTP_PORT;
  const username = env.MEMBER_AUTH_SMTP_USERNAME;
  const password = env.MEMBER_AUTH_SMTP_PASSWORD;
  const from = env.MEMBER_AUTH_SMTP_FROM;
  if (host !== "smtp.zeptomail.com" || (port !== "465" && port !== "587") ||
    typeof username !== "string" || !/^[A-Za-z0-9@._+-]{1,254}$/.test(username) ||
    username.startsWith("REPLACE_") || typeof password !== "string" ||
    !/^[\x21-\x7e]{1,4096}$/.test(password) || password.startsWith("REPLACE_") ||
    !isMemberMailAddress(from)) throw invalid();
  return Object.freeze({ host, port: Number(port) as 465 | 587, username, password, from });
}

/** Revalidate even typed callers before constructing a network transport. */
export function requireMemberMailConfig(config: MemberMailConfig): MemberMailConfig {
  if (!config || typeof config !== "object") throw invalid();
  return loadMemberMailConfig({
    MEMBER_AUTH_MAIL_MODE: "smtp", MEMBER_AUTH_SMTP_HOST: config.host,
    MEMBER_AUTH_SMTP_PORT: String(config.port), MEMBER_AUTH_SMTP_USERNAME: config.username,
    MEMBER_AUTH_SMTP_PASSWORD: config.password, MEMBER_AUTH_SMTP_FROM: config.from
  })!;
}
