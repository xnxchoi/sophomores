import { describe, expect, it } from "vitest";
import { pageTypeToPublicPath, pageTypeToPublicPrefix } from "./RP_Voyageur";

describe("public route serialization", () => {
  it("maps semantic page types to public prefixes", () => {
    expect(pageTypeToPublicPrefix("posts")).toBe("essays");
    expect(pageTypeToPublicPrefix("categories")).toBe("archived");
    expect(pageTypeToPublicPrefix("tags")).toBe("tagged");
    expect(pageTypeToPublicPrefix("pages")).toBe("");
  });

  it.each([
    ["posts", "an essay", "/essays/an%20essay"],
    ["categories", "travel/seoul", "/archived/travel/seoul"],
    ["tags", "music", "/tagged/music"],
    ["pages", "about", "/about"]
  ])("serializes %s/%s as %s", (pageType, slug, expected) => {
    expect(
      pageTypeToPublicPath(
        pageType as "posts" | "categories" | "tags" | "pages",
        slug
      )
    ).toBe(expected);
  });
});
