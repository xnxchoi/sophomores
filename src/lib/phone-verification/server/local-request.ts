/**
 * Next dev can normalize Request.url to its loopback bind address while retaining
 * the browser's canonical Host. Native URL parses these authorities but cannot
 * decide this local enrollment trust policy; no equivalent repo helper exists.
 * Keep it with local verification, not broad shared utilities or proxy handling.
 */
export function hasLocalRequestAuthority(request: Request, origin: string): boolean {
  const expected = new URL(origin);
  const actual = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"];
  if (expected.protocol !== "http:" || !local.includes(expected.hostname)
    || actual.protocol !== expected.protocol || !local.includes(actual.hostname)
    || actual.port !== expected.port || actual.username || actual.password) return false;
  const host = request.headers.get("host");
  // A missing Host is supported for direct Request callers only when their URL
  // already carries the exact canonical authority. Forwarded headers are ignored.
  return host === null ? actual.origin === expected.origin : host === expected.host;
}

/** The addresses a standalone `next start` listener binds (deployment/Dockerfile sets HOSTNAME=0.0.0.0). */
const LISTENER_HOSTS = ["0.0.0.0", "localhost", "127.0.0.1", "[::]", "[::1]"];
type Env = Readonly<Record<string, string | undefined>>;

/**
 * The trusted-proxy opt-in (Review-B, 26 Nov: off by default, exact listener only, never inferred from forwarded
 * headers). TRUSTED_PROXY_LISTENER_ORIGIN names the origin Next builds a route's request.url from behind the proxy,
 * `${X-Forwarded-Proto}://${HOSTNAME}:${PORT}` (next-server.js attachRequestMeta), e.g. https://0.0.0.0:3000. Set it
 * only where that proxy is the one way to the listener. Anything but an exact https listener origin with a port is off.
 */
function trustedProxyListener(env: Env): string | null {
  const value = env.TRUSTED_PROXY_LISTENER_ORIGIN;
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  return url.protocol === "https:" && url.port !== "" && LISTENER_HOSTS.includes(url.hostname) && url.origin === value
    ? value : null;
}

/**
 * Request authority for the configured auth origin. A loopback `http:` origin keeps the
 * exact local rules above. An `https:` production origin matches `request.url` exactly and,
 * when a Host header is present, its host. Behind the proxy, request.url is the listener's own
 * address (preview, 26 Nov: every member status call was refused for that reason). With the
 * trusted-proxy opt-in only, that exact listener origin is accepted when the proxy's Host, and
 * any X-Forwarded-Host, name the configured host. Forwarded headers alone never grant trust.
 */
export function hasConfiguredRequestAuthority(request: Request, origin: string, env: Env = process.env): boolean {
  const expected = new URL(origin);
  if (expected.protocol === "http:") return hasLocalRequestAuthority(request, origin);
  if (expected.protocol !== "https:") return false;
  const actual = new URL(request.url);
  if (actual.username || actual.password) return false;
  const host = request.headers.get("host");
  if (actual.origin === expected.origin) return host === null || host === expected.host;
  const listener = trustedProxyListener(env);
  const forwardedHost = request.headers.get("x-forwarded-host");
  return listener !== null && actual.origin === listener && host === expected.host
    && (forwardedHost === null || forwardedHost === expected.host);
}
