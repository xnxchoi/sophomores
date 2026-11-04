"use client";

/**
 * TapeModel — inner R3F scene component for the tape player 3D model.
 *
 * Converted from the minified vanilla Three.js script in ./rip/tape3d.js.
 * See the plan file for a full symbol-decoding table.
 *

 * Then update the TODO comments below to use the /public/ paths.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TWEEN_EASE } from "@/constants/animations";
import { useNowPlaying, usePlayState } from "@/providers/HideawayFM/hooks";
import { lerp } from "@/utilities/rp_utils";
import { useWindowResize } from "@/utilities/use_window_resize";
import {
  Environment,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  RenderTexture,
  Text,
  useGLTF,
  useTexture
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLenis } from "lenis/react";
import { AnimationSequence } from "motion";
import {
  animate,
  scroll,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform
} from "motion/react";
import {
  RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  BufferGeometry,
  Color,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Material,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
  PCFSoftShadowMap,
  PointLight,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UVMapping,
  Vector2,
  Vector3
} from "three";
import { OrbitControls as OrbitControls_ } from "three-stdlib";

// gsap.registerPlugin(ScrollTrigger);

/**
 * Visual state for the tape button animation. Derived from the new
 * HideawayFM tri-state play model + crossfading flag.
 */
type TapeVisualState = "seeking" | "playing" | "paused" | "stopped";
// ─── DRACO decoder path ───────────────────────────────────────────────────────
// The files are already copied to /public/draco/ (from rip/).
useGLTF.setDecoderPath("/draco/");
useTexture.preload("/assets/three/materials/brushed_metal/normal.jpg");
// ─── Asset URLs ───────────────────────────────────────────────────────────────
// Assets are served from the project's /public/ directory.
// Update these paths once the actual model/env/video files are in place.

const MODEL_URL = "/assets/three/tape/player.gltf";
const HDR_URL = "/assets/three/tape/urban_alley_01_1k.hdr";
const VIDEO_URL = "/assets/three/tape/Display.mp4";

// Module-level preload of the GLTF. Whenever this file's chunk is in
// the bundle graph (i.e. any page that statically imports TapeModel
// or Tape3DScene), the fetch + draco decode kicks off as soon as the
// chunk evaluates — well before the cassette is actually mounted.
// Without this, the parse hits the main thread on first reveal and
// the GSAP-pinned scroll stutters audibly as the model pops in.
useGLTF.preload(MODEL_URL);

// ─── Constants ────────────────────────────────────────────────────────────────

/** Constant idle disk rotation speed (Gb in original). */
const BASE_DISK_SPEED = -0.005;

/** Initial model rotation.y */
const INIT_ROT_Y = -0.6;
const PRESSED_ROT_Z = 0.07;
/** Initial model position.y */
const INIT_POS_Y = -0.2;
/** Button state change animation duration in milliseconds */
const BUTTON_ANIM_DURATION = 200;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets ACESFilmic tone mapping + SRGBColorSpace + PCFSoftShadowMap on the
 * shared renderer when the tape scene mounts, then restores the previous
 * values on unmount so other Views (VGradient, Lanyard, etc.) are unaffected.
 */
function TapeRendererSetup() {
  const { gl } = useThree();
  useEffect(() => {
    const prev = {
      toneMapping: gl.toneMapping,
      toneMappingExposure: gl.toneMappingExposure,
      outputColorSpace: gl.outputColorSpace,
      shadowMapType: gl.shadowMap.type
    };
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = SRGBColorSpace;
    gl.shadowMap.type = PCFSoftShadowMap;
    return () => {
      gl.toneMapping = prev.toneMapping;
      gl.toneMappingExposure = prev.toneMappingExposure;
      gl.outputColorSpace = prev.outputColorSpace;
      gl.shadowMap.type = prev.shadowMapType;
    };
  }, [gl]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optional override for the display screen text — bypasses HideawayFM
 * when provided. `tickerMode: "static"` freezes the marquee scroll so
 * the text sits centered, intended to be paired with a CRT-scanline
 * overlay rendered outside the canvas (see Tape3DScene). When the
 * override is null/undefined, the display reverts to HideawayFM's
 * "ARTIST - TITLE" marquee.
 */
export interface TapeDisplayOverride {
  text: string;
  tickerMode?: "marquee" | "static";
}

/**
 * Optional camera override for cinematic surfaces. When provided,
 * replaces the default INITIAL_CAMERA_POS / OrbitControls target so a
 * page (e.g. Day-n-Night LiminalHandoff) can frame the tape closer
 * with the display face-forward to the viewport.
 */
export interface TapeCameraOverride {
  /** World-space camera position. Defaults to (-8, -3, 15). */
  position?: [number, number, number];
  /** OrbitControls look-at target. Defaults to (0, 0, 0). */
  target?: [number, number, number];
  /** Field of view in degrees. Defaults to 10. */
  fov?: number;
}

/**
 * Optional model rotation override. When set, the model's scene
 * rotation is locked to `{x,y,z}` (radians) and the built-in
 * scroll-driven rotation pipeline is short-circuited so the GSAP
 * onUpdate doesn't fight the override. Drop to null to hand rotation
 * back to the scroll trigger.
 */
export interface TapeModelRotation {
  x: number;
  y: number;
  z: number;
}

interface TapeModelProps {
  scrollTriggerId: string;
  /**
   * Whether the parent container is currently in the viewport.
   * Controls `makeDefault` on the PerspectiveCamera and `enabled` on
   * OrbitControls so they don't compete with other Views when off-screen.
   */
  inView: boolean;
  /** See TapeDisplayOverride. Defaults to HideawayFM-driven marquee. */
  displayOverride?: TapeDisplayOverride | null;
  /** See TapeCameraOverride. Defaults to (-8,-3,15) / fov 10 / target (0,0,0). */
  cameraOverride?: TapeCameraOverride | null;
  /** See TapeModelRotation. Defaults to scroll-driven rotation. */
  modelRotation?: TapeModelRotation | null;
}
const METAL_TEXTURE = "/assets/three/materials/brushed_metal/normal.jpg";
useTexture.preload(METAL_TEXTURE);
export function TapeModel({
  scrollTriggerId = "webgl_trigger",
  inView,
  displayOverride,
  cameraOverride,
  modelRotation
}: TapeModelProps) {
  // Ref-track the rotation override so the scroll trigger callback
  // (created once via useEffectEvent) can see live updates without
  // re-binding. Used to short-circuit the scroll-driven rotation
  // pipeline when the cinematic surface wants to lock the pose.
  const modelRotationRef = useRef(modelRotation);
  useEffect(() => {
    modelRotationRef.current = modelRotation;
  }, [modelRotation]);
  const controlsRef = useRef<OrbitControls_>(null!);
  const { scene } = useGLTF(MODEL_URL);
  const texture = useTexture(METAL_TEXTURE, (texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = NoColorSpace;
    texture.anisotropy = 1;
    texture.mapping = UVMapping;
    texture.channel = 1;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.repeat.set(5, 5);
    texture.offset.set(0, -4);
    texture.needsUpdate = true;
    return texture;
  });
  /** The "Disk" mesh that spins in response to scroll velocity. */
  const diskRef = useRef<Object3D | null>(null);
  const playButtonRef = useRef<Object3D | null>(null);
  const pauseButtonRef = useRef<Object3D | null>(null);
  const forwardButtonRef = useRef<Object3D | null>(null);
  const rewindButtonRef = useRef<Object3D | null>(null);
  const activeButtonRef = useRef<Object3D | null>(null);
  // Camera override changes shift the "home" pose so reset behaviour
  // returns to the cinematic frame instead of the default Radio one.
  // We memoise on the override's serialized values so a stable
  // override doesn't churn the Vector3 identity each render.
  const overridePosKey = cameraOverride?.position?.join(",") ?? "";
  const overrideTargetKey = cameraOverride?.target?.join(",") ?? "";
  const overrideFov = cameraOverride?.fov ?? 10;
  const INITIAL_CAMERA_POS = useMemo(
    () =>
      cameraOverride?.position
        ? new Vector3(...cameraOverride.position)
        : new Vector3(-8, -3, 15),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overridePosKey]
  );
  const INITIAL_TARGET_POS = useMemo(
    () =>
      cameraOverride?.target
        ? new Vector3(...cameraOverride.target)
        : new Vector3(0, 0, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrideTargetKey]
  );
  /** Raw scroll velocity fed by Lenis (hg in original). */
  const scrollVelocityRef = useRef(0);
  const displayBounds = useRef(new Box3()),
    displayCenter = useRef(new Vector3());
  const textWidth = useRef(10);
  const [displayAspect, setDisplayAspect] = useState<number | null>(null);
  const DISPLAY_EMISSIVE_INTENSITY = 200;
  const DISPLAY_HALF_HEIGHT = 1.5;
  const FONT_SIZE_RATIO = 0.33;
  // Static-mode captions can be wider than the marquee window
  // (e.g. "Time for a change of pace." is ~25 chars). Shrink the
  // glyph height so the full string fits without clipping. 0.7 was
  // tuned against the LiminalHandoff captions; tweak if shorter or
  // longer text shows up.
  const STATIC_FONT_SHRINK = 0.7;
  const displayFontSize =
    DISPLAY_HALF_HEIGHT *
    2 *
    FONT_SIZE_RATIO *
    (displayOverride?.tickerMode === "static" ? STATIC_FONT_SHRINK : 1);
  const RENDER_TEX_HEIGHT = 256;
  /** Exponentially smoothed velocity (qc in original). */
  const smoothedVelocityRef = useRef(0);

  /** The PointLight so GSAP can animate its position. */
  const lightRef = useRef<PointLight>(null!);

  /** Reference to the replaced Metal MeshStandardMaterial. */
  const metalMatRef = useRef<MeshStandardMaterial | null>(null);
  const displayScreen = useRef<Object3D | null>(null);
  const displayEmissiveRef = useRef<Texture | null>(null);
  const displayScreenMatRef = useRef<MeshStandardMaterial | null>(null);
  const displayScreenMeshRef = useRef<BufferGeometry | null>(null);
  const isResetting = useRef(false);
  const interactingValue = useMotionValue(false);
  const isisis = useRef(false);
  // ─── Material setup, disk ref, video texture ────────────────────────────────
  useEffect(() => {
    if (!scene) return;
    if (!isisis.current) {
      console.log("scene", scene);
      isisis.current = true;
    }

    scene.receiveShadow = true;
    scene.castShadow = true;
    scene.position.set(0, 0, 0);
    scene.rotation.y = INIT_ROT_Y;

    // Locate the Disk mesh for the animation loop
    diskRef.current = scene.getObjectByName("Disk") ?? null;
    playButtonRef.current = scene.getObjectByName("PLAY") ?? null;
    pauseButtonRef.current = scene.getObjectByName("PAUSE") ?? null;
    forwardButtonRef.current = scene.getObjectByName("FORWARD") ?? null;
    rewindButtonRef.current = scene.getObjectByName("REWIND") ?? null;
    let metalMate: MeshStandardMaterial | null = null;
    scene.traverse((obj) => {
      if (!(obj instanceof Mesh) || !obj.material) return;
      const mat = obj.material as Material & { name?: string };

      // ── Display mesh — video texture as emissive map ─────────────────────
      if (mat.name === "Display") {
        displayScreen.current = obj;
        const displayMat = obj.material as MeshStandardMaterial;
        displayMat.emissive = new Color(0x96f7ff);
        // Keep display unlit until the RenderTexture aspect is computed and
        // the texture has been wired onto the emissiveMap slot.
        displayMat.emissiveIntensity = 300;
        displayScreenMatRef.current = displayMat;
        displayScreenMeshRef.current = obj.geometry;
        displayMat.emissiveMap = displayEmissiveRef.current;
        displayMat.needsUpdate = true;

        // Measure the Display geometry's UV aspect so the RenderTexture +
        // ortho camera match the physical screen shape (no stretching).
        obj.geometry.computeBoundingBox();
        const bb = obj.geometry.boundingBox;
        if (bb) {
          const size = new Vector3();
          bb.getSize(size);
          // Pick the two largest axes as "width × height" of the screen face.
          const aspect = size.x / size.y;
          setDisplayAspect(aspect);
        }
      }

      // ── black_glass — MeshPhysicalMaterial with transmission ─────────────
      // No explicit envMap: scene.environment is picked up automatically.
      if (mat.name === "black_glass") {
        obj.material = new MeshPhysicalMaterial({
          color: "#111111",
          metalness: 0,
          roughness: 0,
          transmission: 1,
          ior: 1.3,
          thickness: 0.3,
          transparent: false
        });
        obj.material.needsUpdate = true;
      }

      // ── Black — plain MeshStandardMaterial ───────────────────────────────
      if (mat.name === "Black") {
        obj.material = new MeshStandardMaterial({
          color: "#1c1c1c",
          metalness: 0,
          roughness: 1
        });
        obj.material.needsUpdate = true;
      }

      // ── Metal — polished material with normal map from original ──────────
      // No explicit envMap: scene.environment is picked up automatically.
      if (mat.name.startsWith("Metal")) {
        if (mat.name === "Metal") {
          metalMate = obj.material as MeshStandardMaterial;

          const metalMat = new MeshStandardMaterial({
            ...metalMate,
            color: "#EBEFF4",
            metalness: 0.85,
            roughness: 0.2,
            envMapIntensity: 0.156,
            normalMap: texture,
            normalScale: new Vector2(0.5, 0.5)
          });
          metalMat.needsUpdate = true;
          metalMatRef.current = metalMat;
          obj.material = metalMat;
        } else if (metalMatRef.current) {
          obj.material = metalMatRef.current;
        }
      }
      if (obj.name === "Disk001") {
        obj.material = new MeshStandardMaterial({
          ...obj.material,
          ...(metalMatRef.current || {}),
          normalMap: texture
        });
      }
    });
  }, [scene]);

  const lastResize = useWindowResize({ debounce: 100 });
  // ─── Responsive model scale ───────────────────────────────────────────────
  const onResize = useEffectEvent(() => {
    if (!scene) return;

    // < 991 px → 0.5 scale (mobile + tablet), ≥ 992 px → 0.6
    const s = window.innerWidth < 991 ? 0.5 : 0.6;
    scene.scale.set(s, s, s);
  });
  useEffect(() => {
    onResize();
  }, [lastResize]);
  const playState = usePlayState();
  const nowPlaying = useNowPlaying();
  const seeking = nowPlaying.crossfading;
  const trackStatus: TapeVisualState = useMemo(() => {
    if (seeking) return "seeking";
    switch (playState.real) {
      case "playing":
        return "playing";
      case "paused":
        return "paused";
      default:
        return "stopped";
    }
  }, [seeking, playState.real]);
  const lastTrackstatus = useRef<TapeVisualState>(trackStatus);
  const trackStatusValue = useMotionValue<TapeVisualState>(trackStatus);
  useEffect(() => {
    trackStatusValue.set(trackStatus);
  }, [trackStatus, trackStatusValue]);

  const lastActive = useRef(activeButtonRef.current);
  const statusToButton = useCallback((status: TapeVisualState) => {
    switch (status) {
      case "seeking":
        return forwardButtonRef.current;
      case "playing":
        return playButtonRef.current;
      case "paused":
      case "stopped":
        return pauseButtonRef.current;
      default:
        return null;
    }
  }, []);
  const activeButtonValue = useTransform(() => {
    const curState = trackStatusValue.get();
    const ogState = trackStatusValue.getPrevious();
    const once1 = statusToButton(curState);
    if (!once1 && !!ogState && curState !== ogState) {
      return statusToButton(ogState);
    }
    return once1;
  });
  const lastActiveValue = useTransform(() => activeButtonValue.getPrevious());
  useMotionValueEvent(activeButtonValue, "change", (v) => {
    const seq: AnimationSequence = [];
    const r = activeButtonValue.getPrevious();
    if (r) {
      seq.push([
        r.rotation,
        {
          y: 0
        },
        {
          ease: TWEEN_EASE.expo.out,
          duration: 0.25,
          type: "tween",
          at: 0
        }
      ]);
    }
    if (v) {
      seq.push([
        v.rotation,
        {
          y: 0.1
        },
        {
          ease: TWEEN_EASE.back.out(1.7),
          duration: 0.3,
          delay: 0.05,
          type: "tween",
          at: 0
        }
      ]);
    }
    seq.length > 0 && animate(seq);
  });
  useEffect(() => {
    const state = trackStatus;
    if (state !== lastTrackstatus.current) {
      lastActive.current = activeButtonRef.current;
      const fwdb = forwardButtonRef.current,
        playb = playButtonRef.current,
        pauseb = pauseButtonRef.current;
      switch (state) {
        case "seeking":
          activeButtonRef.current = fwdb;
          break;
        case "playing":
          activeButtonRef.current = playb;
          break;
        case "paused":
        case "stopped":
          activeButtonRef.current = pauseb;
          break;
        default:
          activeButtonRef.current = null;
          break;
      }
      // [fwdb, playb, pauseb, rewb]
      //   .filter((r) => r !== null)
      //   .forEach((v) => {
      //     const isActive = v === activeButtonRef.current;
      //     if (isActive) {
      //       gsap.to(v.rotation, {
      //         y: 0.08,
      //         duration: 0.3,
      //         delay: 0.05,
      //         ease: "back.out(1.7)" // Built-in tactile mechanical click!
      //       });
      //     } else {
      //       gsap.to(v.rotation, {
      //         y: 0,
      //         duration: 0.25,
      //         ease: "expo.out"
      //       });
      //     }
      //   });
    }
    lastTrackstatus.current = state;
  }, [trackStatus]);

  const track = nowPlaying.track;
  const textRef1 = useRef<Object3D>(null),
    textRef2 = useRef<Object3D>(null);
  // Display override takes precedence: cinematic surfaces (e.g. the
  // Day-n-Night LiminalHandoff) can drop their own caption on the
  // emissive screen instead of HideawayFM's track string. Spaces are
  // preserved so static-mode text still reads cleanly without the
  // marquee padding.
  const overrideText = displayOverride?.text ?? null;
  const isStaticTicker = displayOverride?.tickerMode === "static";
  // Marquee mode pads the string so there's a visual gap before it
  // loops; static mode drops the pad so the full caption fits in the
  // display window without being clipped by the marquee spacing.
  const formatString = (raw: string, isStatic: boolean) =>
    isStatic ? raw : `   ${raw}   `;
  const [playingString, setPlayingString] = useState(() => {
    if (overrideText != null) return formatString(overrideText, isStaticTicker);
    return track
      ? `   ${track.artist} - ${track.title}   `
      : `   Hideaway FM   `;
  });
  useEffect(() => {
    if (overrideText != null) {
      setPlayingString(formatString(overrideText, isStaticTicker));
      return;
    }
    setPlayingString(
      track ? `   ${track.artist} - ${track.title}   ` : `   Hideaway FM   `
    );
  }, [track, overrideText, isStaticTicker]);

  // useMotionValueEvent(progress, "change", (v) => {
  //   scene.rotation.y = INIT_ROT_Y + v * ((2 * Math.PI) / 6);
  //   scene.position.y = INIT_POS_Y + v * 0.6;
  // });
  // ─── GSAP ScrollTrigger animations ───────────────────────────────────────
  const createScrollTrigger = useEffectEvent(() => {
    if (!scene || !lightRef.current) return;
    const light = lightRef.current;
    const metalMat = metalMatRef.current;
    const triggerSelector = document.getElementById(scrollTriggerId);
    if (!triggerSelector) return;
    // 1. Model rotation.y and position.y over scroll. Skipped while
    //    a modelRotation override is active — the cinematic surface
    //    owns the pose during caption phases, and the useFrame block
    //    below force-writes the override each tick.
    const modelST = scroll(
      (progress: number) => {
        if (modelRotationRef.current) return;
        scene.rotation.y = INIT_ROT_Y + progress * ((2 * Math.PI) / 6);
        scene.position.y = INIT_POS_Y + progress * 0.6;
      },
      {
        target: triggerSelector,

        offset: ["start 70%", "end 20%"]
      }
    );
    // start: "top center+=50%",
    // end: "bottom center-=50%",
    // trigger: triggerSelector,
    // scrub: true,
    // onUpdate: (self) => {
    //   scene.rotation.y = INIT_ROT_Y + self.progress * ((2 * Math.PI) / 6);
    //   scene.position.y = INIT_POS_Y + self.progress * 0.6;
    // }
    // });
    const lightST = scroll(
      (progress: number) => {
        lightRef.current.position.x = (1 - progress) * -2 + -5 * progress;
        lightRef.current.position.y = (1 - progress) * -1.3 + -5 * progress;
      },
      {
        target: triggerSelector,
        offset: ["start 70%", "end start"]
      }
    );
    // 2. PointLight position animation (x:-0.5, y:-0.5 — duplicate x key fixed)
    // const lightAnim = gsap.to(light.position, {
    //   x: -0.5,
    //   y: -0.5,
    //   ease: "none"
    // });
    // const lightST = ScrollTrigger.create({
    //   trigger: triggerSelector,
    //   start: "top bottom-=20%",
    //   end: "bottom top+=0%",
    //   scrub: true,
    //   animation: lightAnim
    // });
    //
    let metalST: VoidFunction | null = null;
    if (metalMat) {
      metalST = scroll(
        (progress: number) => {
          metalMat.envMapIntensity = 0.1 + progress * 2.9;
          metalMat.needsUpdate = true;
        },
        {
          target: triggerSelector,
          offset: ["start 70%", "end start"]
        }
      );
    }
    return () => {
      modelST();
      lightST();
      metalST?.();
    };
    // // 3. Metal material envMapIntensity 0.1 → 3
    // let metalST: ScrollTrigger | null = null;
    // let metalAnim: gsap.core.Tween | null = null;
    // if (metalMat) {
    //   metalAnim = gsap.to(metalMat, {
    //     envMapIntensity: 3,
    //     ease: "none",
    //     onUpdate: () => {
    //       metalMat.needsUpdate = true;
    //     }
    //   });
    //   metalST = ScrollTrigger.create({
    //     trigger: triggerSelector,
    //     start: "top bottom-=20%",
    //     end: "bottom top+=0%",
    //     scrub: true,
    //     animation: metalAnim
    //   });
    // }
    //
    // return () => {
    //   modelST.kill();
    //   lightST.kill();
    //   lightAnim.kill();
    //   metalST?.kill();
    //   metalAnim?.kill();
    // };
  });
  useEffect(() => {
    const onsc = createScrollTrigger();
    return () => onsc && onsc();
  }, [scrollTriggerId]);
  // When the camera override changes (e.g. a cinematic surface swaps in
  // a closer frame), trigger the existing reset-lerp so the transition
  // is smooth rather than a hard cut.
  useEffect(() => {
    isResetting.current = true;
  }, [overridePosKey, overrideTargetKey]);
  const db = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInteract = useCallback(() => {
    db.current && clearTimeout(db.current);
    interactingValue.set(true);
    db.current = setTimeout(() => {
      interactingValue.set(false);
    }, 250);
  }, [interactingValue]);
  const lastV = useRef(interactingValue.get());
  interactingValue.on("change", (v) => {
    if (lastV.current !== v) {
      lastV.current = v;
      if (!v) {
        db.current && clearTimeout(db.current);
        isResetting.current = true;
      }
    }
  });

  // ─── Lenis scroll velocity → disk rotation ────────────────────────────────
  // Mirrors: Mi.on('scroll', ({ velocity }) => { hg = -velocity * 0.005 })
  useLenis(({ velocity }) => {
    scrollVelocityRef.current = -velocity * 0.005;
  });
  const firstTime = useRef(0);
  const lastRotation = useRef(activeButtonRef.current?.rotation.z ?? 0);

  // ─── Animation loop ───────────────────────────────────────────────────────
  // Mirrors the requestAnimationFrame loop (dg) from the original.
  useFrame(({ camera }, delta) => {
    // Pause rendering when tab is hidden (mirrors Gl / document.hidden check)
    if (document.hidden) return;
    // Skip all per-frame work when this tape isn't on stage. The
    // canvas itself is still composed by R3F, but we avoid running
    // the disk-spin, camera-reset, marquee-scroll, and override
    // write blocks on every frame for a hidden view. Saves the main
    // thread real cycles while the user is scrolling through other
    // acts that don't need the cassette painted.
    if (!inView) return;
    if (diskRef.current) {
      const isPlaying = lastTrackstatus.current === "playing";

      // Exponential smoothing: qc += (hg - qc) * 0.1
      smoothedVelocityRef.current +=
        (scrollVelocityRef.current - smoothedVelocityRef.current) *
        (isPlaying ? 0.17 : 0.1);
      diskRef.current.rotation.y +=
        BASE_DISK_SPEED + smoothedVelocityRef.current;
    }
    if (isResetting.current) {
      camera.position.lerp(INITIAL_CAMERA_POS, delta * 5);
      controlsRef.current.target.lerp(INITIAL_TARGET_POS, delta * 5);
      controlsRef.current.update();

      const distToCam = camera.position.distanceTo(INITIAL_CAMERA_POS);
      const distToTarget =
        controlsRef.current.target.distanceTo(INITIAL_TARGET_POS);

      if (distToCam < 0.01 && distToTarget < 0.01) {
        // 4. Mutate the ref to stop the loop. Again, no re-render!
        isResetting.current = false;
      }
    }
    // Model rotation override: force the locked pose every tick so
    // any stray GSAP write (race with the ref check above) gets
    // immediately overwritten. Position.y left at INIT_POS_Y so the
    // tape sits at its natural baseline.
    const rotOverride = modelRotationRef.current;
    if (rotOverride && scene) {
      scene.rotation.set(rotOverride.x, rotOverride.y, rotOverride.z);
      scene.position.y = INIT_POS_Y;
    }
    // Static ticker mode (display override): freeze the marquee at x=0
    // so the caption sits centered. Skip the firstTime increment so
    // re-entering marquee mode doesn't jump-cut to a stale offset.
    if (isStaticTicker) {
      if (textRef1.current) textRef1.current.position.x = 0;
      if (textRef2.current) textRef2.current.position.x = -textWidth.current;
    } else {
      firstTime.current += (delta * 5) / 10;
      if (textRef1.current) {
        textRef1.current.position.x = firstTime.current % textWidth.current;
      }
      if (textRef2.current) {
        textRef2.current.position.x =
          (firstTime.current % textWidth.current) - textWidth.current;
      }
    }
    // Wire RenderTexture → real Display material's emissiveMap once both refs
    // are populated (traverse runs before RenderTexture mounts its ref).
    // Reveal the display only after both the texture is attached AND the
    // geometry aspect has been measured, so the marquee isn't visible while
    // its aspect is still being resolved.
    if (
      displayScreenMatRef.current &&
      displayEmissiveRef.current &&
      displayAspect !== null &&
      displayScreenMatRef.current.emissiveMap !== displayEmissiveRef.current
    ) {
      displayScreenMatRef.current.emissiveMap = displayEmissiveRef.current;
      displayScreenMatRef.current.emissiveIntensity =
        DISPLAY_EMISSIVE_INTENSITY;
      displayScreenMatRef.current.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Configures ACESFilmic tone mapping etc. on the shared renderer. */}
      <TapeRendererSetup />

      {/*
       * PerspectiveCamera — fov=10, position=(-8,-3,15).
       * makeDefault={inView} activates this camera only while the
       * container div is in the viewport; other Views use their own cameras.
       * OrbitControls defaults to target=(0,0,0), handling lookAt implicitly.
       */}
      <PerspectiveCamera
        makeDefault={inView}
        fov={overrideFov}
        position={INITIAL_CAMERA_POS}
        near={0.1}
        far={100}
      />
      <OrbitControls
        onChange={onInteract}
        enableDamping
        enabled={inView}
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
      />

      {/*
       * Tilt group — replaces lr.rotation.set(.1, 0, 0) from the original.
       * Cannot rotate the shared R3F scene, so we wrap content in a group.
       */}
      <group rotation={[0.1, 0, 0]} visible={inView}>
        {/*
         * HDR environment lighting.
         * background={false} keeps the env map for lighting only (no skybox).
         * scene.environment is set automatically; materials without an
         * explicit envMap will pick it up from there.
         */}
        <Environment files={HDR_URL} background={false} />

        {/*
         * PointLight — original: new J_(0xFF7829, 50, 3.5, 3.6)
         * GSAP ScrollTrigger animates position.x and position.y.
         */}
        <pointLight
          ref={lightRef}
          color={"#ff7829"}
          intensity={50}
          distance={3.5}
          decay={3.6}
          position={[-2, -1.3, 2]}
          castShadow
        />

        {/*
         * The GLTF model — materials are overridden in the traverse effect.
         * The nested <mesh> hosts the RenderTexture whose texture is assigned
         * onto the real Display material via displayEmissiveRef.
         */}
        <primitive object={scene} />

        {/*
         * Hidden helper mesh that hosts the RenderTexture. The texture is
         * captured via displayEmissiveRef and copied onto the real Display
         * material's emissiveMap in the useFrame wiring block above.
         * This mesh is not rendered (visible=false) and positioned far away.
         */}

        <mesh visible={false} position={[0, -1000, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial emissiveIntensity={300}>
            <RenderTexture
              ref={displayEmissiveRef}
              attach="emissiveMap"
              width={Math.round(
                RENDER_TEX_HEIGHT * DISPLAY_HALF_HEIGHT * 1 * FONT_SIZE_RATIO
              )}
              height={RENDER_TEX_HEIGHT}
              format={RGBAFormat}
              flipY={false}
              colorSpace={SRGBColorSpace}
              magFilter={LinearFilter}
              minFilter={LinearFilter}
            >
              <OrthographicCamera
                makeDefault
                position={[0, 0, 10]}
                left={-(DISPLAY_HALF_HEIGHT * (displayAspect ?? 8))}
                right={DISPLAY_HALF_HEIGHT * (displayAspect ?? 8)}
                top={DISPLAY_HALF_HEIGHT * (displayAspect ?? 8)}
                bottom={-DISPLAY_HALF_HEIGHT * (displayAspect ?? 8)}
                near={0.1}
                far={10}
              />
              <group rotation={[Math.PI, 0, 0]} position={[0, 0, 0]}>
                <Text
                  ref={textRef1}
                  onSync={(troik) => {
                    if (troik) {
                      const troika = troik as Object3D;
                      displayBounds.current.setFromObject(troika, false);
                      const size = displayBounds.current.getSize(
                        displayCenter.current
                      );
                      textWidth.current = size.x;
                    }
                  }}
                  font={"/assets/fonts/Workbench.ttf"}
                  color={"#c5dcdc"}
                  fontSize={displayFontSize}
                  fillOpacity={0.6}
                >
                  {playingString}
                </Text>
                <Text
                  position={[-textWidth.current, 0, 0]}
                  font={"/assets/fonts/Workbench.ttf"}
                  color={"#c5dcdc"}
                  ref={textRef2}
                  fontSize={displayFontSize}
                  fillOpacity={0.6}
                >
                  {playingString}
                </Text>
              </group>
            </RenderTexture>
          </meshStandardMaterial>
        </mesh>
      </group>
    </>
  );
}
interface DisplayScreenTextProps {
  text: string;
  isActive: boolean;
  isMarquee?: boolean;
  speed?: number;
}
export function DisplayScreenText({
  text,
  isActive,
  isMarquee = false,
  speed = 2.5
}: DisplayScreenTextProps) {
  const groupRef = useRef<Group>(null);
  const materialRef1 = useRef<MeshStandardMaterial>(null);
  const materialRef2 = useRef<MeshStandardMaterial>(null);

  // State to hold the measured width of a single text block
  const [textWidth, setTextWidth] = useState(text.length);

  // We pad the text heavily so there's a natural visual gap before it repeats
  const paddedText = text + "      *** ";

  useFrame((_, delta) => {
    // 1. Handle Smooth Opacity for both text meshes
    // const targetOpacity = isActive ? 1 : 0;
    const targetOpacity = 1;
    if (materialRef1.current) {
      materialRef1.current.opacity = MathUtils.damp(
        materialRef1.current.opacity,
        targetOpacity,
        8,
        delta
      );
    }
    if (materialRef2.current) {
      materialRef2.current.opacity = MathUtils.damp(
        materialRef2.current.opacity,
        targetOpacity,
        8,
        delta
      );
    }

    // 2. The Seamless Marquee Logic
    if (isMarquee && groupRef.current && textWidth > 0) {
      if (isActive) {
        groupRef.current.position.x -= speed * delta;

        // Once the group shifts left by exactly the width of ONE text block,
        // we snap it back by that exact same amount.
        if (groupRef.current.position.x <= -textWidth) {
          // We use += instead of = 0 to preserve any fractional leftover movement,
          // which prevents micro-stutters during the snap!
          groupRef.current.position.x += textWidth;
        }
      } else {
        groupRef.current.position.x = 0;
      }
    }
  });

  return (
    // We anchor the whole group at 0.
    // If it's a marquee, we push the text slightly to the right to start.
    <group ref={groupRef} position={[isMarquee ? 0 : 0, 0, 0]}>
      {/* Primary Text */}
      <Text
        font={"/assets/fonts/BitcountGrid.ttf"}
        fontSize={2}
        anchorX={isMarquee ? "left" : "center"}
        anchorY="middle"
        // onSync={(troikaText) => {
        //   if (!isMarquee) return;
        //   troikaText.geometry.computeBoundingBox();
        //   const box = troikaText.geometry.boundingBox;
        //   if (box) {
        //     const width = box.max.x - box.min.x;
        //     // Only update state if the width changes to prevent React render loops
        //     if (Math.abs(textWidth - width) > 0.01) {
        //       setTextWidth(width);
        //     }
        //   }
        // }}
      >
        {isMarquee ? paddedText : text}
        <meshStandardMaterial
          ref={materialRef1}
          color="#96f7ff"
          transparent
          opacity={0}
        />
      </Text>

      {/* Duplicate Text — Only renders if it's a marquee and we know where to place it */}
      <Text
        position={[textWidth, 0, 0]} // Placed exactly at the tail end of the first string!
        font={"/assets/fonts/BitcountGrid.ttf"}
        visible={isMarquee && textWidth > 0}
        fontSize={2}
        anchorX="left"
        anchorY="middle"
      >
        {paddedText}
        <meshStandardMaterial
          ref={materialRef2}
          color="#96f7ff"
          transparent
          opacity={0}
        />
      </Text>
    </group>
  );
}
