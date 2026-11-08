// noinspection CommaExpressionJS

"use client";
import { useCache } from "@/hideaway/components/layouts/Profile/providers/CachedReader";
import type {
  BGGradient,
  BGGradientFrontMaterial,
  Colors,
  GLScreen,
  MarqueeShader,
  MouseUniform,
  SlidePageTextureMap,
  SliderGL,
  SliderMaterialUniforms,
  SliderProoops,
  UsagiMouseTrail,
  WebglMouse,
  WebGLObject,
  WebGLShader as WebGlShaderType
} from "@/hideaway/components/layouts/Profile/types";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { useTheme } from "@/hideaway/providers/Theme";
import { clamp } from "@/hideaway/utilities/mathUtilities";
import { useGSAP } from "@gsap/react";
import { GeistMono } from "geist/font/mono";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useLenis } from "lenis/react";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import Tempus from "tempus";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  LinearFilter,
  MathUtils,
  Mesh,
  OrthographicCamera as THREEOrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBFormat,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import backgroundFragShader from "./shaders/backgroundFrag.glsl";
import baseFragShader from "./shaders/baseFrag.glsl";
import baseVertexShader from "./shaders/baseVertex.glsl";
import bgGradientFragShader from "./shaders/bgGradientFrag.glsl";
import marqueeFragmentShader from "./shaders/marqueeFrag.glsl";
import stickyFrag from "./shaders/stickyFrag.glsl";
import trailsFrag from "./shaders/trailsFrag.glsl";

export const Slider = (props: {
  gradient1: string;
  gradient2: string;
  textures: SlidePageTextureMap;
  userId: string;
}) => {
  const { textures, gradient1, gradient2, userId } = props;
  gsap.registerPlugin(ScrollTrigger);
  const lenis = useLenis();
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null!);
  const texturesRef = useRef(textures);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const isReady = useRef(false);
  const { isMobile } = useIsMobile();
  const imagePaneRef = useRef<HTMLDivElement>(null!);
  const fvMainRef = useRef<HTMLDivElement>(null!);
  const targets: [RefObject<HTMLDivElement>, string][] = useMemo(
    () => [
      [containerRef, "profil"],
      [imagePaneRef, "frame"],
      [fvMainRef, "gradience"]
    ],
    []
  );
  const cache = useCache((store) => store);
  const user = useRef(userId);
  const areTargetsDefined = useCallback(
    (targets: [RefObject<HTMLDivElement>, string][]) =>
      targets.reduce((prev, next) => {
        return prev && Boolean(next[0].current);
      }, true),
    []
  );
  type TargetShit = [RefObject<HTMLDivElement>, string][];
  type RestShit = RefObject<Element | SlidePageTextureMap | string>[];
  const areRestDefined = useCallback(
    (rest: RestShit) =>
      rest.reduce((prev, next) => prev && Boolean(next.current), true),
    []
  );
  const totalCheck = useCallback(
    (targets: TargetShit, rest: RestShit) =>
      areTargetsDefined(targets) && areRestDefined(rest),
    [areRestDefined, areTargetsDefined]
  );
  const reqAF = useRef<ReturnType<typeof Tempus.add> | null>(null);
  useEffect(() => {
    const rest = [canvasRef, texturesRef, user];
    // Helper: defer Tempus remover past the current dispatch cycle to avoid
    // a Tempus bug where self-removal during dispatch makes this.callbacks[i]
    // undefined, crashing with "Cannot read properties of undefined (reading 'samples')".
    const deferRemove = () => {
      if (reqAF.current) {
        const rem = reqAF.current;
        reqAF.current = null;
        queueMicrotask(rem);
      }
    };
    const rwe = () => {
      if (isReady.current || sliderRef.current || totalCheck(targets, rest)) {
        deferRemove();
      }
      targets.forEach(([ref, target]) => {
        if (!ref.current) {
          const tt = document.getElementById(target) as HTMLDivElement;
          if (tt) {
            ref.current = tt;
          }
        }
      });
      const allGood = totalCheck(targets, rest);
      if (allGood) {
        setReady(true);
        deferRemove();
      } else {
        setReady(false);
      }
    };
    reqAF.current = Tempus.add(rwe, { priority: 20, fps: 10 });
  }, [targets, totalCheck]);

  const sliderRef = useRef<ReturnType<typeof sliderInternal>>(null);
  const theme = useTheme((r) => r.theme);
  const modes: Record<
    Exclude<Colors, "gradient1" | "gradient2">,
    Color
  > = useMemo(
    () => ({
      black: new Color("#050302"),
      white: new Color("#f9f5f2"),
      gray: new Color("#cbcaca")
    }),
    []
  );
  const gradients: Record<
    Extract<Colors, "gradient1" | "gradient2">,
    Color
  > = useMemo(
    () => ({
      gradient1: new Color(gradient1),
      gradient2: new Color(gradient2)
    }),
    [gradient1, gradient2]
  );
  const colors = useRef({
    bg: theme === "dark" ? modes.black : modes.white,
    fg: theme === "dark" ? modes.white : modes.black
  });
  useGSAP(
    () => {
      gsap.killTweensOf([colors.current.bg, colors.current.fg]);
      const toBg = theme === "dark" ? modes.black : modes.white;
      const toFg = theme === "dark" ? modes.white : modes.black;

      gsap.to(colors.current.bg, {
        r: toBg.r,
        g: toBg.g,
        b: toBg.b,

        duration: 1,
        ease: "power2.inOut"
      });
      gsap.to(colors.current.fg, {
        r: toFg.r,
        g: toFg.g,
        b: toFg.b,
        duration: 1,
        onUpdate: () => {
          if (sliderRef.current) {
            sliderRef.current.onThemeChange();
          }
        },
        ease: "power2.inOut"
      });
    },
    {
      dependencies: [theme]
    }
  );
  useEffect(() => {
    if (ready && lenis && !sliderRef.current && !isReady.current) {
      sliderRef.current = sliderInternal({
        user: user.current,
        colors: { ...modes, ...gradients },
        bg: colors.current.bg,
        fg: colors.current.fg,
        container: containerRef.current,
        lenis,
        textures: texturesRef.current,
        canvas: canvasRef.current,
        imagePane: imagePaneRef.current,
        fvMain: fvMainRef.current,
        cache
      });
      isReady.current = true;
    }
  }, [cache, gradients, modes, ready, lenis]);

  return (
    <div className={"fixed inset-0 z-[0] h-screen w-screen"}>
      <canvas
        className={
          "pointer-events-none fixed inset-0 z-[-1] block h-svh w-screen bg-transparent"
        }
        ref={canvasRef}
      />
    </div>
  );
};

function sliderInternal({
  container,
  textures,
  lenis,
  canvas,
  imagePane,
  fvMain,
  colors,
  bg,
  fg,
  user,
  cache: disposer
}: SliderProoops) {
  const vMouse = new Vector2(0, 0);
  const vMouseDamp = new Vector2(0, 0);

  const RESCALE = 0.1;
  let WW = window.innerWidth;
  let WH = window.innerHeight;
  const VW = 1080;
  const VH = 1920;
  const WR = (VH / VW) * (WW / WH);
  const updateSize = () => {
    WW = window.innerWidth;
    WH = window.innerHeight;
    onResizeWebGL();
  };

  let RES = Math.min(window.devicePixelRatio, 2);
  WW >= 1980
    ? (RES = Math.min(window.devicePixelRatio, 1.5))
    : WW >= 1680
      ? (RES = Math.min(window.devicePixelRatio, 1.75))
      : (RES = Math.max(RES, 1.3));

  const getPxThree = (e: number, t = WEBGL.width) =>
    (e / window.innerWidth) * t;
  const getPxScaleThree = (e: number, t: number) => {
    const n = t / WEBGL.width,
      r = window.innerWidth * n;
    return e / r;
  };
  const WEBGL: WebGLObject = {
    final: null!,
    o_camera: null!,
    p_camera: null!,
    far: 0,
    fov: 15,
    ready: !1,
    width: 0,
    height: 0,
    canvas: null!,
    renderer: null!,
    scene: null!,
    aspect: 0,
    padding: {
      x: 0,
      y: 0
    },

    params: {
      edgePower: 20,
      noiseSpeed: 0.5,
      noiseDensity: 5,
      waveSpeed: 0.5,
      waveDisp: {
        x: 5,
        y: 5
      },
      wavePower: 0.1,
      mouse: {
        size: 0.9,
        age: 0.2
      },
      trail: {
        power: 0.5
      }
    }
  };

  const WEBGL_SCREEN: GLScreen = {
    alpha: {
      fbo: null!,
      scene: null!
    },
    front: {
      fbo: null!,
      scene: null!
    },
    back: {
      fbo: null!,
      scene: null!
    },
    bgFront: null!,
    bgBack: null!
  };
  const Slider: SliderGL = {
    ready: false,
    visible: !1,
    global: null!,
    borderRadius: 10,
    material: null!,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    translate: {
      x: 0,
      y: 0
    },
    textures: null!,
    mesh: null!,
    geometry: null!,

    params: { fadeDensity: 3.5, fadePower: 5, borderWidth: 0.05 }
  };

  const _onceWebGL = (canvas: HTMLCanvasElement) => {
    ((WEBGL.width = WW * RESCALE),
      (WEBGL.height = WH * RESCALE),
      (WEBGL.canvas = canvas),
      ((WEBGL.renderer = new WebGLRenderer({
        canvas: WEBGL.canvas,
        alpha: true,
        antialias: !1,
        premultipliedAlpha: false
      })),
      disposer.setRenderer("webglRender", new WeakRef(WEBGL.renderer))),
      WEBGL.renderer.setPixelRatio(RES),
      (WEBGL.renderer.shadowMap.enabled = !1),
      ((WEBGL.scene = new Scene()),
      disposer.setScene("webglScene", new WeakRef(WEBGL.scene)),
      (WEBGL.aspect = WEBGL.width / WEBGL.height),
      (WEBGL.o_camera = new THREEOrthographicCamera(
        (-WEBGL.height * WEBGL.aspect) / 2,
        (WEBGL.height * WEBGL.aspect) / 2,
        WEBGL.height / 2,
        -WEBGL.height / 2,
        -WEBGL.height / 2,
        WEBGL.height / 2
      )),
      (WEBGL.o_camera.position.z = 1),
      _onInitWebGL(),
      (WEBGL.padding = {
        x: 0,
        y: 0
      }),
      (WEBGL.ready = !0)));
  };
  const _onInitWebGL = () => {
    const i = new PlaneGeometry(1, 1, 1, 1);
    const element = new ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: baseFragShader,
      uniforms: {
        resolution: {
          value: {
            x: 0,
            y: 0
          }
        },
        i_resolution: {
          value: {
            x: 0,
            y: 0
          }
        },
        cBlack: {
          value: colors.black
        },
        cBg: {
          value: bg
        },
        time: {
          value: 0
        },
        tMouse: {
          value: null!
        },
        tFront: {
          value: null!
        },
        tBack: {
          value: null!
        },
        wakuNaiVisible: {
          value: 1
        },
        wakuSenOpacity: {
          value: 1
        }
      },
      transparent: !0
    }) as WebGlShaderType;
    ((element.alphaTest = 0.5),
      (WEBGL.final = new Mesh(i, element)),
      WEBGL.scene.add(WEBGL.final));
    disposer.setMaterial("webglMat", new WeakRef(element));
    disposer.setGeometry("webglGeo", new WeakRef(i));
    disposer.setMesh("webglMesh", new WeakRef(WEBGL.final));
  };
  const onResizeWebGL = () => {
    ((WEBGL.width = WW * RESCALE),
      (WEBGL.height = WH * RESCALE),
      (WEBGL.aspect = WEBGL.width / WEBGL.height),
      (WEBGL.padding.x = getPxThree(20)),
      (WEBGL.padding.y = getPxThree(15)),
      WEBGL.final &&
        ((WEBGL.final.scale.x = WEBGL.width),
        (WEBGL.final.scale.y = WEBGL.height),
        (WEBGL.final.material.uniforms.resolution!.value.x =
          WEBGL.final.scale.x),
        (WEBGL.final.material.uniforms.resolution!.value.y =
          WEBGL.final.scale.y),
        (WEBGL.final.material.uniforms.i_resolution!.value.x = 1800),
        (WEBGL.final.material.uniforms.i_resolution!.value.y = 1063)),
      WEBGL.renderer.setSize(WW, WH),
      WEBGL.p_camera &&
        ((WEBGL.far =
          -(WEBGL.height / 2) / Math.tan((WEBGL.fov * Math.PI) / 180 / 2)),
        (WEBGL.p_camera.aspect = WEBGL.width / WEBGL.height),
        (WEBGL.p_camera.position.z = -WEBGL.far),
        WEBGL.p_camera.updateProjectionMatrix()),
      WEBGL.o_camera &&
        ((WEBGL.o_camera.left = -WEBGL.width / 2),
        (WEBGL.o_camera.right = WEBGL.width / 2),
        (WEBGL.o_camera.top = WEBGL.height / 2),
        (WEBGL.o_camera.bottom = -WEBGL.height / 2),
        (WEBGL.o_camera.near = -WEBGL.height / 2),
        (WEBGL.o_camera.far = WEBGL.height / 2),
        WEBGL.o_camera.updateProjectionMatrix()),
      onResizeScreenWebGL(),
      AboutMember.onResize(),
      WEBGL_MOUSE.onResize());
  };
  const _onUpdateWebGL = () => {
    WEBGL.final.material && (WEBGL.final.material.uniforms.time!.value += 0.01);
    /***
     (WEBGL.final.material.uniforms.wakuNaiVisible.value =
     PAGE_TRANSITION.page.single.ptFade +
     PAGE_TRANSITION.page.works.ptFade +
     PAGE_TRANSITION.page.info.ptFade),
     (WEBGL.final.material.uniforms.wakuSenOpacity.value =
     PAGE_TRANSITION.page["error-500"].ptFadeMouse +
     PAGE_TRANSITION.page["error-404"].ptFadeMouse +
     PAGE_TRANSITION.page.info.ptFadeMouse +
     PAGE_TRANSITION.page.works.ptFadeMouse +
     PAGE_TRANSITION.page.home.ptFadeMouse),
     */
  };
  const onRenderWebGL = () => {
    (_onUpdateWebGL(), _onRenderScreenWebGL());
    AboutMember.onRender();

    WEBGL_MOUSE.onRender();

    WEBGL.renderer.setRenderTarget(null);
    WEBGL.renderer.render(WEBGL.scene, WEBGL.o_camera);
  };

  const onceScreenWebGL = () => {
    ((WEBGL_SCREEN.front.scene = new Scene()),
      (WEBGL_SCREEN.front.fbo = new WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
          minFilter: LinearFilter,
          magFilter: LinearFilter,
          format: RGBFormat
        }
      )),
      (WEBGL_SCREEN.back.scene = new Scene()),
      (WEBGL_SCREEN.back.fbo = new WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
          minFilter: LinearFilter,
          magFilter: LinearFilter,
          format: RGBFormat
        }
      )),
      (WEBGL.final.material.uniforms!.tFront!.value =
        WEBGL_SCREEN.front.fbo.texture!),
      (WEBGL.final.material.uniforms!.tBack!.value =
        WEBGL_SCREEN.back.fbo.texture!),
      onInitBackgroundScreenWebGL(),
      onResizeScreenWebGL());
    disposer.setScene("frontFBOSCene", new WeakRef(WEBGL_SCREEN.front.scene));
    disposer.setScene("backFBOSCene", new WeakRef(WEBGL_SCREEN.back.scene));
    disposer.setRenderTarget("frontFBO", new WeakRef(WEBGL_SCREEN.front.fbo));
    disposer.setRenderTarget("backFBO", new WeakRef(WEBGL_SCREEN.back.fbo));
  };
  const onInitBackgroundScreenWebGL = () => {
    let i, element;

    ((i = new PlaneGeometry(1, 1, 1, 1)),
      (element = new ShaderMaterial({
        vertexShader: baseVertexShader,
        fragmentShader: backgroundFragShader,
        uniforms: {
          opacity: {
            value: 0.0
          },
          cBg: {
            value: bg
          }
        }
      })),
      ((WEBGL_SCREEN.bgFront = new Mesh(i, element)),
      WEBGL_SCREEN.front.scene.add(WEBGL_SCREEN.bgFront)),
      (element = new ShaderMaterial({
        vertexShader: baseVertexShader,
        fragmentShader: backgroundFragShader,
        uniforms: {
          opacity: {
            value: 0
          },
          cBg: {
            value: bg
          }
        }
      })),
      (WEBGL_SCREEN.bgBack = new Mesh(i, element)),
      WEBGL_SCREEN.back.scene.add(WEBGL_SCREEN.bgBack),
      disposer.setMaterial("bgFrontMat", new WeakRef(element)));
    disposer.setMaterial("bgBackMat", new WeakRef(element));
    disposer.setGeometry("bgGeo", new WeakRef(i));
    disposer.setMesh("bgFrontMesh", new WeakRef(WEBGL_SCREEN.bgFront));
    disposer.setMesh("bgBackMesh", new WeakRef(WEBGL_SCREEN.bgBack));
  };
  const onResizeScreenWebGL = () => {
    (WEBGL_SCREEN.front.fbo &&
      WEBGL_SCREEN.front.fbo.setSize(
        window.innerWidth * RES,
        window.innerHeight * RES
      ),
      WEBGL_SCREEN.back.fbo &&
        WEBGL_SCREEN.back.fbo.setSize(
          window.innerWidth * RES,
          window.innerHeight * RES
        ),
      WEBGL_SCREEN.bgFront &&
        ((WEBGL_SCREEN.bgFront.scale.x = WEBGL.width),
        (WEBGL_SCREEN.bgFront.scale.y = WEBGL.height)),
      WEBGL_SCREEN.bgBack &&
        ((WEBGL_SCREEN.bgBack.scale.x = WEBGL.width),
        (WEBGL_SCREEN.bgBack.scale.y = WEBGL.height)));
  };
  const _onRenderScreenWebGL = () => {
    (WEBGL.renderer.setRenderTarget(WEBGL_SCREEN.front.fbo),
      WEBGL.renderer.render(WEBGL_SCREEN.front.scene, WEBGL.o_camera),
      WEBGL.renderer.setRenderTarget(WEBGL_SCREEN.back.fbo),
      WEBGL.renderer.render(WEBGL_SCREEN.back.scene, WEBGL.o_camera));
  };
  const onDestroyScreenWebGL = () => {};

  const _initSlider = () => {
    Slider.global = WEBGL_SCREEN.front.scene;
    (Slider.global &&
      ((Slider.geometry = new PlaneGeometry(1, 1, 1, 1)),
      (Slider.material = new ShaderMaterial({
        vertexShader: baseVertexShader,
        fragmentShader: stickyFrag,
        transparent: !0,
        uniforms: {
          opacity: {
            value: 0
          },
          resolution: {
            value: {
              x: 0,
              y: 0
            }
          },
          i_resolution: {
            value: {
              x: 0,
              y: 0
            }
          },
          borderRadius: {
            value: 0
          },
          fadeDensity: {
            value: Slider.params.fadeDensity
          },
          fadePower: {
            value: Slider.params.fadePower
          },
          borderWidth: {
            value: Slider.params.borderWidth
          },
          borderColor: {
            value: bg
          },
          slidePower1: {
            value: 0
          },
          slidePower2: {
            value: 0
          },
          slidePower3: {
            value: 0
          },
          slidePower4: {
            value: 0
          },
          tSlide1: {
            value: null
          },
          tSlide2: {
            value: null
          },
          tSlide3: {
            value: null
          },
          tSlide4: {
            value: null
          }
        }
      }))),
      ((Slider.mesh = new Mesh(
        Slider.geometry,
        Slider.material
      ) as unknown as Mesh & {
        material: ShaderMaterial & { uniforms: SliderMaterialUniforms };
      }),
      Slider.global.add(Slider.mesh)),
      _onResizeSlider(),
      onScrollSlider(),
      (Slider.textures = {
        ...textures
      }));
    disposer.setMaterial("sliderMat", new WeakRef(Slider.material));
    disposer.setGeometry("sliderGeo", new WeakRef(Slider.geometry));
    disposer.setMesh("sliderMesh", new WeakRef(Slider.mesh));
  };
  const _onUnmountSlider = () => {
    Object.keys(Slider.textures).forEach((elemen) => {
      const element = elemen as keyof typeof Slider.textures;
      if (Slider.textures[element]) {
        "el" in Slider.textures[element] &&
          (Slider.textures[element].el = null!);
        Slider.textures[element].tex = null!;
        Slider.textures[element] = null!;
      }
    });
  };

  const onLoadTextureSlider = () => {
    const { height, width } = imagePane.getBoundingClientRect();
    const v = Object.entries(Slider.textures);

    v.forEach(([name, element], trigger) => {
      const start = element;

      let end: string;
      start.video
        ? ((end = start.video.src),
          (start.el = document.createElement("video")),
          ((start.tex = new VideoTexture(start.el)),
          (start.el.preload = "metadata"),
          (start.el.muted = !0),
          (start.el.loop = !0),
          start.el.setAttribute("crossorigin", "anonymous"),
          start.el.setAttribute("muted", ""),
          start.el.setAttribute("playsinline", "playsinline"),
          (start.el.src = end)))
        : ((end = start.image.src),
          (start.tex = new TextureLoader().load(end, (texture) => {
            const imageWidth = texture.image.width;
            const imageHeight = texture.image.height;
            const imageAspect = imageWidth / imageHeight;
            const aspect = width / height;

            let scaleX = 1;
            let scaleY = 1;

            if (aspect < imageAspect) {
              scaleY = aspect / imageAspect;
            } else {
              scaleX = imageAspect / aspect;
            }
            texture.matrix.setUvTransform(0, 0, scaleX, scaleY, 0, 0.5, 0.5);
            texture.offset.set((1 - scaleX) * 0.5, (1 - scaleY) * 0.5);
            texture.center.set(0.5, 0.5);
            texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
          })),
          (start.tex.matrixAutoUpdate = false),
          name && (Slider.material.uniforms[name]!.value = start.tex));

      disposer.setTexture(
        `sliderTex_${user}_${trigger}`,
        new WeakRef(start.tex)
      );
    });
  };

  const _onResizeSlider = () => {
    const element = imagePane;
    if (element) {
      const trigger = element.getBoundingClientRect();
      ((Slider.width = trigger.width),
        (Slider.height = trigger.height),
        (Slider.top = WH),
        (Slider.left = trigger.left),
        (Slider.mesh.scale.x = getPxThree(Slider.width)),
        (Slider.mesh.scale.y = getPxThree(Slider.height)),
        (Slider.mesh.material.uniforms.resolution.value.x =
          Slider.mesh.scale.x),
        (Slider.mesh.material.uniforms.resolution.value.y =
          Slider.mesh.scale.y),
        (Slider.mesh.material.uniforms.borderRadius.value = getPxScaleThree(
          Slider.borderRadius - 2,
          Slider.mesh.scale.x
        )),
        (Slider.mesh.position.x =
          -WEBGL.width / 2 +
          getPxThree(Slider.left) +
          Slider.mesh.scale.x / 2 +
          Slider.translate.x),
        (Slider.mesh.position.y =
          WEBGL.height / 2 - getPxThree(WH * 1.5) + Slider.translate.y));
    }
  };
  const onScrollSlider = (element = 0, trigger = 0, _start = 0) => {
    Slider.mesh &&
      ((Slider.translate.y =
        trigger != 1 ? getPxThree(element) : getPxThree(WH)),
      (Slider.mesh.position.y =
        WEBGL.height / 2 - getPxThree(WH * 1.5) + Slider.translate.y));
  };
  const _onSyncSlider = (index: number, trigger: number) => {
    const start = Math.min(trigger * 2, 1);
    switch (index) {
      case 0:
        Slider.mesh.material.uniforms.slidePower1.value = start;
        break;
      case 1:
        Slider.mesh.material.uniforms.slidePower2.value = start;
        break;
      case 2:
        Slider.mesh.material.uniforms.slidePower3.value = start;
        break;
      case 3:
        Slider.mesh.material.uniforms.slidePower4.value = start;
        break;
    }
  };
  const onRenderSlider = () => {
    Slider.mesh &&
      ((Slider.mesh.visible = Slider.visible),
      (Slider.mesh.position.x =
        -WEBGL.width / 2 +
        getPxThree(Slider.left) +
        Slider.mesh.scale.x / 2 +
        Slider.translate.x),
      (Slider.mesh.material.uniforms.fadeDensity.value =
        Slider.params.fadeDensity),
      (Slider.mesh.material.uniforms.fadePower.value = Slider.params.fadePower),
      (Slider.mesh.material.uniforms.borderWidth.value =
        Slider.params.borderWidth));
  };
  const onDestroySlider = () => {
    Slider.mesh &&
      ((Slider.mesh.visible = !1),
      (Slider.mesh.material.uniforms.slidePower1.value = 0),
      (Slider.mesh.material.uniforms.slidePower2.value = 0),
      (Slider.mesh.material.uniforms.slidePower3.value = 0),
      (Slider.mesh.material.uniforms.slidePower4.value = 0));
    disposer.dispose("textures");
    // Object.keys(Slider.textures).forEach((element, trigger) => {
    //   const start = Slider.textures[element];
    //   start.el = null;
    // })
  };

  const Scroller: {
    slides: Array<{
      el: HTMLDivElement;
      visible: boolean;
      tl: GSAPTween | null;
      observer: IntersectionObserver | null;
      listener: IntersectionObserverCallback | null;
    }>;
    f1: number;
    f2: number;
    scroll: number;
    slideElMap: WeakMap<HTMLDivElement, number>;
  } = {
    slides: [],
    slideElMap: new WeakMap(),
    f1: 0,
    f2: 0,
    scroll: 0
  };

  let unmountLenis: () => void;
  const _initLenis = () => {
    if (lenis) {
      const handleScroll = (lenis: Lenis) => {
        const { limit, scroll } = lenis;
        Scroller.scroll = scroll;
        if (!container) return;
        const WH = window.innerHeight;
        const ff1 = Math.min(scroll / WH, 1);
        const ff2 = Math.max((scroll - WH) / (limit - WH), 0);
        Scroller.f1 = ff1;
        Scroller.f2 = ff2;
        container.style.setProperty("--f1", ff1.toString());
        container.style.setProperty("--f2", ff2.toString());
        AboutMember.ready && AboutMember.onScroll(scroll, ff1, ff2);
      };
      lenis.on("scroll", handleScroll);
      unmountLenis = () => {
        lenis.off("scroll", handleScroll);
      };
    }
  };
  const _initScroller = () => {
    document.querySelectorAll("[data-slide]").forEach((element, index) => {
      const divEl = element as HTMLDivElement;
      Scroller.slides.push({
        visible: false,
        tl: null,
        observer: null,
        listener: null,
        el: divEl
      });
      Scroller.slideElMap.set(divEl, index);
    });
    Scroller.slides.forEach((element) => {
      const divEl = element.el;
      element.listener = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.tl = gsap.to(element.el, {
              ease: "none",
              scrollTrigger: {
                scroller: document.documentElement,
                trigger: element.el,
                scrub: 0.01,
                start: "top bottom",
                end: "bottom top",
                onUpdate: (o) => {
                  if (!AboutMember.ready) return;
                  const index = Scroller.slideElMap.get(divEl);
                  if (typeof index !== "number") return;
                  if (index > 3) return;
                  if (index < 0) return;
                  const start = Math.min(o.progress * 2, 1);
                  const selector =
                    `slidePower${index + 1}` as `slidePower${1 | 2 | 3 | 4}`;
                  divEl.style.setProperty("--p1", o.progress.toString());
                  divEl.style.setProperty("--p2", (1 - o.progress).toString());
                  Slider.mesh.material.uniforms[selector].value = start;
                }
              }
            });
          }
        });
      };
      element.observer = new IntersectionObserver(element.listener, {
        threshold: 0
      });
      element.observer.observe(element.el);
    });
  };
  const onDestroyScroller = () => {
    Scroller.slides.forEach((element) => {
      element.observer && element.observer.disconnect();
      element.tl && element.tl.kill();
      gsap.killTweensOf(element.el);
      element.tl = null;
      element.observer = null;
      element.listener = null;
      Scroller.slideElMap.delete(element.el);
    });
  };
  const gdntFrnt: BGGradient = {
    visible: false,
    props: {
      color1: null!,
      color2: null!,
      color3: null!,
      color4: null!,
      speed: 0.01,
      borderRadius: 35,
      top: 0,
      left: 0,
      radius: {
        x: 1,
        y: 1.2
      },
      move: {
        x: 0.1,
        y: 0.1
      },
      noisePower: 0.1,
      noiseSpeed: 1.0,
      noiseDensity: 1.0,
      pivot: {
        x: 0.5,
        y: 0.6
      },
      gradient1st: {
        power: 0.5
      },
      gradient2nd: {
        power: 0.85
      },
      gradient3rd: {
        power: 1.0
      },
      width: 0,
      height: 0,
      translate: {
        x: 0,
        y: 0
      }
    },
    mesh: null!,
    material: null!,
    geometry: null!,
    global: null!,
    speed: 0.01,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    translate: {
      x: 0,
      y: 0
    },

    onInit: (props: BGGradient["props"]) => {
      gdntFrnt.props = props;
      ((gdntFrnt.geometry = new PlaneGeometry(1, 1, 1, 1)),
        (gdntFrnt.material = new ShaderMaterial({
          vertexShader: baseVertexShader,
          fragmentShader: bgGradientFragShader,
          transparent: true,
          uniforms: {
            opacity: {
              value: 1
            },
            borderRadius: {
              value: 0.0
            },
            resolution: {
              value: {
                x: 0,
                y: 0
              }
            },
            time: {
              value: 0
            },
            move: {
              value: gdntFrnt.props.move
            },
            mouse: {
              value: {
                x: 0,
                y: 0
              }
            },
            noisePower: {
              value: gdntFrnt.props.noisePower
            },
            noiseSpeed: {
              value: gdntFrnt.props.noiseSpeed
            },
            noiseDensity: {
              value: gdntFrnt.props.noiseDensity
            },
            pivot: {
              value: gdntFrnt.props.pivot
            },
            radius: {
              value: {
                x: gdntFrnt.props.radius.x,
                y: gdntFrnt.props.radius.y
              }
            },
            color1: {
              value: gdntFrnt.props.color1
            },
            color2: {
              value: gdntFrnt.props.color2
            },
            color3: {
              value: gdntFrnt.props.color3
            },
            color4: {
              value: gdntFrnt.props.color4
            },
            gradient1st: {
              value: gdntFrnt.props.gradient1st.power
            },
            gradient2nd: {
              value: gdntFrnt.props.gradient2nd.power
            },
            gradient3rd: {
              value: gdntFrnt.props.gradient3rd.power
            }
          }
        }) as BGGradientFrontMaterial));
      gdntFrnt.material.alphaTest = 0.5;
      gdntFrnt.mesh = new Mesh(gdntFrnt.geometry, gdntFrnt.material);
      gdntFrnt.mesh.position.z = 0;
      gdntFrnt.global.add(gdntFrnt.mesh);
      disposer.setMaterial("gdntFrntMat", new WeakRef(gdntFrnt.material));
      disposer.setGeometry("gdntFrntGeo", new WeakRef(gdntFrnt.geometry));
      disposer.setMesh("gdntFrntMesh", new WeakRef(gdntFrnt.mesh));
    },
    onResize: () => {
      const element = fvMain.getBoundingClientRect();
      if (element) {
        const ww = element.width;
        const hh = element.height ? element.height : WH - 3.2;
        gdntFrnt.width = ww;
        gdntFrnt.height = hh;
        gdntFrnt.top = element.top;
        gdntFrnt.left = element.left;
        const scaleW = getPxThree(ww);
        const scaleH = getPxThree(hh);
        gdntFrnt.mesh.scale.x = scaleW;
        gdntFrnt.mesh.scale.y = scaleH;
        gdntFrnt.mesh.material.uniforms.resolution.value.x = scaleW;
        gdntFrnt.mesh.material.uniforms.resolution.value.y = scaleH;
        gdntFrnt.mesh.material.uniforms.borderRadius.value = getPxScaleThree(
          gdntFrnt.props.borderRadius - 2,
          scaleW
        );
        gdntFrnt.mesh.position.x =
          -WEBGL.width / 2 +
          getPxThree(gdntFrnt.left) +
          gdntFrnt.mesh.scale.x / 2 +
          gdntFrnt.translate.x;
        gdntFrnt.mesh.position.y =
          WEBGL.height / 2 -
          getPxThree(gdntFrnt.top) -
          gdntFrnt.mesh.scale.y / 2 +
          gdntFrnt.translate.y;
      }
    },
    onScroll: (element: number, _trigger: number) => {
      if (gdntFrnt.mesh) {
        gdntFrnt.translate.y = getPxThree(element);
        gdntFrnt.mesh.position.y =
          WEBGL.height / 2 -
          getPxThree(gdntFrnt.top) -
          gdntFrnt.mesh.scale.y / 2 +
          gdntFrnt.translate.y;
      }
    },
    onRender: () => {
      if (gdntFrnt.mesh) {
        gdntFrnt.mesh.visible = true;
        const mouselerp = {
          x: vMouseDamp.x / WW,
          y: 1 - vMouseDamp.y / WH
        };
        gdntFrnt.mesh.material.uniforms.mouse.value.x = mouselerp.x * 2 - 1;
        gdntFrnt.mesh.material.uniforms.mouse.value.y = mouselerp.y * 2 - 1;
        gdntFrnt.mesh.material.uniforms.time.value += gdntFrnt.speed;
        gdntFrnt.mesh.material.uniforms.noisePower.value =
          gdntFrnt.props.noisePower;
        gdntFrnt.mesh.material.uniforms.noiseSpeed.value =
          gdntFrnt.props.noiseSpeed;
        gdntFrnt.mesh.material.uniforms.noiseDensity.value =
          gdntFrnt.props.noiseDensity;

        gdntFrnt.mesh.position.x =
          -WEBGL.width / 2 +
          getPxThree(gdntFrnt.left) +
          gdntFrnt.mesh.scale.x / 2 +
          gdntFrnt.translate.x;
      }
    },
    onDestroy: () => {
      if (gdntFrnt.mesh) {
        // gdntFrnt.mesh.material && gdntFrnt.mesh.material.dispose();
        // gdntFrnt.mesh.geometry && gdntFrnt.mesh.geometry.dispose();

        gdntFrnt.global.remove(gdntFrnt.mesh);
        // gdntFrnt.material && gdntFrnt.material.dispose();
        // gdntFrnt.geometry && gdntFrnt.geometry.dispose();
        gdntFrnt.mesh.material = null!;
        gdntFrnt.mesh = null!;
        gdntFrnt.global = null!;
        gdntFrnt.geometry = null!;
        gdntFrnt.material = null!;
        gdntFrnt.width = 0;
      }
    }
  };
  const MQee: MarqueeShader = {
    ready: false,
    canvas: null!,
    texture: null!,
    text: {
      content:
        "BRIDGING THE GAP BETWEEN THE PUBLIC AND THE INTIMATE - THE HIDEAWAY, A RESTORED PROJECT - SEOUL, BOSTON, PARIS, LONDON & LA",
      width: 500,
      height: 15
    },
    color: fg,
    ctx: null!,
    global: null!,
    visible: false,
    translate: new Vector2(0, 0),
    props: {
      borderRadius: 0.2
    },
    speed: 0.85,
    scale: 0.313,
    time: Math.random(),
    _once: ({ scene }: { scene: Scene }) => {
      while (!MQee.ctx) {
        console.log("while...");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        MQee.canvas = canvas;
        MQee.ctx = context!;
      }
      MQee.global = scene;
      MQee.global && (MQee.onInitMesh(), (MQee.ready = !0));
    },
    geometry: null!,
    material: null!,
    mesh: null!,

    top: 0,
    left: 0,
    width: 0,
    height: 0,
    onInitMesh: () => {
      MQee.geometry = new PlaneGeometry(1, 1, 1, 1);
      ((MQee.material = new ShaderMaterial({
        vertexShader: baseVertexShader,
        fragmentShader: marqueeFragmentShader,
        transparent: true,
        uniforms: {
          cBlack: {
            value: colors.black
          },
          cFg: {
            value: fg
          },
          opacity: {
            value: 1
          },
          time: {
            value: 0
          },
          resolution: {
            value: {
              x: 1,
              y: 1
            }
          },
          i_resolution: {
            value: {
              x: 1400,
              y: 100
            }
          },
          i_repeat: {
            value: {
              x: 1,
              y: 14
            }
          },
          textureAspect: { value: 1.0 },
          planeAspect: { value: 1.0 },
          borderRadius: {
            value: 0.25
          },
          tDiffuse: {
            value: null!
          }
        }
      }) as (typeof MQee)["material"]),
        (MQee.mesh = new Mesh(MQee.geometry, MQee.material)),
        MQee.global.add(MQee.mesh));
      const height = 15;
      const context = MQee.ctx;
      context.font = `${2 * height}px ${GeistMono.style.fontFamily}`;
      context.letterSpacing = "-0.02em";
      // Calculate width based on measured text
      const textMetrics = context.measureText(MQee.text.content);
      const width = Math.ceil(textMetrics.width);
      MQee.text.width = width;
      MQee.canvas.height = 2 * height;
      MQee.canvas.width = width;

      context.font = `${2 * MQee.text.height}px ${GeistMono.style.fontFamily}`;

      context.textBaseline = "middle";
      context.textAlign = "left";

      // Clear and set background transparent
      context.clearRect(0, 0, MQee.text.width, 2 * MQee.text.height);

      // Render text
      context.fillStyle = `currentColor`;
      context.fillText(MQee.text.content, 0, (2 * MQee.text.height) / 2);
      const texture = new CanvasTexture(MQee.canvas);
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      MQee.texture = texture;
    },
    renderText: () => {
      // MQee.ctx.font = `${2 * MQee.text.height}px ${GeistMono.style.fontFamily}`;
      //
      // MQee.ctx.textBaseline = "middle";
      // MQee.ctx.textAlign = "left";
      // MQee.ctx.clearRect(0, 0, MQee.text.width, 2 * MQee.text.height);
      // MQee.ctx.fillStyle = color;
      // MQee.ctx.fillText(MQee.text.content, 0, MQee.text.height);
      MQee.texture.needsUpdate = true;
    },
    onResize: () => {
      const trigger = fvMain;
      if (trigger) {
        const element = trigger.getBoundingClientRect();
        (element &&
          ((MQee.width = element.width),
          (MQee.height = element.height),
          (MQee.top = element.top),
          (MQee.left = element.left)),
          MQee.mesh &&
            ((MQee.mesh.scale.x = getPxThree(MQee.width)),
            (MQee.mesh.scale.y = getPxThree(MQee.height)),
            (MQee.mesh.position.x =
              -WEBGL.width / 2 + getPxThree(MQee.left) + MQee.mesh.scale.x / 2),
            (MQee.mesh.position.y =
              WEBGL.height / 2 - getPxThree(MQee.top) - MQee.mesh.scale.y / 2),
            (MQee.mesh.position.z = 1),
            (MQee.mesh.material.uniforms.resolution.value.x =
              MQee.mesh.scale.x),
            (MQee.mesh.material.uniforms.resolution.value.y =
              MQee.mesh.scale.y),
            (MQee.mesh.material.uniforms.borderRadius.value = getPxScaleThree(
              MQee.props.borderRadius - 2,
              MQee.mesh.scale.x
            )),
            (MQee.mesh.material.uniforms.i_repeat.value.x =
              (MQee.mesh.material.uniforms.i_resolution.value.x / MQee.width) *
              WR),
            (MQee.mesh.material.uniforms.i_repeat.value.y =
              (MQee.mesh.material.uniforms.i_resolution.value.y / MQee.height) *
              WR)));
      }
    },
    onLoadTexture: () => {
      const texture = MQee.texture;
      MQee.onUpdateTexture(texture, MQee.text.width, MQee.text.height * 2);
    },
    onUpdateTexture: (texture, xValue, yValue) => {
      MQee.mesh.material.uniforms.tDiffuse.value = texture;
      MQee.mesh.material.uniforms.i_resolution.value.x = xValue / 2;
      MQee.mesh.material.uniforms.i_resolution.value.y = yValue / 2;
      MQee.mesh.material.uniforms.textureAspect.value = xValue / yValue;
    },
    onScroll: (a = 0, _b = 0) => {
      MQee.mesh &&
        ((MQee.translate.y = getPxThree(a)),
        (MQee.mesh.position.y =
          WEBGL.height / 2 -
          getPxThree(MQee.top) -
          MQee.mesh.scale.y / 2 +
          MQee.translate.y));
    },
    onRender: () => {
      MQee.mesh &&
        ((MQee.mesh.material.uniforms.time.value >= 1 &&
          (MQee.mesh.material.uniforms.time.value = 0),
        (MQee.time += 1e-4 * MQee.speed)),
        (MQee.mesh.material.uniforms.time.value = MQee.time + 0.05),
        (MQee.mesh.visible = MQee.visible),
        (MQee.mesh.position.x =
          -WEBGL.width / 2 +
          getPxThree(MQee.left) +
          MQee.mesh.scale.x / 2 +
          MQee.translate.x));
    },
    onDestroy: () => {
      MQee.mesh &&
        ((MQee.translate.x = 0),
        (MQee.translate.y = 0),
        (MQee.mesh.visible = !1));
    }
  };
  const TRAILS: {
    body: UsagiMouseTrail;
    raf: () => void;
    once: () => void;
    maxAge: number;
  } = {
    body: {
      ratio: 1,
      trails: [],
      ease: "expo.out",
      maxAge: 20,
      intensity: 0,
      ageRatio: 0.3,
      age: 0,
      size: 64,
      raf: (a, b) => {
        while (
          TRAILS.body.trails.length > 0 &&
          TRAILS.body.trails[0]!.age > TRAILS.body.maxAge
        ) {
          TRAILS.body.addTouch({
            x: a,
            y: b
          });
          TRAILS.body.trails.shift();

          for (const trail of TRAILS.body.trails) {
            trail.age++;
            TRAILS.body.drawTouch(trail);
          }
        }
      },
      addTouch: (coords: { x: number; y: number }) => {
        let trigger = 0;
        const start = TRAILS.body.trails[TRAILS.body.trails.length - 1];
        if (start) {
          const end = start.x - coords.x,
            a = start.y - coords.y,
            o = end * end + a * a;
          o < window.innerWidth && (trigger = Math.min(o * 1e4, 1));
        }
        (TRAILS.body.trails.push({
          x: coords.x,
          y: coords.y,
          age: 0,
          force: trigger
        }),
          TRAILS.body.trails.length > TRAILS.body.maxAge &&
            TRAILS.body.trails.splice(
              0,
              TRAILS.body.trails.length - TRAILS.body.maxAge
            ));
      },

      drawTouch: (trail) => {
        if (
          ((trail.intensity = 1),
          trail.age < TRAILS.body.maxAge * TRAILS.body.ageRatio)
        ) {
          const trigger =
            trail.age / (TRAILS.body.maxAge * TRAILS.body.ageRatio);
          trail.intensity = gsap.parseEase(TRAILS.body.ease)(trigger);
        } else {
          const trigger =
            1 -
            (trail.age - TRAILS.body.maxAge * TRAILS.body.ageRatio) /
              (TRAILS.body.maxAge * (1 - TRAILS.body.ageRatio));
          trail.intensity = gsap.parseEase(TRAILS.body.ease)(trigger);
        }
        trail.intensity *= trail.force;
      },
      onMouseMove: (element) => {
        const mouseLerp = {
          x: vMouseDamp.x / WW,
          y: 1 - vMouseDamp.y / WH
        };
        TRAILS.body.addTouch(mouseLerp);
      },

      once: (props) => {}
    },
    maxAge: 20,
    once: () => {
      TRAILS.body.once();
    },
    raf: () => {
      const mouselerp = {
        x: vMouseDamp.x / WW,
        y: 1 - vMouseDamp.y / WH
      };
      TRAILS.body.raf(mouselerp.x, mouselerp.y);
    }
  };
  const WEBGL_MOUSE: WebglMouse = {
    visible: !0,
    ready: !1,
    geometry: null!,
    material: null!,
    mesh: null!,
    fbo: null!,
    scene: null!,
    params: {
      edgePower: 20,
      noiseSpeed: 0.5,
      noiseDensity: 5,
      waveSpeed: 0.5,
      waveDisp: {
        x: 5,
        y: 5
      },
      wavePower: 0.1,
      mouse: {
        size: 0.9,
        age: 0.2
      },
      trail: {
        power: 0.5
      },
      yuenye: {
        power: 3,
        edge: 2,
        ratio: 0.6
      }
    },
    once: () => {
      WEBGL_MOUSE.scene = new Scene();
      WEBGL_MOUSE.fbo = new WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
          minFilter: LinearFilter,
          magFilter: LinearFilter,
          format: RGBFormat
        }
      );

      WEBGL_MOUSE.onInit();
      WEBGL_MOUSE.onInitMesh();
      WEBGL_MOUSE.onResize();
      WEBGL.final.material.uniforms.tMouse.value = WEBGL_MOUSE.fbo.texture;
      disposer.setScene("webglMouseScene", new WeakRef(WEBGL_MOUSE.scene));
      disposer.setRenderTarget("webglMouseFbo", new WeakRef(WEBGL_MOUSE.fbo));
    },
    onInit: () => {},
    onInitMesh: () => {
      const trailsArr: Vector2[] = [],
        element: number[] = [],
        trigger: number[] = [];
      for (let start = 0; start < 20; start++) {
        (trailsArr.push(new Vector2()), element.push(0), trigger.push(0));
      }
      WEBGL_MOUSE.geometry = new PlaneGeometry(1, 1, 1, 1);
      const uniforms = {
        resolution: {
          value: {
            x: 0,
            y: 0
          }
        },
        cBlack: {
          value: colors.black
        },
        time: {
          value: 0
        },
        edgePower: {
          value: WEBGL_MOUSE.params.edgePower
        },
        noiseSpeed: {
          value: WEBGL_MOUSE.params.noiseSpeed
        },
        noiseDensity: {
          value: WEBGL_MOUSE.params.noiseDensity
        },
        waveSpeed: {
          value: WEBGL_MOUSE.params.waveSpeed
        },
        waveDisp: {
          value: WEBGL_MOUSE.params.waveDisp
        },
        wavePower: {
          value: WEBGL_MOUSE.params.wavePower
        },
        yuenyePower: {
          value: WEBGL_MOUSE.params.yuenye.power
        },
        yuenyeEdge: {
          value: WEBGL_MOUSE.params.yuenye.edge
        },
        yuenyeRatio: {
          value: WEBGL_MOUSE.params.yuenye.ratio
        },
        mouse: {
          value: {
            x: 0,
            y: 0
          }
        },
        mouseTrailsCount: {
          value: 20
        },
        mouseTrailsArray: {
          value: trailsArr
        },
        mouseTrailsIntensity: {
          value: element
        },
        mouseTrailsAge: {
          value: trigger
        },
        mouseTrailsMaxAge: {
          value: 20
        },
        mouseTrailsSize: {
          value: 0.9
        },
        mouseTrailsAgeRatio: {
          value: 0.2
        }
      } satisfies MouseUniform;
      WEBGL_MOUSE.material = new ShaderMaterial({
        vertexShader: baseVertexShader,
        fragmentShader: trailsFrag,
        transparent: true,
        uniforms: uniforms
      }) as WebglMouse["material"];
      WEBGL_MOUSE.mesh = new Mesh(WEBGL_MOUSE.geometry, WEBGL_MOUSE.material);
      WEBGL_MOUSE.scene.add(WEBGL_MOUSE.mesh);
      disposer.setMesh("webglMouseMesh", new WeakRef(WEBGL_MOUSE.mesh));
      disposer.setMaterial(
        "webglMouseMaterial",
        new WeakRef(WEBGL_MOUSE.material)
      );
      disposer.setGeometry(
        "webglMouseGeometry",
        new WeakRef(WEBGL_MOUSE.geometry)
      );
      disposer.setScene("webglMouseScene", new WeakRef(WEBGL_MOUSE.scene));
    },
    onRender: () => {
      if (!WEBGL_MOUSE.mesh) return;
      if (!WEBGL_MOUSE.scene) return;
      WEBGL_MOUSE.mesh.visible = true;
      WEBGL_MOUSE.material.uniforms.time.value += 0.01;

      WEBGL_MOUSE.material.uniforms.yuenyePower.value =
        WEBGL_MOUSE.params.yuenye.power;
      WEBGL_MOUSE.material.uniforms.yuenyeEdge.value =
        WEBGL_MOUSE.params.yuenye.edge;
      WEBGL_MOUSE.material.uniforms.yuenyeRatio.value =
        WEBGL_MOUSE.params.yuenye.ratio;
      WEBGL_MOUSE.material.uniforms.mouse.value.x = vMouseDamp.x / WW;
      WEBGL_MOUSE.material.uniforms.mouse.value.y = 1 - vMouseDamp.y / WH;
      WEBGL_MOUSE.material.uniforms.mouseTrailsSize.value = clamp(
        WEBGL_MOUSE.params.mouse.size,
        0,
        1
      );
      WEBGL_MOUSE.material.uniforms.mouseTrailsAgeRatio.value =
        WEBGL_MOUSE.params.mouse.age;
      WEBGL_MOUSE.material.uniforms.mouseTrailsCount.value = Math.min(
        TRAILS.body.trails.length,
        20
      );
      TRAILS.body.trails.forEach((trail, i) => {
        const mta = WEBGL_MOUSE.material.uniforms.mouseTrailsArray.value[i];
        mta && ((mta.x = trail.x), (mta.y = trail.y));
        trail.intensity &&
          WEBGL_MOUSE.material.uniforms.mouseTrailsIntensity.value[i] &&
          (WEBGL_MOUSE.material.uniforms.mouseTrailsIntensity.value[i] =
            trail.intensity);
        WEBGL_MOUSE.material.uniforms.mouseTrailsAge.value[i] = trail.age;
      });
      WEBGL.renderer.setRenderTarget(WEBGL_MOUSE.fbo);
      WEBGL.renderer.render(WEBGL_MOUSE.scene, WEBGL.o_camera);
    },
    onResize: () => {
      const i = clamp(RES, 1, 1.75);
      WEBGL_MOUSE.fbo && WEBGL_MOUSE.fbo.setSize(WW * i, WH * i);
      WEBGL_MOUSE.mesh &&
        ((WEBGL_MOUSE.mesh.scale.x = WEBGL.width),
        (WEBGL_MOUSE.mesh.scale.y = WEBGL.height),
        (WEBGL_MOUSE.mesh.position.x = 0),
        (WEBGL_MOUSE.mesh.position.y = 0),
        (WEBGL_MOUSE.mesh.position.z = 0),
        (WEBGL_MOUSE.mesh.material.uniforms.resolution.value.x =
          WEBGL_MOUSE.mesh.scale.x),
        (WEBGL_MOUSE.mesh.material.uniforms.resolution.value.y =
          WEBGL_MOUSE.mesh.scale.y));
    }
  };

  const AboutMember: {
    [key: string]: any;
    ready: boolean;
    titleRect: HTMLDivElement;
    init: () => void;
    onScroll: (a: number, b: number, c: number) => void;
    onResize: () => void;
    onRender: () => void;
    onDestroy: () => void;
  } = {
    ready: false,
    titleRect: null!,
    init: () => {
      _initSlider();
      AboutMember.titleRect = document.getElementById(
        "title-container"
      ) as HTMLDivElement;
      gdntFrnt.visible = true;
      gdntFrnt.global = WEBGL_SCREEN.front.scene;

      gdntFrnt.global &&
        gdntFrnt.onInit({
          color1: new Color("#d3eef3"),
          color2: colors.gradient1,
          color3: colors.gradient2,
          noisePower: 0.1,
          noiseSpeed: 1,
          noiseDensity: 1,
          borderRadius: 35,
          move: {
            x: 0.1,
            y: 0.2
          },
          pivot: {
            x: 0.5,
            y: 0.6
          },
          radius: {
            x: 1.2,
            y: 1.2
          },
          color4: fg,
          gradient1st: {
            power: 0.4
          },
          gradient2nd: {
            power: 0.8
          },
          gradient3rd: {
            power: 0.9
          },
          speed: 0.01,
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          translate: {
            x: 0,
            y: 0
          }
        });
      MQee._once({ scene: WEBGL_SCREEN.back.scene });
      MQee.visible = true;
      onScrollSlider(0, 0, 0);
      gdntFrnt.onScroll(0, 0);
      MQee.onScroll(0, 0);
      AboutMember.ready = true;
    },
    onLoaded: () => {
      onLoadTextureSlider();
      MQee.onLoadTexture();
      MQee.onResize();
    },
    onScroll: (a: number, b: number, c: number) => {
      gdntFrnt.onScroll(a, b);
      onScrollSlider(a, b, c);
      MQee.onScroll(a, b);
    },
    onRender: () => {
      if (!AboutMember.ready) return;
      Slider.visible = true;
      MQee.visible = true;
      Slider.mesh.material.uniforms.opacity.value = 1;
      gdntFrnt.mesh.material.uniforms.opacity.value = 1;

      gdntFrnt.mesh.material.uniforms.gradient1st.value =
        gdntFrnt.props.gradient1st.power;
      gdntFrnt.mesh.material.uniforms.gradient2nd.value =
        gdntFrnt.props.gradient2nd.power;
      gdntFrnt.mesh.material.uniforms.gradient3rd.value =
        gdntFrnt.props.gradient3rd.power;
      MQee.mesh.material.uniforms.opacity.value = 1;
      MQee.onRender();
      gdntFrnt.onRender();
      onRenderSlider();
    },
    onResize: () => {
      _onResizeSlider();
      MQee.onResize();
      gdntFrnt.onResize();
    },
    onDestroy: () => {
      onDestroySlider();
      _onUnmountSlider();
      gdntFrnt.onDestroy();
    }
  };
  const onPointerMove = (e: MouseEvent | PointerEvent) => {
    vMouse.set(e.clientX, e.clientY);
  };
  let remover: () => void;
  const Root = {
    init: () => {
      document.addEventListener("mousemove", onPointerMove);
      document.addEventListener("pointermove", onPointerMove);
      TRAILS.once();
      _onceWebGL(canvas);
      onceScreenWebGL();
      _initLenis();
      _initScroller();
      AboutMember.init();
      WEBGL_MOUSE.once();
      Root._onLoaded();
    },
    _onLoaded: () => {
      AboutMember.onLoaded();
      onResizeWebGL();
    },
    onRender: () => {
      const a = Tempus.add((time, deltaTime) => {
        for (const k in vMouse) {
          if (k == "x" || k == "y")
            vMouseDamp[k] = MathUtils.damp(
              vMouseDamp[k],
              vMouse[k],
              1,
              deltaTime / 1000
            );
        }
        onRenderWebGL();
        TRAILS.raf();
      });
      a && (remover = a);
    },
    onResize: () => {
      updateSize();
    },
    unmount: () => {
      try {
        unmountLenis && unmountLenis();
        document.removeEventListener("resize", updateSize);
        AboutMember.onDestroy();
        // WEBGL_SCREEN.front.fbo && WEBGL_SCREEN.front.fbo.dispose();
        // WEBGL_SCREEN.back.fbo && WEBGL_SCREEN.back.fbo.dispose();
        // WEBGL_SCREEN.alpha.fbo && WEBGL_SCREEN.alpha.fbo.dispose();
        // WEBGL_SCREEN.alpha.scene && WEBGL_SCREEN.alpha.scene.removeFromParent();
        // WEBGL_SCREEN.front.scene && WEBGL_SCREEN.front.scene.removeFromParent();
        // WEBGL_SCREEN.back.scene && WEBGL_SCREEN.back.scene.removeFromParent();
        // const bb = WEBGL_SCREEN.bgBack;
        // if (Array.isArray(bb.material)) {
        //   bb.material?.forEach((element) => {
        //     element?.dispose();
        //   });
        // } else if (bb.material) {
        //   bb.material?.dispose();
        // }
        // bb.geometry && bb.geometry?.dispose();
        // const bf = WEBGL_SCREEN.bgFront;
        // if (Array.isArray(bf?.material)) {
        //   bf.material?.forEach((element) => {
        //     element.dispose();
        //   });
        // } else if (bf.material) {
        //   bf.material?.dispose();
        // }
        // bf.geometry && bf.geometry.dispose();
        // WEBGL.final.material && WEBGL.final.material.dispose();
        // WEBGL.final.geometry && WEBGL.final.geometry.dispose();
        // WEBGL.renderer.dispose();
        onDestroyScreenWebGL();
        onDestroyScroller();

        document.removeEventListener("mousemove", onPointerMove);
        document.removeEventListener("pointermove", onPointerMove);

        remover && remover();
      } catch (e) {
        console.log(e);
      }
    }
  };
  Root.init();
  Root.onRender();

  return {
    onThemeChange: () => {
      const fM = WEBGL.final.material;
      Array.isArray(fM)
        ? fM.forEach((element) => {
            element.needsUpdate = true;
          })
        : (fM.needsUpdate = true);
      const bbM = WEBGL_SCREEN.bgBack.material;
      Array.isArray(bbM)
        ? bbM.forEach((element) => {
            element.needsUpdate = true;
          })
        : (bbM.needsUpdate = true);
      const bfM = WEBGL_SCREEN.bgFront.material;
      Array.isArray(bfM)
        ? bfM.forEach((element) => {
            element.needsUpdate = true;
          })
        : (bfM.needsUpdate = true);
      Slider.mesh.material.needsUpdate = true;
      gdntFrnt.mesh.material.needsUpdate = true;
      MQee.renderText();
    },
    onResize: Root.onResize,
    unmount: Root.unmount
  };
}

// const FVTitle: FV_InkTitle = {
//   global: null!,
//   visible: false,
//   mesh: null!,
//   width: 0,
//   height: 0,
//   top: 0,
//   left: 0,
//   scale: {
//     f1: 0,
//     x: 1,
//     y: 1,
//   },
//   translate: {
//     x: 0,
//     y: 0,
//   },
//   onInit: (scene: Scene) => {
//     FVTitle.global = scene;
//   },
//   onInitMesh: () => {
//     const element = new PlaneGeometry(1, 1, 1, 1),
//       trigger = new ShaderMaterial({
//         vertexShader: baseVertexShader,
//         fragmentShader: fvMainTitleFragShader,
//         transparent: !0,
//         uniforms: {
//           inkbleed: {
//             value: 1,
//           },
//           opacity: {
//             value: 1,
//           },
//           cBlack: {
//             value: colors.black,
//           },
//           edgeSharp: {
//             value: 0.2,
//           },
//           tNormal: {
//             value: null,
//           },
//           tShadow: {
//             value: null,
//           },
//         },
//       });
//     disposer.setMaterial("titleMat", new WeakRef(trigger));
//     disposer.setGeometry("titleGeo", new WeakRef(element));
//     ((FVTitle.mesh = new Mesh(element, trigger) as Mesh<
//       PlaneGeometry,
//       ShaderMaterial & InkTitleUniforms
//     >),
//       FVTitle.global.add(FVTitle.mesh));
//     disposer.setMesh("titleMesh", new WeakRef(FVTitle.mesh));
//   },
//   onResize: (
//     element = {
//       width: 0,
//       height: 0,
//       top: 0,
//       left: 0,
//     },
//   ) => {
//     element &&
//       ((FVTitle.width = element.width),
//       (FVTitle.height = element.height),
//       (FVTitle.top = element.top),
//       (FVTitle.left = element.left),
//       (FVTitle.mesh.scale.x = getPxThree(FVTitle.width) * FVTitle.scale.x),
//       (FVTitle.mesh.scale.y = getPxThree(FVTitle.height) * FVTitle.scale.y),
//       (FVTitle.mesh.position.x =
//         -WEBGL.width / 2 +
//         getPxThree(FVTitle.left) +
//         getPxThree(FVTitle.width) / 2 +
//         FVTitle.translate.x),
//       (FVTitle.mesh.position.y =
//         WEBGL.height / 2 -
//         getPxThree(FVTitle.top) -
//         getPxThree(FVTitle.height) / 2 +
//         FVTitle.translate.y),
//       (FVTitle.mesh.position.z = 3));
//   },
//   onUpdateTexture: (element, trigger) => {
//     ((FVTitle.mesh.material.uniforms.tNormal.value = element),
//       (FVTitle.mesh.material.uniforms.tShadow.value = trigger));
//   },
//   onScroll: (element = 0, trigger = 0) => {
//     FVTitle.mesh &&
//       ((FVTitle.translate.y = getPxThree(element)),
//       (FVTitle.mesh.position.y =
//         WEBGL.height / 2 -
//         getPxThree(FVTitle.top) -
//         FVTitle.mesh.scale.y / 2 +
//         FVTitle.translate.y));
//   },
//   onStickyScroll: (element = 0, trigger = 0, start = 0) => {
//     if (FVTitle.mesh) {
//       FVTitle.scale.f1 = start;
//       const end =
//         WEBGL.height / 2 - getPxThree(FVTitle.top) - FVTitle.mesh.scale.y / 2;
//       ((FVTitle.translate.y = trigger),
//         (FVTitle.mesh.position.y = end + FVTitle.translate.y));
//     }
//   },
//   onRender: () => {
//     FVTitle.mesh &&
//       ((FVTitle.mesh.visible = FVTitle.visible),
//       (FVTitle.scale.x = 1 - FVTitle.scale.f1 * 0.2),
//       (FVTitle.scale.y = 1 - FVTitle.scale.f1 * 0.2),
//       (FVTitle.mesh.scale.x = getPxThree(FVTitle.width) * FVTitle.scale.x),
//       (FVTitle.mesh.scale.y = getPxThree(FVTitle.height) * FVTitle.scale.y),
//       (FVTitle.mesh.position.x =
//         -WEBGL.width / 2 +
//         getPxThree(FVTitle.left) +
//         getPxThree(FVTitle.width) / 2 +
//         FVTitle.translate.x));
//   },
//   onDestroy: () => {},
// };

//   constructor(
//     element: {
//       isMobile?: boolean;
//       move?: {
//         active?: number;
//         duration?: number;
//       };
//       ease?: string | Array<number | string>;
//       useRAF?: boolean;
//       precision?: number;
//       onUpdateBefore?: (props: any) => void;
//       onUpdateAfter?: (props: any) => void;
//       onStickyScrollBefore?: (props: any) => void;
//       onMouseMoveBefore?: (props: any) => void;
//       onMouseMoveAfter?: (props: any) => void;
//     } = {},
//   ) {
//     ((this.prop = element),
//       (this.isActive = !1),
//       (this.isFirst = !1),
//       (this.useRAF = element.useRAF ? element.useRAF : !1),
//       (this.precision = element.precision ? element.precision : 100),
//       (this.isMobile = element.isMobile === !0),
//       (this.ease = this.prop.ease ? this.prop.ease : 0.1),
//       (this.array = []),
//       (this.easeRatio = {
//         delta: this.prop.easeRatio ? this.prop.easeRatio.delta : 85,
//         acceleration: this.prop.easeRatio
//           ? this.prop.easeRatio.acceleration
//           : 60,
//       }),
//       (this.x = window.innerWidth / 2),
//       (this.y = window.innerHeight / 2),
//       (this.currentEvent = null),
//       (this.currentTime = performance.now() * 0.001),
//       (this.lastTime = 0),
//       (this.deltaTime = 0),
//       typeof element.onUpdateBefore == "function" &&
//         (this.onUpdateBefore = () => element.onUpdateBefore),
//       element.onUpdateAfter !== undefined &&
//         typeof element.onUpdateAfter == "function" &&
//         (this.onUpdateAfter = () => element!.onUpdateAfter),
//       element.onMouseMoveBefore &&
//         typeof element.onMouseMoveBefore === "function" &&
//         (this.onMouseMoveBefore = () => element.onMouseMoveBefore),
//       typeof element.onMouseMoveAfter === "function" &&
//         (this.onMouseMoveAfter = () => element.onMouseMoveAfter));
//     const trigger = {
//       active: 0,
//       duration: 1,
//       ease: "power1.out",
//     };
//     ((this.move = {
//       ...trigger,
//       ...element.move,
//     }),
//       (this.touch = {
//         enable: !1,
//         active: 0,
//         start: {
//           enable: !1,
//           x: 0,
//         },
//         ing: {
//           x: 0,
//           delta: {
//             x: 0,
//           },
//           ease: 0.025,
//         },
//         end: {
//           x: 0,
//         },
//       }),
//       this.onRunRabbit());
//   }
//
//   onRunRabbit() {
//     Array.isArray(this.ease)
//       ? ((this.isArray = !0), this.onInitArray())
//       : ((this.isArray = !1), this.onInitSingle());
//   }
//
//   onInitSingle() {
//     ((this.center = {
//       x: 0,
//       y: 0,
//     }),
//       (this.shader = {
//         x: 0,
//         y: 0,
//       }),
//       (this.delta = {
//         x: 0,
//         y: 0,
//       }),
//       (this.acceleration = {
//         prevEvent: null,
//         x: 0,
//         y: 0,
//         distance: 0,
//         delta: {
//           x: 0,
//           y: 0,
//           distance: 0,
//         },
//       }),
//       this.addEvents(),
//       this.onInitGetAcceleration(this.acceleration),
//       this.useRAF && this.raf());
//   }
//
//   onInitArray() {
//     this.addEvents();
//     for (
//       let element = 0;
//       element < (this.ease as Array<number>).length;
//       element++
//     ) {
//       const trigger = this.ease[element];
//       this.array.push({
//         ease: trigger,
//         center: {
//           x: 0,
//           y: 0,
//         },
//         shader: {
//           x: 0,
//           y: 0,
//         },
//         delta: {
//           x: 0,
//           y: 0,
//         },
//         acceleration: {
//           prevEvent: null,
//           x: 0,
//           y: 0,
//           distance: 0,
//           delta: {
//             x: 0,
//             y: 0,
//             distance: 0,
//           },
//         },
//         lastTime: 0,
//       });
//     }
//     (this.isMobile ||
//       this.array.forEach((element, trigger) => {
//         this.onInitGetAcceleration(element.acceleration);
//       }),
//       this.useRAF && this.raf());
//   }
//
//   onInitGetAcceleration(element) {
//     (clearInterval(element.interval),
//       (element.interval = setInterval(() => {
//         if (
//           (Math.abs(element.delta.x) < 0.001 && (element.delta.x = 0),
//           Math.abs(element.delta.y) < 0.001 && (element.delta.y = 0),
//           Math.abs(element.delta.distance) < 0.001 &&
//             (element.delta.distance = 0),
//           element.prevEvent && this.currentEvent)
//         ) {
//           const trigger =
//               (this.currentEvent.screenX - element.prevEvent.screenX) * 2,
//             start = (this.currentEvent.screenY - element.prevEvent.screenY) * 2;
//           ((element.x = trigger / (window.innerWidth / 2)),
//             (element.y = start / (window.innerHeight / 2)),
//             (element.x = Math.max(-1, Math.min(1, element.x))),
//             (element.y = Math.max(-1, Math.min(1, element.y))));
//           const end =
//             Math.sqrt(
//               window.innerWidth * window.innerWidth +
//                 window.innerHeight * window.innerHeight,
//             ) / 2;
//           ((element.distance =
//             (Math.sqrt(trigger * trigger + start * start) / end) * 10),
//             (element.distance = Math.max(0, Math.min(1, element.distance))));
//         }
//         element.prevEvent = this.currentEvent;
//       }, this.precision)));
//   }
//
//   addEvents() {
//     this.isMobile
//       ? ((this.onTouchStart = this.onTouchStart.bind(this)),
//         (this.onTouchMove = this.onTouchMove.bind(this)),
//         (this.onTouchEnd = this.onTouchEnd.bind(this)),
//         window.addEventListener("touchstart", this.onTouchStart),
//         window.addEventListener("touchmove", this.onTouchMove),
//         window.addEventListener("touchend", this.onTouchEnd))
//       : ((this.onMouseMove = this.onMouseMove.bind(this)),
//         window.addEventListener("mousemove", this.onMouseMove));
//   }
//
//   removeEvents() {
//     this.isMobile
//       ? (window.addEventListener("touchstart", this.onTouchStart),
//         window.addEventListener("touchmove", this.onTouchMove),
//         window.addEventListener("touchend", this.onTouchEnd))
//       : window.removeEventListener("mousemove", this.onMouseMove);
//   }
//
//   onTouchStart(element) {
//     this.isActive = !0;
//     let trigger = element.clientX;
//     (element.touches &&
//       element.touches[0] &&
//       (trigger = element.touches[0].clientX),
//       (this.touch.enable = !0),
//       (this.touch.start.enable = !0),
//       (this.touch.start.x = trigger));
//   }
//
//   onTouchMove(element) {
//     let trigger = element.clientX;
//     if (
//       (element.touches && element.touches[0]
//         ? (trigger = element.touches[0].clientX)
//         : element.originalEvent &&
//           element.originalEvent.changedTouches[0] &&
//           (trigger = element.originalEvent.changedTouches[0].clientX),
//       this.touch.start.enable)
//     ) {
//       const start = this.touch.end.x + (trigger - this.touch.start.x);
//       this.touch.ing.x = clamp(start / window.innerWidth, -1, 1);
//     }
//   }
//
//   onTouchEnd(element) {
//     ((this.touch.start.enable = !1),
//       (this.touch.end.x = this.touch.ing.x),
//       (this.touch.ing.x = 0));
//   }
//
//   onMouseMove(element) {
//     (this.onMouseMoveBefore && this.onMouseMoveBefore(this),
//       this.isFirst ||
//         gsap.to(this.move, {
//           active: 1,
//           duration: this.move.duration,
//           ease: this.move.ease,
//         }),
//       (this.isFirst = !0),
//       (this.isActive = !0),
//       (this.x = element.clientX),
//       (this.y = element.clientY),
//       (this.currentEvent = element),
//       this.onMouseMoveAfter && this.onMouseMoveAfter(this));
//   }
//
//   raf() {
//     (this.isMobile ? this.onUpdateForMobile() : this.onUpdateForDesktop(),
//       this.useRAF && (this.onRAF = requestAnimationFrame(this.raf.bind(this))));
//   }
//
//   lerp(element, trigger, start) {
//     return trigger + (element - trigger) * start;
//   }
//
//   onUpdateForDesktop() {
//     if (
//       (this.onUpdateBefore && this.onUpdateBefore(this),
//       (this.currentTime = performance.now() * 0.001),
//       (this.deltaTime = this.currentTime - this.lastTime),
//       this.isArray)
//     )
//       for (let element = 0; element < this.array.length; element++)
//         this.onUpdateDelta(this.array[element]);
//     else
//       this.onUpdateDelta(
//         this as unknown as Omit<typeof UsagiMouse, "ease"> & { ease: number },
//       );
//     ((this.lastTime = this.currentTime),
//       this.onUpdateAfter && this.onUpdateAfter(this));
//   }
//
//   onUpdateForMobile() {
//     ((this.touch.ing.delta.x +=
//       (this.touch.ing.x - this.touch.ing.delta.x) * this.touch.ing.ease),
//       (this.touch.ing.delta.x =
//         Math.abs(this.touch.ing.delta.x) > 0.001 ? this.touch.ing.delta.x : 0));
//   }
//
//   onUpdateDelta(element: {
//     [x: string]: any;
//     ease: number;
//     acceleration: {
//       delta: {
//         x: number;
//         y: number;
//         distance: number;
//       };
//       x: number;
//       y: number;
//       distance: number;
//     };
//     delta: {
//       x: number;
//       y: number;
//       distance: number;
//     };
//     center: {
//       x: number;
//       y: number;
//     };
//     shader: {
//       x: number;
//       y: number;
//     };
//   }) {
//     const trigger = Math.exp(
//       -element.ease * this.easeRatio.acceleration * this.deltaTime,
//     );
//     ((element.acceleration.delta.x = this.lerp(
//       element.acceleration.delta.x,
//       element.acceleration.x,
//       trigger,
//     )),
//       (element.acceleration.delta.y = this.lerp(
//         element.acceleration.delta.y,
//         element.acceleration.y,
//         trigger,
//       )),
//       (element.acceleration.delta.distance = this.lerp(
//         element.acceleration.delta.distance,
//         element.acceleration.distance,
//         trigger,
//       )));
//     const start = Math.exp(
//       -element.ease * this.easeRatio.delta * this.deltaTime,
//     );
//     ((element.delta.x = this.lerp(element.delta.x, this.x, start)),
//       (element.delta.y = this.lerp(element.delta.y, this.y, start)),
//       (element.center.x =
//         (element.delta.x - window.innerWidth / 2) / window.innerWidth),
//       (element.center.y =
//         (element.delta.y - window.innerHeight / 2) / window.innerHeight),
//       (element.shader.x = (element.delta.x / window.innerWidth) * 2 - 1),
//       (element.shader.y = -(element.delta.y / window.innerHeight) * 2 + 1));
//   }
//
//   destroy() {
//     (this.onRAF && cancelAnimationFrame(this.onRAF),
//       (this.onRAF = null),
//       clearInterval(this.acceleration.interval),
//       this.removeEvents());
//   }
// }
//  const MOUSE: {
//     body: UsagiMouse;
//     once: () => void;
//     raf: () => void;
//   } = {
//     body: null!,
//     once: () => {
//       // MOUSE.body = {
//       //   prop: {
//       //     ease: [0.025, 0.05, 0.1],
//       //   },
//       //   isActive: false,
//       //   isFirst: false,
//       //   isArray: false,
//       //   onRAF: null!,
//       //   useRAF: false,
//       //   isMobile: false,
//       //   shader: null!,
//       //   center: null!,
//       //   delta: null!,
//       //   acceleration: null!,
//       //   move: {
//       //     active: 0,
//       //     ease: "power1.out",
//       //     duration: 2,
//       //   },
//       //   precision: 100,
//       //   ease: [0.025, 0.05, 0.1],
//       //   easeRatio: {
//       //     delta: 85,
//       //     acceleration: 60,
//       //   },
//       //   x: window.innerWidth / 2,
//       //   y: window.innerHeight / 2,
//       //   array: [],
//       //   currentEvent: null,
//       //   currentTime: performance.now() * 0.001,
//       //   lastTime: 0,
//       //   deltaTime: 0,
//       //   touch: {
//       //     enable: !1,
//       //     active: 0,
//       //     start: {
//       //       enable: !1,
//       //       x: 0,
//       //     },
//       //     ing: {
//       //       x: 0,
//       //       delta: {
//       //         x: 0,
//       //       },
//       //       ease: 0.025,
//       //     },
//       //     end: {
//       //       x: 0,
//       //     },
//       //   },
//       //   once: () => {
//       //     MOUSE.body.onRunRabbit();
//       //   },
//       //   onRunRabbit: () => {
//       //     MOUSE.body.isArray = !0;
//       //     MOUSE.body.onInitArray();
//       //   },
//       //   onInitSingle: () => {
//       //     ((MOUSE.body.center = {
//       //       x: 0,
//       //       y: 0,
//       //     }),
//       //       (MOUSE.body.shader = {
//       //         x: 0,
//       //         y: 0,
//       //       }),
//       //       (MOUSE.body.delta = {
//       //         x: 0,
//       //         y: 0,
//       //       }),
//       //       (MOUSE.body.acceleration = {
//       //         prevEvent: null,
//       //         x: 0,
//       //         y: 0,
//       //         distance: 0,
//       //         delta: {
//       //           x: 0,
//       //           y: 0,
//       //           distance: 0,
//       //         },
//       //       }),
//       //       MOUSE.body.addEvents(),
//       //       MOUSE.body.onInitGetAcceleration(MOUSE.body.acceleration),
//       //       MOUSE.body.useRAF && MOUSE.body.raf());
//       //   },
//       //   onInitArray: () => {
//       //     MOUSE.body.addEvents();
//       //     for (
//       //       let element = 0;
//       //       element < (MOUSE.body.ease as Array<number>).length;
//       //       element++
//       //     ) {
//       //       const trigger = MOUSE.body.ease[element];
//       //       MOUSE.body.array.push({
//       //         ease: trigger,
//       //         center: {
//       //           x: 0,
//       //           y: 0,
//       //         },
//       //         shader: {
//       //           x: 0,
//       //           y: 0,
//       //         },
//       //         delta: {
//       //           x: 0,
//       //           y: 0,
//       //         },
//       //         acceleration: {
//       //           prevEvent: null,
//       //           x: 0,
//       //           y: 0,
//       //           distance: 0,
//       //           delta: {
//       //             x: 0,
//       //             y: 0,
//       //             distance: 0,
//       //           },
//       //         },
//       //         lastTime: 0,
//       //       });
//       //     }
//       //     (MOUSE.body.isMobile ||
//       //       MOUSE.body.array.forEach((element, trigger) => {
//       //         MOUSE.body.onInitGetAcceleration(element.acceleration);
//       //       }),
//       //       MOUSE.body.useRAF && MOUSE.body.raf());
//       //   },
//       //   onInitGetAcceleration: (element) => {
//       //     (clearInterval(element.interval),
//       //       (element.interval = setInterval(() => {
//       //         if (
//       //           (Math.abs(element.delta.x) < 0.001 && (element.delta.x = 0),
//       //           Math.abs(element.delta.y) < 0.001 && (element.delta.y = 0),
//       //           Math.abs(element.delta.distance) < 0.001 &&
//       //             (element.delta.distance = 0),
//       //           element.prevEvent && MOUSE.body.currentEvent)
//       //         ) {
//       //           const trigger =
//       //               (MOUSE.body.currentEvent.screenX -
//       //                 element.prevEvent.screenX) *
//       //               2,
//       //             start =
//       //               (MOUSE.body.currentEvent.screenY -
//       //                 element.prevEvent.screenY) *
//       //               2;
//       //           ((element.x = trigger / (window.innerWidth / 2)),
//       //             (element.y = start / (window.innerHeight / 2)),
//       //             (element.x = Math.max(-1, Math.min(1, element.x))),
//       //             (element.y = Math.max(-1, Math.min(1, element.y))));
//       //           const end =
//       //             Math.sqrt(
//       //               window.innerWidth * window.innerWidth +
//       //                 window.innerHeight * window.innerHeight,
//       //             ) / 2;
//       //           ((element.distance =
//       //             (Math.sqrt(trigger * trigger + start * start) / end) * 10),
//       //             (element.distance = Math.max(
//       //               0,
//       //               Math.min(1, element.distance),
//       //             )));
//       //         }
//       //         element.prevEvent = MOUSE.body.currentEvent;
//       //       }, MOUSE.body.precision)));
//       //   },
//       //   addEvents: () => {
//       //     MOUSE.body.isMobile
//       //       ? ((MOUSE.body.onTouchStart = MOUSE.body.onTouchStart.bind(
//       //           MOUSE.body,
//       //         )),
//       //         (MOUSE.body.onTouchMove = MOUSE.body.onTouchMove.bind(
//       //           MOUSE.body,
//       //         )),
//       //         (MOUSE.body.onTouchEnd = MOUSE.body.onTouchEnd.bind(MOUSE.body)),
//       //         window.addEventListener("touchstart", MOUSE.body.onTouchStart),
//       //         window.addEventListener("touchmove", MOUSE.body.onTouchMove),
//       //         window.addEventListener("touchend", MOUSE.body.onTouchEnd))
//       //       : ((MOUSE.body.onMouseMove = MOUSE.body.onMouseMove.bind(
//       //           MOUSE.body,
//       //         )),
//       //         window.addEventListener("mousemove", MOUSE.body.onMouseMove));
//       //   },
//       //   removeEvents: () => {
//       //     MOUSE.body.isMobile
//       //       ? (window.addEventListener("touchstart", MOUSE.body.onTouchStart),
//       //         window.addEventListener("touchmove", MOUSE.body.onTouchMove),
//       //         window.addEventListener("touchend", MOUSE.body.onTouchEnd))
//       //       : window.removeEventListener("mousemove", MOUSE.body.onMouseMove);
//       //   },
//       //   onTouchStart: (element) => {
//       //     MOUSE.body.isActive = !0;
//       //     let xCoord = element.clientX;
//       //     (element.touches &&
//       //       element.touches[0] &&
//       //       (xCoord = element.touches[0].clientX),
//       //       (MOUSE.body.touch.enable = !0),
//       //       (MOUSE.body.touch.start.enable = !0),
//       //       (MOUSE.body.touch.start.x = xCoord));
//       //   },
//       //
//       //   onTouchMove: (ev) => {
//       //     let xCoord = ev.clientX;
//       //
//       //     if (
//       //       (ev.touches && ev.touches[0]
//       //         ? (xCoord = ev.touches[0].clientX)
//       //         : ev.originalEvent &&
//       //           ev.originalEvent.changedTouches[0] &&
//       //           (xCoord = ev.originalEvent.changedTouches[0].clientX),
//       //       MOUSE.body.touch.start.enable)
//       //     ) {
//       //       const start =
//       //         MOUSE.body.touch.end.x + (xCoord - MOUSE.body.touch.start.x);
//       //       MOUSE.body.touch.ing.x = clamp(start / window.innerWidth, -1, 1);
//       //     }
//       //   },
//       //
//       //   onTouchEnd: (element) => {
//       //     ((MOUSE.body.touch.start.enable = !1),
//       //       (MOUSE.body.touch.end.x = MOUSE.body.touch.ing.x),
//       //       (MOUSE.body.touch.ing.x = 0));
//       //   },
//       //
//       //   onMouseMove: (element) => {
//       //     (MOUSE.body.onMouseMoveBefore &&
//       //       MOUSE.body.onMouseMoveBefore(MOUSE.body),
//       //       MOUSE.body.isFirst ||
//       //         gsap.to(MOUSE.body.move, {
//       //           active: 1,
//       //           duration: MOUSE.body.move.duration,
//       //           ease: MOUSE.body.move.ease,
//       //         }),
//       //       (MOUSE.body.isFirst = !0),
//       //       (MOUSE.body.isActive = !0),
//       //       (MOUSE.body.x = element.clientX),
//       //       (MOUSE.body.y = element.clientY),
//       //       (MOUSE.body.currentEvent = element),
//       //       MOUSE.body.onMouseMoveAfter &&
//       //         MOUSE.body.onMouseMoveAfter(MOUSE.body));
//       //   },
//       //
//       //   raf: () => {
//       //     (MOUSE.body.isMobile
//       //       ? MOUSE.body.onUpdateForMobile()
//       //       : MOUSE.body.onUpdateForDesktop(),
//       //       MOUSE.body.useRAF &&
//       //         (MOUSE.body.onRAF = requestAnimationFrame(
//       //           MOUSE.body.raf.bind(MOUSE.body),
//       //         )));
//       //   },
//       //
//       //   onUpdateForDesktop: () => {
//       //     if (
//       //       (MOUSE.body.onUpdateBefore && MOUSE.body.onUpdateBefore(MOUSE.body),
//       //       (MOUSE.body.currentTime = performance.now() * 0.001),
//       //       (MOUSE.body.deltaTime =
//       //         MOUSE.body.currentTime - MOUSE.body.lastTime),
//       //       MOUSE.body.isArray)
//       //     )
//       //       for (let element = 0; element < MOUSE.body.array.length; element++)
//       //         MOUSE.body.onUpdateDelta(MOUSE.body.array[element]);
//       //     else
//       //       MOUSE.body.onUpdateDelta(
//       //         MOUSE.body as unknown as Omit<UsagiMouse, "ease"> & {
//       //           ease: number;
//       //         },
//       //       );
//       //     ((MOUSE.body.lastTime = MOUSE.body.currentTime),
//       //       MOUSE.body.onUpdateAfter && MOUSE.body.onUpdateAfter(MOUSE.body));
//       //   },
//       //
//       //   onUpdateForMobile: () => {
//       //     ((MOUSE.body.touch.ing.delta.x +=
//       //       (MOUSE.body.touch.ing.x - MOUSE.body.touch.ing.delta.x) *
//       //       MOUSE.body.touch.ing.ease),
//       //       (MOUSE.body.touch.ing.delta.x =
//       //         Math.abs(MOUSE.body.touch.ing.delta.x) > 0.001
//       //           ? MOUSE.body.touch.ing.delta.x
//       //           : 0));
//       //   },
//       //   onUpdateDelta: (element: {
//       //     [x: string]: any;
//       //     ease: number;
//       //     acceleration: {
//       //       delta: {
//       //         x: number;
//       //         y: number;
//       //         distance: number;
//       //       };
//       //       x: number;
//       //       y: number;
//       //       distance: number;
//       //     };
//       //     delta: {
//       //       x: number;
//       //       y: number;
//       //       distance: number;
//       //     };
//       //     center: {
//       //       x: number;
//       //       y: number;
//       //     };
//       //     shader: {
//       //       x: number;
//       //       y: number;
//       //     };
//       //   }) => {
//       //     const trigger = Math.exp(
//       //       -element.ease *
//       //         MOUSE.body.easeRatio.acceleration *
//       //         MOUSE.body.deltaTime,
//       //     );
//       //     ((element.acceleration.delta.x = lerp(
//       //       element.acceleration.x,
//       //       element.acceleration.delta.x,
//       //       trigger,
//       //     )),
//       //       (element.acceleration.delta.y = lerp(
//       //         element.acceleration.y,
//       //         element.acceleration.delta.y,
//       //         trigger,
//       //       )),
//       //       (element.acceleration.delta.distance = lerp(
//       //         element.acceleration.distance,
//       //         element.acceleration.delta.distance,
//       //         trigger,
//       //       )));
//       //     const start = Math.exp(
//       //       -element.ease * MOUSE.body.easeRatio.delta * MOUSE.body.deltaTime,
//       //     );
//       //     ((element.delta.x = lerp(element.delta.x, MOUSE.body.x, start)),
//       //       (element.delta.y = lerp(MOUSE.body.y, element.delta.y, start)),
//       //       (element.center.x =
//       //         (element.delta.x - window.innerWidth / 2) / window.innerWidth),
//       //       (element.center.y =
//       //         (element.delta.y - window.innerHeight / 2) / window.innerHeight),
//       //       (element.shader.x = (element.delta.x / window.innerWidth) * 2 - 1),
//       //       (element.shader.y =
//       //         -(element.delta.y / window.innerHeight) * 2 + 1));
//       //   },
//       //   destroy: () => {
//       //     (MOUSE.body.onRAF && cancelAnimationFrame(MOUSE.body.onRAF),
//       //       (MOUSE.body.onRAF = null),
//       //       clearInterval(MOUSE.body.acceleration.interval),
//       //       MOUSE.body.removeEvents());
//       //   },
//       // };
//       // MOUSE.body.once();
//     },
//     raf: () => {
//       // MOUSE.body.raf();
//     },
//   };
