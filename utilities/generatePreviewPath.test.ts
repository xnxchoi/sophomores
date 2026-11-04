import type { PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generatePreviewPath,
  generatePreviewPathWithAuthor,
  resolveRelationshipID
} from "./generatePreviewPath";

const readPreviewParams = (url: string) => {
  const [, query = ""] = url.split("?");
  return Object.fromEntries(new URLSearchParams(query));
};

describe("generatePreviewPath", () => {
  beforeEach(() => {
    process.env.PREVIEW_SECRET = "test-preview-secret";
  });

  it.each([
    ["pages", "about", "/about"],
    ["posts", "long-essay", "/essays/long-essay"],
    ["surf", "small-wave", "/surf/small-wave"],
    ["users", "sean", "/users/sean"],
    ["profile", "sean", "/users/sean/profile"]
  ] as const)(
    "builds a relative %s preview URL for the public app route",
    (collection, slug, path) => {
      const url = generatePreviewPath({
        collection,
        slug,
        req: {} as PayloadRequest
      });

      expect(url.startsWith("/next/preview?")).toBe(true);
      expect(readPreviewParams(url)).toMatchObject({
        collection,
        path,
        previewSecret: "test-preview-secret",
        slug
      });
    }
  );
});

describe("resolveRelationshipID", () => {
  it.each([
    ["user-1", "user-1"],
    [{ id: "user-2", slug: "sean" }, "user-2"],
    [null, undefined],
    [{ slug: "missing-id" }, undefined]
  ])("normalizes %j to %s", (value, expected) => {
    expect(resolveRelationshipID(value)).toBe(expected);
  });
});

describe("generatePreviewPathWithAuthor", () => {
  beforeEach(() => {
    process.env.PREVIEW_SECRET = "test-preview-secret";
  });

  const createReq = (slug = "sean") =>
    ({
      payload: {
        findByID: vi.fn(async () => ({ slug }))
      }
    }) as unknown as PayloadRequest;

  it.each([
    ["posts", "long-essay", "/@sean/essays/long-essay"],
    ["surf", "small-wave", "/@sean/surf/small-wave"],
    ["profile", "ignored-profile-slug", "/users/sean/profile"]
  ] as const)(
    "builds an author-aware %s preview URL that resolves through existing routes",
    async (collection, slug, path) => {
      const req = createReq();
      const url = await generatePreviewPathWithAuthor({
        collection,
        req,
        slug,
        userID: "user-1"
      });

      expect(readPreviewParams(url)).toMatchObject({
        collection,
        path,
        previewSecret: "test-preview-secret",
        slug
      });
      expect(req.payload.findByID).toHaveBeenCalledWith({
        collection: "users",
        id: "user-1",
        overrideAccess: true,
        select: {
          slug: true
        }
      });
    }
  );

  it("throws before querying when no author id is available", async () => {
    await expect(
      generatePreviewPathWithAuthor({
        collection: "posts",
        req: createReq(),
        slug: "draft",
        userID: ""
      })
    ).rejects.toThrow("User ID is required");
  });
});
