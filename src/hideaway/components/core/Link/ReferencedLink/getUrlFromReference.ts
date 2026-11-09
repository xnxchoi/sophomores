"use server";
import { LinkedCollectionSlug } from "../types";
import { collectionTypeToFrontEnd } from "@/payload/collections/Posts/hooks/collectionTypeToFrontEnd";
import config from "@payload-config";
import { getPayload } from "payload";

export async function getUrlFromReference({
  relationTo,
  value
}: {
  relationTo: LinkedCollectionSlug;
  value: string;
}) {
  const payload = await getPayload({ config });
  const url = await payload
    .findByID({
      collection: relationTo,
      id: value,
      select: {
        slug: true
      }
    })
    .catch(
      (e) => (
        payload.logger.info(
          `Error while querying for document from ${relationTo}, id: ${value}`,
          e
        ),
        null
      )
    );
  return (
    (url?.slug && `${collectionTypeToFrontEnd(relationTo)}/${url.slug}`) || null
  );
}
