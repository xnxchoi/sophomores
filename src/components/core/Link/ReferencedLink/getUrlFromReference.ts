export type ReferenceTarget = {
  relationTo: string;
  value: string;
};

/** Turns a collection document into a site path. Not installed yet. */
export type ReferenceUrlResolver = (
  reference: ReferenceTarget
) => Promise<string | null> | string | null;

export async function getUrlFromReference(
  reference: ReferenceTarget,
  resolveReference?: ReferenceUrlResolver
) {
  if (!resolveReference) return null;
  return resolveReference(reference);
}
