import { draftMode, cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "/";
  const rawLocale = searchParams.get("locale");
  const locale = rawLocale && rawLocale !== "[object Object]" ? rawLocale : "en";
  const secret = searchParams.get("secret");

  if (
    process.env.PAYLOAD_PREVIEW_SECRET &&
    secret !== process.env.PAYLOAD_PREVIEW_SECRET
  ) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/" });

  const targetUrl = new URL(url, req.url);
  if (locale && !targetUrl.searchParams.has("locale")) {
    targetUrl.searchParams.set("locale", locale);
  }
  const draftId = searchParams.get("draftId");
  if (draftId && !targetUrl.searchParams.has("draftId")) {
    targetUrl.searchParams.set("draftId", draftId);
  }
  if (!targetUrl.searchParams.has("draft")) {
    targetUrl.searchParams.set("draft", "true");
  }

  redirect(targetUrl.pathname + targetUrl.search);
}
