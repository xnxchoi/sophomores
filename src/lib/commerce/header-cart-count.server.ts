import "server-only";
import type { Payload } from "payload";
import { z } from "zod";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

/**
 * How many lines the signed-in member's open cart holds, for the header (Cordy, 26 Nov): a count only, never the cart.
 * Null when there is no verified member session or the read fails, so the header shows no count rather than a wrong
 * one. Request-scoped like readHeaderMemberState: the layout that reads it is dynamic (sent no-store), and nothing here
 * is cached, serialized or kept in the browser.
 */
export async function readHeaderMemberCartLines(headers: Headers): Promise<number | null> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return null;
    const principal = await runtime.toMemberPrincipal(new Request(runtime.config.origin, { headers }));
    if (!principal) return null;
    const { getPayload } = await import("@/payload");
    return await countMemberCartLines(await getPayload(), principal.userId);
  } catch {
    console.error("Header cart count could not be loaded.");
    return null;
  }
}

// Review-B, 27 Nov: only an explicit empty join ({ docs: [] }) or a populated cart with a valid items array is a count.
// A missing, malformed or unpopulated join (a bare ID) is no answer.
const cartJoin = z.object({ docs: z.array(z.unknown()) });
const openCart = z.object({ id: z.union([z.string(), z.number()]), items: z.array(z.object({ product: z.unknown() })) });

/**
 * SYSTEM read scoped to one verified member: the users.cart join the plugin's client uses (open cart only, newest first,
 * one doc; src/lib/commerce/ecommerce.ts), answered as a line count.
 */
export async function countMemberCartLines(payload: Payload, userId: string): Promise<number | null> {
  // The cart join is added by the commerce plugin at config time, so its select/joins keys aren't in the generated types.
  const user = await payload.findByID({ collection: "users", id: userId, overrideAccess: true, disableErrors: true,
    depth: 1, select: { cart: true } as never, joins: { cart: { limit: 1 } } as never }) as { id?: unknown; cart?: unknown } | null;
  if (!user || String(user.id) !== userId) return null;
  const join = cartJoin.safeParse(user.cart);
  if (!join.success) return null;
  if (join.data.docs.length === 0) return 0;
  const cart = openCart.safeParse(join.data.docs[0]);
  return cart.success ? cart.data.items.length : null;
}
