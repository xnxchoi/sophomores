import { draftMode, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homePageDraftViewer, homePageLocale, homePagePreviewLocation } from "@/lib/teaser/home-page-copy";

/**
 * The Live Preview entry into Next draft mode (Payload docs, admin/preview: "authenticates user, and enters
 * draft mode"). Authorization is the staff session the preview iframe carries, checked with payload.auth;
 * there is no shared secret, because a secret in this GET URL would land in request logs. It fails closed:
 * no verified CMS staff session, 403 and draft mode switched off. Draft mode grants nothing by itself: the
 * Home page and its JSON route re-check the staff session on every draft read.
 * Staff are always sent to the local Home page with an approved query (homePagePreviewLocation).
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  let staff = null;
  try {
    const { getPayload } = await import("@/payload");
    staff = await homePageDraftViewer(await getPayload(), { draftMode: true, headers: req.headers });
  } catch {
    // Payload unavailable: nobody can be verified, so the entry refuses.
  }
  if (!staff) {
    try {
      // Also end any earlier draft mode. Not what protects drafts: every draft read re-checks staff.
      (await draftMode()).disable();
    } catch {
      // Outside a Next request (unit tests) there is no draft-mode cookie to clear.
    }
    return new Response("You are not allowed to preview this page", { status: 403 });
  }
  const location = homePagePreviewLocation(searchParams);
  (await draftMode()).enable();
  (await cookies()).set("NEXT_LOCALE", homePageLocale(searchParams.get("locale")), { path: "/" });
  redirect(location);
}
