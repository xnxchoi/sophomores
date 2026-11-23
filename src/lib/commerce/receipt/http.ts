import type { Payload, TypedUser } from "payload";
import { z } from "zod";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { projectOrderReceipt, projectOrderRecord, type OrderReceipt } from "./order-receipt";

const privateHeaders = {
  "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
};
type Principal = { payload: Payload; user: TypedUser };
const reject = (status: number) => new Response(null, { status, headers: privateHeaders });

export const receiptPrincipal = (user: TypedUser) => `${user.collection}:${user.id}`;

export async function readOrderDetail({ payload, user }: Principal, id: string) {
  const staff = isCmsSuperAdmin(user);
  if (!staff && user.collection !== "users") return null;
  const order = await payload.findByID({
    collection: "orders", id, user, overrideAccess: false, disableErrors: true, depth: 0,
    select: { customer: true, user: true, commerceVersion: true, commerceSnapshot: true, amount: true, totalAmount: true,
      currency: true, status: true, createdAt: true, fulfillment: true },
  });
  if (!order || order.id !== id) return null;
  const owner = order.commerceVersion === "commerce-v1" ? order.customer : order.user ?? order.customer;
  if (!staff && owner !== user.id) return null;
  const receipt = projectOrderReceipt(order, id);
  return receipt ? { kind: "receipt" as const, receipt } : { kind: "record" as const, record: projectOrderRecord(order) };
}

export function createReceiptDeliveryHandler(authenticate: (req: Request) => Promise<Principal | null>) {
  return async (request: Request) => {
    try {
      const query = new URL(request.url).searchParams;
      const id = z.uuid().safeParse(query.get("order"));
      if (!id.success || query.size !== 1) return reject(404);
      const principal = await authenticate(request);
      if (!principal) return reject(401);
      // The caller's original identity is an extra fence, never an authorization credential.
      if (request.headers.get("x-receipt-principal") !== receiptPrincipal(principal.user)) return reject(403);
      const detail = await readOrderDetail(principal, id.data);
      if (detail?.kind !== "receipt") return reject(404);
      const { address, fulfillment } = detail.receipt;
      return Response.json({ address, fulfillment }, { headers: privateHeaders });
    } catch {
      console.error("Order delivery details could not be read.");
      return reject(503);
    }
  };
}

// These per-process limits aren't shared across replicas. Better Auth's limiter only covers its routes.
export function createReceiptPdfHandler(
  authenticate: (req: Request) => Promise<Principal | null>,
  render: (receipt: OrderReceipt) => Promise<Uint8Array<ArrayBuffer>>,
) {
  const windows = new Map<string, { count: number; expires: number }>();
  let rendering = 0;
  return async (request: Request): Promise<Response> => {
    try {
      const principal = await authenticate(request);
      if (!principal) return reject(401);
      const { user } = principal;
      // Orders already restrict staff reads to verified CMS super admins.
      if (user.collection !== "users" && !isCmsSuperAdmin(user)) return reject(403);
      const query = new URL(request.url).searchParams;
      const id = z.uuid().safeParse(query.get("order"));
      const inline = query.get("view") === "inline";
      if (!id.success || query.size !== (inline ? 2 : 1)) return reject(404);
      const key = `${user.collection}:${user.id}`;
      const now = Date.now();
      for (const [entry, window] of windows) if (window.expires <= now) windows.delete(entry);
      const current = windows.get(key);
      if (!current && windows.size >= 1024) return reject(503);
      if ((current?.count ?? 0) >= 6) return new Response(null, { status: 429,
        headers: { ...privateHeaders, "Retry-After": String(Math.max(1, Math.ceil(((current?.expires ?? now) - now) / 1000))) } });
      windows.set(key, { count: (current?.count ?? 0) + 1, expires: current?.expires ?? now + 60_000 });
      const detail = await readOrderDetail(principal, id.data);
      if (detail?.kind !== "receipt") return reject(404);
      const { receipt } = detail;
      if (rendering >= 2) return reject(503);
      rendering++;
      try {
        return new Response(await render(receipt), { headers: { ...privateHeaders, "Content-Type": "application/pdf",
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="receipt-${receipt.id}.pdf"` } });
      } finally { rendering--; }
    } catch {
      console.error("Order receipt could not be downloaded.");
      return reject(503);
    }
  };
}
