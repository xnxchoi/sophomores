"use client";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, RepeatWrapping, Vector2, Vector3 } from "three";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import {
  meshBounds,
  PerspectiveCamera,
  shaderMaterial,
  useTexture
} from "@react-three/drei";

const vertexShader = `uniform float u_time;
uniform vec3 u_color[3];
varying vec2 v_uv;
varying vec3 v_color;
varying vec3 v_position;
uniform vec2 u_pixels;
uniform float u_opacity;

#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif

//	Simplex 3D Noise
//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x) {return mod(((x * 34.0) + 1.0) * x, 289.0);}
vec4 taylorInvSqrt(vec4 r) {return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    //  x0 = x0 - 0. + 0.0 * C
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    // Permutations
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
                                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
                             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                     + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0 / 7.0; // N=7
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);    // mod(j,N)

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1),
    dot(p2, x2), dot(p3, x3)));
}
void main() {
    v_color = vec3(0.5);
    vec2 noiseCoord = uv * vec2(3., 4.);
    float tilt = -0.8 * uv.y;
    float incline = uv.x * 0.1;
    float offset = 0.5 * incline * mix(-.25, 0.25, uv.y);
    v_color = u_color[2];
    vec3 pos = vec3(position.x, position.y, position.z + tilt + incline + offset);
    for (int i = 0;i < 3; i++) {
        float noiseFlow = 5. + float(i) * 0.3;
        float noiseSpeed = 10. + float(i) * 0.3;
        float noiseSeed = 1. + float(i) * 10.;
        vec2 noiseFreq = vec2(0.5, 0.8);
        float noise = snoise(vec3(noiseCoord.x * noiseFreq.x + u_time * noiseFlow, noiseCoord.y * noiseFreq.y, u_time * noiseSpeed + noiseSeed));
        v_color = mix(v_color, u_color[i], noise);
    }
    v_uv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`;
const fragmentShader = `uniform float u_time;
uniform float u_progress;
uniform sampler2D u_texture1;
uniform vec4 u_resolution;
uniform float uAdditionalZoom;
uniform vec2 uAdditionalOffset;
uniform vec3 u_color[3];
uniform float uSize;
uniform vec2 uOffset;
uniform float uColorMixer;
uniform float uSpeed;
uniform sampler2D u_noiseTexture;
varying vec2 v_uv;
varying vec3 v_color;
varying vec3 v_position;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 nUv = (-.5 + v_uv) * 2.;
    if (u_resolution.x < u_resolution.y) {
        nUv.x *= u_resolution.x / u_resolution.y;
    } else {
        nUv.y *= u_resolution.y / u_resolution.x;
    }
    nUv = nUv / 2. + .5;
    float additionalZoom = uAdditionalZoom;
    vec2 offset = uOffset + uAdditionalOffset;

    vec2 bUv = nUv * (uSize * 2. + additionalZoom);
    vec2 nUv1 = bUv + offset * (1.) + u_time * uSpeed;
    bUv.y -= .5;
    vec2 nUv2 = bUv + offset * (1.) - u_time * uSpeed;
    vec4 noiseColor1 = texture2D(u_noiseTexture, nUv1);
    float noise1 = noiseColor1.r;

    vec4 noiseColor2 = texture2D(u_noiseTexture, nUv2);
    float noise2 = noiseColor2.r;
    float noise = clamp((noise1 + noise2) / 2., 0., 1.);

    vec2 nUv3 = bUv + noise * .5;
    noise = texture2D(u_noiseTexture, nUv3).r;
    vec3 color = vec3(0.);
    noise = mix(noise, noise * 1.25 + .15, 0.);
    if (noise < 0.25) {
        color = mix(v_color, u_color[1], noise / 0.25);
    } else if (noise < 0.5) {
        color = mix(v_color, u_color[2], (noise - 0.25) / 0.25);
    } else if (noise < 0.75) {
        color = mix(v_color, u_color[2], (noise - 0.5) / 0.25);
    } else {
        color = v_color;
    }
    vec3 alt = pow(color, vec3(2.));
    alt = alt * 1. - step(.01, color);
    color = mix(color, alt, uColorMixer);
    gl_FragColor = vec4(v_uv, 0.0, 1.);

    //    gl_FragColor = vec4(v_color, 1.);
    gl_FragColor = vec4(color, 1.);
    #include <tonemapping_fragment>
        #include <colorspace_fragment>
}
`;
const VisibilityContext = createContext(undefined);
const VisibilityProvider = ({ children }) => {
  const visibilityRef = useRef();
  const [visible, hv] = useState(false);
  const setVisible = useCallback(
    (visibil) => {
      hv(visibil);
    },
    [hv]
  );
  if (!visibilityRef.current) {
    visibilityRef.current = { visible, setVisible };
  }
  return (
    <VisibilityContext.Provider value={visibilityRef.current}>
      {children}
    </VisibilityContext.Provider>
  );
};
const useVisibility = () => {
  const haC = useContext(VisibilityContext);
  if (!haC) {
    throw new Error("useVisibility must be used within VisibilityProvider");
  }
  return haC;
};
const GradientModuleOuter = (props) => {
  const { setVisible } = useVisibility();
  const { inView, ref } = useInView();
  useEffect(() => {
    setVisible(inView);
  }, [inView, setVisible]);
  return (
    <div
      className={cn("absolute inset-0 h-full w-full", props.className)}
      ref={ref}
    >
      <Canvas className="preview__gradient">
        <PerspectiveCamera
          near={0.01}
          far={1000}
          position={[0, 0, 0.2]}
          fov={35}
          aspect={2}
          makeDefault={true}
        />
        {props.children}
      </Canvas>
    </div>
  );
};
const GradientModuleInner = () => {
  const noiseTexture = useTexture(
    {
      map: "/assets/seamless.png"
    },
    (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
    }
  );
  const gradientt = useRef();
  const { gl } = useThree();
  const colorSchemes = useMemo(
    () => [
      [
        parseInt("021628", 16),
        parseInt("044A66", 16),
        parseInt("0EA5B5", 16),
        parseInt("2358D6", 16)
      ]
    ],
    []
  );
  const uOffset = useMemo(() => new Vector2(0.42, 0.6), []);
  const u_pixels = useMemo(() => new Vector2(1, 1), []);
  const u_resolution = useMemo(() => new Vector2(1, 1), []);
  const uAdditionalOffset = useMemo(() => new Vector2(0), []);
  const u_color = useMemo(
    () => [
      new Color(colorSchemes[0][0]),
      new Color(colorSchemes[0][1]),
      new Color(colorSchemes[0][2]),
      new Color(colorSchemes[0][3])
    ],
    [colorSchemes]
  );
  const uOpacity = useRef(1.0);
  const colore = useMemo(() => new Color("rgb(122,122,122)"), []);
  const vecc = useMemo(() => new Vector3(0, 0, 0.46), []);
  const uniforms = useMemo(
    () => ({
      u_color: u_color,
      uColorMixer: 0,
      uAdditionalZoom: 0,
      uAdditionalOffset: uAdditionalOffset,
      uSize: 0.2,
      uOffset: uOffset,
      uSpeed: 0.02,
      u_pixels: u_pixels,
      u_resolution: u_resolution,
      u_time: 1.0,
      u_noiseTexture: noiseTexture,
      u_opacity: 1.0
    }),
    [uOffset, u_pixels, uAdditionalOffset, u_resolution, noiseTexture, u_color]
  );

  const [dpr, setDpr] = useState(0);
  useEffect(() => {
    let devicePixelRatio = window.devicePixelRatio || 2;
    setDpr(devicePixelRatio);
    let pe = gl.domElement.parentElement;
    gl.domElement.width = pe.offsetWidth;
    gl.domElement.height = pe.offsetHeight;
  }, [gl.domElement]);

  useEffect(() => {
    gl.setPixelRatio(dpr);
  }, [dpr, gl]);
  const GradientShader = shaderMaterial(uniforms, vertexShader, fragmentShader);
  extend({ GradientShader });
  useFrame((state, delta) => {
    gradientt.current.uniforms.u_time.value += delta * 0.01;
  });
  return (
    <>
      <ambientLight args={[colore]} intensity={1} />
      <directionalLight
        color={colore.setRGB(122, 122, 122)}
        intensity={1}
        position={vecc}
      />
      <mesh raycast={meshBounds}>
        <planeGeometry args={[1.5, 1.5, 300, 300]} />
        <gradientShader
          ref={gradientt}
          opacity={uOpacity.current}
          extensions={{
            derivatives: "#extension GL_OES_standard_derivatives: enable"
          }}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
};

export function EventGateGradient(props) {
  return (
    <VisibilityProvider>
      <GradientModuleOuter className={props.className}>
        <GradientModuleInner />
      </GradientModuleOuter>
    </VisibilityProvider>
  );
}
