import { LinkUnderlined } from "@/components/core/Link/Link";
import { Missing } from "./Missing";
import { MissingLayout } from "./lays.client";

/** Hideaway's 404 page. The layout already mounts the providers. */
export function NotFoundPage() {
  return (
    <>
      <div className="title-wrapper fixed h-full w-full">
        <MissingLayout />
      </div>
      <Missing />
      <div className="fixed z-1 flex h-full w-full items-center justify-center">
        <LinkUnderlined
          className="link-underlined bg-transparent hover:text-red-500"
          href="/"
          style={{ position: "relative", bottom: "20px" }}
        >
          Come Back.
        </LinkUnderlined>
      </div>
    </>
  );
}
