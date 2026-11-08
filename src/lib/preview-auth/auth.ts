import { isIP } from "node:net";
import {
  clearCookie, cookieToken, issueSession, sessionCookie,
  validateConfig, verifyCredentials, verifySession, type PreviewAuthConfig,
} from "./session";

const MAX_BODY = 4096;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CLIENTS = 1024;

export interface PreviewLoginForm {
  readonly username: string;
  readonly password: string;
  readonly remember?: "yes";
}
export interface AuthOptions {
  readonly clock?: () => number;
  readonly verifyPassword?: (config: PreviewAuthConfig, username: string, password: string) => Promise<boolean>;
}
interface Attempt { readonly count: number; readonly until: number; }
interface AuthContext {
  readonly config: PreviewAuthConfig;
  readonly clock: () => number;
  readonly verifyPassword: NonNullable<AuthOptions["verifyPassword"]>;
  readonly limiter: ReturnType<typeof attemptLimiter>;
  readonly hashes: ReturnType<typeof hashGate>;
}
const policy = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
});
function respond(status: number, body = "", headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : body, {
    status, headers: { ...policy, "Content-Type": "text/plain; charset=utf-8", ...headers },
  });
}
export function parseForm(body: string): PreviewLoginForm {
  const entries = body.split("&").map((part): [string, string] => {
    const equal = part.indexOf("=");
    if (equal < 0) throw new Error("Invalid form");
    const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, " "));
    return [decode(part.slice(0, equal)), decode(part.slice(equal + 1))];
  });
  if (new Set(entries.map(([key]) => key)).size !== entries.length
    || entries.some(([key]) => !["username", "password", "remember"].includes(key))) throw new Error("Invalid form");
  const form: Record<string, string> = Object.fromEntries(entries);
  if (!form.username || form.username.length > 128 || !form.password || form.password.length > 1024
    || ("remember" in form && form.remember !== "yes")) throw new Error("Invalid form");
  return Object.freeze({ username: form.username, password: form.password,
    ...(form.remember === "yes" ? { remember: "yes" as const } : {}),
  });
}
class BodyTooLarge extends Error {}
async function readBody(req: Request): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      length += value.byteLength;
      if (length > MAX_BODY) {
        // Cancellation must not delay the rejection if a hostile stream never settles.
        void reader.cancel().catch(() => undefined);
        throw new BodyTooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}
function sameOrigin(req: Request, origin: string): boolean {
  // Headers combines repeated Origin fields with commas, which exact equality rejects.
  return req.headers.get("origin") === origin;
}
function attemptLimiter(clock: () => number) {
  let attempts = new Map<string, Attempt>();
  return {
    admit(ip: string): boolean {
      const now = clock();
      attempts = new Map([...attempts].filter(([, entry]) => entry.until > now));
      const current = attempts.get(ip);
      if ((!current && attempts.size >= MAX_CLIENTS) || (current && current.count >= 5)) return false;
      attempts = new Map([...attempts, [ip, { count: (current?.count ?? 0) + 1, until: current?.until ?? now + WINDOW_MS }]]);
      return true;
    },
    reset(ip: string): void { attempts = new Map([...attempts].filter(([key]) => key !== ip)); },
  };
}
function hashGate() {
  let count = 0;
  return { acquire: () => { if (count >= 2) return false; count++; return true; }, release: () => { count--; } };
}
async function authenticate(req: Request, context: AuthContext): Promise<Response> {
  const { config, clock, verifyPassword, limiter, hashes } = context;
  if (req.method !== "POST") return respond(405, "", { Allow: "POST" });
  if (!sameOrigin(req, config.origin)) return respond(403, "Request rejected.");
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(req.headers.get("content-type") ?? "")) return respond(415, "Unsupported form format.");
  if (Number(req.headers.get("content-length")) > MAX_BODY) return respond(413, "Request too large.");
  let form: PreviewLoginForm;
  try { form = parseForm(await readBody(req)); }
  catch (error: unknown) { return respond(error instanceof BodyTooLarge ? 413 : 400, "Invalid form."); }
  const ip = req.headers.get("x-real-ip");
  if (!ip || !isIP(ip)) return respond(400, "Invalid request source.");
  if (!limiter.admit(ip) || !hashes.acquire()) return respond(429, "Please wait before trying again.", { "Retry-After": "900" });
  let valid: boolean;
  try { valid = await verifyPassword(config, form.username, form.password); }
  finally { hashes.release(); }
  if (!valid) return respond(303, "", { Location: "/login?error=credentials" });
  limiter.reset(ip);
  const now = Math.floor(clock() / 1000);
  const remember = form.remember === "yes";
  return respond(303, "", { Location: "/", "Set-Cookie": sessionCookie(issueSession(config, remember, now), remember, now) });
}
async function safe(operation: () => Response | Promise<Response>): Promise<Response> {
  try { return await operation(); }
  catch { return respond(503, "Please try again shortly."); }
}
export function createAuthHandlers(config: unknown, { clock = Date.now, verifyPassword = verifyCredentials }: AuthOptions = {}) {
  const context: AuthContext = { config: validateConfig(config), clock, verifyPassword, limiter: attemptLimiter(clock), hashes: hashGate() };
  return Object.freeze({
    login: (req: Request): Promise<Response> => safe(() => authenticate(req, context)),
    logout: (req: Request): Promise<Response> => safe(() => {
      if (req.method !== "POST") return respond(405, "", { Allow: "POST" });
      if (!sameOrigin(req, context.config.origin)) return respond(403, "Request rejected.");
      return respond(303, "", { Location: "/login", "Set-Cookie": clearCookie() });
    }),
    verify: (req: Request): Promise<Response> => safe(() => {
      if (!["GET", "HEAD"].includes(req.method)) return respond(405, "", { Allow: "GET, HEAD" });
      return respond(verifySession(context.config, cookieToken(req.headers.get("cookie")), Math.floor(clock() / 1000)) ? 204 : 401);
    }),
  });
}
