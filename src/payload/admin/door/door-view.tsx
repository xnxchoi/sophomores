import type { AdminViewServerProps } from "payload";
import { isCmsStaff } from "@/lib/auth/access";
import { DoorConsole } from "./door-console";

/**
 * ADR-0007: the door, at /admin/door. A Payload admin view, so it sits behind the
 * same CMS staff sign-in as every other staff surface. The endpoints enforce the
 * same `isCmsStaff` boundary independently.
 */
export async function DoorView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult;
  if (!isCmsStaff(req.user)) return <DoorConsole allowed={false} events={[]} />;
  const found = await req.payload.find({ collection: "commerce-events" as never, depth: 0, limit: 50, sort: "-partIStartsAt", overrideAccess: true, req });
  const events = (found.docs as unknown as { id: string; name?: string }[]).map((event) => ({ id: String(event.id), name: String(event.name ?? event.id) }));
  return <DoorConsole allowed events={events} />;
}
