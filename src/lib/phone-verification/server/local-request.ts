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

/**
 * The addresses `next start` (standalone) binds and builds a route's request.url from: deployment/Dockerfile sets
 * HOSTNAME=0.0.0.0, and Next's initURL is `${X-Forwarded-Proto}://${hostname}:${port}`, whatever Host the browser used.
 */
const BIND_HOSTS = ["0.0.0.0", "localhost", "127.0.0.1", "[::]", "[::1]"];

/**
 * Request authority for the configured auth origin. A loopback `http:` origin keeps the
 * exact local rules above. An `https:` production origin matches `request.url` exactly and,
 * when a Host header is present, its host. Behind the proxy, request.url is the server's own
 * bind address (preview, 26 Nov: every member status call was refused for that reason), so a
 * bind-address https URL is accepted only when the proxy's Host, and any X-Forwarded-Host,
 * name the configured host. Any other host in request.url is refused.
 */
export function hasConfiguredRequestAuthority(request: Request, origin: string): boolean {
  const expected = new URL(origin);
  if (expected.protocol === "http:") return hasLocalRequestAuthority(request, origin);
  if (expected.protocol !== "https:") return false;
  const actual = new URL(request.url);
  if (actual.username || actual.password) return false;
  const host = request.headers.get("host");
  if (actual.origin === expected.origin) return host === null || host === expected.host;
  const forwardedHost = request.headers.get("x-forwarded-host");
  return actual.protocol === "https:" && BIND_HOSTS.includes(actual.hostname) && host === expected.host
    && (forwardedHost === null || forwardedHost === expected.host);
}
