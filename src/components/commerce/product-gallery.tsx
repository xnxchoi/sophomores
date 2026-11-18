"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useTranslations } from "next-intl";
import type { CommerceOffer } from "@/lib/commerce/catalogue";

export function CommerceProductGallery({ images, title }: {
  images: CommerceOffer["images"];
  title: string;
}) {
  const t = useTranslations("Customer.components_commerce_offer");
  const media = images.flatMap(({ image }, sourceIndex) =>
    typeof image === "object" && image.url
      ? [{ id: image.id, src: image.url, alt: image.alt || title, sourceIndex }]
      : []
  );

  if (media.length === 0) return (
    <p className="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted px-8 text-center text-sm leading-relaxed text-muted-foreground">
      {t("imagesUnavailable")}
    </p>
  );

  if (media.length === 1) return (
    // Preserve the configured media host and the original first-slot loading priority.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media[0].src} alt={media[0].alt} loading={media[0].sourceIndex ? "lazy" : "eager"}
      className="aspect-square w-full rounded-xl border border-border bg-muted object-contain" />
  );

  return (
    <Tabs.Root defaultValue={0} className="flex min-w-0 flex-col gap-4">
      <Tabs.List activateOnFocus loopFocus={false} aria-label={t("galleryLabel")}
        className="order-2 flex flex-wrap gap-3">
        {media.map((image, index) => (
          <Tabs.Tab key={`${image.id}:${image.sourceIndex}`} value={index}
            aria-label={t("gallerySelectImage", { number: index + 1, count: media.length })}
            className="relative flex size-18 min-h-12 min-w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-transparent bg-muted p-1 text-foreground transition-colors outline-offset-4 hover:border-border focus-visible:outline-2 data-active:border-foreground">
            {/* The tab's accessible name replaces this duplicate thumbnail description. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="" loading="lazy" className="size-full rounded-sm object-contain" />
            <span aria-hidden="true" className="absolute right-1 bottom-1 flex min-w-5 items-center justify-center rounded-sm bg-background/90 px-1 text-[10px] leading-5 tabular-nums">
              {index + 1}
            </span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <div className="order-1 grid min-w-0">
        {media.map((image, index) => (
          <Tabs.Panel key={`${image.id}:${image.sourceIndex}`} value={index} keepMounted
            className="col-start-1 row-start-1 min-w-0 rounded-xl outline-offset-4 transition-opacity duration-250 ease-out focus-visible:outline-2 data-hidden:hidden data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading={image.sourceIndex ? "lazy" : "eager"}
                className="size-full object-contain" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              {t("galleryImagePosition", { number: index + 1, count: media.length })}
            </p>
          </Tabs.Panel>
        ))}
      </div>
    </Tabs.Root>
  );
}
