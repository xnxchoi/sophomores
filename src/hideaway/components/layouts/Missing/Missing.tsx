"use client";
import fragmentShader from "@/hideaway/components/layouts/Missing/shader/fragment.glsl";
import vertexShader from "@/hideaway/components/layouts/Missing/shader/vertex.glsl";
import { TWEEN_EASE } from "@/hideaway/constants/animations";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { useVoyageur } from "@/hideaway/stores/Routing/RP_Voyageur";
import { motionCallback } from "@/hideaway/utilities/motionHelpers";
import { Canvas } from "@react-three/fiber";
import { animate, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import "./mis.css";
import {
  CanvasTexture,
  Group,
  IUniform,
  MathUtils,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from "three";
import { useShallow } from "zustand/shallow";
const Manvas = m.create(Canvas);
export function Missing() {
  const is404 = useVoyageur(useShallow((l) => l.is404));
  const has = useRef(false);
  const setHeaderTransition = useRPStore((r) => r.setHeaderTransition);
  const curt = useRef<HTMLDivElement>(null!);
  const [aspectRatio, setAspectRatio] = useState(1);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const initializeSignage = useEffectEvent(() => {
    const canvas = curt.current;
    // extract "variation" parameter from the url
    const variation = 45;

    // Scene setup

    const scene = new Scene();
    const vMouse = new Vector2(0, 0);
    const vMouseDamp = new Vector2(0, 0);
    const vResolution = new Vector2(1, 1);

    // Viewport setup (updated on resize)
    let w = 1,
      h = 1;

    // Orthographic camera setup
    const aspect = w / h;
    const camera = new OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);

    const renderer = new WebGLRenderer({
      alpha: true,
      powerPreference: "high-performance"
    });
    canvas.appendChild(renderer.domElement);

    // Plane geometry covering the full viewport
    const group = new Group();

    const geo = new PlaneGeometry(1, 1); // Scaled to cover full viewport
    const vPixelRatio = window.devicePixelRatio;
    const uniforms = {
      u_resolution: { value: vResolution },
      u_mouse: { value: vMouseDamp },
      u_pixelRatio: { value: vPixelRatio }
    };
    if (!canvasEl.current) canvasEl.current = document.createElement("canvas");
    const canvass = canvasEl.current;
    ((canvass.width = canvas.clientWidth),
      (canvass.height = canvas.clientHeight));
    const ctx = canvass.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas context is not available");
    ctx.clearRect(0, 0, canvass.width, canvass.height);
    ctx.globalAlpha = 1;
    const svgEl = document.getElementById("svgel") as SVGSVGElement | null;
    if (!svgEl) throw new Error("SVG element is not defined");
    const d = svgEl.querySelector("path")?.getAttribute("d");
    if (!d) throw new Error("SVG path is not defined");
    // "m0 1098.61.14-258.06c42.73-65 82.1-132.06 118.11-201.13 35.99-69.07 68.06-138.46 96.2-208.22 28.12-69.76 52.89-138.84 74.27-207.26 21.38-68.39 39.4-135.12 54.07-200.14l345.56.18-.72 1343.24-207.34-.11.61-1152.22h-11.81c-21.39 85.34-46.45 166.94-75.14 244.83-28.7 77.9-60.22 151.7-94.52 221.46S228.86 816.26 190.62 877.2v16.27l620.32.33-.11 205.24zm1430.98 297.45c-64.06-.03-119.96-15.99-167.7-47.84s-87.35-77.93-118.78-138.24c-31.43-60.29-54.72-132.8-69.84-217.48s-22.65-179.84-22.59-285.54c.08-155.77 14.74-286.15 44.03-391.15 29.28-104.99 72.31-183.88 129.08-236.68 56.76-52.78 127.3-79.17 211.6-79.13 85.4.05 156.19 27.18 212.36 81.4 56.15 54.22 98.25 133.48 126.29 237.82 28.03 104.34 42.03 231.7 41.95 382.05-.06 107.04-7.97 203.57-23.75 289.58-15.78 86.04-39.7 159.18-71.76 219.43-32.06 60.28-72.27 106.32-120.61 138.12-48.35 31.8-105.1 47.69-170.28 47.66m3.48-203.2c25.85.01 49.45-8.77 70.82-26.37 21.35-17.6 39.35-46.04 53.98-85.33 14.61-39.27 26.16-90.39 34.63-153.4 8.45-62.99 12.72-139.2 12.76-228.63.06-107.02-6.36-197.11-19.24-270.27-12.89-73.16-32.23-129.06-58.06-167.69s-57.85-57.95-96.06-57.97c-32.6-.02-61.81 15.89-87.68 47.7q-38.805 47.76-59.94 156.45c-14.08 72.46-21.15 170.34-21.21 293.62-.05 89.43 3.83 165.3 11.67 227.64 7.83 62.33 19.04 112.78 33.64 151.4 14.57 38.62 32.54 67.07 53.89 85.36 21.33 18.31 44.94 27.46 70.79 27.48Zm622.05-93.16.14-258.06c42.73-65 82.1-132.06 118.11-201.13 35.99-69.07 68.06-138.46 96.2-208.22 28.12-69.76 52.89-138.84 74.27-207.26 21.38-68.39 39.4-135.12 54.07-200.14l345.56.18-.72 1343.24-207.34-.11.61-1152.22h-11.81c-21.39 85.34-46.45 166.94-75.14 244.83-28.7 77.9-60.22 151.7-94.52 221.46s-70.57 135.08-108.81 196.02v16.27l620.32.33-.11 205.24z";
    const path = new Path2D(d);
    const viewBox = svgEl.getAttribute("viewBox")?.split(" ");
    if (!viewBox) throw new Error("SVG viewBox attribute is not defined");
    const m = parseFloat(viewBox[2]),
      g = parseFloat(viewBox[3]),
      _ = canvass.width / m,
      v = canvass.height / g,
      y = Math.min(_, v);
    (ctx.setTransform(y, 0, 0, y, 0, 0),
      ctx.translate((canvass.width - m * y) / 2, (canvass.height - g * y) / 2),
      (ctx.fillStyle = `oklch(46.3% 0.187 28.3)`),
      ctx.fill(path));
    const txttr = new CanvasTexture(canvass);

    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader, // most of the action happening in the fragment
      transparent: true,
      opacity: 1,
      uniforms: {
        uTime: { value: 0.0 },
        uIntensity: { value: [0.0, 0.0] },
        uDirection: { value: 0.0 },
        u_mouse: { value: vMouseDamp },
        u_resolution: { value: vResolution },
        u_pixelRatio: { value: vPixelRatio },
        u_pxRange: { value: 3 },
        u_alpha: { value: 1 },
        canvasTexture: { type: "t", value: txttr } as IUniform
      },
      defines: {
        VAR: variation
      }
    });

    // Mesh creation
    const quad = new Mesh(geo, mat);
    quad.position.set(0, 0, 1);

    group.add(quad);
    scene.add(group);

    // Camera position and orientation
    camera.position.z = 100; // Set appropriately for orthographic
    // Animation loop to render
    let time,
      lastTime = 0;
    let rafID = 0;
    const update = () => {
      // calculate delta time
      time = performance.now() * 0.001;
      const dt = time - lastTime;

      lastTime = time;

      // ease mouse motion with damping
      for (const k in vMouse) {
        if (k == "x" || k == "y")
          vMouseDamp[k] = MathUtils.damp(vMouseDamp[k], vMouse[k], 1, dt);
      }
      renderer.render(scene, camera);
      rafID = requestAnimationFrame(update);
    };
    animate([
      [
        motionCallback(() => {
          setHeaderTransition("slide");
          resize();
          update();
        }),
        {
          duration: 0,
          at: 0
        }
      ],
      [
        svgEl,
        {
          opacity: 0
        },
        {
          duration: 1,
          ease: TWEEN_EASE.power4.inOut,
          at: 0
        }
      ]
    ]);

    const onPointerMove = (e: MouseEvent | PointerEvent) => {
      vMouse.set(
        -window.innerWidth + e.clientX * 2,
        window.innerHeight - 2 * e.clientY
      );
    };
    const preventer = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("pointermove", onPointerMove);
    document.body.addEventListener("touchmove", preventer, { passive: false });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;

      const dpr = window.devicePixelRatio;
      renderer.setSize(w, h);
      renderer.setPixelRatio(dpr);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      quad.scale.set(w, h, 1);
      vResolution.set(w, h).multiplyScalar(dpr);
      mat.uniforms.u_pixelRatio.value = dpr;

      uniforms.u_resolution.value = vResolution;
    };

    const remover = () => {
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("pointermove", onPointerMove);
      document.body.removeEventListener("touchmove", preventer);
      scene.remove(group, camera);
      quad.geometry.dispose();
      quad.material.dispose();
      txttr.dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      has.current = false;
      cancelAnimationFrame(rafID);
    };
    window.addEventListener("resize", resize);
    document.addEventListener("transFour", remover, { once: true });
  });
  useEffect(() => {
    if (curt.current && is404 && !has.current) {
      has.current = true;
      initializeSignage();
    }
  }, [is404]);

  return (
    <>
      {is404 && (
        <m.div
          ref={curt}
          className="curtains-canvas"
          initial={{ opacity: 0, visibility: "hidden" }}
          animate={{
            opacity: 1,
            visibility: "visible",
            transition: {
              type: "tween",
              ease: TWEEN_EASE.power4.inOut,
              duration: 0.3,
              delay: 0.3
            }
          }}
          exit={{ opacity: 0, visibility: "hidden" }}
        ></m.div>
      )}
    </>
  );
}
