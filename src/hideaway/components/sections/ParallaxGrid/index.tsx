"use client";
import "@/styles/__parallax_grid.scss";
import { ComponentProps, useEffect, useRef } from "react";
import Image from "next/image";
import { Media } from "@/payload-types";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import { useDeviceInfo } from "@/hideaway/providers/RP_Pro";
import { useGSAP } from "@gsap/react";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { useShallow } from "zustand/shallow";
gsap.registerPlugin(ScrollTrigger);
export type RPImage = Partial<
  Pick<Media, "height" | "width" | "alt" | "sizes">
> &
  Pick<Media, "url">;
export type ParallaxGridProps = {
  title: string;
  images: RPImage[];
};
export const ParallaxGrid = (
  props: ComponentProps<"div"> & ParallaxGridProps
) => {
  const { title, images, ...rest } = props;
  const config = {
    title: title || "Parallax Grid",
    images: [...images]
  };
  const section = useRef<HTMLElement>(null!);
  const container = useRef<HTMLDivElement>(null!),
    imagesListContainer = useRef<HTMLDivElement>(null!),
    imagesList = useRef<HTMLUListElement>(null!);
  const scrollTrigger = useRef<GSAPTimeline>(null!);

  const wW = useRPStore(useShallow((r) => r.viewportWidth));
  const windowResize = useWindowResize({ detectHeightChange: true });
  const isMobile = useDeviceInfo(useShallow((r) => r.isMobile));
  useEffect(() => {
    gsap.to(section.current, {
      autoAlpha: 1,
      duration: 0.1
    });
  }, []);
  useGSAP(
    () => {
      if (scrollTrigger.current) {
        scrollTrigger.current.kill();
      }
      const offsetLeft = imagesList.current.getBoundingClientRect().left;
      const iW = wW;
      const ll = isMobile ? iW * 0.5 : iW * 0.15;
      const offsetWidth = imagesList.current.offsetWidth - iW + offsetLeft + ll;

      scrollTrigger.current = gsap
        .timeline({
          scrollTrigger: {
            trigger: imagesList.current,
            start: "top center+10%",
            end: "bottom top",
            scrub: true
          }
        })
        .fromTo(
          imagesList.current,
          { x: 0 },
          { x: -offsetWidth, ease: "none" },
          0
        );
    },
    { dependencies: [windowResize] }
  );
  return (
    <section ref={section} style={{ margin: "150px 0" }}>
      <div>
        <div className="parallax__grid" ref={container}>
          <div className="parallax__grid-inner">
            <div className={"parallax__grid-title-container"}>
              <h1 className={"parallax__grid-title"}>{config.title}</h1>
            </div>
          </div>
          <div
            className="parallax__grid-images-list-container"
            ref={imagesListContainer}
          >
            <ul className="parallax__grid-images-list" ref={imagesList}>
              {config.images.map((image, index) => {
                return (
                  (image.url && (
                    <li
                      className="parallax__grid-images-list-item"
                      data-index={index}
                      key={index + "ff"}
                    >
                      <div
                        className={cn(
                          "parallax__grid-image-container",
                          `parallax__grid-item-${index}`
                        )}
                      >
                        <Image
                          width={300}
                          height={300}
                          alt={"some"}
                          src={image.url}
                          className="parallax__grid-image"
                        />
                      </div>
                    </li>
                  )) ||
                  null
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
