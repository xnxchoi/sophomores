import type { Endpoint } from "payload";
import { z } from "zod";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";
import { assertCommerceBrowserAuthority } from "../access";
import { readOwnedEventPassSource } from "./event-pass";
import { createPassHolderCheck, type PassHolderCheck } from "./unlock/pass-holder";

const params = z.strictObject({ orderID: z.uuid(), admissionID: z.uuid(), platform: z.enum(["ios", "android"]) });
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  Vary: "Accept, Cookie, Authorization",
};
const unavailable = (status: number) => Response.json({ error: "Wallet pass unavailable" }, { status, headers: privateHeaders });
type Fail = (status: number) => Response;
/**
 * A click on the card's link is a top-level navigation: any refusal or Locksmith failure sends the member back to the
 * ticket page with one fixed marker (the card shows a plain line), built from the validated order UUID only. Fetches
 * (Accept: application/json) keep the JSON error.
 */
function failureFor(req: { headers: Headers }, orderID: string): Fail {
  if (req.headers.get("sec-fetch-mode") !== "navigate" || req.headers.get("accept") === "application/json") return unavailable;
  const back = `/shop/orders/${orderID}#wallet-pass-unavailable`;
  return () => new Response(null, { status: 303, headers: { ...privateHeaders, Location: back } });
}
const appleType = "application/vnd.apple.pkpass";
const googleResponse = z.object({ passObjectUrl: z.string().max(16_384) });

async function readBounded(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing pass content");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) return Buffer.concat(chunks, size);
      size += part.value.byteLength;
      if (size > limit) throw new Error("Pass content exceeds limit");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

async function servePass(response: Response, platform: "ios" | "android", json: boolean, unavailable: Fail) {
  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  if (!response.ok || contentType !== (platform === "ios" ? appleType : "application/json")) {
    await response.body?.cancel();
    return unavailable(502);
  }
  if (platform === "ios") {
    const bytes = await readBounded(response, 4 * 1024 * 1024);
    if (bytes.subarray(0, 4).toString("hex") !== "504b0304") return unavailable(502);
    return new Response(new Uint8Array(bytes), { headers: { ...privateHeaders,
      "Content-Type": appleType, "Content-Disposition": 'attachment; filename="event-ticket.pkpass"' } });
  }
  const { passObjectUrl } = googleResponse.parse(JSON.parse((await readBounded(response, 20 * 1024)).toString("utf8")));
  const save = new URL(passObjectUrl);
  if (save.origin !== "https://pay.google.com" || save.username || save.password || save.search || save.hash ||
    !/^\/gp\/v\/save\/[\w-]+\.[\w-]+\.[\w-]+$/.test(save.pathname)) return unavailable(502);
  // Navigation goes to Google; an explicit sponsor share action can copy the validated URL instead.
  return json ? Response.json({ passObjectUrl: save.href }, { headers: privateHeaders })
    : new Response(null, { status: 302, headers: { ...privateHeaders, Location: save.href } });
}

type Dependencies = {
  getMemberRuntime?: () => { config: { origin: string }; toMemberPrincipal: (request: Request) => Promise<{ userId: string; emailVerified: boolean } | null> } | null;
  fetcher?: typeof fetch;
  /** Serve-time chain proof that the member's Safe still holds the valid key; fails closed (pass-holder.ts). */
  keyHeld?: PassHolderCheck;
};

export function createEventPassEndpoint({ getMemberRuntime = getPayloadMemberRuntime, fetcher = (...args) => fetch(...args),
  keyHeld = createPassHolderCheck() }: Dependencies = {}): Endpoint {
  const rates = new Map<string, { count: number; until: number }>();
  return {
    path: "/commerce/orders/:orderID/admissions/:admissionID/wallet-pass/:platform",
    method: "get",
    handler: async req => {
      const parsed = params.safeParse(req.routeParams);
      if (!parsed.success) return unavailable(404);
      const { orderID, admissionID, platform } = parsed.data;
      const fail = failureFor(req, orderID);
      if (!req.url || req.user?.collection !== "users") return fail(404);
      let source: Awaited<ReturnType<typeof readOwnedEventPassSource>>;
      try {
        const request = new Request(req.url, { headers: req.headers });
        const runtime = getMemberRuntime();
        if (!runtime || request.url.includes("?") || isReviewCopyRequest(request)) return fail(404);
        assertCommerceBrowserAuthority(req, runtime.config.origin, "read");
        const buyer = String(req.user.id);
        const principal = await runtime.toMemberPrincipal(request);
        if (!principal?.emailVerified || principal.userId !== buyer) return fail(404);
        const now = Date.now();
        for (const [id, rate] of rates) if (rate.until <= now) rates.delete(id);
        const rate = rates.get(buyer);
        if (rate ? rate.count >= 20 : rates.size >= 1024) return fail(429);
        rates.set(buyer, { count: (rate?.count ?? 0) + 1, until: rate?.until ?? now + 60_000 });
        source = await readOwnedEventPassSource(req, buyer, orderID, admissionID, platform);
      } catch {
        return fail(404);
      }
      if (!source) return fail(404);
      // Live on Polygon, right before Unlock is asked: a key that moved, expired or was cancelled gets no pass.
      try { if (!(await keyHeld(source.key))) return fail(404); } catch { return fail(404); }
      try {
        const upstream = await fetcher(source.url, { cache: "no-store", credentials: "omit", redirect: "error",
          signal: AbortSignal.timeout(5000) });
        return await servePass(upstream, platform, req.headers.get("accept") === "application/json", fail);
      } catch {
        return fail(502);
      }
    },
  };
}
