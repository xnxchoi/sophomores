"use client";
import { Button } from "@/components/core/Button";
import { useCursorHandlers } from "@/components/core/cursorWrapper";
import { Link } from "@/components/core/Link/Link";
import { FrontImage } from "@/components/core/Media/FrontImage";
import { ImageMedia } from "@/components/core/Media/Image";
import { cn } from "@/lib/utils";
import type { User, UserMedia } from "@/payload-types";
import { useIsMobile } from "@/providers/MiddleMan";
import { useWindowResize } from "@/utilities/use_window_resize";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useLenis } from "lenis/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type UIEventHandler
} from "react";
import "./__credits.scss";

import { useCursor, useRPStore } from "@/providers/RP_Pro";
import { useShallow } from "zustand/shallow";
import type { RP_Roles } from "../../../stores/Notification/NotificationStore";

type Person = Pick<
  User,
  "image" | "name" | "bio" | "role" | "link" | "slug" | "displayUsername" | "id"
> & {
  portrait: null | UserMedia;
};
export type Credited = Person & {
  patronage: boolean;
  position: RP_Roles;
};

export type MemberList = {
  title: string;
  members: Credited[];
};
/**
 * Credits — editorial credits roll used by `/credits` and (newly) by
 * `/day-n-night/guests`.
 *
 * `titles` is optional per-position label override so non-staff surfaces
 * can repurpose the same component (e.g. event surfaces want
 * "Hosts / Past Attendees / Guests" instead of "Founders / Cofounders /
 * Guests"). When omitted, every label falls back to the original copy
 * — existing call sites keep working unchanged.
 *
 * Mapping convention for non-role groupings: collapse your N buckets
 * into N of the 7 RP_Roles slots. Untouched slots stay empty, and the
 * internal `team.members.length > 0` filter auto-skips them — so the
 * visible group order honours the slot order
 * (admin → cofounder → editor → author → patron → resident → user).
 */
type CreditsProps = {
  people: MemberList["members"];
  titles?: Partial<Record<RP_Roles, string>>;
};

export const Credits = ({ people, titles }: CreditsProps) => {
  const label = (role: RP_Roles, fallback: string) =>
    titles?.[role] ?? fallback;
  const admin: MemberList = {
    title: label("admin", "Founders"),
    members: people.filter((p) => p.position === "admin")
  };
  const cofounder: MemberList = {
    title: label("cofounder", "Cofounders"),
    members: people.filter((p) => p.position === "cofounder")
  };
  const editor: MemberList = {
    title: label("editor", "Editors"),
    members: people.filter((p) => p.position === "editor")
  };
  const author: MemberList = {
    title: label("author", "Authors"),
    members: people.filter((p) => p.position === "author")
  };
  const patron: MemberList = {
    title: label("patron", "Patrons"),
    members: people.filter((p) => p.position === "patron")
  };
  const resident: MemberList = {
    title: label("resident", "Residents"),
    members: people.filter((p) => p.position === "resident")
  };
  const user: MemberList = {
    title: label("user", "Guests"),
    members: people.filter((p) => p.position === "user")
  };
  return CreditsInner({
    positions: { admin, cofounder, editor, author, patron, resident, user }
  });
};
type Team = {
  [x in RP_Roles]: MemberList;
};
type CreditComponentProps = {
  positions: Team;
};
const CreditsInner = (props: CreditComponentProps) => {
  const { positions } = props;
  const movied = useRef<HTMLDivElement>(null!);
  const initial = Object.values(positions).reduce(
    (previousValue, currentValue, _currentIndex) => {
      return [...previousValue, ...currentValue.members];
    },
    [] as Credited[]
  );
  const [teamData, setTeamData] = useState<MemberList["members"]>(initial);
  useEffect(() => {
    const ted = Object.values(positions).reduce(
      (previousValue, currentValue) => {
        const newArr: Credited[] = currentValue.members.map((r) => {
          return r;
        });
        return [...previousValue, ...newArr];
      },
      [] as Credited[]
    );
    setTeamData(ted);
  }, []);
  const [locked, setLocked] = useState(false);
  const credits = useRef<HTMLDivElement>(null!);
  const fondFlou = useRef<HTMLDivElement>(null!);
  const mobileList = useRef<HTMLUListElement>(null!);
  const closeCatMob = useRef<HTMLButtonElement>(null!);
  const mobileListItems = useRef<HTMLLIElement[]>([]);
  const [activeProfile, setActiveProfile] = useState<Credited>(null!);
  const [mobileProfile, setMobileProfile] = useState<Credited>(null!);
  const { isMobile } = useIsMobile();
  const [isParty, setIsParty] = useState(!1);
  const [hasPatronage, setIsPatron] = useState(!1);
  const [isTouching, setIsTouching] = useState(!1);
  const canvas = useRef<HTMLCanvasElement>(null!);
  const [dpr, setDPR] = useState(1);
  const lastIndex = useRef<string>(null!);
  const canvasCtx = useRef<CanvasRenderingContext2D>(null!);
  const wW = useRPStore(useShallow((r) => r.viewportWidth));
  const wH = useRPStore(useShallow((r) => r.viewportHeight));
  const deltaY = useRef(0);
  useEffect(() => {
    if (window === undefined) return;
    setDPR(anotherMathFunc(window.devicePixelRatio, 1, 2));
  }, []);
  const inten = useRef(0);

  const posX = useRef(0);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const ySetter = useRef<Function>(null!);
  const height = useRef(0);
  const acceleration = useRef(0);

  const confettisCount = useRef(300),
    gravity = useRef(0.8),
    terminalVelocity = useRef(20),
    drag = useRef(0.075);
  const membersRef = useRef<
    Array<
      Pick<
        User,
        | "image"
        | "name"
        | "bio"
        | "role"
        | "link"
        | "slug"
        | "displayUsername"
        | "id"
      > & {
        birthday: boolean;
      }
    >
  >([]);

  const colors = useRef([
    {
      front: "red",
      back: "darkred"
    },
    {
      front: "green",
      back: "darkgreen"
    },
    {
      front: "blue",
      back: "darkblue"
    },
    {
      front: "yellow",
      back: "darkyellow"
    },
    {
      front: "orange",
      back: "darkorange"
    },
    {
      front: "pink",
      back: "darkpink"
    },
    {
      front: "purple",
      back: "darkpurple"
    },
    {
      front: "turquoise",
      back: "darkturquoise"
    }
  ]);

  const scroller = useLenis();

  const updateProfil = (e: Credited) => {
    setActiveProfile(e);
    e.patronage &&
      setIsParty(false) &&
      initConfettis() &&
      gsap.ticker.add(render);
  };
  const updateProfil2 = (e: Credited) => {
    if (isMobile) {
      scroller && scroller.stop();
      (setActiveProfile(e), setMobileProfile(e));
      const n = mobileListItems.current.find(
        (item) => item.dataset.id === e.id.toString()
      );
      if (!n) return;
      (credits.current.classList.add("-hidden"),
        closeCatMob.current.classList.add("on"),
        fondFlou.current.classList.add("pointer"),
        mobileList.current.classList.remove("-snap"),
        e.patronage && !isParty && initConfettis() && gsap.ticker.add(render));
      setTimeout(function () {
        (n.scrollIntoView(),
          gsap.to(mobileList.current, {
            scrollLeft: "+=60",
            duration: 0.5,
            ease: "power3.inOut",
            yoyo: !0,
            repeat: 1,
            delay: 0.5,
            onComplete: function () {
              mobileList.current.classList.add("-snap");
            }
          }));
      }, 250);
    } else {
      setPortraitState("focus");
    }
  };
  const hideProfil = useCallback(() => {
    isMobile || setActiveProfile(null!);
  }, []);
  const hideProfil2 = useCallback(() => {
    scroller && scroller.start();
    (setActiveProfile(null!), setMobileProfile(null!));
    (closeCatMob.current.classList.remove("on"),
      fondFlou.current.classList.remove("pointer"),
      gsap.delayedCall(1, function () {
        credits.current.classList.remove("-hidden");
      }));
  }, []);

  const onResize = useCallback(() => {
    canvas.current.width = wW * dpr;
    canvas.current.height = wH * dpr;
    canvas.current.style.width = "" + Math.ceil(wW) + "px";
    canvas.current.style.height = "" + Math.ceil(wH) + "px";
    canvasCtx.current.scale(dpr, dpr);
  }, [canvas, wW, wH, canvasCtx]);
  const resizeTime = useWindowResize({ debounce: 300 });
  useEffect(() => {
    canvasCtx.current && onResize();
  }, [onResize, resizeTime]);
  const confettis = useRef<
    {
      color: any;
      dimensions: { x: number; y: number };
      position: { x: any; y: number };
      rotation: any;
      scale: { x: number; y: number };
      velocity: { x: any; y: any };
    }[]
  >([]);
  const isWheeling = useRef<ReturnType<typeof setTimeout>>(null!);
  const onWheel = useCallback(
    (e: WheelEvent) => {
      deltaY.current = e.deltaY;
      (clearTimeout(isWheeling.current),
        (isWheeling.current = setTimeout(function () {
          deltaY.current = 0;
        }, 66)));
    },
    [isWheeling, deltaY]
  );
  const init = useCallback(() => {
    if (window === undefined) return;
    if (isMobile) {
      (setIsTouching(false),
        gsap.to(credits.current, {
          opacity: 1,
          duration: 0.5,
          delay: 1
        }));
    } else {
      (window.addEventListener("wheel", onWheel),
        (height.current = credits.current.offsetHeight),
        (acceleration.current = 1),
        gsap.to(credits.current, {
          opacity: 1,
          duration: 0.5,
          delay: 1,
          onComplete: () => {
            gsap.ticker.add(animate);
          }
        }));
    }
  }, [onWheel, credits, setIsTouching]);
  const testBirthday = useCallback(() => {
    const t = new Date(),
      n = t.getDate(),
      o = t.getMonth() + 1;
    console.log(n, o);
    Object.values(positions).forEach((t) => {
      membersRef.current = [
        ...new Set([
          ...membersRef.current,
          ...t.members.map(function (p) {
            const isPatro = p.patronage ?? false;
            setIsPatron(isPatro);
            return {
              ...p,
              birthday: isPatro
            };
          })
        ])
      ];
    });
    console.log(membersRef.current);
  }, [teamData, membersRef]);
  const { context, contextSafe } = useGSAP(
    () => {
      ySetter.current = gsap.quickSetter(".credits", "y", "px");
    },
    { scope: movied }
  );
  const activeTO = useRef<ReturnType<typeof setTimeout>>(null!);
  const ySet = contextSafe((pos: number) => {
    ySetter.current(pos);
  });
  const initCanvas = useCallback(() => {
    const c = canvas.current.getContext("2d")!;
    canvasCtx.current = c;
    ((confettisCount.current = 300),
      (gravity.current = 0.8),
      (terminalVelocity.current = 20),
      (drag.current = 0.075));
  }, [canvas, canvasCtx, confettisCount, gravity, terminalVelocity, drag]);
  useEffect(() => {
    init();

    testBirthday();
  }, []);
  useEffect(() => {
    hasPatronage && initCanvas();
  }, [hasPatronage, initCanvas]);
  const initConfettis = useCallback(() => {
    console.log("initConfettis");
    setIsParty(true);
    confettis.current = [];
    for (let i = 0; i < confettisCount.current; i++)
      confettis.current.push({
        color: colors.current[randomize(0, colors.current.length - 1)],
        dimensions: {
          x: randomize(10, 40),
          y: randomize(10, 30)
        },
        position: {
          x: randomize(0, wW),
          y: wH - 1
        },
        rotation: randomize(0, 2 * Math.PI),
        scale: {
          x: 1,
          y: 1
        },
        velocity: {
          x: randomize(-25, 25),
          y: randomize(-5, -50)
        }
      });
  }, [confettisCount, wW, wH, colors, setIsParty]);

  const animate = useCallback(
    (time: number, dt: number) => {
      const e = 1 - Math.pow(0.9, dt);
      const intent = inten.current;
      const posax = posX.current;
      ySet(posax);

      inten.current += (deltaY.current / 2 - intent) * e;
      posX.current -= (dt * acceleration.current + 6 * intent) / 12;
      (posX.current > 0 && (posX.current = -height.current / 2),
        posX.current < -height.current / 2 &&
          (posX.current = posX.current + height.current / 2));
    },
    [inten, posX, height, acceleration, deltaY]
  );
  const render = useCallback(() => {
    (canvasCtx.current.clearRect(0, 0, wW * dpr, wH * dpr),
      confettis.current.forEach(function (t, n) {
        canvasCtx.current.scale(dpr, dpr);
        const o = t.dimensions.x * t.scale.x,
          r = t.dimensions.y * t.scale.y;
        (canvasCtx.current.translate(t.position.x, t.position.y),
          canvasCtx.current.rotate(t.rotation),
          (t.velocity.x -= t.velocity.x * drag.current),
          (t.velocity.y = Math.min(
            t.velocity.y + gravity.current,
            terminalVelocity.current
          )),
          (t.velocity.x +=
            Math.random() > 0.5 ? Math.random() : -Math.random()),
          (t.position.x += t.velocity.x),
          (t.position.y += t.velocity.y),
          t.position.y >= wH + 2 * r && confettis.current.splice(n, 1),
          (t.scale.y = Math.cos(0.1 * t.position.y)),
          (canvasCtx.current.fillStyle =
            t.scale.y > 0 ? t.color.front : t.color.back),
          canvasCtx.current.fillRect(-o / 2, -r / 2, o, r),
          canvasCtx.current.setTransform(1, 0, 0, 1, 0, 0));
      }),
      confettis.current.length || setIsParty(!1),
      canvasCtx.current.clearRect(0, 0, wW * dpr, wH * dpr));
  }, [
    confettis,
    wW,
    wH,
    dpr,
    setIsParty,
    colors,
    gravity,
    terminalVelocity,
    drag,
    canvasCtx
  ]);

  const pause = useCallback(() => {
    const progress = {
      acceleration: acceleration.current
    };
    gsap.to(progress, {
      acceleration: 0,
      onUpdate: function () {
        acceleration.current = progress.acceleration;
      },
      duration: 0.8,
      ease: "power2.inOut"
    });
    setIsTouching(true);
  }, [setIsTouching, acceleration]);
  const play = useCallback(() => {
    const progress = {
      acceleration: acceleration.current
    };
    gsap.to(progress, {
      acceleration: 1,
      onUpdate: function () {
        acceleration.current = progress.acceleration;
      },
      duration: 0.8,
      ease: "power2.inOut"
    });
    setIsTouching(false);
  }, [setIsTouching, acceleration]);
  const portraitRef = useRef<HTMLDivElement>(null!);
  useGSAP(
    () => {
      gsap.to(portraitRef.current, {});
    },
    { scope: movied }
  );
  const to = useRef<ReturnType<typeof setTimeout>>(null!);
  const onMobileListScroll: UIEventHandler<HTMLUListElement> = useCallback(
    (e) => {
      to.current && clearTimeout(to.current);
      to.current = setTimeout(setIndex, 100);
    },
    [to]
  );

  const setIndex = useCallback(() => {
    const e = activeProfile;

    let t;
    const o = Math.floor(mobileList.current.scrollLeft / wW);
    let r = !1;
    null !== e &&
      void 0 !== e &&
      e.id &&
      (Object.values(positions).every(function (e, t) {
        return (
          e.members.every(function (p, e) {
            return t + e !== o || (setActiveProfile(p), (r = !0), !1);
          }),
          !r
        );
      }),
      null !== (t = activeProfile) &&
        void 0 !== t &&
        !isParty &&
        initConfettis());
  }, [activeProfile, wW, positions, isParty, initConfettis]);
  const [gap, setGap] = useState(100 / teamData.length);
  useEffect(() => {
    const newLength = teamData.length;
    setGap(100 / newLength);
  }, [teamData]);
  const [hidden, setHidden] = useState(false);
  const [playing, setPlaying] = useState(true);
  const { onMouseEnter, onMouseLeave } = useCursorHandlers("dom", {
    onLeave: () => {
      setHidden(true);
    }
  });
  const [portraitState, setPortraitState] = useState<"visible" | "focus">(
    "visible"
  );
  useEffect(() => {
    if (portraitState === "focus") {
      setLocked(true);
    }
  }, [portraitState]);
  useEffect(() => {
    if (!locked) {
      playing ? play() : pause();
      hidden &&
        (activeTO.current && clearTimeout(activeTO.current),
        (activeTO.current = setTimeout(hideProfil, 200)));
    } else {
      pause();
    }
  }, [playing, locked, hidden, play, pause, hideProfil]);
  const setCursor = useCursor((state) => state.setCursorState);

  return (
    <m.div ref={movied}>
      <div
        className={
          "equipe h-screen overflow-hidden bg-off-black text-off-white max-md:mb-[70px] max-md:h-auto max-md:overflow-visible max-md:px-0 max-md:pt-[110px]"
        }
      >
        <div className="fondFlou fixed" ref={fondFlou}>
          <AnimatePresence mode={"wait"} initial={false}>
            {teamData.flatMap((perso) => {
              return (
                !locked &&
                activeProfile &&
                activeProfile.id === perso.id && (
                  <m.div
                    initial={{
                      opacity: 0,
                      visibility: "hidden"
                    }}
                    animate={{
                      opacity: 0.5,
                      visibility: "visible",
                      zIndex: activeProfile
                        ? lastIndex.current + 1
                        : lastIndex.current,
                      transition: {
                        type: "tween",
                        ease: "easeIn",
                        duration: 0.2,
                        delay: 0.1
                      }
                    }}
                    exit={{
                      opacity: 0,
                      visibility: "hidden",
                      zIndex: 0,
                      transition: {
                        type: "tween",
                        delay: 0.1,
                        ease: "easeInOut",
                        duration: 0.2
                      }
                    }}
                    key={`bgImg-${perso.id}`}
                  >
                    <FrontImage
                      imgClassName={`imgFond absolute`}
                      resource={perso.image}
                      isUser={true}
                    />
                  </m.div>
                )
              );
            })}
          </AnimatePresence>
        </div>
        <AnimatePresence mode={"sync"} initial={false}>
          {activeProfile && activeProfile.image && (
            <m.div
              className="profil absolute"
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
            >
              <m.div
                className="vignette vignetteEquipe relative"
                ref={portraitRef}
                initial={{
                  visibility: "hidden",
                  opacity: 0
                }}
                variants={{
                  visible: {
                    visibility: "visible",
                    opacity: 1,
                    transformOrigin: "right center",
                    transform: "translate3d(0,0,0) scale(1)",
                    transition: {
                      type: "tween",
                      ease: "easeInOut",
                      duration: 0.3
                    }
                  },
                  hidden: {
                    visibility: "hidden",
                    opacity: 0,
                    transition: {
                      type: "tween",
                      ease: "easeOut",
                      duration: 0.2,
                      delay: 0.4
                    }
                  },
                  focus: {
                    visibility: "visible",
                    opacity: 1,
                    transformOrigin: "right center",
                    transform: "translate3d(0,100px,135px) scale(1.2)",
                    zIndex: 100,
                    transition: {
                      type: "tween",
                      ease: "easeInOut",
                      delay: 0.3,
                      duration: 0.5
                    }
                  }
                }}
                animate={portraitState}
                exit={"hidden"}
              >
                <ImageMedia
                  key={`bgImg-${activeProfile.id}`}
                  imgClassName={`w-full h-full object-cover absolute`}
                  src={activeProfile.image}
                />
              </m.div>
              <m.div
                className="mx-0 my-[15px] text-4xl"
                initial={{
                  opacity: 0
                }}
                animate={{
                  opacity: 1
                }}
                exit={{
                  opacity: 0
                }}
              >
                {activeProfile &&
                  (activeProfile.displayUsername ?? activeProfile.slug)}
              </m.div>
              <m.div
                className="mono"
                initial={{
                  opacity: 0
                }}
                animate={{
                  opacity: 1
                }}
                exit={{
                  opacity: 0
                }}
              >
                <p className="">
                  {(activeProfile &&
                  activeProfile.position &&
                  positions[activeProfile.position] &&
                  positions[activeProfile.position].title &&
                  positions[activeProfile.position].title.endsWith("s")
                    ? positions[activeProfile.position].title.slice(-1)
                    : positions[activeProfile.position].title) || null}
                </p>
              </m.div>
              {portraitState === "focus" && (
                <>
                  <m.div
                    className="fixed inset-0 z-[99] h-screen w-screen bg-background/40 backdrop-blur-sm"
                    onClick={() => (
                      setLocked(false),
                      setPortraitState("visible"),
                      setCursor(null),
                      setPlaying(true)
                    )}
                    onMouseEnter={() => setCursor("CLOSE")}
                    onMouseLeave={() => setCursor(null)}
                    key={`bgImg-${activeProfile.id}`}
                    initial={{
                      opacity: 0
                    }}
                    animate={{
                      opacity: 1,
                      transition: {
                        type: "tween",
                        delay: 0.3,
                        duration: 0.3,
                        ease: "easeIn"
                      }
                    }}
                    exit={{
                      opacity: 0,
                      transition: {
                        type: "tween",
                        delay: 0,
                        duration: 0.3,
                        ease: "easeOut"
                      }
                    }}
                  />
                  <m.div
                    className="fixed top-1/2 left-1/2 z-[100] mr-10 flex h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 flex-col items-start justify-center gap-1.5 overflow-hidden rounded-[15px] bg-muted-background/40 p-10 backdrop-blur-sm"
                    initial={{
                      opacity: 0
                    }}
                    animate={{
                      opacity: 1
                    }}
                    exit={{
                      opacity: 0
                    }}
                  >
                    <m.div
                      className="relative flex h-min w-full flex-none flex-col flex-wrap content-center items-center gap-[10px] overflow-hidden p-0"
                      animate={{
                        opacity: 1,
                        rotate: 0,
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        skewX: 0,
                        skewY: 0,
                        transition: {
                          delay: 0.8,
                          duration: 0.4,
                          ease: [0.44, 0, 0.56, 1],
                          type: "tween"
                        },
                        x: 0,
                        y: 0
                      }}
                      exit={{
                        opacity: 0,
                        rotate: 0,
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        skewX: 0,
                        skewY: 0,
                        transition: {
                          delay: 0,
                          duration: 0.3,
                          ease: [0.44, 0, 0.56, 1],
                          type: "tween"
                        },
                        x: 0,
                        y: 0
                      }}
                      initial={{
                        opacity: 0,
                        rotate: 0,
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        skewX: 0,
                        skewY: 0,
                        x: 0,
                        y: 0
                      }}
                      style={{ flex: "0 0 auto" }}
                    >
                      {[
                        activeProfile.displayUsername ?? activeProfile.slug,
                        activeProfile.bio,
                        activeProfile.position,
                        activeProfile.link
                      ]
                        .filter((item) => typeof item === "string")
                        .map((item, index) => (
                          <m.div
                            key={index + item}
                            className="relative h-auto w-full flex-none shrink-0 justify-start wrap-break-word whitespace-pre-wrap outline-none"
                          >
                            <m.p className="text-2xl">{item}</m.p>
                          </m.div>
                        ))}
                    </m.div>
                  </m.div>
                </>
              )}
            </m.div>
          )}
        </AnimatePresence>
        <div
          className="credits-modal"
          style={{ display: mobileProfile ? "inherit" : "none" }}
        >
          <ul ref={mobileList} onScroll={onMobileListScroll}>
            {Object.values(positions).map((team, teamIndex) => (
              <div
                key={`team-${teamIndex}`}
                className={"space-between flex gap-x-7"}
              >
                <div className="w-[calc(48vw-15px)] px-0 py-[clamp(5px,0.34vw,7px)] text-right md:w-[calc(24vw-15px)]">
                  {team.title}
                </div>
                <ul className="w-[calc(48vw-15px)] md:w-[calc(24vw-15px)]">
                  {team.members.map((person, personIndex) => (
                    <li
                      ref={(el) => {
                        el &&
                          (mobileListItems.current[teamIndex + personIndex] =
                            el);
                      }}
                      key={`teamm-${personIndex}`}
                      data-id={`${personIndex}`}
                      data-index={`${personIndex}`}
                    >
                      <div className="profil absolute">
                        <div className="vignetteEquipe relative aspect-[.88] max-h-[50vh] overflow-hidden rounded-3xl bg-none max-md:w-full md:h-[35vw]">
                          {person.image && (
                            <FrontImage
                              imgClassName="w-full h-full object-cover absolute"
                              resource={person.image}
                              isUser={true}
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div
                          className={`mx-0 my-[15px] text-4xl ${person.patronage ? "birthDay" : ""}`}
                        >
                          {person.displayUsername ?? person.slug}
                        </div>
                        <div className="infos mono">
                          <p className="poste">{person.bio}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto my-0 w-[calc(96vw-15px)]">
          <div
            ref={credits}
            className="credits m-0 mb-[8vw] w-[calc(48vw-15px)] align-baseline text-[clamp(20px,1.6vw,30px)] leading-[1]"
            onMouseEnter={() => {
              setPlaying(false);
            }}
            onMouseLeave={() => {
              setPlaying(true);
            }}
          >
            {[1, 2].map((p) => {
              return Object.values(positions).map(
                (team, teamIndex) =>
                  team.members.length > 0 && (
                    <div
                      key={`team-1${teamIndex}`}
                      className="space-between flex w-[calc(48vw-30px)] gap-x-7"
                    >
                      <div className="w-[calc(48vw-30px)] px-0 py-[clamp(5px,0.34vw,7px)] text-right md:w-[calc(24vw-15px)]">
                        {team.title}
                      </div>
                      <ul className="w-[calc(48vw-30px)] md:w-[calc(24vw-15px)]">
                        {team.members.map((person, personIndex) => (
                          <li
                            key={`team-${teamIndex}-${personIndex}`}
                            className={cn(
                              'relative px-0 py-[clamp(5px,.34vw,7px)] before:absolute before:top-1/2 before:right-[calc(100%+7.5px)] before:h-[.48vw] before:w-[.48vw] before:transform-[translate(50%,-50%)] before:rounded-full before:bg-off-white before:opacity-0 before:transition-opacity before:duration-200 before:ease-in-out before:content-none hover:before:opacity-100 md:before:content-[""]',
                              { birthDay: person.patronage }
                            )}
                            style={{
                              marginBottom: gap + "vh"
                            }}
                            onMouseEnter={(e) => (
                              onMouseEnter(e),
                              updateProfil(person)
                            )}
                            onMouseLeave={(e) => (
                              (lastIndex.current = person.id.toString()),
                              onMouseLeave(e),
                              setHidden(true)
                            )}
                            onClick={() => (
                              updateProfil2({
                                ...person
                              }),
                              setLocked(true),
                              setPortraitState("focus")
                            )}
                          >
                            {person.displayUsername ?? person.slug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
              );
            })}
            {/* {Object.values(positions).map((team, teamIndex) => (
              <div
                key={`team-2-${teamIndex}`}
                className="space-between flex w-[calc(48vw-15px)] gap-x-7"
              >
                <div className="w-[calc(48vw-15px)] px-0 py-[clamp(5px,.34vw,7px)] text-right md:w-[calc(24vw-15px)]">
                  {team.title} 2
                </div>
                <ul className="w-[calc(48vw-15px)] md:w-[calc(24vw-15px)]">
                  {team.members.map((person, personIndex) => (
                    <li
                      key={`team-2-${teamIndex}-${personIndex}`}
                      className={cn(
             'relative z-[100] px-0 py-[clamp(5px,.34vw,7px)] before:absolute before:top-1/2 before:right-[calc(100%+5px)] before:h-[.4vw] before:w-[.4vw] before:translate-[50%,-50%] before:rounded-full before:bg-off-white before:opacity-0 before:transition-opacity before:duration-200 before:ease-in-out before:content-none hover:before:opacity-100 md:before:content-[""]',
                        { birthDay: person.patronage },
                      )}
                      style={{
                        marginBottom: gap + "vh",
                      }}
                      onMouseEnter={(e) => (
                        onMouseEnter(e),
                        updateProfil({
                          ...person,
                        })
                      )}
                      onMouseLeave={(e) => (
                        onMouseLeave(e),
                        (lastIndex.current = person.id), setHidden(true)
                      )}
                      onClick={() =>
                      (
                        updateProfil2({
                          ...person,
                        }),
                        setLocked(true),
                        setPortraitState("focus")
                      )
                      }
                    >
                      {person.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))} */}
          </div>
        </div>
        <Button
          className="closeCatMob fixed flex items-center"
          onClick={hideProfil2}
          ref={closeCatMob}
        >
          <svg
            fill="none"
            height="25"
            viewBox="0 0 25 25"
            width="25"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="#121212" strokeLinecap="round" strokeWidth="1.25">
              <path d="m1.5 23.3019 21.8025-21.80245" />
              <path d="m23.5328 23.269-21.80249-21.80241" />
            </g>
          </svg>
        </Button>
      </div>
      <footer id="rp-footer" style={{ display: "none" }}>
        <div className="bas">
          <div className={"datas space-between flex flex-wrap"}>
            <div className="space-between flex w-[calc(48vw-15px)] px-0 py-[clamp(5px,0.34vw,7px)] text-right md:w-[calc(24vw-15px)]"></div>
          </div>
          <Link href={"/public"} className={"wander relative h-screen"}>
            <div
              className={"vignette vignetteFooter fixed"}
              style={{ transform: "translate(-50%, -110%)" }}
            >
              <div className={"h-vignetteInner"}>
                <canvas
                  ref={canvas}
                  style={{ display: "block", width: 0, height: 0 }}
                />
              </div>
            </div>
          </Link>
        </div>
      </footer>
    </m.div>
  );
};
const randomize = (t: number, e: number) => {
  return Math.floor(Math.random() * (t - e + 1)) + e;
};
const anotherMathFunc = function (e: number, t: number, n: number) {
  return e < t ? t : e > n ? n : e;
};
