import { request } from "node:https";

/*
 * A minimal fetch for the web app's Polygon reads (Review-A, 25 Nov, MEDIUM): Next patches globalThis.fetch and can
 * record a request's URL in its trace spans (patch-fetch: span name and http.url). An Alchemy URL carries its key in
 * the path, so the wallet-pass holder check talks to the RPC through node:https directly and never through the patched
 * fetch. HTTPS only, POST/GET with a string body, no redirects (a 3xx is returned as is, which viem treats as an
 * error), a bounded response, and the caller's AbortSignal honoured. Errors carry no URL.
 */
const MAX_RESPONSE_BYTES = 1024 * 1024;
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 103, 204, 205, 304]);

/**
 * The Response for what came back, built so it can't throw: a null-body status (204, 304...) gets no body, and a status
 * the Response constructor refuses (outside 200-599) becomes null, which the caller rejects (Review-A, 26 Nov: a
 * constructor throw inside the 'end' listener escaped the promise as an uncaught exception).
 */
export function responseFrom(status: number | undefined, chunks: readonly Buffer[], headers: Headers): Response | null {
  const code = status ?? 502;
  try {
    return new Response(NULL_BODY_STATUSES.has(code) ? null : Buffer.concat(chunks), { status: code, headers });
  } catch {
    return null;
  }
}

export const untracedFetch = (async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.protocol !== "https:") throw new Error("Untraced fetch is HTTPS only");
  if (init.body != null && typeof init.body !== "string") throw new Error("Untraced fetch sends string bodies only");
  const headers = new Headers(init.headers);
  const body = typeof init.body === "string" ? init.body : undefined;
  if (body !== undefined) headers.set("content-length", String(Buffer.byteLength(body)));
  const signal = init.signal ?? undefined;
  if (signal?.aborted) throw new Error("RPC request aborted");
  return new Promise<Response>((resolve, reject) => {
    const req = request(url, { method: init.method ?? "GET", headers: Object.fromEntries(headers), signal }, res => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) { req.destroy(); reject(new Error("RPC response too large")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (typeof value === "string") responseHeaders.set(name, value);
          else if (Array.isArray(value)) responseHeaders.set(name, value.join(", "));
        }
        const response = responseFrom(res.statusCode, chunks, responseHeaders);
        if (response) resolve(response);
        else reject(new Error("RPC response status unsupported"));
      });
      res.on("error", () => reject(new Error("RPC response failed")));
    });
    req.on("error", () => reject(new Error("RPC request failed")));
    if (body !== undefined) req.write(body);
    req.end();
  });
}) as typeof fetch;
