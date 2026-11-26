"use client";
import { useWindowResize } from "@/utilities/use_window_resize";
import {
  meshBounds,
  PerspectiveCamera,
  shaderMaterial,
  useTexture,
  View
} from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { animate, useMotionValueEvent } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import {
  Color as ThreeColor,
  DoubleSide,
  IUniform,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2
} from "three";
import { useShallow } from "zustand/shallow";
import { TWEEN_EASE } from "@/constants/animations";
import { useFrameFactor, useRPStore } from "@/providers/RP_Pro";
import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";

export function VGradient() {
  const navIsOpen = useRPStore((l) => l.navIsOpen);
  useCanvasClaim(navIsOpen);

  return (
    <View
      className="absolute inset-0 z-200"
      visible={navIsOpen}
      data-active={navIsOpen}
    >
      <PerspectiveCamera
        near={0.01}
        far={1000}
        position={[0, 0, 1]}
        fov={45}
        aspect={2}
        makeDefault={navIsOpen}
      />
      <GradientInner />
    </View>
  );
}
type UpdateColorProps =
  | undefined
  | (
      | { selected: string | -1 }
      | { focused: string | -1 }
      | { focused: string | -1; selected: string | -1 }
    );
useTexture.preload("/assets/seamless.png");
function GradientInner() {
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const noiseTexture = useTexture("/assets/seamless.png", (texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });
  // The Hideaway's 15 two-stop schemes, one per menu link in order. The owner asked for the palette's brighter
  // colours here (26 Nov: "use the brighter colors within the palettwe"), so each stop is the nearest of Saffron Amber,
  // Saffron Amber Lighter +1, Muted Olive, Signal Orange, Signal Orange Lighter, Gulf Cerulean and Gulf Cerulean
  // Lighter by OKLab distance to The Hideaway's stop (the second stop takes the next nearest when both would match).
  // The third is the base the noise starts from (The Hideaway's was black): the bright nearest the midpoint of the two
  // stops, other than the stops themselves, so the open menu's dark links never sit on a dark patch (Cordy, 26 Nov).
  const colorSchemes = useMemo<ReadonlyArray<readonly [string, string, string]>>(
    () => [
      ["--orange", "--gulf-cerulean-lighter", "--yellow"],
      ["--orange", "--gulf-cerulean-lighter", "--yellow"],
      ["--gulf-cerulean-lighter", "--yellow-lighter-1", "--olive"],
      ["--yellow", "--yellow-lighter-1", "--olive"],
      ["--yellow-lighter-1", "--gulf-cerulean-lighter", "--olive"],
      ["--orange", "--yellow", "--orange-lighter"],
      ["--orange", "--yellow-lighter-1", "--yellow"],
      ["--yellow", "--yellow-lighter-1", "--olive"],
      ["--gulf-cerulean", "--orange-lighter", "--orange"],
      ["--yellow-lighter-1", "--gulf-cerulean-lighter", "--olive"],
      ["--yellow-lighter-1", "--orange", "--yellow"],
      ["--orange", "--yellow-lighter-1", "--yellow"],
      ["--yellow", "--yellow-lighter-1", "--olive"],
      ["--orange", "--yellow", "--orange-lighter"],
      ["--orange", "--olive", "--yellow"]
    ],
    []
  );
  // Resolved when created, as The Hideaway's setHex was: drei's shaderMaterial copies these values into the
  // material, so a colour set later (an effect) never reaches the base tones, which nothing animates. This only
  // renders on the client, inside the canvas.
  const colours = useMemo(
    () => colorSchemes[0].map((token) => tokenColor(token, new ThreeColor())),
    [colorSchemes]
  );
  const u_offset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const u_additionalOffset = useMemo(() => new Vector2(0), []);
  // The first scheme's two stops and its base. The shaders never read the fourth entry; it repeats the base.
  const u_color = useMemo(
    () => [
      tokenColor(colorSchemes[0][0], new ThreeColor()),
      tokenColor(colorSchemes[0][1], new ThreeColor()),
      tokenColor(colorSchemes[0][2], new ThreeColor()),
      tokenColor(colorSchemes[0][2], new ThreeColor())
    ],
    [colorSchemes]
  );
  const uniforms = useMemo(
    () => ({
      u_color: u_color,
      u_colorMixer: 0,
      u_additionalZoom: 0,
      u_additionalOffset: u_additionalOffset,
      u_size: 0.2,
      u_offset: u_offset,
      u_speed: 0.02,
      u_pixels: u_pixels,
      u_resolution: u_resolution,
      u_time: 1.0,
      u_noiseTexture: noiseTexture,
      u_opacity: 1.0
    }),
    [
      u_offset,
      u_pixels,
      u_additionalOffset,
      u_resolution,
      noiseTexture,
      u_color
    ]
  );
  const GradientShader = shaderMaterial(uniforms, vertexShader, fragmentShader);
  extend({ GradientShader });
  const gradientt = useRef<
    Omit<ShaderMaterial, "uniforms"> & {
      uniforms: {
        [X in keyof typeof uniforms]: IUniform<(typeof uniforms)[X]>;
      };
    }
  >(null);

  const navItemSelected = useFrameFactor((r) => r.activeKey);
  const navItemHovered = useFrameFactor((r) => r.focusedKey);
  const menuMediaPreviewKeyValue = useRPStore(
    useShallow((l) => l.navigationPreviewMediaByKey)
  );
  /**
   *
   * @type {React.RefObject<{[x:string]:number}>}
   */
  const mapped = useRef(new Map<string, number>());
  const menuPreviewKeys = useRef<Array<string>>([]);
  useEffect(() => {
    if (menuPreviewKeys.current.length < 1 && menuMediaPreviewKeyValue) {
      Object.keys(menuMediaPreviewKeyValue).forEach((k, i) => {
        mapped.current.set(k, i);
        menuPreviewKeys.current.push(k);
      });
    }
  }, [menuMediaPreviewKeyValue]);
  // The renderer's size and pixel ratio belong to the shared canvas (R3F, gl/shared-canvas.tsx, capped at 2). The
  // Hideaway's gradient set them itself (Gradient_M.tsx:204), which overrode that cap on every resize; here it only
  // feeds its own uniforms, which still read the device's ratio, so the gradient looks the same.
  const onResize = useEffectEvent(() => {
    const devicePixelRatio = window.devicePixelRatio || 2;
    gradientt.current &&
      ((gradientt.current.uniforms.u_resolution.value = new Vector2(
        window.innerWidth,
        window.innerHeight
      )),
      gradientt.current.uniforms.u_pixels.value.set(
        window.innerWidth / devicePixelRatio,
        window.innerHeight / devicePixelRatio
      ));
  });
  const lastResize = useWindowResize({ debounce: 100 });

  useEffect(() => {
    onResize();
  }, []);
  useEffect(() => {
    onResize();
  }, [lastResize]);

  const updateColor = useCallback(
    (props?: UpdateColorProps) => {
      const ai =
          (props && "selected" in props && props.selected) ||
          navItemSelected.get(),
        hi =
          (props && "focused" in props && props.focused && props.focused) ||
          navItemHovered.get();
      const selIndex =
        (ai === -1
          ? hi === -1
            ? 0
            : mapped.current.get(hi)
          : mapped.current.get(ai)) || 0;
      const target = colorSchemes[selIndex];
      // Read on every change, so the stops follow the current theme's tokens.
      tokenColor(target[0], colours[0]);
      tokenColor(target[1], colours[1]);
      tokenColor(target[2], colours[2]);

      gradientt.current &&
        animate([
          [
            gradientt.current.uniforms.u_color.value[0],
            {
              r: colours[0].r,
              g: colours[0].g,
              b: colours[0].b
            },
            {
              duration: 1.1,
              delay: 0.3,
              ease: TWEEN_EASE.power4.inOut,
              at: 0,
              type: "tween"
            }
          ],
          [
            gradientt.current.uniforms.u_color.value[1],
            {
              r: colours[1].r,
              g: colours[1].g,
              b: colours[1].b
            },
            {
              duration: 1.1,
              delay: 0.3,
              ease: TWEEN_EASE.power4.inOut,
              at: 0,
              type: "tween"
            }
          ],
          [
            gradientt.current.uniforms.u_color.value[2],
            {
              r: colours[2].r,
              g: colours[2].g,
              b: colours[2].b
            },
            {
              duration: 1.1,
              delay: 0.3,
              ease: TWEEN_EASE.power4.inOut,
              at: 0,
              type: "tween"
            }
          ]
        ]);
    },
    [navItemSelected, navItemHovered, colorSchemes, colours]
  );
  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    toRef.current && clearTimeout(toRef.current);
    if (navIsOpen) {
      toRef.current = setTimeout(updateColor, 50);
    }
  }, [navIsOpen, colorSchemes, colours, updateColor]);
  useMotionValueEvent(navItemSelected, "change", () => {
    toRef.current && clearTimeout(toRef.current);
    toRef.current = setTimeout(updateColor, 50);
  });
  useMotionValueEvent(navItemHovered, "change", () => {
    toRef.current && clearTimeout(toRef.current);
    toRef.current = setTimeout(updateColor, 50);
  });
  useFrame((state, delta, frame) => {
    gradientt.current &&
      (gradientt.current.uniforms.u_time.value += delta * 0.02);
  });
  return (
    <>
      <mesh raycast={meshBounds} visible={navIsOpen}>
        <planeGeometry args={[10, 10, 192, 192]} />
        {/** @ts-ignore */}
        <gradientShader
          ref={gradientt}
          extensions={{
            derivatives: "#extension GL_OES_standard_derivatives: enable"
          }}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}

/**
 * Reads a CSS colour token into a three.js colour. The browser parses the token (oklch, lab, relative colours,
 * var() chains) by painting one canvas pixel: three's Color.setStyle doesn't read oklch, and the installed
 * `color` package converts oklch numbers but can't parse CSS colour strings. A token the canvas can't read
 * paints black.
 */
let probe: CanvasRenderingContext2D | null = null;
function tokenColor(token: string, target: ThreeColor) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe || !value) return target;
  // A fresh pixel each time, so a translucent token can't blend over the last one.
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "transparent";
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return target.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}
