// import { GPUComputationRenderer } from 'three-stdlib/misc/GPUComputationRenderer.js'
// import {
//   Color,
//   MeshBasicMaterial,
//   OrthographicCamera,
//   PlaneGeometry, RepeatWrapping,
//   Scene,
//   Uniform,
//   Vector2,
//   WebGLRenderer,
// } from 'three'
// import gsap from 'gsap/dist/gsap'
// import { extend } from '@react-three/fiber'
// import { useLenis } from 'lenis/react'
// import { useWindowResize } from 'src/scripts/rp_utils.js'
// import { useEffect } from 'types-react'
// import { BlendFunction, Effect, EffectComposer, EffectPass, KawaseBlurPass, RenderPass } from 'postprocessing'
// import { shaderMaterial } from '@react-three/drei'
// import vtx from 'src/graphics/Gradient/shaders/vtx.glsl'
// import frgmnt from 'src/graphics/Gradient/shaders/frgmt.glsl'
//
// class GPGPU {
//   constructor(ze, Gr, Yr = ze) {
//     ;(this.textures = {}),
//       (this.variables = []),
//       (this.gpuComputer = new GPUComputationRenderer(ze, Yr, Gr))
//   }
//
//   createTexture(ze, Gr = 8) {
//     return (
//       (this.textures[ze] = this.gpuComputer.createTexture()),
//         this._createIndexes(Gr, this.textures[ze]),
//         this.textures[ze]
//     )
//   }
//
//   _createIndexes(ze, Gr) {
//     const Yr = ze * ze
//     Gr.indexes = new Float32Array(Yr * 2)
//     for (let Kr = 0; Kr < Yr; Kr++)
//       (Gr.indexes[Kr * 2 + 0] = (Kr % ze) / ze), (Gr.indexes[Kr * 2 + 1] = ~~(Kr / ze) / ze)
//   }
//
//   addVariable(ze, Gr, Yr, Kr) {
//     const Zr = this.gpuComputer.addVariable(ze, Yr, Gr)
//     if ((this.gpuComputer.setVariableDependencies(Zr, [Zr]), Kr))
//       for (const Qr in Kr)
//         Zr.material.uniforms[Qr] = {
//           value: Kr[Qr],
//         }
//     const Jr = this.gpuComputer.init()
//     Jr !== null && console.error(Jr), (this.variables[ze] = Zr)
//   }
//
//   addDebugPlane(ze, Gr) {
//     let Yr = new Mesh(
//       new PlaneGeometry(1, 1),
//       new MeshBasicMaterial({
//         map: this.gpuComputer.getCurrentRenderTarget(this.variables[Gr]).texture,
//       }),
//     )
//     ze.add(Yr),
//       gsap.ticker.add(() => {
//         ;(Yr.material.map = this.gpuComputer.getCurrentRenderTarget(this.variables[Gr]).texture),
//           (Yr.material.needsUpdate = !0)
//       })
//   }
// }
//
// extend({ GPGPU })
// const GrainMe = () => {
//   const config = {
//       fps: 60,
//       stats: !0,
//       loadingAnim: !0,
//       webgl: {
//         enable: !0,
//         pixelRatio: 1,
//       },
//     }
//   ;(config.fps = 60),
//     (config.stats = !1),
//     (config.loadingAnim = !0),
//     (config.webgl.enable = !0),
//     (config.webgl.pixelRatio = 1)
//   let fps = config.fps
//   fps ? (gsap.ticker.fps(fps), fps < 60 && console.error(fps, 'FPS')) : console.error('No FPS set')
//   useLenis((Wr) => {
//     uScrollOffset.value += Wr.velocity * 3e-4
//   })
//   const renderer = new WebGLRenderer({
//     antialias: !1,
//     alpha: !0,
//     depth: !1,
//     stencil: !0,
//     powerPreference: 'high-performance',
//   })
//   renderer.setPixelRatio(config.webgl.pixelRatio)
//   const canvas$1 = renderer.domElement
//   const windowResize = useWindowResize({ debounce: 140 })
//   const u_resolution = new Uniform(new Vector2(canvas$1.offsetWidth, canvas$1.offsetHeight))
//
//   function createGPGPU(Wr, ze) {
//     ;(gpgpu = new GPGPU(Wr, renderer, ze)),
//       gpgpu.addVariable('tPosition', null, simulationFragShader, {
//         uTime: 0,
//         uDelta: 0,
//       }),
//       (uSimulationTexture.value = gpgpu.gpuComputer.getCurrentRenderTarget(
//         gpgpu.variables.tPosition,
//       ).texture)
//   }
//
//   useEffect(() => {
//     const resize$2 = () => {
//       const Wr = window.innerWidth,
//         ze = window.innerHeight
//       renderer.setSize(Wr, ze)
//       u_resolution.value.set(canvas$1.offsetWidth, canvas$1.offsetHeight)
//       gpgpu && (gpgpu.gpuComputer.dispose(), (gpgpu.gpuComputer = null), (gpgpu = null)),
//         (w = Math.floor(document.documentElement.clientWidth / 40)),
//         (h$1 = Math.floor(window.innerHeight / 40)),
//         createGPGPU(w, h$1)
//     }
//     resize$2()
//   }, [windowResize])
//
//   const container = document.querySelector('.webgl')
//   container.appendChild(canvas$1)
//   const scene = new Scene()
//   scene.background = new Color(16777215)
//   const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
//   camera.position.z = 1
//   const simulationFragShader = `
// // The size of the computation (sizeX * sizeY) is defined as 'resolution' automatically in the shader.
// // For example:
// // #DEFINE resolution vec2( 1024.0, 1024.0 )
//
// uniform vec2 uMouse;
// uniform vec2 uPrevMouse;
// uniform float uTime;
// uniform float uDelta;
// uniform float uMouseFactor;
//
// // Function to calculate the minimum distance from a point to a line segment
// float distanceToSegment(vec2 point, vec2 start, vec2 end) {
//     vec2 lineVec = end - start;
//     vec2 pointVec = point - start;
//     float lineLen = length(lineVec);
//     vec2 lineUnitVec = lineVec / lineLen;
//     float projLength = dot(pointVec, lineUnitVec);
//     projLength = clamp(projLength, 0.0, lineLen);
//     vec2 projPoint = start + lineUnitVec * projLength;
//     return length(point - projPoint);
// }
//
// void main()
// {
//     vec2 uv = gl_FragCoord.xy / resolution.xy;
//
//     vec4 data = texture2D(tPosition, uv);
//
//     // blacken over time
//     data.r = mix(data.r, .5, uDelta * .002);
//     data.g = mix(data.g, .5, uDelta * .002);
//     data.b = mix(data.b, 0., uDelta * .001);
//
//     //float aspect = min(resolution.x, resolution.y) / max(resolution.x, resolution.y);
//     //float mixer = smoothstep(.65, .85, aspect);
//     //float aspectCorrection = mix(1., 1., mixer);
//
//
//     //direction = vec2(10., 10.);
//     //float angle = atan(direction.y, direction.x);
//     //float hue = degrees(angle);
//
//     // Normalize hue from -180 to 180 to 0 to 1
//     //hue = mod((hue / 360.0) + 1.0, 1.0);
//
//
//
//
//     data.r = clamp(data.r, 0., 1.);
//     data.g = clamp(data.g, 0., 1.);
//     data.b = clamp(data.b, 0., 1.);
//
//     gl_FragColor = data;
// }
// `
//
//   const uScrollOffset = new Uniform(0)
//
//   let w = Math.floor(document.documentElement.clientWidth / 40),
//     h$1 = Math.floor(window.innerHeight / 40),
//     gpgpu
//   const uSimulationTexture = new Uniform()
//   createGPGPU(w, h$1)
//   gsap.ticker.add((Wr, ze) => {
//     gpgpu &&
//     ((gpgpu.variables.tPosition.material.uniforms.uTime.value = Wr),
//       (gpgpu.variables.tPosition.material.uniforms.uDelta.value = ze),
//       gpgpu.gpuComputer.compute())
//   })
//   const grain = `uniform float uXCount;
// uniform float uYCount;
// uniform float uIntensity;
//
// vec2 hash(vec2 p) // replace this by something better
// {
//   p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
//   return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
// }
//
// float noise(in vec2 p) {
//   const float K1 = 0.366025404; // (sqrt(3)-1)/2;
//   const float K2 = 0.211324865; // (3-sqrt(3))/6;
//
//   vec2 i = floor(p + (p.x + p.y) * K1);
//   vec2 a = p - i + (i.x + i.y) * K2;
//   float m = step(a.y, a.x);
//   vec2 o = vec2(m, 1.0 - m);
//   vec2 b = a - o + K2;
//   vec2 c = a - 1.0 + 2.0 * K2;
//   vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
//   vec3 n =
//       h * h * h * h *
//       vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
//   return dot(n, vec3(70.0));
// }
//
// float speed = 12.;
// // float intensity = .01;
//
// float random2d(vec2 coord) {
//   return fract(sin(dot(coord.xy, vec2(12.9898, 78.233))) * 43758.5453);
// }
//
// float blendSoftLight(float base, float blend) {
//   return (blend < 0.5)
//              ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend))
//              : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
// }
//
// vec3 blendSoftLight(vec3 base, vec3 blend) {
//   return vec3(blendSoftLight(base.r, blend.r), blendSoftLight(base.g, blend.g),
//               blendSoftLight(base.b, blend.b));
// }
//
// vec3 blendSoftLight(vec3 base, vec3 blend, float opacity) {
//   return (blendSoftLight(base, blend) * opacity + base * (1.0 - opacity));
// }
//
// void mainImage(const in vec4 inputColor, const in vec2 uv,
//                out vec4 outputColor) {
//   float gridX = floor(uv.x * uXCount) / uXCount;
//   float gridY = 1.0 - floor(uv.y * uYCount) / uYCount;
//   float t = mod(time, 1.);
//   // float timeSpeed = time; // -> fluide (it's random, so we cant control the
//   // speed)
//   float timeSpeed = floor(t * 8.); // -> saccadé
//   // float timeSpeed = 1.;
//   // float intensity = (inputColor.r + inputColor.g + inputColor.b) / 3.;
//   float grain = random2d(vec2(gridX + timeSpeed, gridY));
//
//   grain -= grain / 2.;
//   grain *= .1;
//
//   vec3 resultColor =
//       blendSoftLight(inputColor.rgb, inputColor.rgb + grain, uIntensity);
//
//   outputColor = vec4(resultColor, 1.0);
//   // outputColor = vec4(inputColor.rgb, 1.0);
// }
// `,
//     pixelSize = window.devicePixelRatio,
//     uXCount = new Uniform(canvas$1.offsetWidth / pixelSize),
//     uYCount = new Uniform(canvas$1.offsetHeight / pixelSize),
//     uIntensity = new Uniform(1.29),
//     renderPass = new RenderPass(scene, camera),
//     grainEffect = new Effect('grain', grain, {
//       blendFunction: BlendFunction.NORMAL,
//       uniforms: new Map([
//         ['uXCount', uXCount],
//         ['uYCount', uYCount],
//         ['uIntensity', uIntensity],
//       ]),
//     }),
//     blurPass = new KawaseBlurPass()
//   blurPass.scale = 2
//   const displacementEffect = new Effect(
//       'displacement',
//       `
//     uniform sampler2D uSimulationTexture;
//     uniform vec2 uDisplacementStrength;
//     uniform float uCursorColoring;
//
//     void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
//         // UV aspect fix
//         /* vec2 nUv = (-.5 + uv) * 2.;
//         if( resolution.x < resolution.y ) {
//             nUv.x *= resolution.x / resolution.y;
//         } else {
//             nUv.y *= resolution.y / resolution.x;
//         }
//         nUv = nUv / 2. + .5; */
//
//         vec4 gpgpuColor = texture2D(uSimulationTexture, vUv);
//
//         vec2 dUv = vec2(
//             uv.x - (-0.5 + gpgpuColor.r) * uDisplacementStrength.x * gpgpuColor.b,
//             uv.y - (-0.5 + gpgpuColor.g) * uDisplacementStrength.y * gpgpuColor.b
//         );
//
//         vec4 color = texture2D(inputBuffer, dUv);
//
//         color.rgb += color.rgb * gpgpuColor.b * uCursorColoring;
//
//         outputColor = vec4(color.rgb, 1.0);
//     }`,
//       {
//         blendFunction: BlendFunction.NORMAL,
//         uniforms: new Map([
//           ['uSimulationTexture', uSimulationTexture],
//           ['uDisplacementStrength', new Uniform(new Vector2(2, 2))],
//           ['uCursorColoring', new Uniform(1.5)],
//         ]),
//       },
//     ),
//     effectPass = new EffectPass(camera, displacementEffect, grainEffect),
//     passes = [renderPass, blurPass, effectPass]
//
//   const composer = new EffectComposer(renderer),
//     context = composer.getRenderer().getContext()
//   composer.multisampling = Math.min(4, context.getParameter(context.MAX_SAMPLES))
//   const resize = () => {
//     const Wr = canvas$1.offsetWidth,
//       ze = canvas$1.offsetHeight
//     composer.setSize(Wr, ze)
//   }
//
//   window.addEventListener('resize', resize)
//   const compose = (Wr) => {
//     composer.removeAllPasses()
//     for (const ze of Wr) composer.addPass(ze)
//   }
//
//   gsap.registerPlugin(ScrollTrigger)
//   let mesh
//
//   function createGradient() {
//     const Wr = debug()
//
//     function ze(fi, di) {
//       compose(passes),
//       mesh || (mesh = new Mesh(new PlaneGeometry(2, 2), material)),
//         scene.add(mesh),
//       di && (debug$1.mount(), Wr.mount())
//     }
//
//     function Gr() {
//       scene.remove(mesh), debug$1.unmount(), Wr.unmount()
//     }
//
//     function Yr(fi) {
//       renderer.render(scene, camera), composer.render(fi)
//     }
//
//     function Kr() {
//       return mesh.material.uniforms.uSize.value
//     }
//
//     function Zr() {
//       return mesh.material.uniforms.uOffset.value
//     }
//
//     function Jr() {
//       return mesh.material.uniforms.uSpeed.value
//     }
//
//     function Qr() {
//       return mesh.material.uniforms.uColor1.value.getHex()
//     }
//
//     function ei() {
//       return mesh.material.uniforms.uColor2.value.getHex()
//     }
//
//     function ti() {
//       return mesh.material.uniforms.uColor3.value.getHex()
//     }
//
//     function ri() {
//       return mesh.material.uniforms.uColor4.value.getHex()
//     }
//
//     function ni() {
//       return grainEffect.uniforms.get('uIntensity').value
//     }
//
//     function ii(fi) {
//       mesh.material.uniforms.uSize.value = fi
//     }
//
//     function si(fi) {
//       mesh.material.uniforms.uOffset.value = fi
//     }
//
//     function li(fi) {
//       mesh.material.uniforms.uSpeed.value = fi
//     }
//
//     function oi(fi, di, pi) {
//       !di && !pi
//         ? mesh.material.uniforms.uColor1.value.set(fi)
//         : mesh.material.uniforms.uColor1.value.set(fi, di, pi)
//     }
//
//     function ui(fi, di, pi) {
//       !di && !pi
//         ? mesh.material.uniforms.uColor2.value.set(fi)
//         : mesh.material.uniforms.uColor2.value.set(fi, di, pi)
//     }
//
//     function ai(fi, di, pi) {
//       !di && !pi
//         ? mesh.material.uniforms.uColor3.value.set(fi)
//         : mesh.material.uniforms.uColor3.value.set(fi, di, pi)
//     }
//
//     function hi(fi, di, pi) {
//       !di && !pi
//         ? mesh.material.uniforms.uColor4.value.set(fi)
//         : mesh.material.uniforms.uColor4.value.set(fi, di, pi)
//     }
//
//     function ci(fi) {
//       grainEffect.uniforms.get('uIntensity').value = fi
//     }
//
//     return {
//       mount: ze,
//       unmount: Gr,
//       render: Yr,
//       getSize: Kr,
//       getOffset: Zr,
//       getSpeed: Jr,
//       getColor1: Qr,
//       getColor2: ei,
//       getColor3: ti,
//       getColor4: ri,
//       getGrainIntensity: ni,
//       setSize: ii,
//       setOffset: si,
//       setSpeed: li,
//       setColor1: oi,
//       setColor2: ui,
//       setColor3: ai,
//       setColor4: hi,
//       setGrainIntensity: ci,
//     }
//   }
//
//   function canvas(Wr = !1) {
//     let ze,
//       Gr = {
//         gradient: createGradient(),
//       }
//
//     function Yr(Qr, ei) {
//       ze && ze.unmount(), (ze = Gr[Qr]), ze.mount(ei, Wr)
//     }
//
//     function Kr() {
//       return ze
//     }
//
//     function Zr() {
//       ze && ze.unmount()
//     }
//
//     function Jr(Qr) {
//       ze && ze.render(Qr)
//     }
//
//     return {
//       setEffect: Yr,
//       getEffect: Kr,
//       stop: Zr,
//       render: Jr,
//     }
//   }
// }
// const grd = () => {
//   const noiseImageUrl = '/assets/seamless.png',
//     uTime = new Uniform(0),
//     uSize = new Uniform(0.2),
//     uOffset = new Uniform(new Vector2(0.42, 0.6)),
//     uSpeed = new Uniform(0.02),
//     uColor1 = new Uniform(new Color('rgb(65,66,73)')),
//     uColor2 = new Uniform(new Color('rgb(36,39,51)')),
//     uColor3 = new Uniform(new Color('rgb(49,103,160)')),
//     uColor4 = new Uniform(new Color('rgb(117,153,245)')),
//     noiseTexture = new TextureLoader().load(noiseImageUrl)
//   noiseTexture.wrapS = noiseTexture.wrapT = RepeatWrapping
//   const uNoiseTexture = new Uniform(noiseTexture),
//     uColorMixer = new Uniform(0),
//     uMenuMode = new Uniform(0),
//     uAdditionalZoom = new Uniform(0),
//     uAdditionalOffset = new Uniform(new Vector2(0, 0))
//   gsap.ticker.add((Wr) => (uTime.value = Wr))
//   const sh = shaderMaterial(
//     {
//       uTime,
//       uSize,
//       uOffset,
//       uSpeed,
//       uColor1,
//       uColor2,
//       uColor3,
//       uColor4,
//       uNoiseTexture,
//       uColorMixer,
//       uAdditionalZoom,
//       uAdditionalOffset,
//     },
//     vtx,
//     frgmnt,
//   )
// }
