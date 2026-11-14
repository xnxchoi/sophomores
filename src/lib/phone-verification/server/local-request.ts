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
 * Request authority for the configured auth origin. A loopback `http:` origin keeps the
 * exact local rules above; an `https:` production origin must match `request.url`
 * exactly and, when a Host header is present, its host. Forwarded headers are ignored.
 * Commerce callers still use the local-only helper above.
 */
export function hasConfiguredRequestAuthority(request: Request, origin: string): boolean {
  const expected = new URL(origin);
  if (expected.protocol === "http:") return hasLocalRequestAuthority(request, origin);
  if (expected.protocol !== "https:") return false;
  const actual = new URL(request.url);
  if (actual.origin !== expected.origin || actual.username || actual.password) return false;
  const host = request.headers.get("host");
  return host === null || host === expected.host;
}
