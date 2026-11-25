;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="1c9f9e54-345b-7e08-8e14-22810caf7d83")}catch(e){}}();
(globalThis.SPTURBOPACK||(globalThis.SPTURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[48585,4539,e=>{var t=e.i(55946);let i=[{name:"NOMAD_diffuse",path:"/images/covers/NOMAD/diffuse.jpg",ktx2:!1},{name:"NOMAD_foil",path:"/images/covers/NOMAD/foil.png",ktx2:!1},{name:"NOMAD_bump",path:"/images/covers/NOMAD/bump.jpg",ktx2:!1},{name:"BTG_diffuse",path:"/images/covers/BTG/diffuse.jpg"},{name:"BTG_depth",path:"/images/covers/BTG/bump.jpg"},{name:"BTG_foil",path:"/images/covers/BTG/foil.jpg"},{name:"MOE_diffuse",path:"/images/covers/MOE/diffuse.png"},{name:"MOE_bump",path:"/images/covers/MOE/bump.jpg"},{name:"MOE_foil",path:"/images/covers/MOE/foil.png"},{name:"OOE_diffuse",path:"/images/covers/OOE/diffuse.jpg"},{name:"OOE_bump",path:"/images/covers/OOE/bump.png"},{name:"OOE_foil",path:"/images/covers/OOE/foil.png"},{name:"SCALING_diffuse",path:"/images/covers/SCALING/diffuse.jpg"},{name:"SCALING_bump",path:"/images/covers/SCALING/bump.png"},{name:"SCALING_foil",path:"/images/covers/SCALING/foil.jpg"},{name:"BOOM_diffuse",path:"/images/covers/BOOM/diffuse.jpg"},{name:"BOOM_bump",path:"/images/covers/BOOM/bump.png"},{name:"BOOM_foil",path:"/images/covers/BOOM/foil.jpg"},{name:"PCA_diffuse",path:"/images/covers/PCA/diffuse.png"},{name:"PCA_bump",path:"/images/covers/PCA/bump.png"},{name:"PCA_foil",path:"/images/covers/PCA/foil.png"},{name:"SP_diffuse",path:"/images/covers/SP/diffuse.jpg"},{name:"SP_bump",path:"/images/covers/SP/bump.png"},{name:"SP_foil",path:"/images/covers/SP/foil.png"},{name:"SP_gloss",path:"/images/covers/SP/gloss.png"},{name:"POTA_diffuse",path:"/images/covers/POTA/diffuse.jpg"},{name:"POTA_bump",path:"/images/covers/POTA/bump.png"},{name:"POTA_foil",path:"/images/covers/POTA/foil.png"},{name:"POTA_gloss",path:"/images/covers/POTA/gloss.jpg"},{name:"WIMFC_diffuse",path:"/images/covers/WIMFC/diffuse.png"},{name:"WIMFC_bump",path:"/images/covers/WIMFC/bump.jpg"},{name:"WIMFC_foil",path:"/images/covers/WIMFC/foil.png"},{name:"TBS_diffuse",path:"/images/covers/TBS/diffuse.png"},{name:"TBS_bump",path:"/images/covers/TBS/bump.png"},{name:"TBS_foil",path:"/images/covers/TBS/foil.png"},{name:"SF_diffuse",path:"/images/covers/SF/diffuse.png"},{name:"SF_bump",path:"/images/covers/SF/bump.png"},{name:"SF_foil",path:"/images/covers/SF/foil.png"},{name:"AEP_diffuse",path:"/images/covers/AEP/diffuse.png"},{name:"AEP_bump",path:"/images/covers/AEP/bump.jpg"},{name:"AEP_foil",path:"/images/covers/AEP/foil.png"},{name:"GT_diffuse",path:"/images/covers/GT/diffuse.jpg"},{name:"GT_bump",path:"/images/covers/GT/bump.jpg"},{name:"GT_foil",path:"/images/covers/GT/foil.png"},{name:"HGH_diffuse",path:"/images/covers/HGH/diffuse.png"},{name:"HGH_bump",path:"/images/covers/HGH/bump.png"},{name:"POP_diffuse",path:"/images/covers/POP/diffuse.jpg"},{name:"POP_bump",path:"/images/covers/POP/bump.png"},{name:"ROTP_diffuse",path:"/images/covers/ROTP/diffuse.png"},{name:"ROTP_bump",path:"/images/covers/ROTP/bump.png"},{name:"ROTP_foil",path:"/images/covers/ROTP/foil.png"},{name:"SA_diffuse",path:"/images/covers/SA/diffuse.png"},{name:"SA_bump",path:"/images/covers/SA/bump.png"},{name:"SA_foil",path:"/images/covers/SA/foil.png"},{name:"TADSE_diffuse",path:"/images/covers/TADSE/diffuse.png"},{name:"TADSE_bump",path:"/images/covers/TADSE/bump.png"},{name:"TADSE_foil",path:"/images/covers/TADSE/foil.png"},{name:"TDM_diffuse",path:"/images/covers/TDM/diffuse.jpg"},{name:"TDM_bump",path:"/images/covers/TDM/bump.jpg"},{name:"TDM_foil",path:"/images/covers/TDM/foil.png"},{name:"WIP_diffuse",path:"/images/covers/WIP/diffuse.png"},{name:"WIP_bump",path:"/images/covers/WIP/bump.png"},{name:"shared_bump_buckram",path:"/assets/three/book/shared/bump_buckram.png"},{name:"shared_bump_cardboard",path:"/assets/three/book/shared/bump_cardboard.png"},{name:"shared_bump_paper",path:"/assets/three/book/shared/bump_paper.png"},{name:"shared_glitter",path:"/assets/three/book/shared/glitter.png"},{name:"shared_diffuse_overlay",path:"/assets/three/book/shared/diffuse_overlay.png"},{name:"shared_diffuse_none",path:"/assets/three/book/shared/diffuse_none.png"},{name:"shared_bump_none",path:"/assets/three/book/shared/bump_none.png"},{name:"shared_foil_none",path:"/assets/three/book/shared/foil_none.png"}],n=new Map(i.map(e=>[e.name,e.path])),a=new Set(i.filter(e=>"ktx2"in e&&!1===e.ktx2).map(e=>e.name));function o(e){return e}let r=new Map;e.s(["D",0,function(e){return null},"x",0,function(){},"K",0,function(e){let i=`${(0,t.k)()?"m":"d"}:${e}`,s=r.get(i);return null==s&&(s=function(e){let i=n.get(e)??("string"==typeof e&&e.startsWith("/")?e:null);if(null==i){let e=n.get("shared_diffuse_none");return(0,t.A)(o(e??""))}return(0,t.A)(a.has(e)?i:o(i))}(e),r.set(i,s)),s}],48585),e.s(["f",0,{wipe:0,time:0,baseDiffuse:null,baseBump:null,baseFoil:null,baseFoilOpacity:0,baseFoilSpecular:0,baseFoilDetail:2,baseThickness:3,incomingDiffuse:null,incomingBump:null,incomingFoil:null,incomingFoilOpacity:0,incomingFoilSpecular:0,incomingFoilDetail:2,incomingBumpScaleBase:.03,incomingBumpScaleCustom:.15,incomingThickness:3,activeBookIndex:-1}],4539)},11452,e=>{var t=e.i(60814),i=e.i(72646),n=e.i(73900);let a=(0,e.i(79211).B)(["--surface-bg","--surface-fg","--surface-rule","--surface-muted","--surface-border","--canvas-bg","--nav-fg","color"]),o=t.U.div.attrs(e=>{let t=`var(--press-boot-bg, ${e.$overrideBg??(e.$isLightTheme?"#e8e7e0":"#000")})`,i=`var(--press-boot-fg, ${e.$overrideFg??(e.$isLightTheme?"#191715":"#f7f7ef")})`;return{style:{...e.style,minHeight:e.$liveContentHeight?`calc(${e.$minScrollHeightPx-(e.$contentHeightPx??0)}px + var(--home-content-height, ${e.$contentHeightPx??0}px))`:`${e.$minScrollHeightPx}px`,background:"var(--surface-bg)",color:i,"--surface-bg":t,"--surface-fg":i,"--surface-border":e.$overrideFg?`color-mix(in srgb, ${e.$overrideFg} 35%, transparent)`:e.$isLightTheme?"#b7b4ab":"rgba(247, 247, 239, 0.35)","--surface-rule":e.$overrideFg?`color-mix(in srgb, ${e.$overrideFg} 45%, transparent)`:e.$isLightTheme?"rgba(33, 29, 24, 0.52)":"rgba(247, 247, 239, 0.35)","--surface-muted":e.$overrideFg?`color-mix(in srgb, ${e.$overrideFg} 78%, transparent)`:e.$isLightTheme?"rgba(25, 23, 21, 0.78)":"rgba(247, 247, 239, 0.78)","--canvas-bg":t,"--nav-fg":i}}}).withConfig({displayName:"HomeLayoutStyles__PageContainer",componentId:"sc-82f8dd10-0"})`
  position: relative;
  width: 100%;
  /* Accordion transitions own the layout; native scroll anchoring must not move the viewport to follow the footer. */
  overflow-anchor: ${e=>e.$liveContentHeight&&(e.$contentHeightPx??0)>0?"none":"auto"};
  /* Full-bleed rows in normal flow take width: 100vw (CarouselViewport and ArtifactRowsViewport in
   * HomeContentSectionStyles, DetailFullBleed in DetailPanelStyles). 100vw counts the vertical scrollbar, so on a browser
   * with classic scrollbars each one ran past the page by that scrollbar's width and the page grew a horizontal scrollbar
   * (shopping-agent QA saw it at 1440px). This box is the viewport minus the scrollbar, so clipping here trims only that
   * overhang. clip, not hidden: hidden would make this a scroll container, which changes what scroll anchoring and any
   * future sticky descendant measure against; clip creates none. Fixed layers are not clipped, since their containing block
   * is the viewport and nothing here gives them a nearer one. Not on AccordionBody, whose rows must stay unclipped
   * (see its comments). (No backticks in here: this is inside a template literal.) */
  overflow-x: clip;
  --surface-fg-rgb: ${e=>e.$isLightTheme?"25, 23, 21":"247, 247, 239"};
  --surface-contrast-bg: ${e=>e.$isLightTheme?"#191715":"#f7f7ef"};
  --surface-contrast-fg: ${e=>e.$isLightTheme?"#f7f7ef":"#191715"};
  /* Preserve the source document's layout and component state while the cart crossfades over it. */
  [data-cart-page-layer] {
    opacity: var(--cart-page-opacity, 1);
    visibility: var(--cart-page-visibility, visible);
  }
  /* $snapSurfaceColor applies the override INSTANTLY instead of easing to it — used to seed a transition's start colour
   * for one frame (see artifactThemeSeed in pages/index.tsx): if the seed itself animated, retargeting a frame later
   * would resume from the colour we were trying to leave behind, and the seed would do nothing. It is honoured again now
   * that there IS a transition to opt out of; while this rule was 'none' the prop was threaded but inert.
   * (No backticks in here: this is inside a template literal, so a backtick would terminate the CSS.) */
  transition: ${e=>e.$snapSurfaceColor?"none":a};
`,r=t.U.div.withConfig({displayName:"HomeLayoutStyles__FixedContent",componentId:"sc-82f8dd10-1"})`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100lvh;
  z-index: 10200;
  pointer-events: none;
`,s=t.U.div.withConfig({displayName:"HomeLayoutStyles__PaddedContainer",componentId:"sc-82f8dd10-2"})`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-top: ${e=>e.$canvasTopPx??n.k}px;
  width: 100%;
  height: max(100vh, ${e=>e.$shaderViewportHeightPx}px);
  height: max(100lvh, ${e=>e.$shaderViewportHeightPx}px);
  min-height: 0;
  box-sizing: border-box;
`,l=t.U.div.withConfig({displayName:"HomeLayoutStyles__ReturnToShelfWrap",componentId:"sc-82f8dd10-3"})`
  position: fixed;
  ${e=>e.$hideMobile?"@media (max-width: 899px) { display: none; }":""}
  /* Right edge at 40vw from the left (detail column edge at min-width 900px); nudged +8px right. */
  left: calc(60vw + 24px);
  top: 46px;
  z-index: 20050;
  opacity: ${e=>+!!e.$visible};
  /* Enter: slide right → left; hide: left → right (positive X = off to the right). */
  transform: translateX(${e=>e.$visible?"0":"28px"});
  transition:
    opacity 320ms ${i.J},
    transform 420ms ${i.J};
  /* Delay only the reveal; hide immediately. */
  transition-delay: ${e=>e.$visible?e.$revealDelayMs??0:0}ms;
  pointer-events: ${e=>e.$visible?"auto":"none"};
`,d=t.U.a.withConfig({displayName:"HomeLayoutStyles__ReturnToShelfLink",componentId:"sc-82f8dd10-4"})`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Suisse Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--surface-fg);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    opacity: 0.82;
  }

`,u=t.U.span.withConfig({displayName:"HomeLayoutStyles__ReturnToShelfArrow",componentId:"sc-82f8dd10-5"})`
  display: inline-flex;
  align-items: center;
  line-height: 1;

  svg {
    stroke: currentColor;
  }
`,p=t.U.span.withConfig({displayName:"HomeLayoutStyles__ReturnToShelfLabel",componentId:"sc-82f8dd10-6"})`
  white-space: nowrap;
`,c=t.U.div.withConfig({displayName:"HomeLayoutStyles__CanvasWrapper",componentId:"sc-82f8dd10-7"})`
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: transparent;
  /* The cart's page fade is a root custom property the open/close tick writes each frame (lib/home/cartMotion.ts). */
  opacity: ${e=>e.$hidden?0:"var(--cart-page-opacity, 1)"};
  /**
   * Lift the background card by $liftPx — mobile book details only, to take back the band the featured-titles strip
   * used to hold (see detailFeaturedTitlesHidden in pages/index.tsx).
   *
   * HERE and not on the plane's own offset inside the scene, which is where this was tried first: the card's drawn rect is
   * pinned to the canvas box (top-clipped, bottom set by the card-height uniforms), so sliding the plane moved its bottom
   * edge 4px and its top not at all — measured at 390×844, card 162..803 against 162..799. The whole canvas has to move.
   *
   * A TRANSFORM rather than 'top', because this is a flex child (flex: 1 1 0) and its siblings must not reflow; and on
   * this element rather than the SceneContainer inside it, which 'overflow: hidden' here would clip.
   *
   * Transitioned so opening a book on mobile eases the card up instead of stepping it. The 500ms matches the page's own
   * surface crossfade, so on the paths where the card is already on screen (a featured-book open) the lift reads as part of
   * the same settling rather than a separate move. $liftMs overrides it for the return home, and with $liftDelayMs and
   * $liftEasing for the mobile open, which waits out the titles' fade and then runs with the page's reveal scroll.
   */
  transform: translateY(${e=>-(e.$liftPx??0)}px);
  transition: transform ${e=>e.$liftMs??i.m}ms ${e=>e.$liftEasing??i.J} ${e=>e.$liftDelayMs??0}ms;
  /* Never 'auto'. This used to opt back into hit-testing whenever the canvas was visible (opacity > 0.02), which made the
     whole background column a pointer target; the books are clicked through BookHitRectsOverlay's projected rects, not
     through the canvas, so it had nothing to catch that anything wanted. Its parent FixedContent is 'none' too. */
  pointer-events: none;
`,f=t.U.div.withConfig({displayName:"HomeLayoutStyles__SafariTopEdgeTint",componentId:"sc-82f8dd10-8"})`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 12px;
  z-index: 2147483646;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(transparent, transparent);
  mask-image: linear-gradient(transparent, transparent);

  @media (min-width: 900px) {
    display: none;
  }

`,m=(0,t.U)(f).withConfig({displayName:"HomeLayoutStyles__SafariBottomEdgeTint",componentId:"sc-82f8dd10-9"})`
  top: auto;
  bottom: -120px;
  height: 132px;
`,h=t.U.div.withConfig({displayName:"HomeLayoutStyles__PageBottomStack",componentId:"sc-82f8dd10-10"})`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* Above the fixed "[Esc] to shelf" link (z 20050) so the footer covers it at page bottom. This element
     creates the stacking context for the footer, so its z — not FooterRoot's — decides that ordering; it
     stays below the production overlay (20100). */
  z-index: 20060;
  display: flex;
  flex-direction: column;
`;e.s(["S",0,"[Esc] to artifacts","N",0,c,"x",0,r,"k",0,s,"C",0,h,"b",0,o,"v",0,u,"d",0,p,"M",0,d,"s",0,l,"T",0,m,"y",0,f])},94787,e=>{let t={fromWidth:375,toWidth:1728,fromSize:40,toSize:56},i={fromWidth:1728,toWidth:2500,fromSize:56,toSize:59},n=e=>`${e.fromSize}px + (${e.toSize} - ${e.fromSize}) * (100vw - ${e.fromWidth}px) / (${e.toWidth} - ${e.fromWidth})`,a=`calc(${n(t)})`,o=`calc((${n(t)}) * 1.1)`,r=`calc(${n(i)})`,s=i.fromWidth,l={book:"Hardcover"};e.s(["T",0,112,"U",0,o,"N",0,63,"I",0,12,"K",0,20,"d",0,a,"w",0,500,"o",0,70,"v",0,s,"x",0,r,"E",0,{current:null},"O",0,function(e){let n=e>=i.fromWidth?i:t;return 90+(n.fromSize+(n.toSize-n.fromSize)*(e-n.fromWidth)/(n.toWidth-n.fromWidth))*112/100+12},"R",0,e=>e?l[e.toLowerCase()]??e.charAt(0).toUpperCase()+e.slice(1).toLowerCase():"","q",0,function(e,t,i){return i?0:Math.max(0,Math.min(1,(e-t-.15)/.85))},"M",0,function(e,t,i){return i<200||t<-.06||!(.06>Math.abs(t))&&e}])},55946,e=>{let t=null,i=!1;function n(){if(!t){let e=window.innerWidth;t={mobile:e<700,portrait:window.innerHeight>=e},i||(i=!0,window.addEventListener("resize",()=>{t=null},{passive:!0}),window.addEventListener("orientationchange",()=>{t=null},{passive:!0}))}return t}let a=null;function o(){return n().mobile||function(){if(null==a){let e=navigator.userAgent;a=/iPhone|iPad|iPod|Android/i.test(e)||/Macintosh/.test(e)&&navigator.maxTouchPoints>1}return a}()}function r(){return n().mobile&&n().portrait}let s=[["/images/backgrounds/","/images/backgrounds-sm/"],["/images/covers/","/images/covers-sm/"],["/images/home/films/","/images/home-sm/films/"],["/images/home/artifacts/","/images/home-sm/artifacts/"],["/images/artifacts/","/images/artifacts-sm/"]],l=[["/images/backgrounds/","/images/backgrounds-sq/"],["/images/artifacts/","/images/artifacts-sq/"]];function d(e){if(!e||!o())return e??"";if(e.includes("/images/pages/"))return e.replace("/images/pages/","/images/pages-sm/").replace(/\.png($|\?)/i,".jpg$1");for(let[t,i]of s)if(e.includes(t))return e.replace(t,i);return e}e.s(["W",0,r,"k",0,o,"A",0,d,"t",0,function(e){if(!e||!r())return d(e);for(let[t,i]of l)if(e.includes(t))return e.replace(t,i);return d(e)}])},73900,e=>{var t=e.i(94787);let i=null,n=null,a=null,o=null,r=null,s=new Set,l=!1;function d(){o||((o=document.createElement("div")).style.cssText="position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none;z-index:-1;",document.body.appendChild(o));let e=o.offsetHeight;return e>0?e:window.innerHeight}function u(){r||((r=document.createElement("div")).style.cssText="position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;z-index:-1;",document.body.appendChild(r));let e=r.offsetHeight;return e>0?e:window.innerHeight}function p(){return"u">typeof navigator&&navigator.maxTouchPoints>0||"function"==typeof window.matchMedia&&window.matchMedia("(hover: none)").matches}function c(){let e=i,t=n;return n=window.innerWidth,i=d(),a=u(),i!==e||n!==t}function f(){let e=window.innerWidth!==n;(!p()||e)&&c()&&s.forEach(e=>e())}function m(){window.setTimeout(()=>{c()&&s.forEach(e=>e())},300)}function h(){return null==i&&(i=document.body?d():window.innerHeight),i}e.s(["z",0,16,"k",0,162,"K",0,.5,"_",0,33,"Q",0,140,"F",0,8,"b",0,380,"I",0,180,"M",0,150,"c",0,50,"p",0,function(e){return e<900?140:Math.max(162,Math.ceil((0,t.O)(e)))},"$",0,function(e,t=162){return Math.max(0,e-t-16)},"e",0,function(e){let t=[],i=0;for(let n=0;n<e.length;n+=1)t.push(i),i+=e[n];return t},"i",0,function(){return 900},"R",0,function(){return 1200},"B",0,function(){let e=h();return null==a&&document.body&&(a=u()),Math.min(e,a??e)},"C",0,h,"X",0,function(){return null==n&&(n=window.innerWidth),n},"w",0,p,"A",0,function(e,t,i,n,a,o){let r=t[e]??0,s=i[e]??0;return r+(null!=o?o:Math.max(.01,Math.min(.99,n))*s)+a},"m",0,function(e,t){if(e<=0||0===t.length)return 0;if(e>=t.reduce((e,t)=>e+t,0))return Math.max(0,t.length-1)+.999;let i=0;for(let n=0;n<t.length;n+=1){let a=t[n],o=i+a;if(e<o||n===t.length-1)return n+Math.min(1,Math.max(0,(e-i)/a));i=o}return Math.max(0,t.length-1)},"d",0,function(e){return s.add(e),l||(l=!0,c()&&s.forEach(e=>e()),window.addEventListener("resize",f),window.addEventListener("orientationchange",m)),()=>{s.delete(e)}}])},84856,18394,e=>{var t=e.i(50461);let i="https://stripe.press",n=function(e){if(!e)return null;try{let t=new URL(e.trim());if("https:"!==t.protocol&&"http:"!==t.protocol)return null;return t.origin}catch{return null}}(t.default.env.NEXT_PUBLIC_SITE_ORIGIN)??i;e.s(["x",0,i,"R",0,n],18394);let a=`${i}/images/social_card.jpg`,o=`${i}/images/social`;e.s(["l",0,i,"D",0,"The Stripe Press library: a row of book spines with The Art of Doing Science and Engineering face out.","B",0,o,"I",0,630,"J",0,a,"K",0,1200,"z",0,function(e,t=200){let i=(e??"").replace(/\s+/g," ").trim();if(i.length<=t)return i;let n=i.slice(0,t-1),a=n.lastIndexOf(" ");return`${(a>.6*t?n.slice(0,a):n).replace(/[,;:.\s]+$/,"")}…`}],84856)},25167,(e,t,i)=>{Object.defineProperty(i,"__esModule",{value:!0});var n={default:function(){return p},noSSR:function(){return u}};for(var a in n)Object.defineProperty(i,a,{enumerable:!0,get:n[a]});let o=e.r(41705),r=e.r(91398);e.r(91788);let s=o._(e.r(52414)),l="u"<typeof window;function d(e){return{default:e?.default||e}}function u(e,t){if(delete t.webpack,delete t.modules,!l)return e(t);let i=t.loading;return()=>(0,r.jsx)(i,{error:null,isLoading:!0,pastDelay:!1,timedOut:!1})}function p(e,t){let i=s.default,n={loading:({error:e,isLoading:t,pastDelay:i})=>null};e instanceof Promise?n.loader=()=>e:"function"==typeof e?n.loader=e:"object"==typeof e&&(n={...n,...e});let a=(n={...n,...t}).loader;return(n.loadableGenerated&&(n={...n,...n.loadableGenerated},delete n.loadableGenerated),"boolean"!=typeof n.ssr||n.ssr)?i({...n,loader:()=>null!=a?a().then(d):Promise.resolve(d(()=>null))}):(delete n.webpack,delete n.modules,u(i,n))}("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},80963,(e,t,i)=>{Object.defineProperty(i,"__esModule",{value:!0});var n={default:function(){return h},defaultHead:function(){return p}};for(var a in n)Object.defineProperty(i,a,{enumerable:!0,get:n[a]});let o=e.r(41705),r=e.r(52456),s=e.r(91398),l=r._(e.r(91788)),d=o._(e.r(94941)),u=e.r(13584);function p(){return[(0,s.jsx)("meta",{charSet:"utf-8"},"charset"),(0,s.jsx)("meta",{name:"viewport",content:"width=device-width"},"viewport")]}function c(e,t){return"string"==typeof t||"number"==typeof t?e:t.type===l.default.Fragment?e.concat(l.default.Children.toArray(t.props.children).reduce((e,t)=>"string"==typeof t||"number"==typeof t?e:e.concat(t),[])):e.concat(t)}let f=["name","httpEquiv","charSet","itemProp"];function m(e){let t,i,n,a;return e.reduce(c,[]).reverse().concat(p().reverse()).filter((t=new Set,i=new Set,n=new Set,a={},e=>{let o=!0,r=!1;if(e.key&&"number"!=typeof e.key&&e.key.indexOf("$")>0){r=!0;let i=e.key.slice(e.key.indexOf("$")+1);t.has(i)?o=!1:t.add(i)}switch(e.type){case"title":case"base":i.has(e.type)?o=!1:i.add(e.type);break;case"meta":for(let t=0,i=f.length;t<i;t++){let i=f[t];if(e.props.hasOwnProperty(i))if("charSet"===i)n.has(i)?o=!1:n.add(i);else{let t=e.props[i],n=a[i]||new Set;("name"!==i||!r)&&n.has(t)?o=!1:(n.add(t),a[i]=n)}}}return o})).reverse().map((e,t)=>{let i=e.key||t;return l.default.cloneElement(e,{key:i})})}let h=function({children:e}){let t=(0,l.useContext)(u.HeadManagerContext);return(0,s.jsx)(d.default,{reduceComponentsToState:m,headManager:t,children:e})};("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},68141,(e,t,i)=>{Object.defineProperty(i,"__esModule",{value:!0}),Object.defineProperty(i,"LoadableContext",{enumerable:!0,get:function(){return n}});let n=(e.r(41705)._(e.r(91788))).default.createContext(null)},52414,(e,t,i)=>{Object.defineProperty(i,"__esModule",{value:!0}),Object.defineProperty(i,"default",{enumerable:!0,get:function(){return c}});let n=e.r(41705)._(e.r(91788)),a=e.r(68141),o=[],r=[],s=!1;function l(e){let t=e(),i={loading:!0,loaded:null,error:null};return i.promise=t.then(e=>(i.loading=!1,i.loaded=e,e)).catch(e=>{throw i.loading=!1,i.error=e,e}),i}class d{constructor(e,t){this._loadFn=e,this._opts=t,this._callbacks=new Set,this._delay=null,this._timeout=null,this.retry()}promise(){return this._res.promise}retry(){this._clearTimeouts(),this._res=this._loadFn(this._opts.loader),this._state={pastDelay:!1,timedOut:!1};let{_res:e,_opts:t}=this;e.loading&&("number"==typeof t.delay&&(0===t.delay?this._state.pastDelay=!0:this._delay=setTimeout(()=>{this._update({pastDelay:!0})},t.delay)),"number"==typeof t.timeout&&(this._timeout=setTimeout(()=>{this._update({timedOut:!0})},t.timeout))),this._res.promise.then(()=>{this._update({}),this._clearTimeouts()}).catch(e=>{this._update({}),this._clearTimeouts()}),this._update({})}_update(e){this._state={...this._state,error:this._res.error,loaded:this._res.loaded,loading:this._res.loading,...e},this._callbacks.forEach(e=>e())}_clearTimeouts(){clearTimeout(this._delay),clearTimeout(this._timeout)}getCurrentValue(){return this._state}subscribe(e){return this._callbacks.add(e),()=>{this._callbacks.delete(e)}}}function u(t){return function(t,i){let l=Object.assign({loader:null,loading:null,delay:200,timeout:null,webpack:null,modules:null},i),u=null;function p(){if(!u){let e=new d(t,l);u={getCurrentValue:e.getCurrentValue.bind(e),subscribe:e.subscribe.bind(e),retry:e.retry.bind(e),promise:e.promise.bind(e)}}return u.promise()}if("u"<typeof window&&o.push(p),!s&&"u">typeof window){let t=l.webpack&&"function"==typeof e.t.resolveWeak?l.webpack():l.modules;t&&r.push(e=>{for(let i of t)if(e.includes(i))return p()})}function c(e,t){let i;p(),(i=n.default.useContext(a.LoadableContext))&&Array.isArray(l.modules)&&l.modules.forEach(e=>{i(e)});let o=n.default.useSyncExternalStore(u.subscribe,u.getCurrentValue,u.getCurrentValue);return n.default.useImperativeHandle(t,()=>({retry:u.retry}),[]),n.default.useMemo(()=>{var t;return o.loading||o.error?n.default.createElement(l.loading,{isLoading:o.loading,pastDelay:o.pastDelay,timedOut:o.timedOut,error:o.error,retry:u.retry}):o.loaded?n.default.createElement((t=o.loaded)&&t.default?t.default:t,e):null},[e,o])}return c.preload=()=>p(),c.displayName="LoadableComponent",n.default.forwardRef(c)}(l,t)}function p(e,t){let i=[];for(;e.length;){let n=e.pop();i.push(n(t))}return Promise.all(i).then(()=>{if(e.length)return p(e,t)})}u.preloadAll=()=>new Promise((e,t)=>{p(o).then(e,t)}),u.preloadReady=(e=[])=>new Promise(t=>{let i=()=>(s=!0,t());p(r,e).then(i,i)}),"u">typeof window&&(window.__NEXT_PRELOADREADY=u.preloadReady);let c=u},94941,(e,t,i)=>{Object.defineProperty(i,"__esModule",{value:!0}),Object.defineProperty(i,"default",{enumerable:!0,get:function(){return s}});let n=e.r(91788),a="u"<typeof window,o=a?()=>{}:n.useLayoutEffect,r=a?()=>{}:n.useEffect;function s(e){let{headManager:t,reduceComponentsToState:i}=e;function s(){if(t&&t.mountedInstances){let e=n.Children.toArray(Array.from(t.mountedInstances).filter(Boolean));t.updateHead(i(e))}}return a&&(t?.mountedInstances?.add(e.children),s()),o(()=>(t?.mountedInstances?.add(e.children),()=>{t?.mountedInstances?.delete(e.children)})),o(()=>(t&&(t._pendingUpdate=s),()=>{t&&(t._pendingUpdate=s)})),r(()=>(t&&t._pendingUpdate&&(t._pendingUpdate(),t._pendingUpdate=null),()=>{t&&t._pendingUpdate&&(t._pendingUpdate(),t._pendingUpdate=null)})),null}}],68489,(e,t,i)=>{t.exports=e.r(25167)},58678,(e,t,i)=>{t.exports=e.r(80963)}]);

//# debugId=1c9f9e54-345b-7e08-8e14-22810caf7d83