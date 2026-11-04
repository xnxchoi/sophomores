"use client";

import { useCanvasClaim } from "@/components/gl/canvas-frameloop";
import { PerspectiveCamera, shaderMaterial, useTexture, View } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, RepeatWrapping, Vector2 } from "three";
import { menuFragmentShader, menuVertexShader } from "./menu-shaders";

const DARK = ["#3B1E1D", "#603230", "#85504D", "#A5716E"] as const;
const LIGHT = ["#F9E2E0", "#EAC0BD", "#D89B95", "#C07D78"] as const;

const MenuGradientMaterial = shaderMaterial(
  {
    u_color: DARK.map((hex) => new Color(hex)),
    u_colorMixer: 0,
    u_additionalZoom: 0,
    u_additionalOffset: new Vector2(),
    u_size: 0.2,
    u_offset: new Vector2(0.42, 0.6),
    u_speed: 0.02,
    u_pixels: new Vector2(1, 1),
    u_resolution: new Vector2(1, 1),
    u_time: 1,
    u_opacity: 1,
    u_noiseTexture: null
  },
  menuVertexShader,
  menuFragmentShader
);

extend({ MenuGradientMaterial });

function colorsFor(theme: string | null) {
  return (theme === "light" ? LIGHT : DARK).map((hex) => new Color(hex));
}

function GradientMesh() {
  const material = useMemo(() => new MenuGradientMaterial(), []);
  const theme = useRef("dark");
  const noise = useTexture("/assets/seamless.png", (texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  });

  // Shader uniforms are the live GPU state, not React state.
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    material.uniforms.u_noiseTexture.value = noise;
    material.uniforms.u_time.value += delta * 0.01;
    const nextTheme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    if (theme.current === nextTheme) return;
    theme.current = nextTheme;
    const current = material.uniforms.u_color.value as Color[];
    colorsFor(nextTheme).forEach((color, index) => current[index]?.copy(color));
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <mesh>
      <planeGeometry args={[1.5, 1.5, 128, 128]} />
      <primitive object={material} attach="material" side={DoubleSide} />
    </mesh>
  );
}

/** The menu field. It joins the shared canvas and keeps the loop running while open. */
export function MenuGradient() {
  useCanvasClaim(true);

  return (
    <View className="pointer-events-none absolute inset-0">
      <PerspectiveCamera makeDefault position={[0, 0, 0.2]} fov={35} near={0.01} far={1000} />
      <GradientMesh />
    </View>
  );
}
