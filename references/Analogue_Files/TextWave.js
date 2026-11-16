import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment
} from "react/jsx-runtime";
import { addPropertyControls, ControlType, RenderTarget, Color } from "framer";
import { useEffect, useRef, useMemo } from "react";
import { motion, animate, easeInOut, useInView } from "framer-motion";
import { useColors } from "https://framerusercontent.com/modules/k76epLFsVsF4jlsF5pgg/vhK3G0ntf62fqS2tFDno/useColors.js";
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 *
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 */ export default function TextWave(props) {
  const {
    text,
    tag,
    per,
    origin,
    colors,
    font,
    userSelect,
    waveWidth,
    waveScale,
    speed,
    resize,
    animation,
    glow,
    direction
  } = props;
  const { loop, trigger, replay, delay } = animation;
  const id = useMemo(generateRandomString, []);
  const isCanvas = RenderTarget.current() === RenderTarget.canvas;
  const ref = useRef(null);
  const elementsRef = useRef([]);
  const spanWidthsRef = useRef([]);
  const [defaultColor, waveInColor, waveOutColor] = useColors(
    colors.defaultColor,
    colors.waveInColor,
    colors.waveOutColor
  );
  const waveInColorObject = useMemo(() => Color(waveInColor), [waveInColor]);
  const glowColorObject = useMemo(
    () => (glow ? Color(glow.color) : null),
    [glow?.color]
  );
  const textColorObjectRef = useRef(
    Color(delay === 0 ? waveOutColor : defaultColor)
  );
  const interpolateColorRef = useRef(
    Color.interpolate(waveInColorObject, Color(waveOutColor || defaultColor))
  );
  const isInView = useInView(ref, { once: loop || !replay, amount: "some" });
  const textAlign = font?.textAlign || "center";
  const MotionTag = motion[tag] || motion.span;
  const spanClassName = `${id}-span`;
  const waveRange = (waveWidth + 1) / 2;
  const progressRef = useRef(-waveRange - 1);
  const [lines, wordCount] = useMemo(() => {
    const textLines = text.split("\n");
    let wordCount = 0;
    const lines = [];
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i].split(/[ \t]+/);
      lines.push(line);
      wordCount += line.length;
    }
    return [lines, wordCount];
  }, [text]);
  let index = 0;
  const createLineChildren = (lineIndex, lineWords) => {
    return lineWords.map((word, wordIndex) => {
      if (per === "character") {
        return /*#__PURE__*/ _jsxs(_Fragment, {
          children: [
            /*#__PURE__*/ _jsx(
              "span",
              {
                className: `${id}-word-wrapper`,
                children: word.split("").map((char, charIndex) => {
                  const savedIndex = index;
                  index++;
                  return /*#__PURE__*/ _jsx(
                    "span",
                    {
                      ref: (el) => {
                        if (el) elementsRef.current[savedIndex] = el;
                      },
                      className: spanClassName,
                      children: char
                    },
                    `${lineIndex}-${wordIndex}-${charIndex}`
                  );
                })
              },
              `${lineIndex}-${wordIndex}`
            ),
            wordIndex < lineWords.length - 1 && " "
          ]
        });
      }
      const savedIndex = index;
      index++;
      return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
          /*#__PURE__*/ _jsx(
            "span",
            {
              ref: (el) => {
                if (el) elementsRef.current[savedIndex] = el;
              },
              className: spanClassName,
              children: word
            },
            `${lineIndex}-${wordIndex}`
          ),
          wordIndex < lineWords.length - 1 && " "
        ]
      });
    });
  };
  useEffect(() => {
    let colorAnimation = null;
    let animation = null;
    let timeoutId = null;
    let animationFrame = null;
    const animateTextColor = (animateIn) => {
      if (!waveOutColor || defaultColor === waveOutColor) {
        return;
      }
      if (colorAnimation) {
        colorAnimation.stop();
      }
      const interpolateTextColor = Color.interpolate(
        textColorObjectRef.current,
        Color(animateIn ? waveOutColor : defaultColor)
      );
      colorAnimation = animate(0, 1, {
        type: "spring",
        bounce: 0,
        duration: mapRange(speed, 0, 100, 1.5, 1),
        onUpdate: (value) => {
          const colorObject = interpolateTextColor(value);
          textColorObjectRef.current = colorObject;
          interpolateColorRef.current = Color.interpolate(
            waveInColorObject,
            colorObject
          );
          if (ref.current) {
            ref.current.style.color = colorObject.toValue();
          }
        }
      });
    };
    const runAnimation = () => {
      animateTextColor(true);
      const segments = per === "word" ? wordCount : text.length;
      const start = direction === "right" ? -waveRange : segments + waveRange;
      const end = direction === "right" ? segments + waveRange : -waveRange;
      animation = animate(start, end, {
        type: "ease",
        ease: "linear",
        duration:
          Math.exp(mapRange(speed, 0, 100, Math.log(0.3), Math.log(0.01))) *
          (segments + waveRange * 2),
        onUpdate: (value) => {
          progressRef.current = value;
        },
        onComplete: () => {
          if (ref.current) {
            ref.current.style.transform = "";
          }
          if (loop && isInView) {
            timeoutId = setTimeout(runAnimation, delay * 1e3);
          }
          animateTextColor(false);
        }
      });
    };
    const updateText = () => {
      let cumulativeOffset = 0;
      let elementOffset = [];
      let prevYPosition = 0;
      const elementLineMap = new Map();
      const elementScaleMap = new Map();
      const lineOffsets = [];
      let lineIndex = -1;
      for (let i = 0; i < elementsRef.current.length; i++) {
        const element = elementsRef.current[i];
        if (!element) continue;
        const offset = Math.abs(progressRef.current - i);
        const boundingClientRect = element.getBoundingClientRect();
        const yPosition =
          origin === "center"
            ? boundingClientRect.y + boundingClientRect.height / 2
            : boundingClientRect.y + boundingClientRect.height;
        if (Math.abs(yPosition - prevYPosition) > 2) {
          // New line has started
          lineIndex++;
          if (lineIndex > 0) {
            lineOffsets[lineIndex - 1] = cumulativeOffset;
          }
          cumulativeOffset = 0;
        }
        prevYPosition = yPosition;
        elementLineMap.set(element, lineIndex);
        if (offset > waveRange) {
          element.style.color = "";
          element.style.margin = "";
          element.style.textShadow = "";
          elementOffset[i] = cumulativeOffset;
        } else {
          const offsetPercent = easeInOut(offset / waveRange);
          const scaleValue = mapRange(offsetPercent, 0, 1, waveScale, 1);
          const halfOffset = resize
            ? (spanWidthsRef.current[i] * (scaleValue - 1)) / 2
            : 0;
          elementScaleMap.set(element, scaleValue);
          cumulativeOffset += halfOffset;
          elementOffset[i] = cumulativeOffset;
          if (glow) {
            element.style.textShadow =
              glow.blur > 0
                ? `0 0 ${glow.blur}px rgba(${glowColorObject.r}, ${glowColorObject.g}, ${glowColorObject.b}, ${glowColorObject.a * (1 - offsetPercent)})`
                : "";
          }
          element.style.color =
            offsetPercent >= 1
              ? waveOutColor || defaultColor
              : offsetPercent <= 0
                ? waveInColor
                : interpolateColorRef.current?.(offsetPercent).toValue() ||
                  waveOutColor ||
                  defaultColor;
          cumulativeOffset += halfOffset;
        }
        if (i === elementsRef.current.length - 1) {
          lineOffsets[lineIndex] = cumulativeOffset;
        }
      }
      for (let i = 0; i < elementsRef.current.length; i++) {
        const element = elementsRef.current[i];
        if (!element) continue;
        const scaleValue = elementScaleMap.get(element) || 1;
        const scale = scaleValue !== 1 ? `scale(${scaleValue})` : "";
        if (!resize) {
          element.style.transform = scale;
          continue;
        }
        const offset = elementOffset[i];
        const lineIndex = elementLineMap.get(element) || 0;
        const lineOffset = lineOffsets[lineIndex];
        let offsetValue = offset;
        switch (textAlign) {
          case "center":
            offsetValue -= lineOffset / 2;
            break;
          case "right":
            offsetValue -= lineOffset;
            break;
        }
        const translate =
          Math.abs(offsetValue) > 0.1 ? `translateX(${offsetValue}px)` : "";
        element.style.transform =
          translate && scale ? `${translate} ${scale}` : translate || scale;
      }
      animationFrame = requestAnimationFrame(updateText);
    };
    if (!isCanvas) {
      animationFrame = requestAnimationFrame(updateText);
      const shouldAnimate = loop
        ? isInView
        : trigger === "appear" || (trigger === "layerInView" && isInView);
      if (shouldAnimate) {
        if (delay) {
          timeoutId = setTimeout(runAnimation, delay * 1e3);
        } else {
          runAnimation();
        }
      }
    }
    return () => {
      animation?.cancel();
      colorAnimation?.stop();
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isInView]);
  useEffect(() => {
    if (!isCanvas) {
      elementsRef.current.forEach((el, i) => {
        if (el) {
          spanWidthsRef.current[i] = el.getBoundingClientRect().width;
        }
      });
    }
  }, [isCanvas, text, font]);
  return /*#__PURE__*/ _jsxs(MotionTag, {
    ref: ref,
    style: {
      ...props.style,
      transformStyle: "preserve-3d",
      whiteSpace: props.style?.width ? undefined : "nowrap",
      userSelect: userSelect ? "auto" : "none",
      margin: 0,
      textAlign,
      color: isCanvas
        ? colors.defaultColor
        : textColorObjectRef.current?.toValue() || colors.defaultColor,
      ...font
    },
    children: [
      /*#__PURE__*/ _jsx("style", {
        children: `
				.${id}-line {
					width: 100%;
					display: block;
					transform-style: preserve-3d;
				}
				.${id}-word-wrapper {
					display: inline-block;
					transform-style: preserve-3d;
					white-space: pre;
				}
				.${id}-span {
					display: inline-block;
					transform-style: preserve-3d;
					white-space: pre;
					will-change: transform, color, text-shadow;
					transform-origin: ${origin === "center" ? "50% 50%" : "50% 100%"};
				}
				`
      }),
      lines.length === 1
        ? createLineChildren(0, lines[0])
        : lines.map((lineWords, lineIndex) =>
            /*#__PURE__*/ _jsx(
              "span",
              {
                className: `${id}-line`,
                children: createLineChildren(lineIndex, lineWords)
              },
              lineIndex
            )
          )
    ]
  });
}
TextWave.displayName = "Text Wave";
addPropertyControls(TextWave, {
  text: {
    type: ControlType.String,
    defaultValue: "Learn Framer With Framer University",
    placeholder: "Text"
  },
  font: {
    type: "font",
    controls: "extended",
    defaultFontType: "sans-serif",
    defaultValue: { fontSize: 32, lineHeight: 1 }
  },
  colors: {
    type: ControlType.Object,
    buttonTitle: "Colors",
    controls: {
      defaultColor: {
        type: ControlType.Color,
        defaultValue: "#FFF",
        title: "Default"
      },
      waveInColor: {
        type: ControlType.Color,
        defaultValue: "#FFF",
        title: "Wave In"
      },
      waveOutColor: {
        type: ControlType.Color,
        defaultValue: "rgba(255, 255, 255, 0.5)",
        optional: true,
        title: "Wave Out"
      }
    }
  },
  glow: {
    type: ControlType.Object,
    optional: true,
    icon: "effect",
    controls: {
      color: { type: ControlType.Color, defaultValue: "#FFF" },
      blur: {
        type: ControlType.Number,
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 1
      }
    }
  },
  per: {
    type: ControlType.Enum,
    options: ["character", "word"],
    optionTitles: ["Letter", "Word"],
    displaySegmentedControl: true
  },
  waveWidth: {
    type: ControlType.Number,
    defaultValue: 10,
    min: 1,
    max: 100,
    step: 1,
    title: "Wave Width"
  },
  waveScale: {
    type: ControlType.Number,
    defaultValue: 1.2,
    min: 0,
    max: 2,
    step: 0.01,
    title: "Scale"
  },
  origin: {
    type: ControlType.Enum,
    defaultValue: "center",
    options: ["center", "bottom"],
    optionTitles: ["Center", "Bottom"], // optionIcons: ["align-middle", "align-bottom"],
    displaySegmentedControl: true,
    hidden: (props) => props.waveScale === 1
  },
  resize: { type: ControlType.Boolean, defaultValue: true },
  direction: {
    type: ControlType.Enum,
    defaultValue: "right",
    options: ["left", "right"],
    optionTitles: ["Left", "Right"],
    optionIcons: ["direction-left", "direction-right"],
    displaySegmentedControl: true
  },
  speed: {
    type: ControlType.Number,
    defaultValue: 50,
    min: 0,
    max: 100,
    step: 1,
    unit: "%"
  },
  animation: {
    type: ControlType.Object,
    icon: "effect",
    controls: {
      loop: { type: ControlType.Boolean, defaultValue: false },
      trigger: {
        type: ControlType.Enum,
        defaultValue: "layerInView",
        options: ["appear", "layerInView"],
        optionTitles: ["Appear", "Layer in View"],
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        hidden: (props) => props.loop
      },
      replay: {
        type: ControlType.Boolean,
        defaultValue: true,
        hidden: (props) => props.loop || props.trigger !== "layerInView"
      },
      delay: { type: ControlType.Number, defaultValue: 0, min: 0, step: 0.1 }
    }
  },
  userSelect: { type: ControlType.Boolean, defaultValue: false },
  tag: {
    type: ControlType.Enum,
    title: "Tag",
    defaultValue: "p",
    displaySegmentedControl: true,
    options: ["h1", "h2", "h3", "p"],
    optionTitles: ["H1", "H2", "H3", "P"],
    description:
      "More components at [Framer University](https://frameruni.link/cc)."
  }
});
function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) {
    return toLow;
  }
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}
const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function generateRandomString() {
  let result = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    result += CHARACTERS.charAt(randomIndex);
  }
  return result;
}
export const __FramerMetadata__ = {
  exports: {
    default: {
      type: "reactComponent",
      name: "TextWave",
      slots: [],
      annotations: {
        framerSupportedLayoutWidth: "any",
        framerContractVersion: "1",
        framerIntrinsicWidth: "400",
        framerSupportedLayoutHeight: "any",
        framerDisableUnlink: "*",
        framerIntrinsicHeight: "200"
      }
    },
    __FramerMetadata__: { type: "variable" }
  }
};
