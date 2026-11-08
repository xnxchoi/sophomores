import { EASING } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { useVoyageur } from "@/stores/Routing/RP_Voyageur";
import { ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { TextLoop } from "../TextLoop/TextLoop";

export const TimeComponent = (props: ComponentProps<"div">) => {
  const { className: c } = props;
  const clockTimezones = useMemo(
    () => [
      { timezone: "Asia/Seoul", title: "SEL" },
      { timezone: "Europe/London", title: "LHR" },
      { timezone: "Europe/Paris", title: "CDG" },
      { timezone: "America/Los_Angeles", title: "LAX" },
      { timezone: "America/New_York", title: "JFK" }
    ],
    []
  );

  const [locations1, setLocation1] = useState<string[]>([]);
  const [locations2, setLocation2] = useState<string[]>([]);
  const [locations3, setLocation3] = useState<string[]>([]);
  const [hours1, setHours1] = useState<string[]>([]);
  const [hours, setHours] = useState<string[]>([]);
  const [hours2, setHours2] = useState<string[]>([]);
  const [minutes1, setMinutes1] = useState<string[]>([]);
  const [minutes2, setMinutes2] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<string[]>([]);
  const [ampms1, setAmpms1] = useState<string[]>([]);
  const [ampms2, setAmpms2] = useState<string[]>([]);
  const [ampms, setAmpms] = useState<string[]>([]);
  const y = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isMobile } = useIsMobile();
  const b = useRef<HTMLDivElement>(null!);
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const isHome = useVoyageur(useShallow((r) => r.isHome));
  const is404 = useVoyageur(useShallow((r) => r.is404));
  const hr1 = useRef<HTMLSpanElement[]>([]),
    hr2 = useRef<HTMLSpanElement[]>([]),
    minute1 = useRef<HTMLSpanElement[]>([]),
    minute2 = useRef<HTMLSpanElement[]>([]),
    ampm1 = useRef<HTMLSpanElement[]>([]),
    ampm2 = useRef<HTMLSpanElement[]>([]),
    locationRefs1 = useRef<HTMLSpanElement[]>([]),
    locationRefs2 = useRef<HTMLSpanElement[]>([]),
    locationRefs3 = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (isMobile) {
      y.current && clearInterval(y.current);
      return;
    }
    const fire = () => {
      const hour1: string[] = [],
        hour2: string[] = [],
        hour: string[] = [],
        minute1: string[] = [],
        minute2: string[] = [],
        minute: string[] = [],
        ampm: string[] = [],
        ampm1: string[] = [],
        ampm2: string[] = [];
      const location1: string[] = [],
        location2: string[] = [],
        location3: string[] = [];
      clockTimezones.forEach((l) => {
        const c = new Date().toLocaleDateString("en-GB", {
          timeZone: l.timezone,
          hour: "2-digit",
          minute: "2-digit"
        });
        const d = c.split(" ")[1];
        const h = parseInt(d.split(":")[0]);
        const v = parseInt(d.split(":")[1] || "0")!;
        const p = `${v < 10 ? "0" + v : v}`;

        const m = h > 11 ? "P" : "A";
        const xx = h > 12 ? h - 12 : 0 === h ? 12 : h;
        const hr1 = xx > 9 ? xx.toString().at(0)! : "0";
        const hr2 = xx > 9 ? xx.toString().at(1)! : `${xx}`;
        location1.push(l.title.at(0)!);
        location2.push(l.title.at(1)!);
        location3.push(l.title.at(2)!);
        hour.push(`${xx > 9 ? xx : "0" + xx}`);
        minute.push(`${v < 10 ? "0" + v : v}`);
        hour1.push(hr1);
        hour2.push(hr2);
        minute1.push(p.at(0)!);
        minute2.push(p.at(1)!);
        ampm.push(m + "M");
        ampm1.push(m);
        ampm2.push("M");
      });
      setLocation1(location1);
      setLocation2(location2);
      setLocation3(location3);
      setHours1(hour1);
      setHours2(hour2);
      setMinutes1(minute1);
      setMinutes2(minute2);
      setAmpms1(ampm1);
      setAmpms2(ampm2);
      // setHours(hour);
      // setMinutes(minute);
      setAmpms(ampm);
    };
    fire();
    y.current = setInterval(() => {
      fire();
    }, 5e3);
  }, [clockTimezones, isMobile]);
  //   useEffect(() => {
  //     if (!b.current) return;
  //     const l = (isHome || is404) && !navIsOpen;
  //     (gsap.killTweensOf(b.current),
  //       gsap.to(b.current, {
  //         x: l ? 30 : 0
  //       }));
  //   }, [isHome, is404, navIsOpen]);
  return !isMobile ? (
    <div ref={b} className={"block text-xs leading-[120%]"}>
      <span
        className={
          "relative grid overflow-hidden transition-colors duration-200 ease-out-power2 [grid-template-areas:'a']"
        }
        data-themed="color,border-color"
      >
        <span className={"relative flex flex-col gap-1 [grid-area:a]"}>
          <span className={"flex"}>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "105%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                duration: 0.8
              }}
            >
              {locations1.map((l, c) => (
                <span
                  ref={(l) => {
                    l && (locationRefs1.current[c] = l);
                  }}
                  key={c + l}
                  style={{
                    fontSize: "1rem"
                  }}
                  className={cn("inline-block")}
                >
                  {l}
                </span>
              ))}
            </TextLoop>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "105%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.06
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.06
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                duration: 0.8
              }}
            >
              {locations2.map((l, c) => (
                <span
                  ref={(l) => {
                    l && (locationRefs2.current[c] = l);
                  }}
                  key={c + l}
                  style={{
                    fontSize: "1rem"
                  }}
                  className={cn("inline-block")}
                >
                  {l}
                </span>
              ))}
            </TextLoop>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "105%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power3.out,
                    duration: 0.8,
                    delay: 0.12
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power3.out,
                    duration: 0.8,
                    delay: 0.12
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power3.out,
                duration: 0.8
              }}
            >
              {locations3.map((l, c) => (
                <span
                  ref={(l) => {
                    l && (locationRefs3.current[c] = l);
                  }}
                  key={c + l}
                  style={{
                    fontSize: "1rem"
                  }}
                  className={cn("inline-block")}
                >
                  {l}
                </span>
              ))}
            </TextLoop>
          </span>
          <span className={"flex items-center justify-center gap-0.5"}>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "105%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.1
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.1
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power3.out,
                delay: 0.1,
                duration: 0.8
              }}
            >
              {hours1.map((hour, c) => (
                <span
                  ref={(l) => {
                    l && (hr1.current[c] = l);
                  }}
                  style={{
                    fontSize: "1rem"
                  }}
                  key={c + hour}
                  className={cn("inline-block")}
                >
                  {hour}
                </span>
              ))}
            </TextLoop>{" "}
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "85%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.1
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.1
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                delay: 0.1,
                duration: 0.8
              }}
            >
              {hours2.map((hour, c) => (
                <span
                  ref={(l) => {
                    l && (hr2.current[c] = l);
                  }}
                  style={{
                    fontSize: "1rem"
                  }}
                  key={c + hour}
                  className={cn("inline-block")}
                >
                  {hour}
                </span>
              ))}
            </TextLoop>
          </span>
          <span className={"flex items-center justify-center gap-0.5"}>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "85%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.16
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.16
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                delay: 0.1,
                duration: 0.8
              }}
            >
              {minutes1.map((minute, c) => (
                <span
                  ref={(l) => {
                    l && (minute1.current[c] = l);
                  }}
                  style={{
                    fontSize: "1rem"
                  }}
                  key={c + minute}
                  className={cn("inline-block")}
                >
                  {minute}
                </span>
              ))}
            </TextLoop>{" "}
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { x: "85%", opacity: 0 },
                animate: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.16
                  }
                },
                exit: {
                  x: "-105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.16
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                delay: 0.1,
                duration: 0.8
              }}
            >
              {minutes2.map((minute, c) => (
                <span
                  ref={(l) => {
                    l && (minute2.current[c] = l);
                  }}
                  style={{
                    fontSize: "1rem"
                  }}
                  key={c + minute}
                  className={cn("inline-block")}
                >
                  {minute}
                </span>
              ))}
            </TextLoop>
          </span>
          <span className={"flex items-center justify-center gap-0.5"}>
            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { y: "-85%", opacity: 0 },
                animate: {
                  y: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.28
                  }
                },
                exit: {
                  y: "105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.28
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                delay: 0.28,
                duration: 0.8
              }}
            >
              {ampms1.map((ampm, c) => (
                <span
                  ref={(l) => {
                    l && (ampm1.current[c] = l);
                  }}
                  key={c + ampm}
                  className={cn("relative inline-block")}
                >
                  {ampm}
                </span>
              ))}
            </TextLoop>

            <TextLoop
              className={"overflow-hidden font-sans text-xs font-light"}
              variants={{
                initial: { y: "-85%", opacity: 0 },
                animate: {
                  y: 0,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.36
                  }
                },
                exit: {
                  y: "105%",
                  opacity: 0,
                  transition: {
                    type: "tween",
                    ease: EASING.power2.out,
                    duration: 0.8,
                    delay: 0.36
                  }
                }
              }}
              interval={7}
              transition={{
                type: "tween",
                ease: EASING.power2.out,
                delay: 0.36,
                duration: 0.8
              }}
            >
              {ampms2.map((ampm, c) => (
                <span
                  style={{
                    fontSize: "1rem"
                  }}
                  ref={(l) => {
                    l && (ampm2.current[c] = l);
                  }}
                  key={c + ampm}
                  className={cn("inline-block")}
                >
                  {ampm}
                </span>
              ))}
            </TextLoop>
          </span>
        </span>
      </span>
    </div>
  ) : null;
};
