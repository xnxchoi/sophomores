;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="f3e9bd3c-5c1f-717c-b0c0-f9a8625fa3bf")}catch(e){}}();
(()=>{"use strict";(globalThis.SPTURBOPACK||(globalThis.SPTURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,63862,e=>{var t=e.i(91398),o=e.i(91788),a=e.i(30943),r=e.i(60814),n=e.i(50016);let i=r.U.div.withConfig({displayName:"DevDraggableBookstackHud__Root",componentId:"sc-9a24f2bc-0"})`
  position: fixed;
  left: ${e=>e.$left}px;
  top: ${e=>e.$top}px;
  z-index: ${n.BOOK_STACK_DEV_HUD_Z_INDEX};
  background: rgba(22, 22, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  pointer-events: auto;
  max-height: ${e=>e.$maxHeight??"50vh"};
  display: flex;
  flex-direction: column;
`,l=r.U.div.withConfig({displayName:"DevDraggableBookstackHud__ScrollBody",componentId:"sc-9a24f2bc-1"})`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
`,u=r.U.div.withConfig({displayName:"DevDraggableBookstackHud__InlineRoot",componentId:"sc-9a24f2bc-2"})`
  background: rgba(22, 22, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  overflow: hidden;
  pointer-events: auto;
  ${e=>e.$collapsed&&"max-height: 32px;"}
`,c=r.U.div.withConfig({displayName:"DevDraggableBookstackHud__Header",componentId:"sc-9a24f2bc-3"})`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  user-select: none;
  ${e=>e.$draggable&&"cursor: grab; touch-action: none;"}
  &:active { ${e=>e.$draggable&&"cursor: grabbing;"} }
`,s=r.U.span.withConfig({displayName:"DevDraggableBookstackHud__DragGrip",componentId:"sc-9a24f2bc-4"})`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  cursor: grab;
  &:active { cursor: grabbing; }
`,d=r.U.span.withConfig({displayName:"DevDraggableBookstackHud__HeaderTitle",componentId:"sc-9a24f2bc-5"})`
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
`,h=r.U.button.withConfig({displayName:"DevDraggableBookstackHud__HeaderBtn",componentId:"sc-9a24f2bc-6"})`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); }
`;e.s(["f",0,({title:e,placement:r,panelWidthPx:n,initialHeightEstimatePx:f,dragOptions:p,children:m,inline:w=!1,collapsed:S,onCollapse:k,onClose:g,maxHeight:v})=>{let b=(0,o.useRef)(null),{position:x,startDrag:M}=function(e,t,a,r,n){let[i,l]=(0,o.useState)({left:8,top:8}),u=(0,o.useRef)(i);u.current=i;let c=(0,o.useRef)(!1),s=n?.initialOffsetLeftPx??0,d=n?.initialOffsetTopPx??0;(0,o.useLayoutEffect)(()=>{if(c.current)return;c.current=!0;let e=window.innerWidth,o=window.innerHeight;"bottom-left"===t?l({left:Math.max(8,8+s),top:Math.max(8,o-r-8+d)}):"bottom-right"===t?l({left:Math.max(8,e-a-16+s),top:Math.max(8,o-r-16+d)}):l({left:Math.max(8,e-a-8+s),top:Math.max(8,8+d)})},[t,a,r,s,d]);let h=(0,o.useCallback)(()=>{let t=e.current;if(!t)return;let o=t.offsetWidth,a=t.offsetHeight,r=window.innerWidth,n=window.innerHeight;l(e=>({left:Math.min(Math.max(8,e.left),Math.max(8,r-o-8)),top:Math.min(Math.max(8,e.top),Math.max(8,n-a-8))}))},[e]);(0,o.useLayoutEffect)(()=>{let e=()=>h();return window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[h]);let f=(0,o.useRef)(null),p=(0,o.useRef)(null),m=(0,o.useCallback)(t=>{let o=f.current;if(!o)return;let a=o.origLeft+(t.clientX-o.startX),r=o.origTop+(t.clientY-o.startY),n=e.current;if(n){let e=n.offsetWidth,t=n.offsetHeight;a=Math.min(Math.max(8,a),Math.max(8,window.innerWidth-e-8)),r=Math.min(Math.max(8,r),Math.max(8,window.innerHeight-t-8))}l({left:a,top:r})},[e]),w=(0,o.useCallback)(e=>{let t=p.current;if(p.current=null,t&&t.pointerId===e.pointerId)try{t.target.releasePointerCapture(t.pointerId)}catch{}f.current=null,window.removeEventListener("pointermove",m),window.removeEventListener("pointerup",w),window.removeEventListener("pointercancel",w)},[m]);return{position:i,startDrag:(0,o.useCallback)(e=>{if(0!==e.button)return;e.preventDefault(),e.stopPropagation();let t=e.currentTarget;if("function"==typeof t.setPointerCapture)try{t.setPointerCapture(e.pointerId),p.current={target:t,pointerId:e.pointerId}}catch{p.current=null}let o=u.current;f.current={startX:e.clientX,startY:e.clientY,origLeft:o.left,origTop:o.top},window.addEventListener("pointermove",m),window.addEventListener("pointerup",w),window.addEventListener("pointercancel",w)},[m,w])}}(b,r,n,f,p),[D,C]=(0,o.useState)(!1),y=S??D,_=k??(()=>C(e=>!e));return"u"<typeof document?null:w?(0,t.jsxs)(u,{$collapsed:y,onPointerDown:e=>e.stopPropagation(),children:[(0,t.jsxs)(c,{children:[(0,t.jsx)(s,{"aria-hidden":!0,children:"⋮⋮"}),(0,t.jsx)(d,{children:e}),(0,t.jsx)(h,{type:"button",title:y?"Expand":"Collapse",onClick:_,children:y?"▸":"▾"}),g&&(0,t.jsx)(h,{type:"button",title:"Close",onClick:g,children:"✕"})]}),!y&&m]}):(0,a.createPortal)((0,t.jsxs)(i,{ref:b,$left:x.left,$top:x.top,$maxHeight:v,onPointerDown:e=>e.stopPropagation(),children:[(0,t.jsxs)(c,{$draggable:!0,onPointerDown:M,children:[(0,t.jsx)(s,{"aria-hidden":!0,children:"⋮⋮"}),(0,t.jsx)(d,{children:e}),(0,t.jsx)(h,{type:"button",title:y?"Expand":"Collapse",onClick:e=>{e.stopPropagation(),_()},children:y?"▸":"▾"}),g&&(0,t.jsx)(h,{type:"button",title:"Close",onClick:e=>{e.stopPropagation(),g()},children:"✕"})]}),!y&&(0,t.jsx)(l,{children:m})]}),document.body)}],63862)},32770,1895,e=>{var t=e.i(50016),o=e.i(32369);let a={current:{array:new Float32Array(1024),count:0}},r=new o.cE;e.s(["R",0,16,"r",0,function(e){let{array:t}=a.current,n=0;e.traverse(e=>{if(n>=256)return;let a=e.geometry;if(!a?.attributes?.position)return;let i=a.attributes.position,l=i.count;if(l<=0)return;let u=e instanceof o.mN?e:null,c=Math.max(1,Math.ceil(l/Math.min(120,256-n+8)));for(let o=0;o<l&&n<256;o+=c){u&&a.attributes.skinIndex&&a.attributes.skinWeight?(r.fromBufferAttribute(i,o),u.applyBoneTransform(o,r),r.applyMatrix4(u.matrixWorld)):(r.fromBufferAttribute(i,o),r.applyMatrix4(e.matrixWorld));let l=4*n;t[l]=r.x,t[l+1]=r.y,t[l+2]=r.z,t[l+3]=1,n+=1}});for(let e=4*n;e<t.length;e+=1)t[e]=0;return a.current.count=n,n},"W",0,a],1895);let n=`
float bookStackRand01( vec2 p ) {
	return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

#if defined( USE_SHADOWMAP ) && defined( SHADOWMAP_TYPE_PCF ) && NUM_DIR_LIGHT_SHADOWS > 0
/*
 * The catcher's own PCF. three's getShadow() spends FIVE hardware-filtered taps on the whole kernel, rotated per pixel —
 * fine at a few texels, but the catcher runs it at ~10–15 texels of radius (shadow.radius \xd7 the HUD blur), where five
 * samples per pixel read as speckle across the whole penumbra. Same Vogel disk and per-pixel rotation, BOOK_STACK_PCF_TAPS
 * taps: the noise drops to under half its amplitude and is fine enough to read as a smooth falloff.
 */
#define BOOK_STACK_PCF_TAPS 16
float bookStackSoftShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
	shadowCoord.xyz /= shadowCoord.w;
	shadowCoord.z += shadowBias;
	bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
	if ( ! inFrustum || shadowCoord.z > 1.0 ) return 1.0;
	float radius = shadowRadius / shadowMapSize.x;
	float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
	float lit = 0.0;
	for ( int i = 0; i < BOOK_STACK_PCF_TAPS; i ++ ) {
		lit += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, BOOK_STACK_PCF_TAPS, phi ) * radius, shadowCoord.z ) );
	}
	return mix( 1.0, lit / float( BOOK_STACK_PCF_TAPS ), shadowIntensity );
}
#define bookStackCatcherShadow bookStackSoftShadow
#else
#define bookStackCatcherShadow getShadow
#endif

float bookStackReceiverLit() {
// USE_SHADOWMAP: with the renderer's shadow pass off (the low-power tier, the perf HUD's toggle) the lights still count
// as casters but three declares none of the shadow structs or samplers, so every branch but the last must drop out.
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 2
	if ( ! receiveShadow ) {
		return 1.0;
	}
	DirectionalLightShadow bookStackDL0 = directionalLightShadows[ 0 ];
	DirectionalLightShadow bookStackDL1 = directionalLightShadows[ 1 ];
	vec4 bookStackC0 = vDirectionalShadowCoord[ 0 ];
	vec4 bookStackC1 = vDirectionalShadowCoord[ 1 ];
	// No per-pixel UV jitter any more: it was white noise on top of the PCF's own, i.e. more grain (see bookStackSoftShadow).
	float bookStackRm = max( 0.25, uShadowRecvPcfRadiusMul );
	float bookStackL0 = bookStackCatcherShadow( directionalShadowMap[ 0 ], bookStackDL0.shadowMapSize, bookStackDL0.shadowIntensity, bookStackDL0.shadowBias, bookStackDL0.shadowRadius * bookStackRm, bookStackC0 );
	float bookStackL1 = bookStackCatcherShadow( directionalShadowMap[ 1 ], bookStackDL1.shadowMapSize, bookStackDL1.shadowIntensity, bookStackDL1.shadowBias, bookStackDL1.shadowRadius * bookStackRm, bookStackC1 );
	float bookStackWsum = max( 1e-5, uBookStackShadowKeyWeight + uBookStackShadowSunWeight );
	float dirLit = ( uBookStackShadowKeyWeight * bookStackL0 + uBookStackShadowSunWeight * bookStackL1 ) / bookStackWsum;
	// The catcher backdrop shows ONLY the key/sun directional grounding shadow. The mouse spotlight casts onto
	// the book + pages (their standard materials handle it), but is deliberately excluded here — a moving hard
	// spot shadow on the soft backdrop plane reads wrong, and pulling spot shadows into this custom ShadowMaterial
	// shader broke the catcher entirely.
	return dirLit;
#elif defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 1
	// Single caster — the artifacts scene, where only the key casts (the sun is fill/rim only). Same jittered,
	// radius-scaled tap as above, with no weighted mean to take. Without this branch a one-caster scene falls through
	// to the plain getShadowMask() path below and loses the HUD's blur + grain jitter entirely, so its backdrop shadow
	// reads hard-edged and ungrained next to the books' catcher.
	if ( ! receiveShadow ) {
		return 1.0;
	}
	DirectionalLightShadow bookStackDLS = directionalLightShadows[ 0 ];
	vec4 bookStackCS = vDirectionalShadowCoord[ 0 ];
	float bookStackRmS = max( 0.25, uShadowRecvPcfRadiusMul );
	return bookStackCatcherShadow( directionalShadowMap[ 0 ], bookStackDLS.shadowMapSize, bookStackDLS.shadowIntensity, bookStackDLS.shadowBias, bookStackDLS.shadowRadius * bookStackRmS, bookStackCS );
#else
	return getShadowMask();
#endif
}
`,i=`
varying vec3 vBookStackRecvWorldPos;
uniform sampler2D uBookVertPositionsTex;
uniform int uBookVertCount;
uniform float uBookVertDistNear;
uniform float uBookVertDistFar;
`,l="varying vec3 vBookStackRecvWorldPos;",u="vBookStackRecvWorldPos = worldPosition.xyz;",c=`uniform float opacity;
uniform float uShadowRecvOpacityDistMul;
uniform float uBookStackShadowKeyWeight;
uniform float uBookStackShadowSunWeight;
uniform float uShadowRecvPcfRadiusMul;
uniform float uShadowRecvUvJitter;
uniform vec3 uGrainTint;
uniform float uGrainAmount;
uniform float uGrainAlphaAmount;
uniform float uTime;
`,s=`float bookStackLit = bookStackReceiverLit();
	// Tinted grain on the shadow catcher (same formula as the background scene grain — book color blended
	// 75% toward warm neutral). Adds texture to the shadow plane.
	float scGrain = bookStackRand01( gl_FragCoord.xy + fract( uTime * 7.13 ) * 100.0 );
	vec3 grainedColor = color + ( scGrain - 0.5 ) * uGrainAmount * uGrainTint;
	// Grain the shadow's DENSITY, not just its tint. The catcher is a near-black ShadowMaterial, so nudging its RGB
	// is invisible in practice — the alpha speckle is what actually reads as grain inside the shadow. Books leave
	// uGrainAlphaAmount at 0 (their look is tint-grain only); the artifacts HUD's "Grain" slider drives it.
	float scAlpha = opacity * uShadowRecvOpacityDistMul * ( 1.0 - bookStackLit );
	scAlpha = clamp( scAlpha * ( 1.0 + ( scGrain - 0.5 ) * uGrainAlphaAmount ), 0.0, 1.0 );
	gl_FragColor = vec4( grainedColor, scAlpha );`,d=`float bookStackLit = bookStackReceiverLit();
	float shadowVis = 1.0 - bookStackLit;
	vec3 outRgb = color;
	if ( uBookVertCount > 0 ) {
		float dMin = 1e8;
		for ( int i = 0; i < 256; i ++ ) {
			float fi = float( i );
			vec2 st = ( vec2( mod( fi, float( 16 ) ), floor( fi / float( 16 ) ) ) + 0.5 ) / float( 16 );
			vec3 vp = texture2D( uBookVertPositionsTex, st ).xyz;
			float take = 1.0 - step( float( uBookVertCount ), fi );
			float di = distance( vBookStackRecvWorldPos, vp );
			dMin = min( dMin, mix( 1e8, di, take ) );
		}
		float tHeat = smoothstep( uBookVertDistNear, uBookVertDistFar, dMin );
		vec3 heat = mix( vec3( 1.0, 0.06, 0.05 ), vec3( 0.06, 0.18, 1.0 ), tHeat );
		outRgb = mix( color, heat, shadowVis );
	}
	gl_FragColor = vec4( outRgb, opacity * uShadowRecvOpacityDistMul * ( 1.0 - bookStackLit ) );`;e.s(["f",0,function(e,o,a,r){let h=t.homeStackLightsTuningLiveRef.current,f=t.homeStackShadowReceiverTuningLiveRef.current;e.uniforms.uShadowRecvOpacityDistMul={value:1},e.uniforms.uBookStackShadowKeyWeight={value:Math.max(.001,h.keyIntensity)},e.uniforms.uBookStackShadowSunWeight={value:Math.max(.001,h.sunIntensity)},e.uniforms.uShadowRecvPcfRadiusMul={value:1+.06*f.shadowReceiverBlurTexels},e.uniforms.uShadowRecvUvJitter={value:f.shadowReceiverNoiseTexels},e.uniforms.uGrainTint={value:[.824,.824,.816]},e.uniforms.uGrainAmount={value:.03},e.uniforms.uGrainAlphaAmount={value:0},e.uniforms.uTime={value:0},r&&(e.uniforms.uBookVertPositionsTex={value:a},e.uniforms.uBookVertCount={value:0},e.uniforms.uBookVertDistNear={value:t.BOOK_STACK_SHADOW_CATCHER_VERT_DIST_NEAR},e.uniforms.uBookVertDistFar={value:t.BOOK_STACK_SHADOW_CATCHER_VERT_DIST_FAR}),e.vertexShader=function(e,t){if(!t||!e.includes("#include <shadowmap_pars_vertex>"))return e;let o=e;return o.includes(l)||(o=o.replace("#include <shadowmap_pars_vertex>",`#include <shadowmap_pars_vertex>

${l}`)),o.includes(u)||(o=o.replace("#include <shadowmap_vertex>",`#include <shadowmap_vertex>
	${u}`)),o}(e.vertexShader,r),e.fragmentShader=function(e,t){let o=t?`${c.trimEnd()}
${i}`:c,a=e.replace("uniform float opacity;",o),r="#include <shadowmask_pars_fragment>";if(!a.includes(r))return e;let l=`${r}

${n}
`;if(a.includes(`${r}

void main()`))a=a.replace(`${r}

void main()`,`${l}
void main()`);else{if(!a.includes(`${r}
void main()`))return e;a=a.replace(`${r}
void main()`,`${l}
void main()`)}return a.replace("gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );",t?d:s)}(e.fragmentShader,r)}],32770)},45312,e=>{var t=e.i(73900);let o=108*Math.tan(18*Math.PI/180/2);function a(e,t,o,a,r){if(r<=0)return e;let n=2/Math.max(1e-4,a),i=n*r,l=1/(1+i+.48*i*i+.235*i*i*i),u=e-t,c=(o.v+n*u)*r;o.v=(o.v-n*c)*l;let s=t+(u+c)*l;return t-e>0==s>t&&(o.v=((s=t)-t)/r),s}let r=-80*Math.PI/180,n={8:40*Math.PI/180},i={selected:3,unselected:-12},l={selected:0,unselected:-3};function u(e){return R(e)?l:i}let c={current:{to:0,lastStepMs:0,nonce:0}},s={current:{width:0,slotX:[],w:[],camZ:60,selectedRowY:-15}};function d(e,t){if(t<=0)return e;let o=t/2;return((e+o)%t+t)%t-o}let h={target:0,value:0,vel:{v:0},appliedSel:-1,stamp:-1},f={current:!1},p=null,m=[],w=[];function S(){return h.value}function k(e,t,o){if(t<=0)return!1;let a=c.current,r=(Math.round(e)%t+t)%t;if(r===a.to)return!1;let n=performance.now();return(!!o?.force||!(n-a.lastStepMs<150))&&(a.to=r,a.lastStepMs=n,a.nonce+=1,!0)}function g(e,t){return k(c.current.to+e,t)}let v={lastStep:null},b=8*Math.PI/180*(7/6),x={dx:0,dy:0,dz:0,scale:1,frameW:1,frameH:1,boxDx:0,boxDy:0,boxDz:0,gapMul:1},M={0:{scale:1.325,frameW:3.566,frameH:3.71,dx:-3},1:{dx:-2,scale:.9375},2:{frameW:2.534,frameH:1.238,dx:-2},3:{scale:1.278,frameW:4.28,frameH:4.256,dx:-1},4:{frameW:1.451,frameH:.862,dx:1.4},5:{scale:.917,frameW:1.18,frameH:.702,dx:-3},6:{frameW:3.478,frameH:1.249,dx:-4},7:{scale:1.115,frameW:3.138,frameH:1.666,dx:-5},8:{frameW:3.192,frameH:1.377,scale:1,dx:-4},9:{scale:1.158,dx:-4}},D={current:Object.fromEntries(Object.entries(M).map(([e,t])=>[e,{...x,...t}]))},C={current:new Map},y={current:new Map},_={current:!1};function B(){_.current=!0}let R=e=>e<900,P=t.k,L={current:0};function T(e){let t=Math.max(0,Math.min(1,e));return t*t*(3-2*t)}e.s(["Ic",0,r,"vl",0,16,"f5",0,P,"ST",0,2.2,"QT",0,5,"XP",0,.5,"wO",0,1.25,"Os",0,450,"Lw",0,159,"nx",0,1.35,"Qr",0,1.5,"zn",0,34,"wc",0,9/16,"rG",0,.75,"Dy",0,"#ffffff","mU",0,4,"W_",0,6,"FB",0,10,"hb",0,3,"Mb",0,1,"SP",0,6,"lW",0,1,"mz",0,9,"tE",0,1,"Yb",0,0,"mS",0,4,"WN",0,0,"WS",0,2,"T5",0,900,"J2",0,1.5625,"PK",0,.75,"GC",0,x,"gO",0,{0:{scale:.79625,gapBeforeMul:.5,detailScale:.5625},1:{detailScale:.6375,detailScaleMobileMul:.75},2:{scale:.85,gapBeforeMul:.5,detailScale:.6825},3:{scale:.7875,gapBeforeMul:.5,detailScale:.5625},4:{scale:.637,gapBeforeMul:.7,detailScale:.5},5:{scale:.7,gapBeforeMul:1.2,detailScale:.5},6:{scale:.85,gapBeforeMul:.5,detailScale:.6825},7:{scale:.875,gapBeforeMul:1.2,detailScale:.5625},8:{scale:.85,detailScale:.525},9:{detailScale:.6375,detailScaleMobileMul:.75}},"lL",0,n,"o2",0,4,"Cs",0,.1,"EU",0,.16,"En",0,.8,"bX",0,1,"FI",0,200,"On",0,600,"CF",0,.35,"Hc",0,1.25,"U3",0,5,"oj",0,420,"VR",0,15,"k_",0,1.5,"aT",0,.9,"dA",0,32,"$H",0,.09,"a1",0,150,"Gj",0,100,"r5",0,[{key:"front",label:"Front",yawDeg:0,pitchDeg:0},{key:"three-quarter",label:"3/4",yawDeg:40,pitchDeg:0},{key:"profile",label:"Profile",yawDeg:90,pitchDeg:0},{key:"top",label:"Top",yawDeg:0,pitchDeg:-65}],"SA",0,6,"uQ",0,o,"dp",0,1,"IR",0,.3,"IZ",0,1.25,"q3",0,.12,"p8",0,1.35,"D",0,-.05,"SX",0,.82,"x9",0,.92,"F6",0,.6,"R3",0,1,"L9",0,-.2,"mw",0,0,"SU",0,.9,"dz",0,1.5,"dM",0,.9,"TV",0,.3,"fk",0,.2,"Qt",0,1.35,"WJ",0,function(e,t,o){if(h.stamp===e)return;h.stamp=e;let r=s.current,n=c.current.to;if(!f.current&&r.slotX.length>0){let e=r.slotX[n]??0;h.appliedSel<0?(h.target=e,h.value=e):r.width>0?h.target=e+r.width*Math.round((h.value-e)/r.width):h.target=e,h.appliedSel=n}f.current&&p?.input!=="wheel"||(h.value=a(h.value,h.target,h.vel,p?.input==="wheel"?.12:.16,t));for(let e=0;e<o;e+=1){let o=+(e===n);void 0===m[e]&&(m[e]=o),w[e]||(w[e]={v:0}),m[e]=a(m[e],o,w[e],.18,t),1e-4>Math.abs(o-m[e])&&(m[e]=o,w[e].v=0)}},"If",0,function(e,t){return t?Math.PI/2+r+(n[e]??0):0},"rl",0,u,"J",0,f,"P$",0,function(e){let t=s.current.camZ,o=u(e),a=t-o.selected,r=t-o.unselected;return a>.001?r/a:1},"Je",0,function(e){return T(m[e]??0)},"tw",0,function(e,t){let o=Math.max(0,e+159+80-t);return t+o},"nc",0,{current:0},"TH",0,L,"Na",0,{current:0},"B_",0,{current:0},"LU",0,{current:!1},"iw",0,y,"Fq",0,{current:2},"dJ",0,function(e){return(.4+(1.1-.4)*Math.max(0,Math.min(1,(e-500)/1228)))*(R(e)?.6:1)},"wB",0,function(e){return-((P-16)/2)/Math.max(1,e)},"yz",0,function(e){let t=Math.max(1,e);return Math.max(.2,(t-P-16)/t)},"JK",0,R,"Ys",0,C,"kG",0,{current:!1},"it",0,{current:-1},"wa",0,function(e){return{...x,...M[e]}},"Lt",0,D,"f4",0,s,"Jc",0,function(e){return Math.max(0,Math.min(1,L.current-e))},"B9",0,{current:{active:!1,index:-1,progress:0,activeProgress:0,closing:!1}},"S2",0,{current:{x:0,y:0}},"w7",0,function(e,t){if(t<=0)return!1;let o=e-c.current.to;return 1>=Math.abs(o-=t*Math.round(o/t))},"te",0,{current:{p1:0,p2:0,q1:.5,q2:.5,visible:!1,sceneY:0}},"Zl",0,{current:{p1:0,p2:0,sceneY:0}},"wt",0,{current:{p1:0,p2:0,q1:.5,q2:.5}},"IQ",0,S,"ci",0,_,"IY",0,c,"P8",0,{current:{index:-1,angle:0,nonce:0}},"tU",0,function(e,t){return`/images/artifacts/views/${e}-${t}.jpg`},"PY",0,d,"jZ",0,{current:!1},"IM",0,function(e,t="drag"){return!(s.current.slotX.length<2)&&!(e<=0)&&(p={start:h.value,selection:c.current.to,unitsPerPixel:e,travel:0,input:t},f.current=!0,"drag"===t&&(h.vel.v=0),!0)},"BV",0,function(e,t,o){if(!o||t<=1||f.current){v.lastStep=null;return}let a=Math.round(e/220);if(null===v.lastStep){v.lastStep=a;return}if(a===v.lastStep)return;let r=a>v.lastStep?1:-1;g(r,t)&&(v.lastStep+=r)},"hZ",0,T,"zQ",0,function(e,t=!1){let o=p;if(!o)return;p=null,f.current=!1;let a=s.current,r=o.selection,n="wheel"===o.input;if(!t&&!(n&&Math.abs(o.travel)<e)){let t=n?h.target:S(),i=1/0;for(let e=0;e<a.slotX.length;e+=1){let o=Math.abs(d(a.slotX[e]-t,a.width));o<i&&(i=o,r=e)}!n&&r===o.selection&&Math.abs(o.travel)>=e&&(r+=Math.sign(o.travel))}k(r,a.slotX.length,{force:!0}),B()},"$v",0,function(e){return D.current[e]??x},"uh",0,B,"pO",0,function(e){if(p){p.travel+=e;h.target=p.start+p.travel*p.unitsPerPixel,"drag"===p.input&&(h.value=h.target),B()}},"u",0,function(e,t){let o=s.current;if(null==e||h.appliedSel<0)return;let a=o.slotX[c.current.to]??e,r=t>0?Math.round((h.value-e)/t):0,n=a-e+r*(o.width-t);h.value+=n,h.target+=n,p&&(p.start+=n)},"Ar",0,function(e,t){let o=6*b,a=Math.min(-1*e,.999*b),r=Math.min((a>0?Math.min(a/Math.max(1e-6,1-a/b),o):a)+-1*t,o);return-((r>0?r/(1+r/b):r)*1)},"sU",0,function(e){let t=c.current.to;h.value=h.target=s.current.slotX[t]??0,h.vel.v=0,h.appliedSel=t;for(let o=0;o<e;o+=1)m[o]=+(o===t),(w[o]??={v:0}).v=0},"CQ",0,k,"IG",0,a,"Oa",0,g])},92209,90433,e=>{var t=e.i(91788),o=e.i(67168),a=e.i(39123),r=e.i(82297);let n=[[1e3,"m"],[900,"cm"],[500,"d"],[400,"cd"],[100,"c"],[90,"xc"],[50,"l"],[40,"xl"],[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]];function i(e){let t="";for(let[o,a]of n)for(;e>=o;)t+=a,e-=o;return t}function l(e){if(!/^[mdclxvi]+$/.test(e))return null;let t={m:1e3,d:500,c:100,l:50,x:10,v:5,i:1},o=0;for(let a=0;a<e.length;a++){let r=t[e[a]];o+=r<(a+1<e.length?t[e[a+1]]:0)?-r:r}return o>0&&i(o)===e?o:null}function u(e){return/^[1-9]\d*$/.test(e)||null!==l(e)}function c(e,t){let o=t-1;if(o<1)return null;if(o<=e.romanCount)return i(o);let a=o-e.romanCount;return a<=e.lastFolio?String(a):null}function s(e,t){return{left:c(e,2*t-1),right:c(e,2*t)}}function d({bookIndex:e,artifactIndex:t,bookDetailVisible:r,artifactDetailVisible:n,zineOpen:i,page:l}){if(n){let e=(0,a.V)(t);if(e)return`/artifacts/${e}`}if(r){let t=(0,o.G)(e);if(t){let e=l?`/page/${l}`:"";return i?`/book/${t}/zine${e}`:`/book/${t}${e}`}}return"/"}function h(e,t){if("page"!==e||void 0===t)return;let o=t.toLowerCase();return u(o)?o:void 0}function f(){let e=window.location.pathname.split("/").filter(Boolean);if("book"===e[0]&&"zine"===e[2]&&(3===e.length||5===e.length)){let t=e[1],a=(0,o.s)(t);return null===a?null:{kind:"book",index:a,slug:t,zine:!0,page:h(e[3],e[4])}}if(4===e.length&&"book"===e[0]&&"page"===e[2]){let t=e[1],a=(0,o.s)(t);return null===a?null:{kind:"book",index:a,slug:t,page:h(e[2],e[3])}}if(2!==e.length)return null;let[t,n]=e;if("book"===t){let e=(0,o.s)(n);return null===e?null:{kind:"book",index:e,slug:n,zine:"#zine"===window.location.hash}}if("artifacts"===t){if(!r.E)return null;let e=(0,a.n)(n);return null===e?null:{kind:"artifact",index:e,slug:n}}return null}e.s(["o",0,u,"u",0,function(e,t){let o=null;if(/^[1-9]\d*$/.test(t))o=e.romanCount+Math.min(parseInt(t,10),e.lastFolio);else{let a=l(t);null!==a&&a<=e.romanCount&&(o=a)}return null===o?null:Math.ceil((o+1)/2)},"x",0,function(e,t){let{left:o,right:a}=s(e,t);return o&&a?/^\d/.test(o)===/^\d/.test(a)?`${o}–${a}`:`${o}, ${a}`:o??a??"–"},"b",0,function(e,t){let{left:o,right:a}=s(e,t),r=o??a;return r||(2*t<2?c(e,2):String(e.lastFolio))}],90433),e.s(["v",0,f,"O",0,function({router:e,bookIndex:o,artifactIndex:a,bookDetailVisible:r,artifactDetailVisible:n,cartOwnsPath:i,deepLinkSettling:l=!1,zineOpen:u=!1,page:c}){let s=(0,t.useRef)(null);(0,t.useEffect)(()=>{let t=window.location.pathname;!("/book"===t||t.startsWith("/book/")||"/artifacts"===t||t.startsWith("/artifacts/"))||f()||(s.current="/",e.replace("/","/",{shallow:!0,scroll:!1}))},[e]),(0,t.useEffect)(()=>{if(i||l)return;let t=d({bookIndex:o,artifactIndex:a,bookDetailVisible:r,artifactDetailVisible:n,zineOpen:u,page:c});if(s.current===t||"/"===t&&null===s.current)return;if(window.location.pathname===t){s.current=t;return}let h="/"!==t&&(null===s.current||"/"===s.current);s.current=t,h?e.push("/",t,{shallow:!0,scroll:!1}):e.replace("/",t,{shallow:!0,scroll:!1})},[e,o,a,r,n,i,l,u,c]);let h=(0,t.useRef)(!1);(0,t.useEffect)(()=>{let e=document.documentElement,t=i?window.location.pathname:d({bookIndex:o,artifactIndex:a,bookDetailVisible:r,artifactDetailVisible:n,zineOpen:u,page:c});if(e.dataset.pressView=t,h.current)return;let p=window.location.pathname===t||s.current===t||null===f();(i||!l&&p)&&(h.current=!0,e.dataset.pressAgentReady="true")},[o,a,r,n,i,l,u,c])}],92209)}])})();

//# debugId=f3e9bd3c-5c1f-717c-b0c0-f9a8625fa3bf