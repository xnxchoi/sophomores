"use client";

import { useIdleDetection } from "../../Radio/hooks/useIdleDetection";
import { SPRING_EASE, TE } from "src/constants/animations";
import { useAudioLevel, usePlayState } from "src/providers/HideawayFM/hooks";
import { useTheme } from "src/providers/Theme";
import { lerp } from "src/utilities/rp_utils";
import { useWindowResize } from "src/utilities/use_window_resize";
import { wait } from "src/utilities/wait";
import {
  OrthographicCamera,
  ScreenQuad,
  shaderMaterial,
  useTexture
} from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { GPUComputationRenderer, Variable } from "three-stdlib";
import { animate, AnimationSequence, cancelFrame, frame } from "motion";
import {
  MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform
} from "motion/react";
import {
  BlendFunction,
  Effect,
  EffectComposer,
  EffectPass,
  KawaseBlurPass,
  RenderPass
} from "postprocessing";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Color from "color";
import {
  FrontSide,
  IUniform,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3
} from "three";
import {
  Color as ThreeColor,
  DoubleSide,
  RepeatWrapping,
  Texture,
  Uniform,
  Vector4
} from "three";
import { number } from "zod";
import { useShallow } from "zustand/shallow";
import fragmentShader from "../shaders/ambient.frag.glsl";
import vertexShader from "../shaders/ambient.vert.glsl";
import grainShader from "../shaders/grain.glsl";
import simulFragShader from "../shaders/simul.frag.glsl";

const displacementShader = `
uniform sampler2D uSimulationTexture;
uniform vec2 uDisplacementStrength;
uniform float uCursorColoring;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 gpgpuColor = texture2D(uSimulationTexture, vUv);
    vec2 dUv = vec2(
        uv.x - (-0.5 + gpgpuColor.r) * uDisplacementStrength.x * gpgpuColor.b,
        uv.y - (-0.5 + gpgpuColor.g) * uDisplacementStrength.y * gpgpuColor.b
    );
    vec4 color = texture2D(inputBuffer, dUv);
    color.rgb += color.rgb * gpgpuColor.b * uCursorColoring;
    outputColor = vec4(color.rgb, 1.0);
}`;

// ── Theme color palettes ───────────────────────────────────────────────────
//
// Leeroy palette philosophy: 4 colors in the SAME hue family, stepping
// monochromatically through value/chroma. The cohesion comes from staying
// inside one hue, not from contrasting accents. Shader ramps quartile-linear
// across noise (0/0.25/0.5/0.75), so each stop owns 25% of the dynamic range.
//
// ─── Dark ── full rosso family: warm wine → blood → vivid rosso → coral peak ──
// Mid-stops lifted so intermediate tones survive the s-curve and read as a
// graded palette, not a binary "black + orange" split. Valley is a warm
// burgundy, not near-black, so depth stays inside the hue family.
const DARK_BG = new ThreeColor().setHex(0x1a060a); // wine-black floor
const DARK_COLOR1 = new ThreeColor().setHex(0x4a141c); // valley: warm burgundy (lifted from near-black)
const DARK_COLOR2 = new ThreeColor().setHex(0x8a2418); // mid: rich blood red
const DARK_COLOR3 = new ThreeColor().setHex(0xd13e1a); // ridge: vivid rosso corsa
const DARK_COLOR4 = new ThreeColor().setHex(0xee9c70); // peak: warm peach-coral bloom
//
// ─── Light ── full bleu family, weighted to the LIGHT half of the value range
// so the rendering stays predominantly cream/sky and never collapses to dark
// navy patches. The brand bleu-700 sits at the peak, not in the middle —
// preserves the "near-white silk with bleu shading" quality.
const bgl = new Color("#0c4a87", "hex");
const LIGHT_BG = new ThreeColor().setHex(0xf1e8d4); // creamy-white (brand)
const LIGHT_COLOR1 = new ThreeColor().setHex(0xa9c0d2); // valley: barely-darker cream
const LIGHT_COLOR2 = new ThreeColor().setHex(0x5097c7); // mid: cool mist (cream→bleu bridge)
const LIGHT_COLOR3 = new ThreeColor().setHex(0x2677a6); // ridge: muted sky-bleu
const LIGHT_COLOR4 = new ThreeColor().setHex(0xdee4e8); // peak: brand bleu-700 (deep stop, not navy-black)
// Fold intensity — keep at 1 for full contrast; blur handles subtlety.
const BLOB_INTENSITY_PLAYING = 0.92;
const BLOB_INTENSITY_STOPPED = 1.0;

// ── Shader material at MODULE SCOPE — one stable class reference ──
// If defined inside the component, shaderMaterial() creates a new class every
// render. extend() then registers a different constructor under `ambientShader`,
// causing R3F's reconciler to unmount/remount the material every frame, which
// resets materialRef.current to null and breaks the render loop entirely.
const _shaderUniforms = {
  u_time: 0.1,
  u_scrollPhase: 0.0,
  u_resolution: new Vector2(1, 1),
  u_bgColor: new ThreeColor(),
  u_color1: new ThreeColor(),
  u_color2: new ThreeColor(),
  u_color3: new ThreeColor(),
  u_color4: new ThreeColor(),
  u_audioLevel: 0.0,
  u_audioBeat: 0.0, // Peak-envelope (~280ms decay) — drives subtle halation breathing
  u_audioGain: 0.0, // Slow play-state ramp (~700ms) — gates ALL audio coupling so pause↔play transitions fade instead of snap
  u_fogProgress: 0.0,
  u_opacity: 0.1,
  u_speed: 0.02,
  u_size: 0.2,
  u_offset: new Vector2(0.42, 0.6),
  u_blobIntensity: BLOB_INTENSITY_STOPPED,
  u_noiseTexture: null as Texture | null
};
const AmbientShaderMaterial = shaderMaterial(
  _shaderUniforms,
  vertexShader,
  fragmentShader
);
extend({ AmbientShaderMaterial });

type AmbientGradientMeshProps = {};
const OPACITY_PLAYING = 0.79;
const OPACITY_STOPPED = 0.35;

export const AmbientGradientMesh = ({}: AmbientGradientMeshProps) => {
  useTexture.preload("/assets/seamless.png");
  const { optimistic } = usePlayState();
  const playing = optimistic === "playing";
  const playState = useMotionValue(playing);
  const cam = useRef<typeof OrthographicCamera>(null);
  useEffect(() => {
    playState.set(playing);
  }, [playState, playing]);
  const theme = useTheme((s) => s.theme);
  const [isDark, setIsDark] = useState(theme === "dark");
  // Color targets ref declared HERE (before the theme effect that writes to
  // it) to avoid a TDZ error. The lerp inside useFrame reads from this ref
  // each frame and drives the actual uniform values toward these targets.
  const colorTargetsRef = useRef({
    bg: new ThreeColor(),
    c1: new ThreeColor(),
    c2: new ThreeColor(),
    c3: new ThreeColor(),
    c4: new ThreeColor()
  });
  // Resolve theme → boolean AND update color targets in the same effect.
  // Splitting the work across two effects (one to set isDark, another to
  // read isDark and write color targets) opened a window where the second
  // effect could miss the change while the audio RAF loop was active and
  // re-rendering the component on every play state tick. One effect closes
  // that window and writes targets immediately on theme change.
  useEffect(() => {
    const dark =
      theme === "dark"
        ? true
        : theme === "light"
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    const targets = colorTargetsRef.current;
    targets.bg.copy(dark ? DARK_BG : LIGHT_BG);
    targets.c1.copy(dark ? DARK_COLOR1 : LIGHT_COLOR1);
    targets.c2.copy(dark ? DARK_COLOR2 : LIGHT_COLOR2);
    targets.c3.copy(dark ? DARK_COLOR3 : LIGHT_COLOR3);
    targets.c4.copy(dark ? DARK_COLOR4 : LIGHT_COLOR4);
  }, [theme]);
  const opacit = useTransform(
    () => (playState.get() ? OPACITY_PLAYING : OPACITY_STOPPED) + 0.01
  );
  const opacity = useSpring(opacit, {
    ...SPRING_EASE.power3.inOut,
    duration: 1.6
  });
  // Single instances of hooks — passed to both desktop and mobile backgrounds
  const { fogProgress } = useIdleDetection({
    timeout: 8000,
    maxFogTime: 15000,
    clearDuration: 650
  });
  const radioAudio = useAudioLevel();

  const noiseTexture = useTexture("/assets/seamless.png", (texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
  });

  const materialRef = useRef<
    Omit<ShaderMaterial, "uniforms"> & {
      uniforms: {
        [X in keyof typeof _shaderUniforms]: IUniform<
          (typeof _shaderUniforms)[X]
        >;
      };
    }
  >(null);
  const meshRef = useRef<Mesh>(null);
  const { gl, scene, camera } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const blurPassRef = useRef<KawaseBlurPass | null>(null);
  const grainUniforms = useMemo(() => {
    const uXCount = new Uniform(window.innerWidth / window.devicePixelRatio);
    const uYCount = new Uniform(window.innerHeight / window.devicePixelRatio);
    const uIntensity = new Uniform(1.29);
    return new Map<string, Uniform>([
      ["uXCount", uXCount],
      ["uYCount", uYCount],
      ["uIntensity", uIntensity]
    ]);
  }, []);
  const grainEffectsRef = useRef<Effect>(null);

  // ── GPGPU mouse-trail simulation ───────────────────────────────────────
  const mouseUv = useMemo(() => new Vector2(0.5, 0.5), []);
  const prevMouseUv = useMemo(() => new Vector2(0.5, 0.5), []);
  const uMouseFactor = useMemo(() => new Uniform(0), []);
  const uSimulationTexture = useMemo(
    () => new Uniform<Texture | null>(null),
    []
  );
  const gpgpuRef = useRef<GPUComputationRenderer | null>(null);
  const tPositionVarRef = useRef<Variable | null>(null);

  const initializeShaderMaterial = useEffectEvent(() => {
    if (!materialRef.current) return;
    if (!meshRef.current || !noiseTexture) return;
    const m = materialRef.current;
    // m.u_noiseTexture = noiseTexture;
    m.uniforms.u_resolution.value = new Vector2(
      window.innerWidth,
      window.innerHeight
    );
  });
  // Target colors are managed in the [theme] effect above, lerped toward
  // in the useFrame tick. Manual lerp (instead of motion.animate) because
  // motion's standalone driver wasn't reliably ticking plain ThreeColor
  // mutations — the render loop is the source of truth.
  const setColors = useEffectEvent((duration = 0.3) => {
    const me = materialRef.current;
    if (!me) return;
    const m = me.uniforms;
    const bg = isDark ? DARK_BG : LIGHT_BG;
    const c1 = isDark ? DARK_COLOR1 : LIGHT_COLOR1;
    const c2 = isDark ? DARK_COLOR2 : LIGHT_COLOR2;
    const c3 = isDark ? DARK_COLOR3 : LIGHT_COLOR3;
    const c4 = isDark ? DARK_COLOR4 : LIGHT_COLOR4;

    // Always update the targets — useFrame will lerp toward them.
    const targets = colorTargetsRef.current;
    targets.bg.copy(bg);
    targets.c1.copy(c1);
    targets.c2.copy(c2);
    targets.c3.copy(c3);
    targets.c4.copy(c4);

    // Sync path: snap immediately (used on mount so first frame is correct).
    if (duration === 0) {
      m.u_bgColor.value.copy(bg);
      m.u_color1.value.copy(c1);
      m.u_color2.value.copy(c2);
      m.u_color3.value.copy(c3);
      m.u_color4.value.copy(c4);
    }
  });
  const initSequence = useEffectEvent(() => {
    // Passes
    const renderPass = new RenderPass(scene, camera);

    // Silk folds need blur that smooths crisp noise transitions without flattening contrast.
    // kernelSize 3 + scale 2: wide enough for velvet look, preserves fold ridge/valley separation.
    const blurPass = new KawaseBlurPass({ kernelSize: 3 });
    blurPass.scale = 2;
    blurPassRef.current = blurPass;

    const grainEffect = new Effect("grain", grainShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: grainUniforms
    });
    grainEffectsRef.current = grainEffect;
    const effectPass = new EffectPass(camera, grainEffect);

    const composer = new EffectComposer(gl);
    composer.multisampling = Math.min(4, 20);
    composer.removeAllPasses();
    composer.setSize(gl.domElement.offsetWidth, gl.domElement.offsetHeight);
    composer.addPass(renderPass);
    composer.addPass(blurPass);
    composer.addPass(effectPass);
    composerRef.current = composer;

    // Disable R3F auto-clear so our EffectComposer has full control
    gl.autoClear = false;

    return () => {
      composer.dispose();
      composerRef.current = null;
      gl.autoClear = true;
    };
  });
  const onResize = useEffectEvent(() => {
    gl.setSize(window.innerWidth, window.innerHeight);
    const devicePixelRatio = window.devicePixelRatio || 2;

    composerRef.current &&
      composerRef.current.setSize(window.innerWidth, window.innerHeight);

    gl.setPixelRatio(devicePixelRatio);
    materialRef.current &&
      (materialRef.current.uniforms.u_resolution.value = new Vector2(
        window.innerWidth,
        window.innerHeight
      ));
    const gu = grainEffectsRef.current?.uniforms;
    if (gu) {
      const uxc = gu.get("uXCount");
      uxc && (uxc.value = window.innerWidth / devicePixelRatio);
      const uyc = gu.get("uYCount");
      uyc && (uyc.value = window.innerHeight / devicePixelRatio);
    }
  });
  const unmountCallback = useRef<() => void>(null);
  // ── Build postprocessing pipeline ONCE via useEffect ────────────────────
  useEffect(() => {
    if (!unmountCallback.current) {
      initializeShaderMaterial();
      setColors(0);
      if (materialRef.current) {
        materialRef.current.uniforms.u_noiseTexture.value = noiseTexture;
      }
      unmountCallback.current = initSequence();

      onResize();
    }
    return () => {
      unmountCallback.current?.();
      unmountCallback.current = null;
    };
  }, [noiseTexture]);
  //
  // // ── Pointer tracking → mouseUv / prevMouseUv / uMouseFactor ───────────
  // useEffect(() => {
  //   let factorTimeout: ReturnType<typeof setTimeout> | null = null;
  //   const onPointerMove = (e: PointerEvent) => {
  //     prevMouseUv.copy(mouseUv);
  //     mouseUv.x = e.clientX / window.innerWidth;
  //     mouseUv.y = 1 - e.clientY / window.innerHeight;
  //     uMouseFactor.value = 1;
  //     if (factorTimeout) clearTimeout(factorTimeout);
  //     factorTimeout = setTimeout(() => {
  //       uMouseFactor.value = 0;
  //     }, 50);
  //   };
  //   window.addEventListener("pointermove", onPointerMove);
  //   return () => {
  //     window.removeEventListener("pointermove", onPointerMove);
  //     if (factorTimeout) clearTimeout(factorTimeout);
  //   };
  // }, [mouseUv, prevMouseUv, uMouseFactor]);

  const resizeTimestamp = useWindowResize({ debounce: 100 });
  // ── Sync sizes on resize ───────────────────────────────────────────────
  useEffect(() => {
    onResize();
  }, [resizeTimestamp]);
  // ── Set initial colors + texture on material (runs once after mount) ───

  // (color targets are now updated in the consolidated [theme] effect above)

  // ── Scroll → fold phase ────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const m = materialRef.current;
      if (!m) return;
      m.uniforms.u_scrollPhase.value = window.scrollY / window.innerHeight;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Update resolution on resize ────────────────────────────────────────

  // Smoothly transition blob intensity
  const _targetBlobIntensity = useMotionValue(BLOB_INTENSITY_STOPPED);
  const targetBlobIntensity = useSpring(_targetBlobIntensity, {
    ...SPRING_EASE.power3.inOut,
    duration: 0.3
  });
  useEffect(() => {
    const target = playing ? BLOB_INTENSITY_PLAYING : BLOB_INTENSITY_STOPPED;
    _targetBlobIntensity.set(target);
  }, [playing, _targetBlobIntensity]);
  // useMotionValueEvent(opacity, "change", (latestValue) => {
  //   const m = materialRef.current;
  //   if (!m) return;
  // });
  useMotionValueEvent(fogProgress, "change", (latestValue) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.u_fogProgress.value = latestValue;
  });

  // ── Render loop ─────────────────────────────────────────────────────────
  // R3F calls gl.render(scene, camera) AFTER all useFrame callbacks.
  // To prevent it from overwriting EffectComposer output, we:
  //   1. Make mesh visible for our EffectComposer render
  //   2. Render through EffectComposer (blur + grain → screen)
  //   3. Hide mesh so R3F's auto-render has nothing to draw
  // Single smooth peak-envelope (~200ms half-life). Drives only the halation
  // bloom downstream — no displacement, no flashes, no color swaps.
  const beatEnvelopeRef = useRef(0);
  // Slow play-state envelope. Audio level snaps from 0 → ~0.5 instantly when
  // play starts (gesture-unlock fires audio at full volume); without this
  // ramp the visual snaps too. Symmetric ~700ms ramp on both pause→play and
  // play→pause for matched smoothness in both directions.
  const audioGainRef = useRef(0);

  useFrame((_state, delta) => {
    if (!materialRef.current || !composerRef.current || !meshRef.current)
      return;
    const m = materialRef.current;
    // Accumulate time (delta is in seconds at ~60fps → ~0.016)
    m.uniforms.u_time.value += delta * (playState.get() ? 0.22 : 0.05);
    const aud = radioAudio.get();
    m.uniforms.u_audioLevel.value = aud;

    const prevBeat = beatEnvelopeRef.current;
    const decayedBeat = prevBeat * Math.exp(-delta * 3.5);
    const beat = aud > decayedBeat ? aud : decayedBeat;
    beatEnvelopeRef.current = beat;
    m.uniforms.u_audioBeat.value = beat;
    const lastOpacity = m.uniforms.u_opacity.value;
    m.uniforms.u_opacity.value = lerp(lastOpacity, opacity.get(), 0.12);

    // Slow audio gain envelope — ramps to 1 when playing, 0 when paused.
    // Decay constant 1.0/s gives ~700ms half-life — soft fade in/out so
    // pause→play visual doesn't snap from inert to fully-modulated.
    const gainTarget = playing ? 1 : 0;
    const gainPrev = audioGainRef.current;
    const gainAlpha = 1 - Math.exp(-delta * 1.0);
    const gain = gainPrev + (gainTarget - gainPrev) * gainAlpha;
    audioGainRef.current = gain;
    m.uniforms.u_audioGain.value = gain;
    // Blur radius oscillates with the beat. The trick: subtract a portion
    // of the smooth `aud` baseline from the peak-follower `beat` so we get
    // ONLY the supra-baseline pulse (what's above sustained level). Without
    // this, aud and beat rise together and the blur sits at a plateau
    // instead of pumping. Lerp is faster (0.32) so the eye tracks each
    // individual beat instead of seeing a smeared average.
    if (blurPassRef.current) {
      const pulse = Math.max(0, beat - aud * 0.85);
      // Lower baseline (1.5) + much bigger pulse coefficient (22) so the
      // per-beat variance dominates the response. Previously the baseline
      // was 2.5 which absorbed most of the pulse — looked like a flat
      // "more blurred" plateau during playback rather than oscillation.
      // Faster lerp (0.45) tracks the beat envelope shape closely so each
      // pulse reads as a discrete inhale/exhale instead of a smear.
      const targetScale = 2.5 + aud * 0.4 + pulse * 20.0;
      blurPassRef.current.scale = lerp(
        blurPassRef.current.scale,
        targetScale,
        0.23
      );
    }
    // Smoothly lerp blob intensity
    const current = m.uniforms.u_blobIntensity.value;
    const target = targetBlobIntensity.get();
    const lerpedValue = lerp(current, target, 0.16);
    m.uniforms.u_blobIntensity.value = lerpedValue;

    // Lerp color uniforms toward their targets each frame. Theme change
    // updates colorTargetsRef; this loop drives the actual transition.
    // 0.10 lerp ≈ 200ms time-constant — soft fade between themes.
    const colorTargets = colorTargetsRef.current;
    const colorLerp = 0.1;
    m.uniforms.u_bgColor.value.lerp(colorTargets.bg, colorLerp);
    m.uniforms.u_color1.value.lerp(colorTargets.c1, colorLerp);
    m.uniforms.u_color2.value.lerp(colorTargets.c2, colorLerp);
    m.uniforms.u_color3.value.lerp(colorTargets.c3, colorLerp);
    m.uniforms.u_color4.value.lerp(colorTargets.c4, colorLerp);

    // Tick GPGPU mouse-trail simulation
    const gpgpu = gpgpuRef.current;
    const tPos = tPositionVarRef.current;
    if (gpgpu && tPos) {
      const u = tPos.material.uniforms;
      u.uTime.value += delta;
      u.uDelta.value = delta * 1000;
      u.uMouseFactor.value = uMouseFactor.value;
      gpgpu.compute();
      uSimulationTexture.value = gpgpu.getCurrentRenderTarget(tPos).texture;
    }
    meshRef.current.visible = true;
    _state.gl.render(_state.scene, _state.camera);
  }, 1);
  useFrame((_state, delta) => {
    if (!materialRef.current || !composerRef.current || !meshRef.current) {
      return;
    }
    // Show mesh → render through postprocessing → hide mesh
    composerRef.current.render(delta);
    meshRef.current.visible = false;
  }, 2);

  return (
    <ScreenQuad ref={meshRef} frustumCulled={false}>
      {/** @ts-expect-error custom drei shaderMaterial element **/}
      <ambientShaderMaterial ref={materialRef} side={FrontSide} />
    </ScreenQuad>
  );
};
