import { createHmac, timingSafeEqual } from "node:crypto";
import { isLosslessNumber, parse } from "lossless-json";
import { carrierSender } from "./carriers";
import type { DeliveryRef } from "./contracts";

export type TokenProvider = () => Promise<string>;
type Fetch = typeof globalThis.fetch;
type FetchLimits = { fetch?: Fetch; timeoutMs?: number; maxBytes?: number };
const regions = ["com", "eu", "in", "com.au", "jp", "ca", "sa", "com.cn"];
const failure = () => new Error("Zoho request failed");

function credential(value: unknown): string {
  if (typeof value !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(value))
    throw failure();
  return value;
}

export function verifyZohoSignature(
  raw: Uint8Array,
  signature: string | null,
  secret: string
): boolean {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const actual = Buffer.from(signature, "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw failure();
  return value as Record<string, unknown>;
}

function parseJson(raw: string): Record<string, unknown> {
  return record(
    parse(raw, undefined, {
      onDuplicateKey: () => {
        throw failure();
      }
    })
  );
}

function id(value: unknown): string {
  const text = isLosslessNumber(value) ? value.value : value;
  if (typeof text !== "string" || !/^[1-9][0-9]{0,29}$/.test(text))
    throw failure();
  return text;
}

export type ZohoNotification = {
  messageId: string;
  receivedAt: Date;
  integrationId?: string;
};
export function parseZohoNotification(
  raw: Uint8Array,
  expected: { zuid?: string; integrationId?: string }
): ZohoNotification {
  if (!raw.byteLength || raw.byteLength > 65_536) throw failure();
  const data = parseJson(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  const messageId = id(data.messageId);
  const receivedTime = id(data.receivedTime);
  const epoch = Number(receivedTime);
  if (!Number.isSafeInteger(epoch) || epoch > 8_640_000_000_000_000)
    throw failure();
  if (expected.zuid && id(data.zuid) !== id(expected.zuid)) throw failure();
  let integrationId: string | undefined;
  if (expected.integrationId) {
    integrationId = id(expected.integrationId);
    if (typeof data.IntegIdList !== "string" || data.IntegIdList.length > 256)
      throw failure();
    const integrations = data.IntegIdList.trim()
      .replace(/,$/, "")
      .split(",")
      .map((entry) => id(entry.trim()));
    if (integrations.length !== 1 || integrations[0] !== integrationId)
      throw failure();
  }
  return {
    messageId,
    receivedAt: new Date(epoch),
    ...(integrationId ? { integrationId } : {})
  };
}

function origin(value: string, service: "mail" | "accounts"): string {
  if (!regions.some((region) => value === `https://${service}.zoho.${region}`))
    throw failure();
  return value;
}

async function limitedResponse(
  response: Response,
  limit: number
): Promise<string> {
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get("content-length")) > limit
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw failure();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw failure();
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks)
    );
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

async function requestJson(
  url: string,
  init: RequestInit,
  options: FetchLimits
): Promise<Record<string, unknown>> {
  const timeout = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 1_048_576;
  if (
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 30_000 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 2_097_152
  )
    throw failure();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await (options.fetch ?? globalThis.fetch)(url, {
      ...init,
      signal: controller.signal,
      redirect: "error"
    });
    return parseJson(await limitedResponse(response, maxBytes));
  } catch {
    throw failure();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchZohoOriginal(
  messageId: string,
  options: FetchLimits & {
    accountId: string;
    mailOrigin: string;
    tokenProvider: TokenProvider;
  }
): Promise<string> {
  try {
    const url = `${origin(options.mailOrigin, "mail")}/api/accounts/${id(options.accountId)}/messages/${id(messageId)}/originalmessage`;
    const token = credential(await options.tokenProvider());
    const response = await requestJson(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          Accept: "application/json"
        }
      },
      options
    );
    if (id(record(response.status).code) !== "200") throw failure();
    const data = record(response.data);
    if (
      id(data.messageId) !== messageId ||
      typeof data.content !== "string" ||
      !data.content ||
      Buffer.byteLength(data.content) > (options.maxBytes ?? 1_048_576)
    )
      throw failure();
    return data.content;
  } catch {
    throw failure();
  }
}

export type ZohoVerificationPage = {
  deliveries: DeliveryRef[];
  pageFull: boolean;
};

function epoch(value: unknown): number {
  const result = Number(id(value));
  if (!Number.isSafeInteger(result) || result > 8_640_000_000_000_000)
    throw failure();
  return result;
}

function exactRecipient(value: unknown, recipient: string): boolean {
  if (typeof value !== "string" || value.length > 1024) return false;
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  const entities: Readonly<Record<string, string>> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    "#34": '"',
    "#39": "'",
    "#60": "<",
    "#62": ">",
    "#38": "&",
    "#x22": '"',
    "#x27": "'",
    "#x3c": "<",
    "#x3e": ">",
    "#x26": "&"
  };
  const decoded = value
    .replace(
      /&([a-z]+|#[0-9]+|#x[0-9a-f]+);/gi,
      (entity, key: string) => entities[key.toLowerCase()] ?? entity
    )
    .trim();
  if (/[\x00-\x1f\x7f,;:]/.test(decoded)) return false;
  if (decoded.toLowerCase() === recipient) return true;
  const match = /^(?:(?:"[^"<>\\]*"|[^"<>]+)\s*)?<([^<>]+)>$/.exec(decoded);
  return match?.[1].trim().toLowerCase() === recipient;
}

function metadataReference(
  value: unknown,
  options: {
    accountId: string;
    recipient: string;
    since: number;
    until: number;
  }
): DeliveryRef | null {
  const row = record(value);
  if (
    typeof row.fromAddress !== "string" ||
    !carrierSender(row.fromAddress) ||
    !exactRecipient(row.toAddress, options.recipient)
  )
    return null;
  const received = epoch(
    row.receivedtime !== undefined ? row.receivedtime : row.receivedTime
  );
  if (
    row.receivedtime !== undefined &&
    row.receivedTime !== undefined &&
    received !== epoch(row.receivedTime)
  )
    throw failure();
  const messageId = id(row.messageId);
  if (received < options.since || received > options.until) return null;
  return {
    mailboxId: options.accountId,
    messageId,
    receivedAt: new Date(received)
  };
}

function coarseSearchDate(since: number): string {
  // https://www.zoho.com/mail/help/search-syntax.html: :: is AND; fromDate is
  // DD-MMM-YYYY. The prior UTC day conservatively covers mailbox timezone edges.
  // Exact timestamps are still checked locally; busy capped scans fail closed.
  const date = new Date(since - 86_400_000);
  const year = date.getUTCFullYear();
  if (year > 9999) throw failure();
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ][date.getUTCMonth()];
  return `${String(date.getUTCDate()).padStart(2, "0")}-${month}-${year}`;
}

/** Search only bounded metadata; original MIME retrieval remains in the worker. */
export async function fetchZohoVerificationPage(
  options: FetchLimits & {
    accountId: string;
    mailOrigin: string;
    tokenProvider: TokenProvider;
    recipient: string;
    since: Date;
    until: Date;
    start?: number;
    limit?: number;
  }
): Promise<ZohoVerificationPage> {
  try {
    const accountId = id(options.accountId);
    const recipient = options.recipient.toLowerCase();
    if (
      !/^[a-z0-9][a-z0-9._+-]{0,63}@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,63}$/.test(
        recipient
      )
    )
      throw failure();
    const since = options.since.getTime(),
      until = options.until.getTime();
    const start = options.start ?? 1,
      limit = options.limit ?? 20;
    if (
      !Number.isSafeInteger(since) ||
      since <= 0 ||
      !Number.isSafeInteger(until) ||
      until < since ||
      !Number.isSafeInteger(start) ||
      start < 1 ||
      start > 41 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 20
    )
      throw failure();
    const url = new URL(
      `${origin(options.mailOrigin, "mail")}/api/accounts/${accountId}/messages/search`
    );
    url.search = new URLSearchParams({
      searchKey: `to:${recipient}::fromDate:${coarseSearchDate(since)}`,
      receivedTime: String(until),
      start: String(start),
      limit: String(limit),
      includeto: "true"
    }).toString();
    const token = credential(await options.tokenProvider());
    const response = await requestJson(
      url.toString(),
      {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          Accept: "application/json"
        }
      },
      options
    );
    if (
      id(record(response.status).code) !== "200" ||
      !Array.isArray(response.data) ||
      response.data.length > limit
    )
      throw failure();
    const deliveries = response.data.flatMap((row) => {
      const ref = metadataReference(row, {
        accountId,
        recipient,
        since,
        until
      });
      return ref ? [ref] : [];
    });
    return { deliveries, pageFull: response.data.length === limit };
  } catch {
    throw failure();
  }
}

export async function exchangeZohoAuthorizationCode(
  options: FetchLimits & {
    accountsOrigin: string;
    clientId: string;
    clientSecret: string;
    code: string;
  }
): Promise<{ refreshToken: string }> {
  try {
    const endpoint = `${origin(options.accountsOrigin, "accounts")}/oauth/v2/token`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: credential(options.clientId),
      client_secret: credential(options.clientSecret),
      code: credential(options.code)
    });
    const data = await requestJson(
      endpoint,
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      },
      { ...options, maxBytes: 16_384 }
    );
    if (
      data.error !== undefined ||
      (data.scope !== undefined && data.scope !== "ZohoMail.messages.READ")
    )
      throw failure();
    return { refreshToken: credential(data.refresh_token) };
  } catch {
    throw failure();
  }
}

export async function refreshZohoAccessToken(
  options: FetchLimits & {
    accountsOrigin: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  try {
    const endpoint = `${origin(options.accountsOrigin, "accounts")}/oauth/v2/token`;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credential(options.clientId),
      client_secret: credential(options.clientSecret),
      refresh_token: credential(options.refreshToken)
    });
    const data = await requestJson(
      endpoint,
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      },
      { ...options, maxBytes: 16_384 }
    );
    const accessToken = credential(data.access_token);
    if (data.error !== undefined) throw failure();
    // Only tokens provisioned with ZohoMail.messages.READ may be supplied. The
    // refresh response sometimes omits scope; when present, reject broader grants.
    if (data.scope !== undefined && data.scope !== "ZohoMail.messages.READ")
      throw failure();
    const expiresInSeconds = Number(id(data.expires_in));
    if (expiresInSeconds > 86_400) throw failure();
    return { accessToken, expiresInSeconds };
  } catch {
    throw failure();
  }
}

/** Separate one-use accounts.READ grant; never reuse or persist receiver authority. */
export async function lookupZohoMailAccountId(
  options: FetchLimits & { mailOrigin: string; accountsOrigin: string; clientId: string; clientSecret: string; code: string }
): Promise<string> {
  try {
    const mail = origin(options.mailOrigin, 'mail');
    const accounts = origin(options.accountsOrigin, 'accounts');
    if (mail.replace('https://mail.', 'https://accounts.') !== accounts) throw failure();
    const body = new URLSearchParams({ grant_type: 'authorization_code',
      client_id: credential(options.clientId), client_secret: credential(options.clientSecret), code: credential(options.code) });
    const authorization = await requestJson(`${accounts}/oauth/v2/token`, {
      method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, { ...options, maxBytes: 16_384 });
    if (authorization.error !== undefined || (authorization.scope !== undefined && authorization.scope !== 'ZohoMail.accounts.READ')) throw failure();
    // Zoho may omit scope. The operator must generate this separate code with
    // accounts.READ only; omitted scope is not proof of narrower authority.
    const accessToken = credential(authorization.access_token);
    const response = await requestJson(`${mail}/api/accounts`, {
      method: 'GET', headers: { Accept: 'application/json', Authorization: `Zoho-oauthtoken ${accessToken}` },
    }, options);
    if (id(record(response.status).code) !== '200' || !Array.isArray(response.data) || response.data.length > 20) throw failure();
    const matches = response.data.map(record).filter((account) =>
      typeof account.primaryEmailAddress === 'string' && account.primaryEmailAddress.toLowerCase() === 'concierge@sophomores.co');
    if (matches.length !== 1 || (matches[0].mailboxAddress !== undefined &&
      (typeof matches[0].mailboxAddress !== 'string' || matches[0].mailboxAddress.toLowerCase() !== 'concierge@sophomores.co'))) throw failure();
    return id(matches[0].accountId);
  } catch { throw failure(); }
}
