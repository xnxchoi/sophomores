"use client";

import { useAssetsRP } from "@/components/UX/Preloader/hooks";
import { TranslatingText } from "@/components/UX/Preloader/TranslatingText";
import { useCursor, useRPStore } from "@/providers/RP_Pro";
import { useVoyageur } from "@/stores/Routing/RP_Voyageur";
import { wait } from "@/utilities/wait";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";

export const Hideaway_Preloader = () => {
  const preloaderAnimationType = useRPStore(
    useShallow((r) => r.preloaderAnimationType)
  );
  const setPreloaderAnimationType = useRPStore(
    (r) => r.setPreloaderAnimationType
  );
  const { loadAssets } = useAssetsRP();
  const setPreloaderEnabled = useRPStore((r) => r.togglePreloaderAnimation);
  const cursorTheme = useCursor(useShallow((r) => r.cursorTheme));
  const isHome = useVoyageur(useShallow((r) => r.isHome));
  const hasInitiated = useRef(false);
  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = !0;
    let l = localStorage.getItem("rp-preloader") as null | `${number}`,
      c = new Date(),
      d = c.getTime();
    if (!l && isHome) {
      (localStorage.setItem("rp-preloader", `${d}`),
        setPreloaderAnimationType("SLOW"),
        setPreloaderEnabled(!0));
      return;
    }
    let h = parseInt(l || "0");
    (d - h > 864e5 && isHome
      ? (localStorage.setItem("rp-preloader", `${d}`),
        setPreloaderAnimationType("SLOW"))
      : setPreloaderAnimationType("FAST"),
      setPreloaderEnabled(!0));
  }, [isHome, setPreloaderAnimationType, setPreloaderEnabled]);
  useEffect(() => {
    if (preloaderAnimationType !== "SLOW") return;
    const fire = async () => {
      await wait(250);
      loadAssets();
    };
    fire();
  }, [preloaderAnimationType, loadAssets]);
  return (
    <div
      className={
        "fixed inset-0 z-330 h-screen w-full bg-faded-foreground text-faded-background"
      }
    >
      <div
        className={`absolute top-0 z-2 grid h-[calc(100-18.66*var(--vh)-var(--gutter))] w-full grid-cols-[repeat(6,1fr)] grid-rows-[repeat(2,1fr)] gap-(--gutter) p-(--gutter) lg:h-screen lg:w-[33.3333vw] lg:grid-cols-[repeat(2,1fr)] lg:grid-rows-[repeat(6,1fr)]`}
      >
        <TranslatingText
          id="TITLE_1"
          size={"large"}
          text="Loading..."
          positions={[
            {
              number: 3,
              corner: "TOP_RIGHT"
            },
            {
              number: 4,
              corner: "TOP_RIGHT"
            },
            {
              number: 3,
              corner: "TOP_LEFT"
            }
          ]}
          introPositionMobile={{
            number: 4,
            corner: "BOTTOM_LEFT"
          }}
          positionsMobile={[
            {
              number: 1,
              corner: "BOTTOM_LEFT"
            },
            {
              number: 1,
              corner: "BOTTOM_LEFT",
              offset: {
                x: "LEFT_2"
              }
            },
            {
              number: 1,
              corner: "BOTTOM_LEFT",
              offset: {
                x: "LEFT_2",
                y: "DOWN_2"
              }
            }
          ]}
          introPosition={{
            number: 4,
            corner: "TOP_RIGHT",
            offset: {
              x: "RIGHT_1"
            }
          }}
        />
        <TranslatingText
          id="TITLE_2"
          size={"large"}
          text="Please wait..."
          introPosition={{
            number: 8,
            corner: "TOP_LEFT",
            offset: {
              x: "RIGHT_2"
            }
          }}
          positions={[
            {
              number: 8,
              corner: "TOP_LEFT"
            },
            {
              number: 7,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_2"
              }
            },
            {
              number: 3,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_2"
              }
            }
          ]}
          introPositionMobile={{
            number: 8,
            corner: "BOTTOM_LEFT"
          }}
          positionsMobile={[
            {
              number: 11,
              corner: "BOTTOM_LEFT"
            },
            {
              number: 12,
              corner: "BOTTOM_LEFT",
              offset: {
                x: "RIGHT_1"
              }
            },
            {
              number: 12,
              corner: "BOTTOM_LEFT",
              offset: {
                x: "RIGHT_1",
                y: "UP_3"
              }
            }
          ]}
        />
        <TranslatingText
          id="TITLE_3"
          size={"large"}
          text="Almost there..."
          introPosition={{
            number: 21,
            corner: "TOP_LEFT",
            offset: {
              x: "LEFT_2"
            }
          }}
          positions={[
            {
              number: 21,
              corner: "TOP_LEFT"
            },
            {
              number: 22,
              corner: "TOP_LEFT",
              offset: {
                x: "RIGHT_1"
              }
            },
            {
              number: 18,
              corner: "TOP_LEFT",
              offset: {
                x: "RIGHT_1"
              }
            }
          ]}
          introPositionMobile={{
            number: 16,
            corner: "TOP_LEFT"
          }}
          positionsMobile={[
            {
              number: 13,
              corner: "TOP_LEFT"
            },
            {
              number: 13,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_4"
              }
            },
            {
              number: 13,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_4",
                y: "DOWN_1"
              }
            }
          ]}
        />
        <TranslatingText
          id="RANDOM_TEXT_1"
          hideMobile
          text="Preparing assets..."
          className="text-base"
          introPosition={{
            number: 12,
            corner: "TOP_LEFT",
            offset: {
              x: "RIGHT_1"
            }
          }}
          positions={[
            {
              number: 12,
              corner: "TOP_LEFT"
            },
            {
              number: 11,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_1"
              }
            },
            {
              number: 11,
              corner: "TOP_LEFT",
              offset: {
                x: "LEFT_5"
              }
            }
          ]}
        />
        <TranslatingText
          id="RANDOM_TEXT_2"
          hideMobile
          text="Initializing..."
          className="text-base"
          introPosition={{
            number: 11,
            corner: "BOTTOM_LEFT",
            offset: {
              x: "RIGHT_3"
            }
          }}
          positions={[
            {
              number: 11,
              corner: "BOTTOM_LEFT"
            },
            {
              number: 11,
              corner: "BOTTOM_LEFT",
              offset: {
                y: "DOWN_1"
              }
            },
            {
              number: 11,
              corner: "BOTTOM_LEFT",
              offset: {
                y: "DOWN_1",
                x: "LEFT_1"
              }
            }
          ]}
        />
        <TranslatingText
          id="RANDOM_TEXT_3"
          hideMobile
          text="Setting up..."
          className="text-base"
          introPosition={{
            number: 17,
            corner: "TOP_RIGHT",
            offset: {
              x: "LEFT_2"
            }
          }}
          positions={[
            {
              number: 17,
              corner: "TOP_RIGHT"
            },
            {
              number: 18,
              corner: "TOP_RIGHT",
              offset: {
                x: "RIGHT_2"
              }
            },
            {
              number: 18,
              corner: "TOP_RIGHT",
              offset: {
                x: "RIGHT_2",
                y: "DOWN_1"
              }
            }
          ]}
        />
        <TranslatingText
          id="RANDOM_TEXT_4"
          hideMobile
          text={(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const displayHours = hours > 12 ? hours - 12 : hours;
            const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
            const timezone = now
              .toLocaleTimeString("en-us", {
                timeZoneName: "short"
              })
              .split(" ")[2];
            return `${displayHours}:${displayMinutes} ${timezone}`;
          })()}
          className="text-base"
          introPosition={{
            number: 12,
            corner: "BOTTOM_RIGHT",
            offset: {
              x: "RIGHT_2"
            }
          }}
          positions={[
            {
              number: 12,
              corner: "BOTTOM_RIGHT",
              offset: {
                x: "RIGHT_1"
              }
            },
            {
              number: 23,
              corner: "BOTTOM_LEFT"
            },
            {
              number: 21,
              corner: "TOP_LEFT"
            }
          ]}
        />
        {Array(12)
          .fill(null)
          .map((_, i) => (
            <span className={"relative"} data-grid-box={i + 1}>
              <span
                className={"absolute top-0 left-0 size-px"}
                data-position={"TOP_LEFT"}
              ></span>
              <span
                className={"absolute top-0 right-0 size-px"}
                data-position={"TOP_RIGHT"}
              ></span>
              <span
                className={"absolute bottom-0 left-0 size-px"}
                data-position={"BOTTOM_LEFT"}
              ></span>
              <span
                className={"absolute right-0 bottom-0 size-px"}
                data-position={"BOTTOM_RIGHT"}
              ></span>
              <span>{i + 1}</span>
            </span>
          ))}
      </div>
      <div
        className={`absolute top-auto right-0 bottom-0 z-2 grid h-[calc(100-18.66*var(--vh)-var(--gutter))] w-full grid-cols-[repeat(6,1fr)] grid-rows-[repeat(2,1fr)] gap-(--gutter) p-(--gutter) lg:top-0 lg:right-0 lg:h-screen lg:w-[33.3333vw] lg:grid-cols-[repeat(2,1fr)] lg:grid-rows-[repeat(6,1fr)]`}
      >
        {Array(12)
          .fill(null)
          .map((_, i) => (
            <span className={"relative"} data-grid-box={i + 13}>
              <span
                className={"absolute top-0 left-0 size-px"}
                data-position={"TOP_LEFT"}
              ></span>
              <span
                className={"absolute top-0 right-0 size-px"}
                data-position={"TOP_RIGHT"}
              ></span>
              <span
                className={"absolute bottom-0 left-0 size-px"}
                data-position={"BOTTOM_LEFT"}
              ></span>
              <span
                className={"absolute right-0 bottom-0 size-px"}
                data-position={"BOTTOM_RIGHT"}
              ></span>
              <span>{i + 13}</span>
            </span>
          ))}
      </div>
    </div>
  );
};
<div className="Preloader_Preloader__neU82">
  <div className="Preloader_leftContent__RIoek">
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="1">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">1</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="2">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">2</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="3">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">3</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="4">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">4</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="5">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">5</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="6">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">6</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="7">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">7</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="8">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">8</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="9">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">9</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="10">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">10</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="11">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">11</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="12">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">12</span>
    </span>
  </div>
  <div className="Preloader_rightContent__Azae_">
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="13">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">13</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="14">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">14</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="15">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">15</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="16">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">16</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="17">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">17</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="18">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">18</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="19">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">19</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="20">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">20</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="21">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">21</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="22">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">22</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="23">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">23</span>
    </span>
    <span className="Preloader_gridPositioningBox__Aqvsp" data-grid-box="24">
      <span data-position="TOP_LEFT"></span>
      <span data-position="TOP_RIGHT"></span>
      <span data-position="BOTTOM_LEFT"></span>
      <span data-position="BOTTOM_RIGHT"></span>
      <span className="Preloader_gridPositioningBox__number__mxaS4">24</span>
    </span>
  </div>
</div>;
