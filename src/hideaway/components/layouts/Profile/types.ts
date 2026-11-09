import type {
  SerializedBlockNode,
  SerializedHeadingNode,
  SerializedListItemNode,
  SerializedListNode,
  SerializedParagraphNode,
  SerializedQuoteNode,
  SerializedTextNode
} from "@payloadcms/richtext-lexical";
import type { SerializedRootNode } from "@payloadcms/richtext-lexical/lexical";
import type { RequiredAndNonNullable } from "@/hideaway/utilities/typeUtilities";
import type { Profile } from "@/payload-types";
import {
  Color,
  IUniform,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import type { ComponentPropsWithRef } from "react";
import { gsap } from "gsap";
import { RP_AccessMemories } from "@/hideaway/components/layouts/Profile/providers/CachedReader";
import Lenis from "lenis";
import { z } from "zod/v4";

export type ProfileInfo = {
  userId: string;
  name: string;
  bio: string;
  places: string[];
  image: string;
};
export type ProfileNodes =
  | SerializedTextNode
  | SerializedListNode
  | SerializedHeadingNode
  | SerializedBlockNode
  | SerializedQuoteNode
  | SerializedListItemNode
  | SerializedParagraphNode;

export type SliderProps = {
  url: null | string;
  mimeType: null | string;
  title: string;
  content: SerializedRootNode | null | undefined;
};
// {
//   title: string;
//   content: SerializedRootNode<ProfileNodes>;
// };
export type ProfileSlideProps = {
  slides: SliderProps[];
  hero: RequiredAndNonNullable<Profile["hero"]>;
  textures: { url: string; mimeType: string }[];
} & ProfileInfo;

export interface SlideUniforms {
  opacity: number;
  resolution: { x: number; y: number };
  i_resolution: { x: number; y: number };
  borderRadius: number;
  fadeDensity: number;
  fadePower: number;
  borderWidth: number;
  borderColor: Color;
  slidePower1: number;
  slidePower2: number;
  slidePower3: number;
  slidePower4: number;
  tSlide1: null | Texture;
  tSlide2: null | Texture;
  tSlide3: null | Texture;
  tSlide4: null | Texture;
}

export type StickySliderMaterial = ShaderMaterial & {
  uniforms: SlideUniforms;
};
export type StickySliderMesh = Mesh & {
  material: StickySliderMaterial;
};
export type StickySectionProps = Omit<
  ComponentPropsWithRef<"div">,
  "content"
> & {
  index: number;
  title: string;
  content: SliderProps["content"];
};
/***     { <mesh ref={meshRef} material={material} visible={true}>
                <planeGeometry args={[1, 1, 1, 1]} />
              </mesh>
 *
 */
export type MemberAboutLeftSlideProps = {
  places?: string[];
  name: string;
  bio: string;
};
export type BGGradientFrontMaterial = ShaderMaterial & {
  uniforms: {
    opacity: {
      value: number;
    };
    borderRadius: {
      value: number;
    };
    resolution: {
      value: {
        x: number;
        y: number;
      };
    };
    time: {
      value: number;
    };
    move: {
      value: {
        x: number;
        y: number;
      };
    };
    mouse: {
      value: {
        x: number;
        y: number;
      };
    };
    noisePower: {
      value: number;
    };
    noiseSpeed: {
      value: number;
    };
    noiseDensity: {
      value: number;
    };
    pivot: {
      value: {
        x: number;
        y: number;
      };
    };
    radius: {
      value: {
        x: number;
        y: number;
      };
    };
    color1: {
      value: Color;
    };
    color2: {
      value: Color;
    };
    color3: {
      value: Color;
    };
    color4: {
      value: Color;
    };
    gradient1st: {
      value: number;
    };
    gradient2nd: {
      value: number;
    };
    gradient3rd: {
      value: number;
    };
  };
};
export type BGGradient = {
  visible: boolean;
  speed: number;
  top: number;
  left: number;
  width: number;
  height: number;
  translate: {
    x: number;
    y: number;
  };
  mesh: Mesh & {
    material: BGGradientFrontMaterial;
  };
  material: BGGradientFrontMaterial;
  geometry: PlaneGeometry;
  global: Scene;
  props: {
    speed: number;
    borderRadius: number;
    top: number;
    left: number;
    radius: {
      x: number;
      y: number;
    };
    move: {
      x: number;
      y: number;
    };
    noisePower: number;
    noiseSpeed: number;
    noiseDensity: number;
    pivot: {
      x: number;
      y: number;
    };
    color1: Color;
    color2: Color;
    color3: Color;
    color4: Color;
    gradient1st: {
      power: number;
    };
    gradient2nd: {
      power: number;
    };
    gradient3rd: {
      power: number;
    };

    width: number;
    height: number;
    translate: {
      x: number;
      y: number;
    };
  };
  onInit: (props: BGGradient["props"]) => void;
  onResize: () => void;
  onScroll: (element: number, trigger: number) => void;
  onRender: () => void;
  onDestroy: () => void;
};
type MarqueeMat = ShaderMaterial & {
  uniforms: {
    cFg: {
      value: Color;
    };
    resolution: {
      value: Vector2;
    };
    i_resolution: {
      value: Vector2;
    };
    i_repeat: {
      value: {
        x: number;
        y: number;
      };
    };
    borderRadius: {
      value: number;
    };
    tDiffuse: {
      value: Texture;
    };
    opacity: {
      value: number;
    };
    time: {
      value: number;
    };
    cBlack: {
      value: Color;
    };
    cBg: {
      value: Color;
    };
    planeAspect: {
      value: number;
    };
    textureAspect: {
      value: number;
    };
  };
};
export type MarqueeState = {
  ready: boolean;
  translate: Vector2;
  global: Scene;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: Texture;
  color: Color;
  text: {
    content: string;
    width: number;
    height: number;
  };
  speed: number;
  scale: number;
  width: number;
  height: number;
  top: number;
  left: number;
  mesh: Mesh & {
    geometry: PlaneGeometry;
    material: MarqueeMat;
  };
  time: number;
  props: {
    borderRadius: number;
  };
  visible: boolean;
  geometry: PlaneGeometry;
  material: MarqueeMat;
};
export type MarqueeShader = MarqueeState & {
  _once: (props: { scene: Scene }) => void;
  onInitMesh: () => void;
  onResize: () => void;
  onScroll: (element: number, trigger: number) => void;
  onRender: () => void;
  onDestroy: () => void;
  onLoadTexture: () => void;
  onUpdateTexture: (element: Texture, trigger: number, start: number) => void;
  renderText: () => void;
};
export type WebGLShader = ShaderMaterial & {
  uniforms: {
    resolution: {
      value: {
        x: number;
        y: number;
      };
    };
    i_resolution: {
      value: {
        x: number;
        y: number;
      };
    };
    cBlack: {
      value: Color;
    };
    cBg: {
      value: Color;
    };
    time: {
      value: number;
    };
    tMouse: {
      value: Texture;
    };
    tFront: {
      value: Texture;
    };
    tBack: {
      value: Texture;
    };
    wakuNaiVisible: {
      value: number;
    };
    wakuSenOpacity: {
      value: number;
    };
  };
};
export type UsagiMouseTrail = {
  maxAge: number;
  ratio: number;
  ease: gsap.EaseFunction | gsap.EaseString;
  trails: {
    x: number;
    y: number;
    intensity?: number;
    age: number;
    force: number;
  }[];
  intensity: number;
  ageRatio: number;
  age: number;
  size: number;
  once: (element?: {
    ratio?: number;
    size?: number;
    ease?: gsap.EaseFunction | gsap.EaseString;
    maxAge?: number;
    ageRatio?: number;
  }) => void;
  raf: (a: number, b: number) => void;
  addTouch: (el: { x: number; y: number }) => void;
  drawTouch: (el: {
    x: number;
    y: number;
    intensity?: number;
    age: number;
    force: number;
  }) => void;
  onMouseMove: (el: { x: number; y: number }) => void;
};
/*!
 * Usagi Mouse 1.0.2
 * @license Copyright, Kenta Toshikura
 * Last update : 2023/12/12
 * Require : gsap
 */
export type UsagiMouse = {
  isActive: boolean;
  isFirst: boolean;
  isMobile: boolean;
  precision: number;
  move: {
    active: number;
    duration: number;
    ease: gsap.EaseString | gsap.EaseFunction | undefined;
  };
  array: any[];
  easeRatio: {
    delta: number;
    acceleration: number;
  };
  useRAF: boolean;
  x: number;
  y: number;
  currentEvent: any;
  lastTime: number;
  currentTime: number;
  deltaTime: number;
  touch: any;
  isArray: boolean;
  ease:
    | Array<number | gsap.EaseString>
    | number
    | gsap.EaseString
    | gsap.EaseFunction;
  acceleration: {
    interval?: ReturnType<typeof setInterval> | undefined;

    prevEvent: any;
    delta: {
      x: number;
      y: number;
      distance: number;
    };
    x: number;
    y: number;
    distance: number;
  };
  delta: {
    x: number;
    y: number;
    distance?: number;
  };
  center: {
    x: number;
    y: number;
  };
  shader: {
    x: number;
    y: number;
  };

  prop: {
    easeRatio?: {
      delta: number;
      acceleration: number;
    };
    ease?: string | (string | number)[] | undefined;
    isMobile?: false | true | undefined;
    move?:
      | { active?: number | undefined; duration?: number | undefined }
      | undefined;
    onMouseMoveAfter?: { (props: any): void } | undefined;
    onMouseMoveBefore?: { (props: any): void } | undefined;
    onStickyScrollBefore?: { (props: any): void } | undefined;
    onUpdateAfter?: { (props: any): void } | undefined;
    onUpdateBefore?: { (props: any): void } | undefined;
    precision?: number | undefined;
    useRAF?: false | true | undefined;
  };
  onRAF: ReturnType<typeof requestAnimationFrame> | null;
  destroy: () => void;
  onMouseMoveBefore?: (props?: any) => void;
  onMouseMove: (l: any) => void;
  onUpdateBefore?: (props?: any) => void;
  onUpdateAfter?: (props?: any) => void;
  onMouseMoveAfter?: (props?: any) => void;
  onUpdateForMobile: () => void;
  onUpdateForDesktop: () => void;
  onUpdateDelta: (props: any) => void;
  once: () => void;
  onInitAfter?: () => void;
  onRunRabbit: () => void;
  onInitArray: () => void;
  onInitSingle: () => void;
  addEvents: () => void;
  removeEvents: () => void;
  raf: () => void;
  onInitGetAcceleration: (element: UsagiMouse["acceleration"]) => void;
  onTouchStart: (l: any) => void;
  onTouchMove: (l: any) => void;
  onTouchEnd: (l: any) => void;
};
export type MouseUniform = {
  resolution: {
    value: {
      x: number;
      y: number;
    };
  };
  cBlack: {
    value: Color;
  };
  time: {
    value: number;
  };
  edgePower: {
    value: number;
  };
  noiseSpeed: {
    value: number;
  };
  noiseDensity: {
    value: number;
  };
  waveSpeed: {
    value: number;
  };
  waveDisp: {
    value: {
      x: number;
      y: number;
    };
  };
  wavePower: {
    value: number;
  };
  yuenyePower: {
    value: number;
  };
  yuenyeEdge: {
    value: number;
  };
  yuenyeRatio: {
    value: number;
  };
  mouse: {
    value: {
      x: number;
      y: number;
    };
  };
  mouseTrailsAge: {
    value: number[];
  };
  mouseTrailsAgeRatio: {
    value: number;
  };
  mouseTrailsArray: {
    value: {
      x: number;
      y: number;
    }[];
  };
  mouseTrailsCount: {
    value: number;
  };
  mouseTrailsIntensity: {
    value: number[];
  };

  mouseTrailsMaxAge: {
    value: number;
  };
  mouseTrailsSize: {
    value: number;
  };
};
export type WebglMouse = {
  once: () => void;
  visible: boolean;
  ready: boolean;
  params: {
    edgePower: number;
    noiseDensity: number;
    noiseSpeed: number;
    wavePower: number;
    waveSpeed: number;
    waveDisp: {
      x: number;
      y: number;
    };
    mouse: {
      size: number;
      age: number;
    };
    trail: {
      power: number;
    };
    yuenye: {
      power: number;
      edge: number;
      ratio: number;
    };
  };
  geometry: PlaneGeometry;
  material: ShaderMaterial & {
    uniforms: MouseUniform;
  };
  mesh: Mesh & {
    material: WebglMouse["material"];
  };
  fbo: WebGLRenderTarget;
  scene: Scene;
  onInit: () => void;
  onResize: () => void;
  onRender: () => void;
  onInitMesh: () => void;
};
const VideoTextureSchema = z.instanceof(VideoTexture);
const TextureSchema = z.instanceof(Texture);
export type SlidePageTextureMap = Record<
  `tSlide${1 | 2 | 3 | 4}`,
  SlidePageProps
>;

export interface SliderMaterialUniforms extends Record<string, IUniform> {
  opacity: { value: number };
  resolution: { value: Vector2 };
  i_resolution: { value: Vector2 };
  borderRadius: { value: number };
  fadeDensity: { value: number };
  fadePower: { value: number };
  borderWidth: { value: number };
  borderColor: { value: Color };
  slidePower1: { value: number };
  slidePower2: { value: number };
  slidePower3: { value: number };
  slidePower4: { value: number };
  tSlide1: { value: Texture };
  tSlide2: { value: Texture };
  tSlide3: { value: Texture };
  tSlide4: { value: Texture };
}

const _SlidePagePropsSchema = z.union([
  z.object({
    video: z.object({
      src: z.string()
    }),
    image: z.undefined(),
    tex: VideoTextureSchema,
    el: z.instanceof(HTMLVideoElement)
  }),
  z.object({
    image: z.object({
      src: z.string()
    }),
    video: z.undefined(),
    tex: TextureSchema
  })
]);
// type SlidePageProps =
//   | {
//       video: {
//         src: string;
//       };
//       image: undefined;
//       tex: VideoTexture;
//       el: HTMLVideoElement;
//     }
//   | {
//       image: {
//         src: string;
//       };
//       video: undefined;
//       tex: Texture;
//     };
type SlidePageProps = z.infer<typeof _SlidePagePropsSchema>;
export type Colors = "black" | "white" | "gray" | "gradient1" | "gradient2";
export type InkTitleUniforms = {
  uniforms: {
    inkbleed: {
      value: number;
    };
    opacity: {
      value: number;
    };
    cBlack: {
      value: Color;
    };
    tNormal: {
      value: Texture | null;
    };
    tShadow: {
      value: Texture | null;
    };
    edgeSharp: {
      value: number;
    };
  };
};
export type FV_InkTitle = {
  global: Scene;
  visible: boolean;
  width: number;
  height: number;
  top: number;
  left: number;
  mesh: Mesh & {
    material: ShaderMaterial & InkTitleUniforms;
  };
  translate: { x: number; y: number };
  scale: { x: number; y: number; f1: number };
  onInitMesh: () => void;
  onResize: () => void;
  onUpdateTexture: (element: Texture | null, trigger: Texture | null) => void;
  onScroll: (element: number, trigger: number) => void;
  onStickyScroll: (element: number, trigger: number, start: number) => void;
  onRender: () => void;
  onDestroy: () => void;
  onInit: (scene: Scene) => void;
};
export type SliderProoops = {
  user: string;
  cache: RP_AccessMemories;
  textures: SlidePageTextureMap;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  imagePane: HTMLDivElement;
  colors: Record<Colors, Color>;
  bg: Color;
  fg: Color;
  lenis: Lenis;
  fvMain: HTMLDivElement;
};
export type WebGLObject = {
  final: Mesh<PlaneGeometry, WebGLShader>;
  o_camera: OrthographicCamera;
  p_camera: PerspectiveCamera;
  far: number;
  fov: number;
  ready: boolean;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  aspect: number;
  padding: {
    x: number;
    y: number;
  };

  params: {
    edgePower: number;
    noiseSpeed: number;
    noiseDensity: number;
    waveSpeed: number;
    waveDisp: {
      x: number;
      y: number;
    };
    wavePower: number;
    mouse: {
      size: number;
      age: number;
    };
    trail: {
      power: number;
    };
  };
};
export type GLScreen = {
  alpha: {
    fbo: WebGLRenderTarget;
    scene: Scene;
  };
  front: {
    fbo: WebGLRenderTarget;
    scene: Scene;
  };
  back: {
    fbo: WebGLRenderTarget;
    scene: Scene;
  };
  bgFront: Mesh;
  bgBack: Mesh;
};
export type SliderGL = {
  ready: boolean;
  visible: boolean;
  global: Scene;
  borderRadius: number;
  params: {
    fadeDensity: number;
    fadePower: number;
    borderWidth: number;
  };
  translate: { x: number; y: number };
  textures: SlidePageTextureMap;

  width: number;
  height: number;
  top: number;
  left: number;
  mesh: Mesh & {
    material: ShaderMaterial & { uniforms: SliderMaterialUniforms };
  };
  material: ShaderMaterial;
  geometry: PlaneGeometry;
};
