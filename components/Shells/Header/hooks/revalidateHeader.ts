"use server";
import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

export const revalidateHeader: GlobalAfterChangeHook = async ({ doc, req: { payload } }) => {
  payload.logger.info(`Revalidating header`);

  revalidateTag("global_header", "max");


  return doc;
};
