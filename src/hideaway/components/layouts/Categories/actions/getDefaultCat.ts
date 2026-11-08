"use server";

import { BasePayload, getPayload, PayloadRequest } from "payload";
import config from "@payload-config";
import { uuidv7 } from "uuidv7";

export async function getDefaultCategorySearch(props?: {
  payload: PayloadRequest["payload"
    ]
}) {
  let payload: BasePayload | undefined | null = props?.payload;
  if (!payload) {
    payload = await getPayload({ config });
  }
  const categiry = await payload.find({
    collection: "categories", where: {
      slug: {
        like: "uncategorized"
      }
    }, select: {
      slug: true, title: true
    }, limit: 1, pagination: false, overrideAccess: true
  }).then(r => r.docs[0]);
  if (!categiry) {
    payload.logger.error("No default category found");
    return [{
      id: uuidv7(), title: "Uncategorized", key: uuidv7(), slug: "uncategorized"
    }];
  }
  return [{
    id: uuidv7(), title: categiry.title, key: categiry.id, slug: categiry.slug
  }];
}