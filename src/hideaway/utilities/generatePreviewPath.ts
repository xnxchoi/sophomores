import { PayloadRequest } from "payload";

const previewPathBuilders = {
  pages: (slug: string) => `/${slug}`,
  posts: (slug: string) => `/essays/${slug}`,
  surf: (slug: string) => `/surf/${slug}`,
  users: (slug: string) => `/users/${slug}`,
  profile: (slug: string) => `/users/${slug}/profile`
};

const authorPreviewPathBuilders = {
  posts: ({ slug, userSlug }: { slug: string; userSlug: string }) =>
    `/@${userSlug}/essays/${slug}`,
  surf: ({ slug, userSlug }: { slug: string; userSlug: string }) =>
    `/@${userSlug}/surf/${slug}`,
  profile: ({ userSlug }: { slug: string; userSlug: string }) =>
    `/users/${userSlug}/profile`
};

type PreviewPathProps = {
  collection: keyof typeof previewPathBuilders;

  slug: string;
  req: PayloadRequest;
};
type PreviewPathWithAuthorProps = {
	collection: keyof typeof authorPreviewPathBuilders;
	req: PayloadRequest;
	slug: string;
	userID: string;
};

export const resolveRelationshipID = (value: unknown): string | undefined => {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	if (value && typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;

		if (typeof id === "string" || typeof id === "number") {
			return String(id);
		}
	}

	return undefined;
};

export const generatePreviewPathWithAuthor = async ({
	collection,
	slug,
  userID,
  req
}: PreviewPathWithAuthorProps) => {
  if (!userID) {
    throw new Error("User ID is required");
  }
  const user = await req.payload.findByID({
    collection: "users",
    id: userID,
    select: {
      slug: true
    },
    overrideAccess: true
  });
  if (!user) {
    throw new Error(`User with ID ${userID} not found`);
  }
  const userSlug = user.slug;
  const path = authorPreviewPathBuilders[collection]({ slug, userSlug });
  const encodedParams = new URLSearchParams({
    slug,
    collection,
    path,
    previewSecret: process.env.PREVIEW_SECRET || ""
  });

  const url = `/next/preview?${encodedParams.toString()}`;

  return url;
};
export const generatePreviewPath = ({ collection, slug }: PreviewPathProps) => {
  const path = previewPathBuilders[collection](slug);

  const encodedParams = new URLSearchParams({
    slug,
    collection,
    path,
    previewSecret: process.env.PREVIEW_SECRET || ""
  });

  const url = `/next/preview?${encodedParams.toString()}`;

  return url;
};
