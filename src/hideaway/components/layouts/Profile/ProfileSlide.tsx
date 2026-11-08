import { InkedTitle } from "@/hideaway/components/layouts/Profile/FVTItle";
import { Slider } from "@/hideaway/components/layouts/Profile/Slider";
import {
  MemberAboutLeftSlideProps,
  ProfileSlideProps,
  StickySectionProps
} from "@/hideaway/components/layouts/Profile/types";
import { cn } from "@/lib/utils";
import RichText from "../../UX/RichText";
import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React from "react";

const textureDummyData: ProfileSlideProps["textures"] = [
  { url: "/media/IMG_6521-1920x1439.webp", mimeType: "image/webp" },
  { url: "/media/IMG_6355-1920x3415.jpg", mimeType: "image/jpg" },
  {
    url: "/media/21succession-recap-articleLarge.webp",
    mimeType: "image/webp"
  },
  { url: "/media/branded_2-1200x630.webp", mimeType: "image/webp" }
];
export const ProfileSlide = ({
  places,
  name,
  bio,
  hero,
  userId,
  slides = [],
  textures = textureDummyData
}: ProfileSlideProps) => {
  gsap.registerPlugin(ScrollTrigger);
  const marqueeTitle =
    "BRIDGING THE GAP BETWEEN THE PUBLIC AND THE INTIMATE - THE HIDEAWAY, A RESTORED PROJECT - SEOUL, BOSTON, PARIS, LONDON & LA";
  return (
    <div id={"profil"} className={"relative h-full w-full uppercase"}>
      <InkedTitle id={"blot-title"} name={name} />
      <div className={"relative z-1"} id={"container"}>
        <div
          className={cn(
            "l-0 sticky top-0 flex h-screen w-[55%] items-center justify-center",
            { "-mb-[100vh]": true }
          )}
        >
          <div className={"relative aspect-3/4 w-[20vw]"}>
            <div
              className={"h-full w-full rounded-xl"}
              id={"frame"}
              data-themed={"box-shadow, background-color"}
              data-gl-type="about-sticky-img-slider"
            ></div>
          </div>
        </div>
        <div className={"flex items-start"}>
          <LeftSlide bio={bio} places={places} name={name} />
          <div className={"relative w-1/2"}>
            {slides.map((slide, index) => (
              <StickySection
                key={slide.title + index}
                title={slide.title}
                content={slide.content}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
      <Slider
        textures={{
          tSlide1: {
            tex: null!,
            image: {
              src: textures[0]?.url || textureDummyData[0]!.url
            },
            video: undefined
          },
          tSlide2: {
            tex: null!,
            image: {
              src: textures[1]?.url || textureDummyData[1]!.url
            },
            video: undefined
          },
          tSlide3: {
            tex: null!,
            image: {
              src: textures[2]?.url || textureDummyData[2]!.url
            },
            video: undefined
          },
          tSlide4: {
            tex: null!,
            image: {
              src: textures[3]?.url || textureDummyData[3]!.url
            },
            video: undefined
          }
        }}
        gradient1={hero.gradient1}
        gradient2={hero.gradient2}
        userId={userId}
      />
    </div>
  );
};
const LeftSlide = (props: MemberAboutLeftSlideProps) => {
  const { places, name, bio } = props;
  return (
    <div
      className={
        "sticky top-0 left-0 flex h-screen w-1/2 items-center justify-center"
      }
    >
      <div className={"relative h-full w-full"}>
        <div className={"h-full w-full p-[3.125vw]"}>
          <div className={"w-[80%]"}>
            <p
              className={
                "text-[max(1.875vw,22px)] leading-[1.2] tracking-[-0.025em]"
              }
            >
              {bio}
            </p>
          </div>
        </div>
        <div
          className={
            "absolute top-0 right-[.25em] bottom-0 flex h-full w-[max(1.041vw,10px)] items-center justify-between"
          }
          style={{
            paddingTop: "max(0.781vw,10px)",
            paddingBottom: "max(0.781vw,10px)",
            writingMode: "vertical-rl"
          }}
        >
          <div
            className={
              "flex w-[max(1.041vw,10px)] items-center justify-center pr-[.06em] text-[max(.729vw,13px)] uppercase"
            }
          >
            {places &&
              places.length > 0 &&
              places
                .slice(0, 3)
                .reduce(
                  (prev, currentValue, index) =>
                    index === 0
                      ? prev + currentValue
                      : prev + " - " + currentValue,
                  ""
                )}
          </div>
          <div
            className={
              "flex w-[max(1.041vw,10px)] items-center justify-center pr-[.06em] text-[max(.729vw,13px)] uppercase"
            }
          >
            {name}
          </div>
        </div>
      </div>
    </div>
  );
};
const StickySection = (props: StickySectionProps) => {
  return (
    <div
      ref={props.ref}
      data-slide={props.index}
      className={"sticky top-0 h-screen"}
      style={{
        paddingTop: `calc(3.125vw * 2 * ${props.index} - 3.125vw * var(--f2) * .5 * ${props.index})`
      }}
    >
      <div
        className={
          "relative flex h-full w-full items-center overflow-hidden rounded-xl bg-[#f4f4f4] px-[3.125vw] py-0 dark:bg-[#0f0a0a]"
        }
        data-themed={"background-color, color"}
      >
        <div
          className={
            "absolute top-0 flex h-[calc(3.125vw*2*1-3.125vw*var(--f2)*.5*1)] w-full items-center"
          }
        >
          <div className={"w-[3.125vw]"} style={{ letterSpacing: ".075em" }}>
            ({props.index + 1})
          </div>
          <h2
            className={"pb-[.05em] text-[max(1.25vw,18px)] italic opacity-100"}
            style={{ textTransform: "none" }}
          >
            {props.title}
          </h2>
        </div>
        <div className={"w-[90%] pl-[3.125vw]"}>
          <div>
            <div className={"leading-[1.4]"} style={{ textTransform: "none" }}>
              {props.content && (
                <RichText
                  data={{
                    root: props.content as DefaultTypedEditorState["root"]
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
