;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="a005fc73-e668-39d9-d5a9-e1b0a7b50155")}catch(e){}}();
(globalThis.SPTURBOPACK||(globalThis.SPTURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[41585,76246,e=>{var t=e.i(91398),A=e.i(91788),a=e.i(81912),i=e.i(82936),o=e.i(92381),r=e.i(77964),n=e.i(65675),l=e.i(6597),s=e.i(3055),g=e.i(32369),u=e.i(78424),c=e.i(63142),f=e.i(51261),d=e.i(13167),h=e.i(99891),I=e.i(54990),p=e.i(95516),C=e.i(70665),m=e.i(76471),B=e.i(48180),E=e.i(19592),v=e.i(48585),Q=e.i(77368),y=e.i(50016),w=e.i(8571),S=e.i(64284),x=e.i(99205),D=e.i(4539);let M={derivatives:!0};(0,p.k)(p.C),new g.nd,new g.as,new g.cE,new g.cE,new g.cE,new g.as;let b=new g.as,R=new g.as,F=new g.as,k=new g.as,L=new g.as,U=new g.FS,N=new g.FS,P=15*Math.PI/180;function _(e,t,A){let a=A>1e-6?e+(1-e)*t:e+.5*t;return a>.999?1:a}function T(e,t){let A=t-e,a=2*Math.PI;for(;A>Math.PI;)A-=a;for(;A<-Math.PI;)A+=a;return A}function G(e){let t=e.userData;return t.pressBindQuat instanceof g.as||(t.pressBindQuat=e.quaternion.clone()),t.pressBindQuat}function H(e){return new g.FS().setFromQuaternion(G(e),e.rotation.order)}function O(e,t,A){let a=T(e,t);return a>A&&(a=A),a<-A&&(a=-A),e+a}function q(e,t,A,a,i,o="z"){let r=0;for(let n=0;n<e.length;n+=1){let l=e[n],s=t.get(l),g=A.get(l);if(!s||!g)break;i.setFromQuaternion(s.quaternion,s.rotation.order);let u=0===n?a:o,c="x"===u?i.x:"y"===u?i.y:i.z;r+=T("x"===u?g.x:"y"===u?g.y:g.z,c)}return r}function Y(e){let t=e.rotation.order;U.setFromQuaternion(e.quaternion,t),e.rotation.set(U.x,U.y,U.z,t)}let J="/assets/three/book/book-rest.glb",W=y.COVER_FLAP_OPEN_MAX_RAD,K="frontcover1",V="backcover1",X="spine",z=["frontcover1","frontcover2","frontcover3","frontcover4","frontcover5"],j=["backcover1","backcover2","backcover3","backcover4","backcover5"],Z="frontendfold",$="frontend",ee=["photo","portrait","inset","picture","detail","custom","plate"],et=["flyleaf","innerspine"],eA="pages1",ea="pages2",ei=1/1.04,eo=40*Math.PI/180,er=50*Math.PI/180,en=Math.PI/2;function el(e){return e.spineArtThickness&&e.spineArtThickness>0?e.thickness/e.spineArtThickness:1}function es(e,t){let A=t.toLowerCase(),a=e;for(;a;){if(a.name.toLowerCase().includes(A))return!0;a=a.parent}return!1}function eg(e){let t=e;for(;t;){let e=t.name.trim().toLowerCase();if(e===eA)return"front";if(e===ea)return"back";t=t.parent}return null}function eu(e){let t=e.morphTargetDictionary;if(!t)return -1;if(void 0!==t.Curve)return t.Curve;let A=Object.keys(t);for(let e=0;e<A.length;e+=1){let a=A[e];if("curve"===a.toLowerCase())return t[a]}return -1}function ec(e){let t=e.morphAttributes.position;if(!t||0===t.length||e.morphAttributes.normal&&e.morphAttributes.normal.length>0)return;let A=e.index,a=e.attributes.position,i=a.count;e.morphAttributes.normal=[];for(let o=0;o<t.length;o+=1){let r=t[o],n=new Float32Array(3*i);if(A){let t=new Float32Array(3*i),o=new Float32Array(i),l=A.count/3,s=new g.cE,u=new g.cE,c=new g.cE,f=new g.cE,d=new g.cE;for(let i=0;i<l;i+=1){let n=A.getX(3*i),l=A.getX(3*i+1),g=A.getX(3*i+2);for(let A of(e.morphTargetsRelative?(s.set(a.getX(n)+r.getX(n),a.getY(n)+r.getY(n),a.getZ(n)+r.getZ(n)),u.set(a.getX(l)+r.getX(l),a.getY(l)+r.getY(l),a.getZ(l)+r.getZ(l)),c.set(a.getX(g)+r.getX(g),a.getY(g)+r.getY(g),a.getZ(g)+r.getZ(g))):(s.set(r.getX(n),r.getY(n),r.getZ(n)),u.set(r.getX(l),r.getY(l),r.getZ(l)),c.set(r.getX(g),r.getY(g),r.getZ(g))),f.subVectors(c,u),d.subVectors(s,u),f.cross(d),[n,l,g]))t[3*A]+=f.x,t[3*A+1]+=f.y,t[3*A+2]+=f.z,o[A]+=1}for(let e=0;e<i;e+=1){let A=t[3*e],a=t[3*e+1],i=t[3*e+2],o=Math.sqrt(A*A+a*a+i*i)||1;n[3*e]=A/o,n[3*e+1]=a/o,n[3*e+2]=i/o}}else{let t=i/3,A=new g.cE,o=new g.cE,l=new g.cE,s=new g.cE,u=new g.cE;for(let i=0;i<t;i+=1){let t=3*i,g=3*i+1,c=3*i+2;e.morphTargetsRelative?(A.set(a.getX(t)+r.getX(t),a.getY(t)+r.getY(t),a.getZ(t)+r.getZ(t)),o.set(a.getX(g)+r.getX(g),a.getY(g)+r.getY(g),a.getZ(g)+r.getZ(g)),l.set(a.getX(c)+r.getX(c),a.getY(c)+r.getY(c),a.getZ(c)+r.getZ(c))):(A.set(r.getX(t),r.getY(t),r.getZ(t)),o.set(r.getX(g),r.getY(g),r.getZ(g)),l.set(r.getX(c),r.getY(c),r.getZ(c))),s.subVectors(l,o),u.subVectors(A,o),s.cross(u).normalize(),n[3*t]=n[3*g]=n[3*c]=s.x,n[3*t+1]=n[3*g+1]=n[3*c+1]=s.y,n[3*t+2]=n[3*g+2]=n[3*c+2]=s.z}}e.morphAttributes.normal.push(new g.ki(n,3))}e.morphTargetsTexture&&(e.morphTargetsTexture.dispose(),e.morphTargetsTexture=null)}function ef(e,t){let A=[e];for(;A.length>0;){let e=A.pop();if(e.name.toLowerCase()===t)return e;let a=e.children;for(let e=a.length-1;e>=0;e-=1)A.push(a[e])}return null}y.BACK_COVER_FLAP_BACK_MAX_RAD;let ed=null;function eh(e){return e.toLowerCase().replace(/[\s._-]+/g,"")}function eI(e){let t=e.userData;if(t?.keepBlenderMaterial===!0)return!0;let A=eh(e.name??"");return!!A&&ee.some(e=>A.includes(eh(e)))}let ep=e=>{let t=new d.f;e.setDRACOLoader(t)};l.f.preload(J,!1,!0,ep);let eC=[],em=0,eB=null,eE=0;function ev(){if(eC.length>0&&(0,s.N)()){null==eB&&(eB=setTimeout(()=>{eB=null,ev()},50));return}for(;em<3&&eC.length>0;){let e=0;for(let t=1;t<eC.length;t+=1)Math.abs(eC[t].index-eE)<Math.abs(eC[e].index-eE)&&(e=t);let t=eC.splice(e,1)[0];t&&t.run()}}let eQ=new Map,ey=new Map,ew=new Map;function eS(e){ew.set(e,(ew.get(e)??0)+1)}function ex(e){let t=(ew.get(e)??0)-1;if(t>0)return void ew.set(e,t);ew.delete(e);let A=eQ.get(e);A&&(A.dispose(),eQ.delete(e))}let eD=[],eM=0,eb=0;function eR(){if(eM=0,0===eD.length){eb=0;return}if((0,s.N)()){eb=0,eM=requestAnimationFrame(eR);return}if(!y.bookTexApplyAllowedRef.current){let e=performance.now();if(0===eb&&(eb=e),e-eb<50){"function"==typeof requestAnimationFrame&&(eM=requestAnimationFrame(eR));return}}eb=0;let e=performance.now(),t=0;do{let e=eD.shift();e&&(e(),t+=1)}while(eD.length>0&&performance.now()-e<6)t>0&&(y.bookTexAppliedNonceRef.current+=1),eD.length>0&&"function"==typeof requestAnimationFrame&&(eM=requestAnimationFrame(eR))}let eF=new Set;function ek(e,t){for(let A of t)!A||eF.has(A.uuid)||(eF.add(A.uuid),eL(()=>e.initTexture(A)))}function eL(e){eD.push(e),eM||"function"!=typeof requestAnimationFrame||(eM=requestAnimationFrame(eR))}function eU(e,t,A,a=0,i){let o=(0,I.f)().covers;if(null!=o&&a>=o)return;let r=eQ.get(e);if(r)return void A(r);let n=ey.get(e);n?n.callbacks.push(A):(ey.set(e,{callbacks:[A]}),eC.push({run:()=>{em+=1,(0,h.w)(t).load(e,A=>{A.colorSpace=g.Ik,A.minFilter=g.Q4,A.magFilter=g.VV,A.anisotropy=i??Math.min(16,Math.max(1,t.capabilities.getMaxAnisotropy())),A.needsUpdate=!0,eL(()=>{try{t.initTexture(A)}catch{}eQ.set(e,A);let a=ey.get(e);if(ey.delete(e),a)for(let e of a.callbacks)e(A)}),em-=1,ev()},void 0,()=>{ey.delete(e),em-=1,ev()})},index:a}),ev())}let eN=80*Math.PI/180,eP=(1-.8**z.length)/(1-.8),e_={x:new g.cE(1,0,0),y:new g.cE(0,1,0),z:new g.cE(0,0,1)},eT=[{label:"X",sub:"rest×open · local X",axis:"x",premultiply:!1},{label:"Y",sub:"rest×open · local Y",axis:"y",premultiply:!1},{label:"Z",sub:"rest×open · local Z",axis:"z",premultiply:!1},{label:"PX",sub:"open×rest · local X",axis:"x",premultiply:!0},{label:"PY",sub:"open×rest · local Y",axis:"y",premultiply:!0},{label:"PZ",sub:"open×rest · local Z",axis:"z",premultiply:!0}];function eG(e){let t=Math.max(0,e);return t<=eo?1:t>=er?eo/Math.max(1e-8,t):(eo+(er-t)/(er-eo)*(t-eo))/Math.max(1e-8,t)}function eH(e,t,A,a,i,o){o.setFromAxisAngle(a,A),e.quaternion.copy(t),i?e.quaternion.premultiply(o):e.quaternion.multiply(o)}function eO(e,t){e.clothGloss.value=t.gloss,e.clothSheen.value=t.sheen,e.clothSheenRough.value=t.sheenRough,e.clothWrap.value=t.wrap,e.clothWeave.value=t.weave,e.clothFibre.value=t.fibre}e.s(["O",0,3.374,"b",0,({config:e,pageCount:s,pageColor:d,tintedLeaves:I,pageImages:ee,stackThicknessPct:eo,buildStaticPageStack:er=!0,staticStackCenterSpread:eh=!1,wireframe:eC=!1,position:em=[0,-1.7,-36],rotation:eB=[-.5,.35,.15],bookRotationX:eE,bookRotationY:ev,onLoaded:eQ,deferTextures:ey=!1,bookTexPriority:ew=0,onCoverApplied:eD,onCoverLoaded:eM,deferLoadReady:eb=!0,deferApplyReady:eR=!0,coverResident:eF=!0,opacity:eq=1,skipBookRotation:eY=!1,frontCoverOpenRad:eJ=0,frontCoverOpenRadRef:eW,frontCoverHoverRadRef:eK,backCoverOpenRadRef:eV,invertBackCoverOpenDirection:eX=!1,spineTiltRadRef:ez,spineTiltAxis:ej,readingSpinYawRadRef:eZ,readingSpinPitchRadRef:e$,coverBoneOpenAxis:e0="y",coverBoneOpenLocalAxis:e1,backCoverBoneOpenAxis:e2,backCoverBoneOpenLocalAxis:e3,backCoverBoneOpenPremultiplyOpen:e5,backCoverOpenAngleSign:e8=1,coverBoneOpenPremultiplyOpen:e4=!0,coverBonePreview:e6=!1,coverBonePreviewMaxRad:e9=eN,coverBonePreviewSpeed:e7=1.1,coverBonePreviewCycle:te=!1,coverBonePreviewCycleIntervalSec:tt=2.2,pageStackCoupleToCovers:tA=!0,drivePages2FromBackCover:ta=!0,drivePages1RotationFromFrontCoverBone:ti=!1,drivePages2RotationFromBackCoverBone:to=!1,pages2BackCoverEulerYFullRad:tr,pages2TiltFullRad:tn,pages2TiltLocalAxis:tl=[0,1,0],pages2CurveFromFrontCover:ts=!1,pages2TiltBackCoverGain:tg=1,coverDiagnosticsHudVisible:tu=!1,coverDiagnosticsSnapshotOutRef:tc,lookInsideOpenProgressRef:tf,onPages2HostForLookInside:td,lookInsidePortalMounted:th=!1,shelfPointerDown:tI=!1,coverFlapStackCoupleRef:tp})=>{let tC=(0,A.useRef)(null),tm=(0,A.useRef)(null),tB=(0,A.useRef)(0),tE=(0,A.useRef)(0),tv=(0,A.useRef)(0),[tQ,ty]=(0,A.useState)(null),[tw,tS]=(0,A.useState)(!1),[tx,tD]=(0,A.useState)(220),[tM,tb]=(0,A.useState)(Math.round(180*y.COVER_FLAP_OPEN_MAX_RAD/Math.PI)),[tR,tF]=(0,A.useState)("y"),[tk,tL]=(0,A.useState)(()=>({label:eT[0].label,sub:eT[0].sub})),tU=(0,A.useRef)(null),tN=(0,A.useRef)(null),tP=(0,A.useRef)(null),[t_,tT]=(0,A.useState)({x:0,y:0}),tG=(0,A.useRef)(t_);tG.current=t_;let tH=(0,A.useRef)(null),tO=(0,A.useCallback)(e=>{let t=tH.current;t&&tT({x:t.origX+(e.clientX-t.startX),y:t.origY+(e.clientY-t.startY)})},[]),tq=(0,A.useCallback)(()=>{tH.current=null,window.removeEventListener("pointermove",tO),window.removeEventListener("pointerup",tq),window.removeEventListener("pointercancel",tq)},[tO]),tY=(0,A.useCallback)(e=>{if(0!==e.button)return;e.preventDefault(),e.stopPropagation();let t=tG.current;tH.current={startX:e.clientX,startY:e.clientY,origX:t.x,origY:t.y},window.addEventListener("pointermove",tO),window.addEventListener("pointerup",tq),window.addEventListener("pointercancel",tq)},[tO,tq]);(0,A.useEffect)(()=>{tw||tT({x:0,y:0})},[tw]),(0,A.useEffect)(()=>{if(!tw)return;let e=y.coverShelfFlapInteractionTuneRef.current;tD(Math.round(100*e.gainMul)),tb(Math.round(180*e.maxOpenRad/Math.PI*10)/10)},[tw]);let tJ=(0,l.f)(J,!1,!0,ep),tW=(0,A.useMemo)(()=>{var e;let t;return e=tJ.scene,t=!1,e.traverse(e=>{e.isSkinnedMesh&&(t=!0)}),t},[tJ]),{riggedScene:tK,riggedModelNodes:tV}=(0,A.useMemo)(()=>{let e=new Set;if(!tW)return{riggedScene:null,riggedModelNodes:e};let t=(0,f.f)(tJ.scene);return t.traverse(t=>e.add(t)),{riggedScene:t,riggedModelNodes:e}},[tJ,tW]),tX=(0,A.useCallback)(()=>{tN.current?.unmount(),tN.current=null;let e=tP.current;e?.parentNode&&e.parentNode.removeChild(e),tP.current=null},[]);(0,A.useLayoutEffect)(()=>{if("u">typeof document){if(!tw||!tW||!tK)return void tX();if(!tP.current){let e=document.createElement("div");e.setAttribute("data-book-dev-cover-stack-panel",""),document.body.appendChild(e),tP.current=e,tN.current=(0,a.createRoot)(e)}tN.current.render((0,t.jsx)(w.f,{shellRef:tU,devCoverDrag:t_,onDragHandlePointerDown:tY,bookPageStackFanMode:"off",devShelfFlapGainPct:tx,setDevShelfFlapGainPct:tD,devShelfFlapMaxDeg:tM,setDevShelfFlapMaxDeg:tb,devPageFanAxis:tR,setDevPageFanAxis:tF}))}},[t_,tw,tR,tx,tM,tX,tY,tW,tK]),(0,A.useLayoutEffect)(()=>()=>tX(),[tX]);let tz=(0,A.useMemo)(()=>tW?null:function(e){let t=e.getObjectByName("book")??e,A=[];if(t.traverse(e=>{e.isMesh&&A.push(e)}),0===A.length)return null;t.updateMatrixWorld(!0);let a=A.map(e=>{let t=e.geometry.clone();return t.applyMatrix4(e.matrixWorld),t});return 1===a.length?a[0]:(0,c.M)(a)??a[0]}(tJ.scene),[tJ,tW]),tj=(0,A.useMemo)(()=>{let e;return tK?(e=new Map,tK.traverse(t=>{t.isBone&&e.set(t.name,t)}),e):new Map},[tK]),tZ=(0,A.useRef)(new Map),t$=(0,A.useRef)(null),t0=(0,A.useRef)([]),t1=(0,A.useRef)([]),t2=(0,A.useRef)(new Map),t3=(0,A.useRef)(new Map),t5=(0,A.useRef)([]),t8=(0,A.useRef)([]),t4=(0,A.useRef)(null),t6=(0,A.useRef)(null),t9=(0,A.useRef)(new g.cE),t7=(0,A.useRef)(0),Ae=(0,A.useRef)(0),At=(0,A.useRef)(new Map),AA=(0,A.useRef)(new Map),Aa=(0,A.useRef)(new Map),Ai=(0,A.useRef)(new g.cE),Ao=(0,A.useRef)(new g.cE),Ar=(0,A.useRef)(new g.as),An=(0,A.useRef)(null),Al=(0,A.useRef)(new g.as),As=(0,A.useRef)(new g.as),Ag=(0,A.useRef)(null),Au=(0,A.useRef)({x:0,y:0,z:0,order:"XYZ"}),Ac=(0,A.useRef)(null),Af=(0,A.useRef)(null),Ad=(0,A.useRef)(0),Ah=(0,A.useRef)(0),AI=(0,A.useRef)(-1),Ap=(0,A.useRef)(null),AC=(0,A.useRef)(0),Am=(0,A.useRef)(0),AB=(0,A.useRef)(-1),AE=(0,A.useRef)(null),Av=(0,A.useRef)([]),AQ=(0,A.useRef)(new g.as),Ay=(0,A.useRef)(new g.as),Aw=(0,A.useRef)(new g.cE),AS=(0,A.useRef)(new g.as),Ax=(0,A.useRef)(null),AD=(0,A.useRef)(new g.as),AM=(0,A.useRef)(new g.FS),Ab=(0,A.useRef)({x:0,y:0,z:0,order:"XYZ"}),AR=(0,A.useRef)(null),AF=(0,A.useRef)([]),Ak=(0,A.useRef)([]),AL=(0,A.useRef)(null),AU=tc??AL;(0,A.useLayoutEffect)(()=>{if(!tW||!tK)return;tK.updateMatrixWorld(!0),tZ.current.clear(),z.forEach(e=>{let t=tj.get(e);t&&tZ.current.set(e,G(t).clone())}),At.current.clear(),z.forEach(e=>{let t=tZ.current.get(e),A=tj.get(e);t&&A&&(U.setFromQuaternion(t,A.rotation.order),At.current.set(e,{x:U.x,y:U.y,z:U.z}))});let e=tj.get(Z);e&&(t$.current=G(e).clone());let t=tj.get(V);AA.current.clear(),j.forEach(e=>{let t=tj.get(e);t&&AA.current.set(e,G(t).clone())}),Aa.current.clear(),j.forEach(e=>{let t=AA.current.get(e),A=tj.get(e);t&&A&&(U.setFromQuaternion(t,A.rotation.order),Aa.current.set(e,{x:U.x,y:U.y,z:U.z}))}),t&&(t4.current=G(t).clone(),U.setFromQuaternion(t4.current,t.rotation.order),t7.current=U.z);let A=tj.get(K);A&&(U.setFromQuaternion(G(A),A.rotation.order),Ae.current=U.z);let a=tj.get(X);t6.current=a?G(a).clone():null},[tW,tK,tj]),(0,A.useLayoutEffect)(()=>{if(!tW||!tK)return;let t=e.material.thickness/3.374;[K,V].forEach(e=>{let A=tj.get(e);if(!A)return;let a=A.userData;void 0===a.coverBoneBindX&&(a.coverBoneBindX=A.position.x),A.position.x=a.coverBoneBindX*t,A.updateMatrix()});let A=tj.get("neutral_bone");if(A){let e=A.userData;void 0===e.neutralBindScaleX&&(e.neutralBindScaleX=A.scale.x),A.scale.x=e.neutralBindScaleX*t,A.updateMatrix()}tK.traverse(e=>{let A=e.name.toLowerCase();if(!A.includes("innerspine")&&!A.includes("crash"))return;let a=e.userData;void 0===a.spineExtraBindScaleX&&(a.spineExtraBindScaleX=e.scale.x),e.scale.x=a.spineExtraBindScaleX*t,e.updateMatrix()})},[tW,tK,tj,e.material.thickness]),(0,A.useLayoutEffect)(()=>{},[tW,tK]),(0,A.useLayoutEffect)(()=>{},[tK]),(0,A.useEffect)(()=>{let e=e=>{let t=e.target,A=t&&("INPUT"===t.tagName||"TEXTAREA"===t.tagName||t.isContentEditable);"/"!==e.key&&"Slash"!==e.code&&"NumpadDivide"!==e.code||A||e.preventDefault()};return window.addEventListener("keydown",e),()=>{window.removeEventListener("keydown",e)}},[]),(0,A.useEffect)(()=>{(tW?tK:tz)&&eQ?.()},[tW,tK,tz,eQ]);let AN=(0,A.useMemo)(()=>({diffuseMapBase:(0,v.K)("shared_diffuse_overlay"),diffuseMapCustom:(0,v.K)(e.material.diffuseMapCustom),bumpMapBase:(0,v.K)(e.material.bumpMapBase),bumpMapCustom:(0,v.K)(e.material.bumpMapCustom),foilMap:(0,v.K)(e.material.foilMap),glossMap:e.material.glossMap?(0,v.K)(e.material.glossMap):(0,v.K)("shared_diffuse_none"),glitterMap:(0,v.K)("shared_glitter")}),[e.material.diffuseMapCustom,e.material.bumpMapBase,e.material.bumpMapCustom,e.material.foilMap,e.material.glossMap]),AP=(0,v.K)("shared_diffuse_none"),A_=(0,A.useMemo)(()=>ey?{...AN,diffuseMapCustom:AP,bumpMapCustom:AP,foilMap:AP}:AN,[ey,AN,AP]),{gl:AT}=(0,o.f)(),AG=(0,A.useCallback)(e=>{e.setTranscoderPath("/basis/"),(0,h.w)(AT)},[AT]),AH=(0,A.useMemo)(()=>Object.keys(A_),[A_]),AO=(0,A.useMemo)(()=>Object.values(A_),[A_]),Aq=(0,r.f)(h.R,AO,AG),AY=(0,A.useMemo)(()=>{let e={};return AH.forEach((t,A)=>{e[t]=Aq[A]}),e},[AH,Aq]);(0,A.useLayoutEffect)(()=>{let e=Math.min(16,Math.max(1,AT.capabilities.getMaxAnisotropy())),t=Math.min(4,e);for(let A of(Object.values(AY).forEach(t=>{t&&(t.colorSpace=g.Ik,t.minFilter=g.Q4,t.magFilter=g.VV,t.anisotropy=e)}),["bumpMapBase","bumpMapCustom","foilMap","glossMap","glitterMap"])){let e=AY[A];e&&(e.anisotropy=t)}ek(AT,Object.values(AY))},[AY,AT]);let AJ=(0,A.useMemo)(()=>{let e=new g.U7(new Uint8Array([248,244,234,255]),1,1,g.W1);return e.needsUpdate=!0,e},[]),AW=(0,r.f)(h.R,(0,v.K)("shared_bump_paper"),AG);(0,A.useEffect)(()=>{AW&&(AW.colorSpace=g.Ik,AW.wrapS=g.FP,AW.wrapT=g.FP,AW.needsUpdate=!0,ek(AT,[AW]))},[AW,AT]);let AK="shared_diffuse_none"===e.material.diffuseMapCustom,AV=(0,A.useMemo)(()=>{let t,A=e.material;return new g.Zg({vertexShader:p.C,fragmentShader:C.f,uniforms:{specular:{value:new g.Es(0xffffff)},shininess:{value:A.shininess},reflectiveness:{value:A.reflectiveness},diffuseMapBase:{value:AY.diffuseMapBase},diffuseMapCustom:{value:AY.diffuseMapCustom},diffuseBaseColor:{value:new g.cE().fromArray(A.diffuseBaseColor)},uDiffuseReady:{value:ey||AK?0:1},bumpMapBase:{value:AY.bumpMapBase},bumpMapCustom:{value:AY.bumpMapCustom},bumpScaleBase:{value:A.bumpScaleBase},bumpScaleCustom:{value:A.bumpScaleCustom},uSpineUvScale:{value:el(A)},foilMap:{value:AY.foilMap},foilDetail:{value:A.foilDetail},foilOffset:{value:A.foilOffset??0},foilSilver:{value:A.foilSilver??0},...{clothGloss:{value:(t=(0,Q.f)(A)).gloss},clothSheen:{value:t.sheen},clothSheenRough:{value:t.sheenRough},clothWrap:{value:t.wrap},clothWeave:{value:t.weave},clothFibre:{value:t.fibre}},foilEmissive:{value:0},foilOpacity:{value:A.foilOpacity},foilSpecular:{value:A.foilSpecular},glossMap:{value:AY.glossMap},glossEmissive:{value:0},glossOpacity:{value:A.glossOpacity||0},glossSpecular:{value:A.glossSpecular||0},glitterMap:{value:AY.glitterMap},glitterEmissive:{value:0},glitterOpacity:{value:A.glitterOpacity||0},glitterSpecular:{value:0},uPageDiffuseMap:{value:AJ},uCoverWipe:{value:0},uCoverWipeTime:{value:0},uCoverWipeThickFrom:{value:0},uCoverWipeThickTo:{value:0},diffuseMapCustom2:{value:AY.diffuseMapCustom},bumpMapCustom2:{value:AY.bumpMapCustom},foilMap2:{value:AY.foilMap},foilOpacity2:{value:0},foilSpecular2:{value:0},foilDetail2:{value:2},bumpScaleBase2:{value:.03},bumpScaleCustom2:{value:.15},uOpacity:{value:eq},uBookBlinnSpecSpread:{value:y.BOOK_BLINN_SPECULAR_SOFTEN_SPREAD},uHologramIntensity:{value:0},uHologramTime:{value:0},uHologramMouse:{value:new g.wq(0,0)},uHologramScanlineFreq:{value:817},uHologramScanlineSpeed:{value:10},uHologramScanlineStrength:{value:.055},uHologramChromaticStrength:{value:.0147},uHologramLightBoost:{value:0},uHologramWaveAmpMul:{value:1},uHologramChromaticTimeMul:{value:0},uHologramTint:{value:new g.cE(.004,.015,.087)},uRadioIntensity:{value:0},uRadioTime:{value:0},uRadioRingFreq:{value:26},uRadioRingSpeed:{value:1.1},uRadioRingStrength:{value:.16},uRadioDisplaceAmp:{value:.12},uRadioNormalAmp:{value:.6},uRadioNoiseAmp:{value:.16},uRadioNoiseScale:{value:42},uRadioNoiseSpeed:{value:7},uRadioCenter:{value:new g.wq(.78,.72)},uRadioTint:{value:new g.cE(.02,.06,.09)},...u.O.lights},lights:!0,defines:{USE_UV:""},extensions:M,onBeforeCompile:e=>{let t=u.Y.lights_phong_pars_fragment,A=/([\t ]*)reflectedLight\.directSpecular \+= irradiance \* BRDF_BlinnPhong\( directLight\.direction, geometryViewDir, geometryNormal, material\.specularColor, material\.specularShininess \) \* material\.specularStrength;/;if(!A.test(t))return;let a=t.replace(A,"$1reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess / max( 1.0, 1.0 + uBookBlinnSpecSpread ) ) * material.specularStrength;"),i=/#include\s+<lights_phong_pars_fragment>[^\n]*/;i.test(e.fragmentShader)&&(e.fragmentShader=e.fragmentShader.replace(i,a))}})},[AY,AJ]);(0,A.useEffect)(()=>{AV.uniforms.uSpineUvScale.value=el(e.material)},[AV,e.material.thickness,e.material.spineArtThickness]),(0,A.useLayoutEffect)(()=>{if(!tK||!tW)return;let e=AV.uniforms,t=[];return tK.traverse(A=>{!A.name.toLowerCase().includes("crash")||A.isMesh&&(t.push(A),A.castShadow=!0,A.receiveShadow=!0,A.material=new g.Zg({vertexShader:`
          #include <common>
          #include <shadowmap_pars_vertex>
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            /* Flipped exactly as the cover's VertexShader does (mesh uv -> book atlas). Unflipped, the strip samples the
             * mirror of the cloth patch near the bottom of the sheet, which is just cover art. */
            vUv = vec2(uv.x, 1.0 - uv.y);
            vec3 transformed = vec3(position);
            /* NO PER-VERTEX ARC HERE, and it cannot be added as-is — the geometry has nowhere to bend.
             *
             * The strip is an extrusion with only its two END rings: 2940 vertices but just 20 distinct Z values, all
             * inside -11.68..-11.59 and 11.59..11.68 (a bevel at each cap). There is not one vertex along the middle of
             * its length, so a profile like 1 - t*t evaluates to ~0 at EVERY vertex. A taper written against that
             * subtracted the whole offset everywhere and the crash stopped pushing out at all, with no bend to show for
             * it — both symptoms of the same thing.
             *
             * Bending it needs the geometry re-tessellated along Z first (interior rings to displace). Until then the
             * push stays a rigid offset; see CRASH_OPEN_SLIDE_FRAC.
             * (NO BACKTICKS in here: this is inside a JS template literal and one would end the string.) */
            vec3 objectNormal = vec3(normal);
            vec3 transformedNormal = normalMatrix * objectNormal;
            vNormal = normalize(transformedNormal);
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
            #include <worldpos_vertex>
            #include <shadowmap_vertex>
          }
        `,fragmentShader:`
          uniform sampler2D diffuseMapBase;
          uniform sampler2D diffuseMapCustom;
          uniform vec3 diffuseBaseColor;
          uniform float uDiffuseReady;
          varying vec2 vUv;
          varying vec3 vNormal;
          #include <common>
          #include <packing>
          #include <bsdfs>
          #include <lights_pars_begin>
          #include <lights_lambert_pars_fragment>
          #include <shadowmap_pars_fragment>
          ${B.f}
          float crashOverlay(float base, float blend) {
            return base < 0.5 ? 2.0 * base * blend : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
          }
          void main() {
            /* Same sample as the cover: the shared paper-grain base overlaid with this book's diffuse. */
            vec3 tex = texture2D(diffuseMapCustom, vUv).rgb;
            vec3 base = texture2D(diffuseMapBase, vUv).rgb;
            vec3 weave = vec3(crashOverlay(base.r, tex.r), crashOverlay(base.g, tex.g), crashOverlay(base.b, tex.b));
            vec4 diffuseColor = vec4(uDiffuseReady < 0.5 ? diffuseBaseColor : weave, 1.0);
            float specularStrength = 0.0;
            vec3 normal = normalize(vNormal);
            ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
            #include <lights_lambert_fragment>
            #include <lights_fragment_begin>
            #include <lights_fragment_end>
            vec3 lit = reflectedLight.indirectDiffuse * 0.800 + reflectedLight.directDiffuse * 0.850;
            lit *= mix(vec3(1.0), occlusionLightHue(), 0.350);
            gl_FragColor = vec4(lit, 1.0);
          }
        `,uniforms:{diffuseMapBase:e.diffuseMapBase,diffuseMapCustom:e.diffuseMapCustom,diffuseBaseColor:e.diffuseBaseColor,uDiffuseReady:e.uDiffuseReady,...u.O.lights},lights:!0}))}),Av.current=t.map(e=>{e.geometry.computeBoundingBox();let t=e.geometry.boundingBox,A=t?Math.abs(t.max.x-t.min.x)*Math.abs(e.scale.x||1):0;return{mesh:e,bind:e.position.clone(),widthX:A}}),()=>{Av.current=[]}},[tW,tK,AV]),(0,A.useEffect)(()=>{let t=e.material,A=AV.uniforms;A.shininess.value=t.shininess,A.reflectiveness.value=t.reflectiveness,A.diffuseBaseColor.value.fromArray(t.diffuseBaseColor),A.bumpScaleBase.value=t.bumpScaleBase,A.bumpScaleCustom.value=t.bumpScaleCustom,A.foilDetail.value=t.foilDetail,A.foilOffset.value=t.foilOffset??0,A.foilSilver.value=t.foilSilver??0,A.foilOpacity.value=t.foilOpacity,A.foilSpecular.value=t.foilSpecular,eO(A,(0,Q.f)(t)),A.glossOpacity.value=t.glossOpacity||0,A.glossSpecular.value=t.glossSpecular||0,A.glitterOpacity.value=t.glitterOpacity||0,A.diffuseMapBase.value=AY.diffuseMapBase,A.diffuseMapCustom.value=AY.diffuseMapCustom,A.bumpMapBase.value=AY.bumpMapBase,A.bumpMapCustom.value=AY.bumpMapCustom,A.foilMap.value=AY.foilMap,A.glossMap.value=AY.glossMap,A.glitterMap.value=AY.glitterMap},[AV,e.material,AY]);let AX=(0,A.useRef)(!1),Az=(0,A.useRef)(!1),Aj=(0,A.useRef)({}),AZ=(0,A.useRef)(eR);AZ.current=eR;let A$=(0,A.useRef)([]),A0=(0,A.useRef)(eD);A0.current=eD;let A1=(0,A.useRef)(eM);A1.current=eM;let A2=(0,A.useRef)(!1),A3=(0,A.useCallback)(()=>{A2.current||(A2.current=!0,A1.current?.())},[]),A5=(0,A.useCallback)(()=>{if(!ey||!AZ.current)return;let e=Aj.current,t=AV.uniforms;e.diffuse&&t.diffuseMapCustom.value!==e.diffuse&&(t.diffuseMapCustom.value=e.diffuse,t.uDiffuseReady.value=+!AK,Az.current||(Az.current=!0,A0.current?.())),e.bump&&t.bumpMapCustom.value!==e.bump&&(t.bumpMapCustom.value=e.bump),e.foil&&t.foilMap.value!==e.foil&&(t.foilMap.value=e.foil)},[ey,AK,AV]);(0,A.useEffect)(()=>{ey||(A3(),A0.current?.())},[ey,A3]),(0,A.useEffect)(()=>{if(!ey||!eF||AX.current||!eb)return;AX.current=!0;let e=[AN.diffuseMapCustom,AN.bumpMapCustom,AN.foilMap];A$.current=e,e.forEach(eS);let t=Math.min(4,Math.max(1,AT.capabilities.getMaxAnisotropy()));eU(AN.diffuseMapCustom,AT,e=>{Aj.current.diffuse=e,A3(),A5()},ew),eU(AN.bumpMapCustom,AT,e=>{Aj.current.bump=e,A5()},ew,t),eU(AN.foilMap,AT,e=>{Aj.current.foil=e,A5()},ew,t)},[ey,eb,eF,AN,AT,A5,A3]),(0,A.useEffect)(()=>{eR&&A5()},[eR,A5]),(0,A.useEffect)(()=>{if(!ey||eF)return;let e=AV.uniforms;e.diffuseMapCustom.value=AY.diffuseMapCustom,e.bumpMapCustom.value=AY.bumpMapCustom,e.foilMap.value=AY.foilMap,e.uDiffuseReady.value=0,AX.current=!1,Az.current=!1,Aj.current={};let t=A$.current;A$.current=[],t.forEach(ex)},[ey,eF,AV,AY]);let A8=(0,A.useRef)(!1);(0,i.f)(()=>{let t=globalThis.__bookMaterialOverrideLiveRef?.current?.get(e.id),A=AV.uniforms;if(!t){if(!A8.current)return;A8.current=!1;let t=e.material;A.shininess.value=t.shininess,A.reflectiveness.value=t.reflectiveness,A.bumpScaleBase.value=t.bumpScaleBase,A.bumpScaleCustom.value=t.bumpScaleCustom,A.foilSpecular.value=t.foilSpecular,A.foilDetail.value=t.foilDetail,A.foilOffset.value=t.foilOffset??0,A.foilSilver.value=t.foilSilver??0,A.foilOpacity.value=t.foilOpacity,A.glossSpecular.value=t.glossSpecular||0,A.glossOpacity.value=t.glossOpacity||0,A.glitterOpacity.value=t.glitterOpacity||0,eO(A,(0,Q.f)(t)),A.diffuseBaseColor.value.fromArray(t.diffuseBaseColor);return}if(A8.current=!0,null!=t.shininess&&(A.shininess.value=t.shininess),null!=t.reflectiveness&&(A.reflectiveness.value=t.reflectiveness),null!=t.bumpScaleBase&&(A.bumpScaleBase.value=t.bumpScaleBase),null!=t.bumpScaleCustom&&(A.bumpScaleCustom.value=t.bumpScaleCustom),null!=t.foilSpecular&&(A.foilSpecular.value=t.foilSpecular),null!=t.foilDetail&&(A.foilDetail.value=t.foilDetail),null!=t.foilOffset&&(A.foilOffset.value=t.foilOffset),null!=t.foilSilver&&(A.foilSilver.value=t.foilSilver),null!=t.foilOpacity&&(A.foilOpacity.value=t.foilOpacity),null!=t.glossSpecular&&(A.glossSpecular.value=t.glossSpecular),null!=t.glossOpacity&&(A.glossOpacity.value=t.glossOpacity),null!=t.glitterOpacity&&(A.glitterOpacity.value=t.glitterOpacity),null!=t.clothGloss&&(A.clothGloss.value=t.clothGloss),null!=t.clothSheen&&(A.clothSheen.value=t.clothSheen),null!=t.clothWeave&&(A.clothWeave.value=t.clothWeave),null!=t.clothFibre&&(A.clothFibre.value=t.clothFibre),null!=t.diffuseR||null!=t.diffuseG||null!=t.diffuseB){let e=A.diffuseBaseColor.value;null!=t.diffuseR&&(e.x=t.diffuseR),null!=t.diffuseG&&(e.y=t.diffuseG),null!=t.diffuseB&&(e.z=t.diffuseB)}});let A4=(0,A.useRef)(new Set);(0,i.f)(()=>{let t=globalThis.__bookTextureOverrideLiveRef?.current?.get(e.id),A=A4.current;if(!t&&!A.size)return;let a=AV.uniforms,i=Aj.current,o={diffuseMapCustom:Az.current&&i.diffuse||AY.diffuseMapCustom,bumpMapCustom:i.bump??AY.bumpMapCustom,foilMap:i.foil??AY.foilMap,glossMap:AY.glossMap,bumpMapBase:AY.bumpMapBase};for(let e of Object.keys(o)){let i=t?.[e];if(i){if(a[e].value===i)continue;"diffuseMapCustom"!==e&&(i.anisotropy=Math.min(4,Math.max(1,AT.capabilities.getMaxAnisotropy()))),a[e].value=i,A.add(e),"diffuseMapCustom"===e&&(a.uDiffuseReady.value=1)}else A.has(e)&&(a[e].value=o[e],A.delete(e),"diffuseMapCustom"===e&&(a.uDiffuseReady.value=AK||ey&&!Az.current?0:1))}}),(0,A.useEffect)(()=>{AV.uniforms.uOpacity.value=eq,AV.transparent=eq<.999,AV.depthWrite=eq>=.999},[AV,eq]),(0,A.useLayoutEffect)(()=>{if(!tK)return()=>{};tK.updateMatrixWorld(!0);let t=[],A=[],a=new Map,i=[];for(let e of(tV.forEach(e=>{if(e.isMesh){var o;let r=Array.isArray(e.material)?e.material:[e.material],n=(e.name??"").toLowerCase().includes("endpaper");for(let t=0;t<r.length;t++){let A=r[t],a=(A.name??"").toLowerCase(),o=`${e.uuid}_${t}`,l=t2.current.has(o);if(a.includes("endpaper")||n||l){l||t2.current.set(o,A.map??null);let a=t2.current.get(o)??null;i.push({mesh:e,slotIndex:t,origMap:a})}}if(function(e,t){let A=e;for(;A;){if(A.name.toLowerCase()===t)return!0;A=A.parent}return!1}(o=e,"pages")||null!==eg(o)){let i=e.userData;if(void 0===i.bookPagesBaseScaleX&&(i.bookPagesBaseScaleX=e.scale.x),null!==eg(e)){void 0===i.bookInteriorStackBindPosition&&(i.bookInteriorStackBindPosition=e.position.clone());let t=Array.isArray(e.material)?e.material:[e.material],o=t3.current.get(e.uuid),r=o?o.matNames:t.map(e=>(e.name??"").toLowerCase());r.some(e=>e.includes("front"))&&(o||t3.current.set(e.uuid,{matNames:r,origMaps:t.map(e=>e.map??null)}),A.push(e),a.set(e,r))}t.push(e)}else!e.isSkinnedMesh&&es(e,$)&&(e.frustumCulled=!1)}if(e.isSkinnedMesh){if(et.some(t=>es(e,t)));else{let t;es(e,$)||(t=(Array.isArray(e.material)?e.material:[e.material]).map(e=>eI(e)?e:AV),e.material=1===t.length?t[0]:t)}e.frustumCulled=!1,null===e.boundingSphere&&eL(()=>{null===e.boundingSphere&&(e.skeleton.update(),e.computeBoundingSphere())})}}),A)){e.castShadow=!0,e.receiveShadow=!0;let t=Array.isArray(e.material),A=t?e.material:[e.material];a.get(e);let i=t3.current.get(e.uuid)?.origMaps,o=A.map((e,t)=>{if(eI(e))return e;let A=AV.clone();A.uniforms.uIsPageStack={value:1},A.uniforms.uPageDarken={value:0},A.uniforms.uShadowGrain={value:.15},A.uniforms.uBounceScale={value:.5},A.uniforms.uBounceIntensity={value:1},A.uniforms.uBounceVariation={value:1},A.uniforms.uBounceColor={value:new g.Es(1,.92,.8)},A.uniforms.shininess={value:30},A.uniforms.reflectiveness={value:0},A.uniforms.specular={value:new g.Es(.02,.02,.02)},A.uniforms.bumpMapBase={value:AW},A.uniforms.bumpScaleBase={value:.0416};let a=e.map??i?.[t]??null;return A.uniforms.uPageDiffuseMap={value:a??AJ},A.needsUpdate=!0,A});e.material=t?o:o[0]}for(let{mesh:e,slotIndex:t,origMap:a}of(t1.current=A,t5.current=[],i)){e.castShadow=!0,e.receiveShadow=!0;let A=AV.clone();A.uniforms.uIsPageStack={value:1},A.uniforms.uPageDarken={value:0},A.uniforms.uShadowGrain={value:.15},A.uniforms.uBounceScale={value:.5},A.uniforms.uBounceVariation={value:1},A.uniforms.uBounceColor={value:new g.Es(1,.92,.8)},A.uniforms.shininess={value:30},A.uniforms.reflectiveness={value:0},A.uniforms.specular={value:new g.Es(.02,.02,.02)},A.uniforms.uPageDiffuseMap={value:a?function(e){if("u"<typeof document)return e;if(!ed){let e=new g.H5().load("/assets/three/book/shared/blank.png");e.flipY=!1,e.colorSpace=g.nj,e.wrapS=g.FP,e.wrapT=g.FP,e.minFilter=g.Q4,e.magFilter=g.VV,e.anisotropy=8,ed=e}return ed}(a):AJ},A.needsUpdate=!0;let i=Array.isArray(e.material)?e.material:[e.material];i[t]=A,e.material=1===i.length?i[0]:i}t8.current=[],An.current,An.current=null,Ag.current=null,Ac.current=null,Af.current=null,AI.current=-1;let o=ef(tK,eA.toLowerCase());if(o){if(An.current=o,o.visible=!1,Al.current.copy(G(o)),As.current.copy(G(o)),Ag.current=null,o.isMesh)Ag.current=o;else{let e=function(e){let t=[...e.children];for(let e=0;e<t.length;e+=1){let A=t[e];if(A.isMesh)return A;for(let e=0;e<A.children.length;e+=1)t.push(A.children[e])}return null}(o);e&&(Ag.current=e)}let e=`${tK.uuid}:${o.uuid}`;if(Ac.current!==e){Ac.current=e;let t=H(o),A=Au.current;A.x=t.x,A.y=t.y,A.z=t.z,A.order=t.order}}Ak.current=[],o&&o.traverse(e=>{if(!tV.has(e)||!e.isMesh)return;let t=eu(e);t>=0&&(ec(e.geometry),Ak.current.push({mesh:e,curveIndex:t}))});let r=tK.getObjectByName("book")??null;AE.current=r,r&&AQ.current.copy(G(r)),Ax.current=null,ty(null),AR.current=null,Ap.current=null,AB.current=-1,AF.current=[];let n=ef(tK,ea.toLowerCase());if(n){Ax.current=n,ty(n),n.visible=!0,n.traverse(e=>{!tV.has(e)||e.isMesh&&(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>{e&&(e.colorWrite=!1,e.depthWrite=!1,e.needsUpdate=!0)})}),AM.current.copy(H(n)),AD.current.copy(G(n)),n.userData.pressLookInsideHostRestQuat||(n.userData.pressLookInsideHostRestQuat=G(n).clone()),n.userData.pressEdgeArtMap=AV.uniforms.diffuseMapCustom,n.userData.pressTintedLeaves=I;let e=`${tK.uuid}:${n.uuid}`;if(AR.current!==e){AR.current=e;let t=H(n),A=Ab.current;A.x=t.x,A.y=t.y,A.z=t.z,A.order=t.order}n.traverse(e=>{if(!tV.has(e)||!e.isMesh)return;let t=eu(e);t>=0&&(ec(e.geometry),AF.current.push({mesh:e,curveIndex:t}))})}for(let e of(t0.current=t,t))for(let t of Array.isArray(e.material)?e.material:[e.material]){if(t.uniforms?.uHologramIntensity)continue;let e=t;e.userData.hologramUniforms={uHologramIntensity:{value:0},uHologramTime:{value:0},uHologramMouse:{value:new g.wq(0,0)},uHologramScanlineFreq:{value:817},uHologramScanlineSpeed:{value:10},uHologramScanlineStrength:{value:.055},uHologramChromaticStrength:{value:.0147},uHologramLightBoost:{value:0},uHologramWaveAmpMul:{value:1},uHologramChromaticTimeMul:{value:0},uHologramTint:{value:new g.cE(.004,.015,.087)}},e.onBeforeCompile=t=>{let A=e.userData.hologramUniforms;Object.assign(t.uniforms,A),t.fragmentShader="uniform float uHologramIntensity;\nuniform float uHologramTime;\nuniform vec2 uHologramMouse;\nuniform float uHologramScanlineFreq;\nuniform float uHologramScanlineSpeed;\nuniform float uHologramScanlineStrength;\nuniform float uHologramChromaticStrength;\nuniform float uHologramLightBoost;\nuniform float uHologramWaveAmpMul;\nuniform float uHologramChromaticTimeMul;\nuniform vec3 uHologramTint;\n"+t.fragmentShader,t.fragmentShader=t.fragmentShader.replace("#include <dithering_fragment>",`#include <dithering_fragment>
            float hI = uHologramIntensity;
            if (hI > 0.001) {
              vec2 hUv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
              float wavePhase = hUv.y * uHologramScanlineFreq * 0.5 + uHologramTime * uHologramScanlineSpeed;
              float waveShift = sin(wavePhase) * 0.003 * hI * uHologramWaveAmpMul;
              gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * (1.0 + waveShift * 10.0), hI);
              float scanline = sin(hUv.y * uHologramScanlineFreq + uHologramTime * uHologramScanlineSpeed) * uHologramScanlineStrength * hI;
              gl_FragColor.rgb += scanline;
              float chromTime = sin(uHologramTime * 1.3 + 2.1) * 0.6 + sin(uHologramTime * 2.7) * 0.4;
              vec2 abDir = (uHologramMouse + vec2(chromTime * 0.3, chromTime * 0.2) * uHologramChromaticTimeMul) * uHologramChromaticStrength * hI;
              gl_FragColor.r += abDir.x * hI * 2.0;
              gl_FragColor.b -= abDir.x * hI * 2.0;
              vec2 grainCoord = floor(gl_FragCoord.xy / 4.0);
              float grainSeed = fract(sin(dot(grainCoord, vec2(12.9898, 78.233)) + floor(uHologramTime * 12.0)) * 43758.5453);
              gl_FragColor.rgb += (grainSeed - 0.5) * 0.08 * hI;
              gl_FragColor.rgb *= 1.0 + uHologramLightBoost;
              gl_FragColor.rgb += uHologramTint * hI;
            }
            `)},e.needsUpdate=!0}e.id,tV.forEach(e=>{e.isMesh&&(e.castShadow=!0,e.receiveShadow=!0)})},[tK,tV,AV,e.id,I]),(0,A.useEffect)(()=>{tK&&tK.traverse(e=>{if(e.isMesh)for(let t of Array.isArray(e.material)?e.material:[e.material])t&&(t.wireframe=eC)})},[tK,eC,AV]),(0,A.useEffect)(()=>{if(tf&&td)return td(Ax.current??null),()=>{td(null)}},[tK,tf,td]),(0,i.f)(t=>{if(!tW)return;let A=e.material.thickness/3.374,a=t0.current;for(let e=0;e<a.length;e+=1){let t=a[e],i=t.userData,o=i.bookPagesBaseScaleX??1;t.scale.x=o*A;let r=i.bookInteriorStackBindPosition;r&&t.position.set(r.x*A,r.y,r.z)}let i=AE.current;if(i){let e=eZ?.current??0,t=e$?.current??0;if(i.quaternion.copy(AQ.current),Math.abs(e)>1e-6||Math.abs(t)>1e-6){let A=i.parent;A?A.getWorldQuaternion(AS.current).invert():AS.current.identity(),Math.abs(e)>1e-6&&(Aw.current.set(0,1,0).applyQuaternion(AS.current).normalize(),Ay.current.setFromAxisAngle(Aw.current,e),i.quaternion.premultiply(Ay.current)),Math.abs(t)>1e-6&&(Aw.current.set(1,0,0).applyQuaternion(AS.current).normalize(),Ay.current.setFromAxisAngle(Aw.current,t),i.quaternion.premultiply(Ay.current))}}let o=tj.get(V),r=t4.current,n=tj.get(K),l=tZ.current.get(K)??null,s=t.clock.elapsedTime,g=eW?.current??eJ;e6&&(g=(.5*Math.sin(s*e7)+.5)*e9);let u=Math.abs(eV?.current??0);!e6&&.002>Math.abs(g)&&(g=0),u<.002&&(u=0);let c=Math.min(1,Math.max(0,Math.abs(g)/Math.max(W,1e-8))),f=tf?.current,d=0;void 0!==f&&(d=Math.min(1,Math.max(0,f)))>1e-6&&(c=Math.max(c,d)),y.coverFlapOpenLiveRef.current=c,tE.current=c;{let t=e.material.thickness/3.374,A=Math.max(Math.min(1,u/Math.max(W,1e-8)),d),a=(e,t,A)=>{let a=Math.min(1,Math.max(0,(A-e)/(t-e)));return a*a*(3-2*a)},i=y.lookInsideSideDroopLiveRef.current,o=(e,t)=>1-(y.coverOpenHingeInsetLiveRef.current??.2)*a(.5,1,e)*d*a(.65,.85,t),r=tj.get(K),n=r?.userData?.coverBoneBindX;r&&void 0!==n&&(r.position.x=n*t*o(c,i.left));let l=tj.get(V),s=l?.userData?.coverBoneBindX;l&&void 0!==s&&(l.position.x=s*t*o(A,i.right))}let h=Av.current;for(let e=0;e<h.length;e+=1){let t=h[e],A=-.0667*t.widthX*c;t.mesh.position.set(t.bind.x,t.bind.y,t.bind.z+A)}tv.current=Math.min(1,Math.max(0,u/Math.max(W,1e-8)));let I=d*d*(3-2*d),p=y.pageStackSpringTuneRef.current.maxRotMul??1,C=y.pageStackSpringTuneRef.current.maxRotMulClosed??p,m=C+(p-C)*I;{let e=tm.current;e&&(e.scale.x=.85)}let B=d<=.02,E=t0.current;for(let e=0;e<E.length;e+=1)E[e].castShadow!==B&&(E[e].castShadow=B);let v=y.pageStackSpringTuneRef.current.curveMul,Q=y.pageStackSpringTuneRef.current.curlCap??.7,w=y.pageStackSpringTuneRef.current.curlSatMul??1,M=y.LOOK_INSIDE_FRONT_COVER_OPEN_RAD*eP*.95*w,G=d>1e-6?1.3:1,H=Math.min(1,Math.abs((Af.current??0)-Au.current.y)/Math.max(M,1e-8)*G);H*=Q*v;let J=Math.min(1,Math.abs((Ap.current??0)-Ab.current.y)/Math.max(M,1e-8)*G);J*=Q*v;let $=!0===tI||tp?.current===!0||void 0!==f&&Math.min(1,Math.max(0,f))>1e-6||u>1e-8,ee=e6&&te,et=!ee&&void 0!==e1&&e1[0]*e1[0]+e1[1]*e1[1]+e1[2]*e1[2]>1e-10,eA=e0,ea=e4;if(ee){let e=Math.floor(t.clock.elapsedTime/tt)%eT.length,A=eT[e];eA=A.axis,ea=A.premultiply,e!==tB.current&&(tB.current=e,tL({label:A.label,sub:A.sub}))}et?Ai.current.set(e1[0],e1[1],e1[2]).normalize():Ai.current.copy(e_[eA]);let eo=g+(eK?.current??0),er=0;if(n&&l){eH(n,l,-eo,Ai.current,ea,Ar.current);let e=-eo;for(let t=1;t<z.length;t+=1){let A=z[t],a=tj.get(A),i=tZ.current.get(A);if(!a||!i)break;let o=e*.8**t;Ai.current.copy(e_.z),eH(a,i,o,Ai.current,ea,Ar.current)}er=e*eP}else for(let e=1;e<z.length;e+=1){let t=z[e],A=tj.get(t),a=tZ.current.get(t);A&&a&&A.quaternion.copy(a)}let el=tj.get(Z),es=t$.current;el&&es&&(Ai.current.copy(e_.x),eH(el,es,-er,Ai.current,ea,Ar.current));let eg=eA,eu=void 0!==e3&&e3[0]*e3[0]+e3[1]*e3[1]+e3[2]*e3[2]>1e-10||void 0!==e2;if(o){let e,t,A,a=Ao.current;void 0!==e3&&e3[0]*e3[0]+e3[1]*e3[1]+e3[2]*e3[2]>1e-10?a.set(e3[0],e3[1],e3[2]).normalize():void 0!==e2?a.copy(e_[e2]):et&&e1?a.set(e1[0],e1[1],e1[2]).normalize():a.copy(e_[eA]),e=Math.abs(a.x),t=Math.abs(a.y),A=Math.abs(a.z),eg=e>=t&&e>=A?"x":t>=e&&t>=A?"y":"z"}let ec=0;if(o&&r)if(u>1e-8){let e=Ao.current,t=e5??ea,A=-(eX?-u:u)*e8;ec=A,eH(o,r,A,e,t,Ar.current);for(let e=1;e<j.length;e+=1){let a=j[e],i=tj.get(a),o=AA.current.get(a);if(!i||!o)break;let r=A*.8**e;Ai.current.copy(eu?e_[eg]:e_.z),eH(i,o,r,Ai.current,t,Ar.current)}}else{o.quaternion.copy(r);for(let e=1;e<j.length;e+=1){let t=j[e],A=tj.get(t),a=AA.current.get(t);A&&a&&A.quaternion.copy(a)}}{let e=tj.get(X),t=t6.current;if(e&&t){let A=ez?.current??0;.002>Math.abs(A)&&(A=0),0===A?e.quaternion.copy(t):(t9.current.copy(e_[ej??eA]),eH(e,t,A,t9.current,ea,Ar.current))}}let ef=0;if(o&&r&&Aa.current.size>0){let e=eu?eg:"z";ef=q(j,tj,Aa.current,eg,N,e)}n&&l&&At.current.size>0&&q(z,tj,At.current,eA,N);let ed=!ti,eh=!to;{let e=y.pageStackShaderTuningLiveRef.current.pageDarken,t=y.lookInsidePhysicsShaderTuningLiveRef.current,A=y.physicsPageBounceLiveRef.current;for(let a of t1.current)for(let i of Array.isArray(a.material)?a.material:[a.material]){let a=i.uniforms;a?.uPageDarken&&(a.uPageDarken.value=e,a.bumpScaleBase&&(a.bumpScaleBase.value=t.bumpScale),a.uShadowGrain&&(a.uShadowGrain.value=t.shadowGrain),a.uBounceScale&&(a.uBounceScale.value=A.scale),a.uBounceIntensity&&(a.uBounceIntensity.value=A.intensity),a.uBounceVariation&&(a.uBounceVariation.value=A.variation),a.uBounceColor&&a.uBounceColor.value.setRGB(A.colorR,A.colorG,A.colorB))}}if(ti&&n&&l){let e=An.current;e&&(b.copy(n.quaternion).multiply(R.copy(l).invert()),e.quaternion.copy(Al.current).premultiply(b))}{let e=An.current;e&&!ed&&Y(e)}let eI=1/60;if(ed){let e=An.current;if(e){let t=Au.current,A=t.y;if(n&&l&&At.current.size>0){y.COVER_FLAP_OPEN_MAX_RAD,z.length,eG(Math.abs(g));let e=.95*eP*g*1*m,a=y.pageStackSpringTuneRef.current,i=a.rotationFollow,o=.3*a.stiffness*eI;Math.abs(e)>1e-6?Ah.current=_(Ah.current,o,d):Ah.current=0;let r=i*(Ah.current*Ah.current),n=Math.abs(e)*Math.max(1,i),l=t.y+e*r,s=Af.current;if(r>=.999||null===s)A=null===s?l:O(s,l,P),Ad.current=0;else if(r<=.001)A=t.y,Ad.current=0;else{let e=a.stiffness*i*2,t=a.damping,o=l-s;Ad.current+=e*o*eI,Ad.current*=Math.exp(-t*eI),o*Ad.current<0&&(Ad.current=0),A=s+Ad.current*eI,0!==o&&(A-s)*o<0&&(A=s,Ad.current=0),o*(A-l)>0&&(A=l,Ad.current=0)}Math.abs(A-t.y)>n&&(A=t.y+Math.sign(A-t.y)*n,Ad.current=0),Af.current=A}else Af.current=null,Ad.current=0;e.rotation.set(t.x,A,t.z,t.order)}}let ep=Ak.current;if(ep.length>0&&n&&l)for(let e=0;e<ep.length;e+=1){let{mesh:t,curveIndex:A}=ep[e],a=t.morphTargetInfluences;a&&A<a.length&&(a[A]=Math.min(.9,H))}if(to&&o&&r){let e=Ax.current;e&&($?(F.copy(o.quaternion).multiply(k.copy(r).invert()),function(e,t){let A=Math.min(1,Math.max(-1,e.w)),a=2*Math.acos(A);if(a<1e-8)return t.identity();let i=Math.sqrt(Math.max(0,1-A*A));if(i<1e-8)return t.copy(e);let o=.28*a*.5,r=Math.sin(o),n=1/i;t.set(e.x*n*r,e.y*n*r,e.z*n*r,Math.cos(o)),t.normalize()}(F,L),e.quaternion.copy(AD.current).premultiply(L)):e.quaternion.copy(AD.current))}{let e=Ax.current;e&&!eh&&Y(e)}if(eh){let e=Ax.current;if(e){let t=Ab.current,A=t.y;if(o&&r&&Aa.current.size>0){eG(u);let e=y.pageStackSpringTuneRef.current,a=e.rotationFollow,i=.95*eP*ec*1*m,o=.3*e.stiffness*eI;Math.abs(i)>1e-6?Am.current=_(Am.current,o,d):Am.current=0;let r=a*(Am.current*Am.current),n=t.y+i*r,l=Ap.current;if(r>=.999||null===l)A=null===l?n:O(l,n,P),AC.current=0;else if(r<=.001)A=t.y,AC.current=0;else{let t=e.stiffness*a*2,i=e.damping,o=n-l;AC.current+=t*o*eI,AC.current*=Math.exp(-i*eI),o*AC.current<0&&(AC.current=0),A=l+AC.current*eI,0!==o&&(A-l)*o<0&&(A=l,AC.current=0),o*(A-n)>0&&(A=n,AC.current=0)}let s=Math.abs(i)*Math.max(r,1);s>0&&Math.abs(A-t.y)>s&&(A=t.y+Math.sign(A-t.y)*s,AC.current=0),Ap.current=A}else Ap.current=null,AC.current=0;e.rotation.set(t.x,A,t.z,t.order)}}if(ta){let e=ts?c*Q:J,t=$?e:0,A=AF.current;for(let e=0;e<A.length;e+=1){let{mesh:a,curveIndex:i}=A[e],o=a.morphTargetInfluences;o&&i<o.length&&(o[i]=Math.min(.9,t))}}if(tu){let e=!ti,t=e?An.current:Ag.current??An.current,A=0,a=0,i={x:0,y:0,z:0};if(t){A=180*t.rotation.y/Math.PI,U.setFromQuaternion(t.quaternion,t.rotation.order);let o=U.x,r=U.z;e?(a=A,i={x:180*o/Math.PI,y:A,z:180*r/Math.PI}):(a=180*U.y/Math.PI,i={x:180*o/Math.PI,y:180*U.y/Math.PI,z:180*r/Math.PI})}let r=!to,l=Ax.current,s=0,u=0;l&&(s=180*l.rotation.y/Math.PI,U.setFromQuaternion(l.quaternion,l.rotation.order),u=r?s:180*U.y/Math.PI);let c={x:0,y:0,z:0},f={x:0,y:0,z:0},d=0;n&&(U.setFromQuaternion(n.quaternion,n.rotation.order),c={x:180*U.x/Math.PI,y:180*U.y/Math.PI,z:180*U.z/Math.PI}),o&&(U.setFromQuaternion(o.quaternion,o.rotation.order),f={x:180*U.x/Math.PI,y:180*U.y/Math.PI,z:180*U.z/Math.PI},d=180*T(t7.current,U.z)/Math.PI),AU.current={pages1RotationYDeg:A,pages1EulerYDeg:a,pages1EulerDeg:i,pages1HudInteriorMesh:e&&null!=t&&t===An.current,pages1CoverChainRotationGain:1.4*ei,pages2RotationYDeg:s,pages2EulerYDeg:u,pages2HudInteriorMesh:r&&null!=l&&l===Ax.current,pages2CoverChainRotationGain:1.4*2.3*ei,frontCoverEulerZDeg:c.z,backCoverEulerZDeg:f.z,backCoverEulerZBindDeg:180*t7.current/Math.PI,backCoverEulerZDeltaDeg:d,frontEulerDeg:c,backEulerDeg:f,frontDeltaDeg:180*g/Math.PI,backSwingDeg:180*ec/Math.PI,backChainEulerSwingSumDeg:180*ef/Math.PI,axisKey:eA,premultiply:ea,invertBack:eX,drivePages2:ta,pages2TiltAxis:tl,pages2TiltFullRadDeg:180*(tn??en)/Math.PI,pages2TiltGain:tg,pageStackFanMode:"off",pageStackCoupleToCovers:tA}}let eC=S.V.current,em=x.V.current,eB=e=>{e.uHologramIntensity.value=S.e.intensity,e.uHologramTime.value=S.e.time,e.uHologramMouse.value.copy(S.e.mouse),e.uHologramScanlineFreq.value=eC.scanlineFrequency,e.uHologramScanlineSpeed.value=eC.scanlineSpeed,e.uHologramScanlineStrength.value=eC.scanlineStrength,e.uHologramChromaticStrength.value=eC.chromaticStrength,e.uHologramLightBoost.value=S.e.lightBoost,e.uHologramWaveAmpMul.value=S.e.waveAmpMul,e.uHologramChromaticTimeMul.value=S.e.chromaticTimeMul;let t=e.uHologramTint.value;if(t.x=eC.tintR,t.y=eC.tintG,t.z=eC.tintB,e.uRadioIntensity){e.uRadioIntensity.value=x.l.intensity,e.uRadioTime.value=x.l.time,e.uRadioRingFreq.value=em.ringFrequency,e.uRadioRingSpeed.value=em.ringSpeed,e.uRadioRingStrength.value=em.ringStrength,e.uRadioDisplaceAmp.value=em.displaceAmp,e.uRadioNormalAmp.value=em.normalAmp,e.uRadioNoiseAmp&&(e.uRadioNoiseAmp.value=em.noiseAmp),e.uRadioNoiseScale&&(e.uRadioNoiseScale.value=em.noiseScale),e.uRadioNoiseSpeed&&(e.uRadioNoiseSpeed.value=em.noiseSpeed),e.uRadioCenter.value.set(em.centerX,em.centerY);let t=e.uRadioTint.value;t.x=em.tintR,t.y=em.tintG,t.z=em.tintB}};for(let e of(eB(AV.uniforms),t5.current))for(let t of Array.isArray(e.mesh.material)?e.mesh.material:[e.mesh.material])t.uniforms?.uHologramIntensity&&eB(t.uniforms);for(let e of t1.current)for(let t of Array.isArray(e.material)?e.material:[e.material])t.uniforms?.uHologramIntensity&&eB(t.uniforms);for(let e of t0.current)for(let t of Array.isArray(e.material)?e.material:[e.material])if(t.uniforms?.uHologramIntensity)eB(t.uniforms);else if(t.userData?.hologramUniforms){let e=t.userData.hologramUniforms;e.uHologramIntensity.value=S.e.intensity,e.uHologramTime.value=S.e.time,e.uHologramMouse.value.copy(S.e.mouse),e.uHologramScanlineFreq.value=eC.scanlineFrequency,e.uHologramScanlineSpeed.value=eC.scanlineSpeed,e.uHologramScanlineStrength.value=eC.scanlineStrength,e.uHologramChromaticStrength.value=eC.chromaticStrength,e.uHologramLightBoost.value=S.e.lightBoost,e.uHologramWaveAmpMul.value=S.e.waveAmpMul,e.uHologramChromaticTimeMul.value=S.e.chromaticTimeMul,e.uHologramTint.value.set(eC.tintR,eC.tintG,eC.tintB)}{let t=D.f,A=AV.uniforms;t.activeBookIndex===ew?(A.uCoverWipe.value=t.wipe,A.uCoverWipeTime.value=t.time,AV.transparent=t.wipe>.001&&t.wipe<.999,A.uCoverWipeThickFrom.value=t.baseThickness||e.material.thickness,A.uCoverWipeThickTo.value=t.incomingThickness,t.baseDiffuse&&A.diffuseMapCustom.value!==t.baseDiffuse&&(A.diffuseMapCustom.value=t.baseDiffuse,A.bumpMapCustom.value=t.baseBump,A.foilMap.value=t.baseFoil,A.foilOpacity.value=t.baseFoilOpacity,A.foilSpecular.value=t.baseFoilSpecular,A.foilDetail.value=t.baseFoilDetail),t.incomingDiffuse&&(A.diffuseMapCustom2.value=t.incomingDiffuse),t.incomingBump&&(A.bumpMapCustom2.value=t.incomingBump),t.incomingFoil&&(A.foilMap2.value=t.incomingFoil),A.foilOpacity2.value=t.incomingFoilOpacity,A.foilSpecular2.value=t.incomingFoilSpecular,A.foilDetail2.value=t.incomingFoilDetail,A.bumpScaleBase2.value=t.incomingBumpScaleBase,A.bumpScaleCustom2.value=t.incomingBumpScaleCustom):(A.uCoverWipe.value=0,AV.transparent&&t.activeBookIndex<0&&(AV.transparent=!1))}});let A6=(0,A.useMemo)(()=>eY?new g.FS(0,0,0,"XYZ"):new g.FS(eE,ev,0,"XYZ"),[eY,eE,ev]);if(tW&&tK){let A=!!(tf&&td),a=(0,E.E)(s),i=eh?(0,E.D)(s,ee):void 0,o=i?.front,r=i?.back;return(0,t.jsxs)("group",{ref:tC,position:em,rotation:new g.FS(eB[0],eB[1],eB[2]),children:[(0,t.jsx)("group",{ref:tm,rotation:A6,scale:[.85,.85,.85],children:(0,t.jsx)("primitive",{object:tK})}),tQ&&er&&!(A&&th)?(0,t.jsx)(m.f,{host:tQ,leafCount:a,bookThicknessRatio:e.material.thickness/3.374,stackThicknessPct:eo,coverFlapOpenRef:tE,backCoverFlapOpenRef:tv,centerFrontUrl:o,centerBackUrl:r,wireframe:eC,pageColor:d,edgeArtMap:AV.uniforms.diffuseMapCustom,tintedLeaves:I}):null,e6&&te?(0,t.jsx)(n.f,{fullscreen:!0,prepend:!0,pointerEvents:"none",children:(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:"12vh",width:"100%",height:"100%",boxSizing:"border-box"},children:[(0,t.jsx)("div",{style:{fontSize:"clamp(64px, 20vw, 160px)",fontWeight:900,lineHeight:1,color:"#fff",textShadow:"0 0 24px #000, 0 4px 32px #000",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",animation:"bookBoneHudFlash 0.45s ease-in-out infinite alternate"},children:tk.label}),(0,t.jsx)("div",{style:{marginTop:12,fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.92)",textShadow:"0 1px 8px #000",fontFamily:"system-ui, sans-serif",letterSpacing:"0.02em"},children:tk.sub}),(0,t.jsx)("style",{children:`
                  @keyframes bookBoneHudFlash {
                    from { opacity: 0.25; filter: brightness(0.9); }
                    to { opacity: 1; filter: brightness(1.15); }
                  }
                `})]})}):null]})}return tz?(0,t.jsx)("group",{ref:tC,position:em,rotation:new g.FS(eB[0],eB[1],eB[2]),children:(0,t.jsx)("mesh",{geometry:tz,material:AV,rotation:A6,scale:[.85*(e.material.thickness/3.374),.85,.85]})}):null},"$",0,function(e){e!==eE&&Number.isFinite(e)&&(eE=e,eC.sort((e,t)=>Math.abs(e.index-eE)-Math.abs(t.index-eE)))}],41585);var eq=e.i(94086);let eY=new g.cE(0,eq.V,y.BOOK_STACK_SHADOW_CATCHER_PLANE_Z),eJ=new g.cE,eW=new g.cE,eK=.05*14;function eV(e,t,A){let a=Math.cos(A),i=Math.sin(A);return{x:e*a+t*i,z:-e*i+t*a}}let eX=[.824,.824,.816];function ez(e,t){return .6*Math.sin(.7*e+1.3*t)+.3*Math.sin(1.9*e+2.7*t)+.1*Math.sin(3.3*e+4.1*t)}function ej(e,t,A){let a=e>>16&255,i=e>>8&255,o=255&e;return Math.round(a+((t>>16&255)-a)*A)<<16|Math.round(i+((t>>8&255)-i)*A)<<8|Math.round(o+((255&t)-o)*A)}let eZ=new g.Es,e$={h:0,s:0,l:0};function e0(e,t,A){if(!e||!t)return e??t??y.HOME_STACK_LIGHTS_TUNING_DEFAULT;let a=(e,t)=>e+(t-e)*A;return{ambientColor:ej(e.ambientColor,t.ambientColor,A),ambientIntensity:a(e.ambientIntensity,t.ambientIntensity),keyColor:ej(e.keyColor,t.keyColor,A),keyIntensity:a(e.keyIntensity,t.keyIntensity),keyPositionX:a(e.keyPositionX,t.keyPositionX),keyPositionY:a(e.keyPositionY,t.keyPositionY),keyPositionZ:a(e.keyPositionZ,t.keyPositionZ),sunColor:ej(e.sunColor,t.sunColor,A),sunIntensity:a(e.sunIntensity,t.sunIntensity),sunPositionX:a(e.sunPositionX,t.sunPositionX),sunPositionY:a(e.sunPositionY,t.sunPositionY),sunPositionZ:a(e.sunPositionZ,t.sunPositionZ),spotColor:ej(e.spotColor,t.spotColor,A),spotIntensity:a(e.spotIntensity,t.spotIntensity),spotAngle:a(e.spotAngle,t.spotAngle),spotPositionX:a(e.spotPositionX,t.spotPositionX),spotPositionY:a(e.spotPositionY,t.spotPositionY),spotPositionZ:a(e.spotPositionZ,t.spotPositionZ),shadowFrustumHalf:a(e.shadowFrustumHalf,t.shadowFrustumHalf),shadowCameraNear:a(e.shadowCameraNear,t.shadowCameraNear),shadowCameraFar:a(e.shadowCameraFar,t.shadowCameraFar),shadowBias:a(e.shadowBias,t.shadowBias),shadowNormalBias:a(e.shadowNormalBias,t.shadowNormalBias),shadowRadius:a(e.shadowRadius,t.shadowRadius),shadowMapSize:A>=.5?t.shadowMapSize:e.shadowMapSize}}function e1(e,t){if(!e?.shadow||!t)return;let A=e.shadow;A.bias=t.shadowBias,A.normalBias=t.shadowNormalBias,A.radius=t.shadowRadius,(0,y.applyViewportShadowMapSize)(A,t.shadowMapSize);let a=A.camera,i=Math.max(1,t.shadowFrustumHalf);a.left=-i,a.right=i,a.top=i,a.bottom=-i,a.near=Math.max(.001,t.shadowCameraNear),a.far=Math.max(a.near+.01,t.shadowCameraFar),a.updateProjectionMatrix()}e.s(["f",0,({lookInsideOpenProgressRef:e,lookInsideCoverProgressRef:a,bookBackgroundColor:r,bookPaletteColors:n,zineOpen:l,pinned:s})=>{let u=(0,o.f)(e=>e.invalidate),c=(0,o.f)(e=>e.scene),f=(0,A.useRef)({x:0,y:0}),d=(0,A.useRef)(null),h=(0,A.useRef)(null),I=(0,A.useRef)(null),p=(0,A.useRef)(null),C=(0,A.useRef)(null),m=(0,A.useRef)({x:0,y:0,z:0}),B=(0,A.useRef)({x:0,y:0,z:0}),E=(0,A.useRef)(null),v=(0,A.useRef)(0),Q=(0,A.useRef)(void 0),w=(0,A.useRef)(null),S=(0,A.useRef)(null),x=(0,A.useRef)(0),D=(0,A.useRef)(null),M=(0,A.useRef)(null),b=(0,A.useRef)(null),R=(0,A.useRef)(null),F=(0,A.useRef)(null),k=(0,A.useRef)(null),L=(0,A.useRef)(0),U=(0,A.useRef)(0);return(0,A.useEffect)(()=>()=>{y.homeStackSunLightLiveRef.current=null,y.homeStackKeyLightLiveRef.current=null},[]),(0,A.useEffect)(()=>{let e=e=>{"touch"!==e.pointerType&&(f.current.x=e.clientX/Math.max(1,window.innerWidth)*2-1,f.current.y=-(e.clientY/Math.max(1,window.innerHeight)*2-1))};return window.addEventListener("pointermove",e),()=>window.removeEventListener("pointermove",e)},[]),(0,A.useLayoutEffect)(()=>{let e={...y.HOME_STACK_LIGHTS_TUNING_DEFAULT,...y.homeStackLightsTuningLiveRef.current};e1(h.current,e),I.current?.castShadow&&e1(I.current,e);let t=p.current,A=C.current;t&&A&&(c.add(A),t.target=A)},[c]),(0,A.useEffect)(()=>(0,y.subscribeHomeStackLightsTuningNotify)(()=>{u()}),[u]),(0,i.f)((t,A)=>{let i,o=s?1e6:Math.min(A,.064);s&&(f.current.x=s.pointerX,f.current.y=s.pointerY);let u={...y.HOME_STACK_LIGHTS_TUNING_DEFAULT,...y.homeStackLightsTuningLiveRef.current},c=e?.current??0,N=y.bookOpenTransitionLiveRef.current.active?y.bookOpenTransitionLiveRef.current.index:-1,P=(N>=0?n?.[N]:void 0)??r;if(P&&P!==Q.current){let e,t,A;Q.current=P,t=parseInt((e=P.replace("#","")).slice(0,2),16),A=parseInt(e.slice(2,4),16),b.current=Math.round(.25*t+157.5)<<16|Math.round(.25*A+157.5)<<8|Math.round(.25*parseInt(e.slice(4,6),16)+156);let a=parseInt(P.replace("#",""),16);D.current=a,eZ.setHex(a>>>0,g.nj),eZ.getHSL(e$,g.nj),eZ.setHSL(e$.h,.5*e$.s,e$.l,g.nj),w.current=eZ.getHex(g.nj),null==S.current&&(S.current=w.current),F.current=[(a>>16&255)/255*.25+.618,(a>>8&255)/255*.25+.618,(255&a)/255*.25+.612],null==R.current&&(R.current=b.current),null==M.current&&(M.current=D.current),null==k.current&&(k.current=[...F.current])}{let e=1-Math.exp(-3*o);null!=b.current&&null!=R.current&&(R.current=ej(R.current,b.current,e)),null!=D.current&&null!=M.current&&(M.current=ej(M.current,D.current,e));let t=F.current,A=k.current;t&&A&&(A[0]+=(t[0]-A[0])*e,A[1]+=(t[1]-A[1])*e,A[2]+=(t[2]-A[2])*e)}let _=+!!y.homeStackColorThemeActiveLiveRef.current;x.current+=(_-x.current)*(1-Math.exp(-3*o));{let e=.25*x.current;y.activeBookThemeColorLiveRef.current=null!=M.current?ej(0xf2ecdd,M.current,e):0xf2ecdd;let t=k.current;y.shadowCatcherGrainTintLiveRef.current=t?[eX[0]+(t[0]-eX[0])*e,eX[1]+(t[1]-eX[1])*e,eX[2]+(t[2]-eX[2])*e]:[...eX]}null!=w.current&&null!=S.current&&(S.current=ej(S.current,w.current,1-Math.exp(-3*o)));let T=+!!y.homeStackDarkThemeActiveLiveRef.current;L.current+=(T-L.current)*(1-Math.exp(-1*o)),.001>Math.abs(T-L.current)&&(L.current=T);let G=L.current,H=G>.001?e0(u,y.homeStackLightsDarkTuningLiveRef.current,G):u,O={...y.HOME_STACK_LIGHTS_LOOK_INSIDE_TUNING,...y.homeStackLightsLookInsideTuningLiveRef.current},q=G>.001?e0(O,y.homeStackLightsDarkLookInsideTuningLiveRef.current,G):O,Y=Math.min(1,Math.max(0,a?.current??0));l?v.current+=(1-v.current)*(1-Math.exp(-1.8*o)):Y>.001?v.current=Y:(v.current+=(0-v.current)*(1-Math.exp(-1.8*o)),v.current<.001&&(v.current=0)),v.current>.001?E.current=i=e0(H,q,v.current*v.current*(3-2*v.current)):(i=H,E.current=null),y.homeStackLookInsideActiveLiveRef.current=c>=1;let J=y.cloudsTuningLiveRef.current,W=(s?s.cloudsT:t.clock.elapsedTime)*J.speed,K=+!!J.enabled,V=1+K*ez(W,0)*J.intensityAmount,X=1+K*ez(W,3.7)*J.intensityAmount,z=K*ez(W,1.1)*J.positionAmount,j=K*ez(W,2.3)*J.positionAmount,Z=K*ez(W,5.2)*J.positionAmount,$=K*ez(W,6.4)*J.positionAmount,ee=d.current;if(ee){let e=null!=R.current?ej(i.ambientColor,R.current,.25*x.current):i.ambientColor;ee.color.setHex(e>>>0),ee.intensity=+i.ambientIntensity}let et=y.productionViewerActiveLiveRef.current?Math.max(0,Math.min(1,y.productionSectionEnterProgressLiveRef.current)):0;U.current+=(et-U.current)*(1-Math.exp(-3*o));let eA=14*U.current,ea=f.current.x*eA,ei=f.current.y*eA,eo=1-L.current,er=eo*eK,en=f.current.x*er,el=f.current.y*er,es=4*eo,eg=1+.1*eo,eu=h.current;if(y.homeStackKeyLightLiveRef.current=eu,eu){let e=S.current,t=null!=e?ej(i.keyColor,e,.2*x.current):i.keyColor;eu.color.setHex(t>>>0),eu.intensity=Math.max(0,i.keyIntensity*V*1*eg);let A=eV(i.keyPositionX+z,i.keyPositionZ,0);eu.position.set(A.x+ea+en,i.keyPositionY+j+ei+el,A.z+es),eu.position.toArray(y.homeStackLightPosesLiveRef.current.keyAim),eJ.copy(eu.position).normalize(),eW.copy(eY).addScaledVector(eJ,-eY.dot(eJ)),eu.position.add(eW),eu.target.position.copy(eW),eu.target.updateMatrixWorld()}e1(eu,i);let ec=I.current;if(y.homeStackSunLightLiveRef.current=ec,ec){ec.color.setHex(i.sunColor>>>0),ec.intensity=Math.max(0,i.sunIntensity*X*1*eg);let e=eV(i.sunPositionX+Z,i.sunPositionZ,0);ec.position.set(e.x+ea+en,i.sunPositionY+$+ei+el,e.z+es)}ec?.castShadow&&e1(ec,i);{let e=y.lightDebugLiveRef.current;e.enabled&&ee&&eu&&ec&&e.samples.length<y.POSE_DEBUG_MAX_SAMPLES&&e.samples.push({t:t.clock.elapsedTime,sunCol:ec.color.getHex(),keyCol:eu.color.getHex(),ambCol:ee.color.getHex(),sunInt:ec.intensity,keyInt:eu.intensity,ambInt:ee.intensity,sunPos:[ec.position.x,ec.position.y,ec.position.z],keyPos:[eu.position.x,eu.position.y,eu.position.z],lookInsideBlend:v.current,darkBlend:L.current,colorThemeBlend:x.current})}let ef=p.current,ed=C.current;if(ef&&ed){let e=.7*Math.PI,t=.6*Math.PI,A=y.homeStackIsMobileLiveRef.current,a=(A?0:f.current.x)*e,o=(A?0:f.current.y)*t,r=36*Math.sin(a),n=36*Math.sin(o),l=s?1:.06,g=i.spotPositionX+r,u=i.spotPositionY+n;m.current.x+=(g-m.current.x)*l,m.current.y+=(u-m.current.y)*l,m.current.z+=(10-m.current.z)*l,B.current.x+=(.3*r-B.current.x)*l,B.current.y+=(.3*n-B.current.y)*l;let c=y.mouseSpotShadowTuningLiveRef.current;ef.color.setHex(i.spotColor>>>0),ef.intensity=i.spotIntensity*(A?.9:1),ef.angle=+i.spotAngle,ef.penumbra=c.penumbra,ef.position.set(m.current.x,m.current.y,m.current.z),ed.position.set(B.current.x,B.current.y,-50),ed.updateMatrixWorld(),ef.castShadow=y.homeStackDarkThemeActiveLiveRef.current;let d=ef.shadow;d.bias=c.bias,d.normalBias=c.normalBias,d.radius=c.radius,(0,y.applyViewportShadowMapSize)(d,c.mapSize);let h=d.camera;h.near=Math.max(.5,c.cameraNear),h.far=Math.max(h.near+.01,c.cameraFar),h.updateProjectionMatrix();let I=y.homeStackLightPosesLiveRef.current;ef.position.toArray(I.spotPos),I.spotGoal[0]=g,I.spotGoal[1]=u,I.spotGoal[2]=10,ed.position.toArray(I.spotTarget),I.spotColor=ef.color.getHex(),I.spotIntensity=ef.intensity,I.spotAngle=ef.angle}if(ee&&eu&&ec){let e=y.homeStackLightPosesLiveRef.current;eu.position.toArray(e.keyPos),eu.target.position.toArray(e.keyTarget),e.keyColor=eu.color.getHex(),e.keyIntensity=eu.intensity,ec.position.toArray(e.sunPos),e.sunColor=ec.color.getHex(),e.sunIntensity=ec.intensity,e.ambientColor=ee.color.getHex(),e.ambientIntensity=ee.intensity,e.darkBlend=L.current,e.lookInsideBlend=v.current,e.valid=!0}}),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("ambientLight",{ref:d,color:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.ambientColor,intensity:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.ambientIntensity}),(0,t.jsx)("directionalLight",{ref:h,castShadow:!0,color:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.keyColor,intensity:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.keyIntensity,position:[y.HOME_STACK_LIGHTS_TUNING_DEFAULT.keyPositionX,y.HOME_STACK_LIGHTS_TUNING_DEFAULT.keyPositionY,y.HOME_STACK_LIGHTS_TUNING_DEFAULT.keyPositionZ]}),(0,t.jsx)("directionalLight",{ref:I,castShadow:!1,color:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.sunColor,intensity:y.HOME_STACK_LIGHTS_TUNING_DEFAULT.sunIntensity,position:[y.HOME_STACK_LIGHTS_TUNING_DEFAULT.sunPositionX,y.HOME_STACK_LIGHTS_TUNING_DEFAULT.sunPositionY,y.HOME_STACK_LIGHTS_TUNING_DEFAULT.sunPositionZ]}),(0,t.jsx)("spotLight",{ref:p,castShadow:!1,color:0xffffff,intensity:30,angle:.6,penumbra:y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.penumbra,decay:0,position:[0,4,-20],"shadow-mapSize":[y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.mapSize,y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.mapSize],"shadow-bias":y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.bias,"shadow-camera-near":y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.cameraNear,"shadow-camera-far":y.MOUSE_SPOT_SHADOW_TUNING_DEFAULT.cameraFar}),(0,t.jsx)("object3D",{ref:C})]})}],76246)},95516,70665,e=>{let t=`
#include <common>
#include <uv_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>

varying vec3 vViewPosition;

/** thickness / spineArtThickness (1 = the art was cut for this thickness): see the spine remap in main(). */
uniform float uSpineUvScale;

uniform float uCoverWipe;
uniform float uCoverWipeTime;
uniform float uCoverWipeThickFrom;
uniform float uCoverWipeThickTo;

uniform float uRadioIntensity;
uniform float uRadioTime;
uniform float uRadioRingFreq;
uniform float uRadioRingSpeed;
uniform float uRadioDisplaceAmp;
uniform vec2 uRadioCenter;
uniform float uRadioNoiseAmp;
uniform float uRadioNoiseScale;
uniform float uRadioNoiseSpeed;

float radioHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/** Smooth value noise (bilinear-interpolated hash) so glitch cells are localized, not per-vertex chaos. */
float radioValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = radioHash(i);
  float b = radioHash(i + vec2(1.0, 0.0));
  float c = radioHash(i + vec2(0.0, 1.0));
  float d = radioHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/** Randomized glitch: two noise cell fields flickering at different rates — irregular, beat-like. 0..1. */
float radioGlitch(vec2 uvIn) {
  float c1 = radioValueNoise(uvIn * uRadioNoiseScale);
  float c2 = radioValueNoise(uvIn * uRadioNoiseScale * 0.37 + 11.3);
  float f1 = sin(uRadioTime * uRadioNoiseSpeed + c1 * 6.2831853) * 0.5 + 0.5;
  float f2 = sin(uRadioTime * uRadioNoiseSpeed * 1.7 + c2 * 6.2831853) * 0.5 + 0.5;
  return pow(c1 * f1, 3.0) * 0.7 + pow(c2 * f2, 2.0) * 0.3;
}

/** Sharp per-cell spikes (extra vertex-only jut, driven by uRadioNoiseAmp). 0..1. */
float radioNoiseSpikes(vec2 uvIn) {
  float cell = radioValueNoise(uvIn * uRadioNoiseScale);
  float flick = sin(uRadioTime * uRadioNoiseSpeed + cell * 6.2831853) * 0.5 + 0.5;
  return pow(cell * flick, 3.0);
}

/** Radio ring field: evenly spaced concentric rings + randomized
 * glitch, faded from the tunable origin. Shared by vertex displacement + fragment normal ripple. */
float radioRingField(vec2 uvIn) {
  vec2 rUv = uvIn - uRadioCenter;
  float dist = length(rUv);
  float TAU = 6.2831853;
  // One carrier only — evenly spaced rings (detuned partials beat into uneven gaps).
  float rings = sin(dist * uRadioRingFreq - uRadioTime * uRadioRingSpeed * TAU) * 0.5 + 0.5;
  rings = pow(rings, 2.0);
  float edgeFade = 1.0 - smoothstep(0.0, 1.2, dist);
  return rings * edgeFade;
}

void main() {
  // Do not use three.js uv_vertex here — it expects MAP_UV / BUMPMAP_UV when USE_MAP / USE_BUMPMAP
  // are defined on the material; this shader only needs mesh uv -> book atlas vUv.
  vUv = vec2(uv.x, 1.0 - uv.y);
  // The atlas spine strip (x 875-1044 of 1920, always 169px) is cut for one thickness, and the geometry squeezes it to
  // the book's: a book drawn thinner than its art was cut for samples a narrower band of the strip about its centre,
  // so the spine type and mark keep the size they were cut at and only the margins are cropped (spineArtThickness).
  // The spine panel's faces lie wholly inside the strip and the boards' wholly outside, so the per-vertex remap is exact.
  {
    const float spineU0 = 875.0 / 1920.0;
    const float spineU1 = 1044.0 / 1920.0;
    float spineScale = uSpineUvScale > 0.0 ? uSpineUvScale : 1.0;
    if (vUv.x > spineU0 && vUv.x < spineU1) {
      float spineC = 0.5 * (spineU0 + spineU1);
      vUv.x = spineC + (vUv.x - spineC) * spineScale;
    }
  }

#ifdef USE_SKINNING
  // Bone-blended normals (object space); view-space + vNormal after position skinning so lighting
  // matches rotated rig geometry when bones animate the cover.
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
#endif

  #include <begin_vertex>

  #include <morphtarget_vertex>

  // Cover wipe: thickness transition at the wipe edge
  if (uCoverWipe > 0.001 && uCoverWipe < 0.999) {
    float wipeEdge = uCoverWipe;
    float thickMix = smoothstep(wipeEdge - 0.01, wipeEdge + 0.01, vUv.y);
    float thickDelta = mix(uCoverWipeThickFrom, uCoverWipeThickTo, thickMix) - uCoverWipeThickFrom;
    transformed.z += thickDelta * 0.08;
  }

  // Radio-wave music-visualizer displacement: push vertices out along the object normal by the ring
  // field. Applied pre-skinning so it rides along with any bone/morph transforms.
  if (uRadioIntensity > 0.001 && uRadioDisplaceAmp > 0.0) {
    float _rw = radioRingField(vUv);
    transformed += normalize(normal) * (_rw * uRadioIntensity * uRadioDisplaceAmp);
  }
#ifdef USE_SKINNING
  #include <skinning_vertex>

  #include <defaultnormal_vertex>
  #include <normal_vertex>
#else
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  vec3 transformedNormalNs = normalMatrix * objectNormal;
  vec3 transformedNormal = transformedNormalNs;
  vNormal = normalize( transformedNormalNs );
#endif

  #include <project_vertex>

  vViewPosition = -mvPosition.xyz;

  #include <worldpos_vertex>
  #include <shadowmap_vertex>
}
`;e.s(["C",0,t,"k",0,function(e){return e.replace("varying vec3 vViewPosition;",`varying vec3 vViewPosition;
uniform float uPageFanAngle;
uniform float uPageSpineX;
uniform float uPageForeX;
uniform float uPageHingeX;
uniform float uPageHingeZ;
uniform vec3 uPageFanAxis;
uniform vec3 uPageFanAxisWorld;
uniform mat4 uPageFanInverseModelMatrix;`).replace("  #include <morphtarget_vertex>",`  {
    float _denom = uPageForeX - uPageSpineX;
    float _t = abs(_denom) > 1e-6
      ? clamp((transformed.x - uPageSpineX) / _denom, 0.0, 1.0)
      : 1.0;
    float _ang = uPageFanAngle * _t;
    vec3 _kw = uPageFanAxisWorld;
    float _kwl = length(_kw);
    if (_kwl > 1e-6 && abs(_ang) > 1e-8) {
      _kw /= _kwl;
      vec4 _hingeL = vec4(uPageHingeX, transformed.y, uPageHingeZ, 1.0);
      vec4 _hingeW = modelMatrix * _hingeL;
      vec4 _posW = modelMatrix * vec4(transformed, 1.0);
      vec3 _v = _posW.xyz - _hingeW.xyz;
      float _co = cos(_ang);
      float _si = sin(_ang);
      vec3 _vr = _v * _co + cross(_kw, _v) * _si + _kw * dot(_kw, _v) * (1.0 - _co);
      vec3 _posWn = _hingeW.xyz + _vr;
      vec4 _local = uPageFanInverseModelMatrix * vec4(_posWn, 1.0);
      transformed.xyz = _local.xyz;
      // Rotate the normal by the same Rodrigues rotation so lighting follows the curl
      vec3 _nw = mat3(modelMatrix) * normal;
      vec3 _nwr = _nw * _co + cross(_kw, _nw) * _si + _kw * dot(_kw, _nw) * (1.0 - _co);
      normal = mat3(uPageFanInverseModelMatrix) * _nwr;
    }
  }
  #include <morphtarget_vertex>`)}],95516);let A=`
/*
 * BOOK COVER FRAGMENT SHADER
 *
 * This shader creates realistic book cover materials with multiple layers:
 * - Base diffuse textures (shared + custom)
 * - Bump mapping for surface detail
 * - Foil effects with animated reflections
 * - Gloss effects with procedural colors
 * - Glitter effects with tiled patterns
 * - Phong lighting with dynamic specularity
 */

// Enable Phong lighting model from Three.js
#define PHONG

// Inputs from vertex shader
varying vec2 vUv;        // UV coordinates for texture sampling
varying vec3 vNormal;     // Surface normal vector

// Basic material properties
uniform vec3 specular;     // Specular color (usually white)
uniform float shininess;   // How sharp specular highlights are
uniform float reflectiveness; // Base reflectivity of the material
uniform float uOpacity;    // Overall alpha (cart fly fade, etc.)
// Softens Blinn–Phong highlights (Book.tsx onBeforeCompile inlines ShaderChunk patch).
uniform float uBookBlinnSpecSpread;

// Diffuse texture system - two layers that can be blended
uniform sampler2D diffuseMapBase;   // Shared base texture (e.g., paper grain)
uniform sampler2D diffuseMapCustom; // Custom texture (e.g., book cover design)
uniform vec3 diffuseBaseColor;      // Fallback color when textures are black
uniform float uDiffuseReady;       // 0 = deferred placeholder (use diffuseBaseColor), 1 = real texture loaded

// Bump mapping system - creates surface detail without geometry
uniform sampler2D bumpMapBase;      // Base bump map (e.g., paper texture)
uniform sampler2D bumpMapCustom;    // Custom bump map (e.g., embossed text)
uniform float bumpScaleBase;        // Intensity of base bump mapping
uniform float bumpScaleCustom;      // Intensity of custom bump mapping

// Foil effect system - creates metallic, reflective areas
uniform sampler2D foilMap;         // Mask defining where foil appears
uniform float foilDetail;          // Controls foil animation speed/detail
uniform float foilOffset;          // Phase added to the swatch lookup: slides where the colour bands sit at rest
uniform float foilOpacity;         // Overall foil effect strength
uniform float foilEmissive;        // How much foil glows
uniform float foilSpecular;        // How reflective foil areas are
uniform float foilSilver;          // 0 = pure swatch colour, 1 = bare silver: pulls an iridescent foil toward polished metal
const vec2 foilUvSize = vec2(0.14, -0.19); // Size of foil texture tiles

// Gloss effect system - creates shiny, wet-looking areas
uniform sampler2D glossMap;        // Mask defining where gloss appears
uniform float glossOpacity;        // Overall gloss effect strength
uniform float glossSpecular;       // How reflective gloss areas are
uniform float glossEmissive;       // How much gloss glows

// Glitter effect system - creates sparkly, metallic particles
uniform sampler2D glitterMap;     // Glitter pattern texture
uniform float glitterOpacity;      // Overall glitter effect strength
uniform float glitterSpecular;     // How reflective glitter particles are
uniform float glitterEmissive;     // How much glitter glows

// Cover wipe: bottom-to-top texture reveal of an incoming book's cover
uniform float uCoverWipe;              // 0 = current only, 1 = fully incoming
uniform sampler2D diffuseMapCustom2;   // incoming book diffuse
uniform sampler2D bumpMapCustom2;      // incoming book bump
uniform sampler2D foilMap2;            // incoming book foil
uniform float foilOpacity2;
uniform float foilSpecular2;
uniform float foilDetail2;
uniform float bumpScaleBase2;
uniform float bumpScaleCustom2;

// Page stack isolation — only set on pages1/pages2 cloned materials
uniform float uIsPageStack;
uniform float uPageDarken;
uniform float uShadowGrain;
uniform float uBounceScale;
uniform float uBounceIntensity;
uniform float uBounceVariation;
uniform vec3 uBounceColor;
uniform sampler2D uPageDiffuseMap;

// Hologram effect — driven from HologramEffect shared state
uniform float uHologramIntensity;
uniform float uHologramTime;
uniform vec2 uHologramMouse;
uniform float uHologramScanlineFreq;
uniform float uHologramScanlineSpeed;
uniform float uHologramScanlineStrength;
uniform float uHologramChromaticStrength;
uniform float uHologramLightBoost;
uniform float uHologramWaveAmpMul;
uniform float uHologramChromaticTimeMul;
uniform vec3 uHologramTint;
uniform float uRadioIntensity;
uniform float uRadioTime;
uniform float uRadioRingFreq;
uniform float uRadioRingSpeed;
uniform float uRadioRingStrength;
uniform float uRadioNormalAmp;
uniform vec2 uRadioCenter;
uniform vec3 uRadioTint;
uniform float uRadioNoiseScale;
uniform float uRadioNoiseSpeed;

float radioHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float radioValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = radioHash(i);
  float b = radioHash(i + vec2(1.0, 0.0));
  float c = radioHash(i + vec2(0.0, 1.0));
  float d = radioHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/** Randomized glitch: two noise cell fields flickering at different rates — irregular, beat-like. */
float radioGlitch(vec2 uvIn) {
  float c1 = radioValueNoise(uvIn * uRadioNoiseScale);
  float c2 = radioValueNoise(uvIn * uRadioNoiseScale * 0.37 + 11.3);
  float f1 = sin(uRadioTime * uRadioNoiseSpeed + c1 * 6.2831853) * 0.5 + 0.5;
  float f2 = sin(uRadioTime * uRadioNoiseSpeed * 1.7 + c2 * 6.2831853) * 0.5 + 0.5;
  return pow(c1 * f1, 3.0) * 0.7 + pow(c2 * f2, 2.0) * 0.3;
}
/** Radio ring field: evenly spaced concentric rings + randomized
 * glitch, faded from the tunable origin. Must match the vertex shader so lighting tracks displacement. */
// Speech-like burst envelope (matches RadioWaveEffect): irregular phrase gating \xd7 syllable flutter.
float radioTalkEnv(float t) {
  float phrase = 0.55 * sin(t * 3.1) + 0.45 * sin(t * 1.7 + 1.4);
  float speaking = max(0.0, phrase);
  float syllable = 0.65 + 0.35 * sin(t * 9.0);
  return clamp(speaking * 1.8, 0.0, 1.0) * syllable;
}

float radioRingField(vec2 uvIn) {
  vec2 rUv = uvIn - uRadioCenter;
  float dist = length(rUv);
  float TAU = 6.2831853;
  // One carrier only — evenly spaced rings (detuned partials beat into uneven gaps).
  float rings = sin(dist * uRadioRingFreq - uRadioTime * uRadioRingSpeed * TAU) * 0.5 + 0.5;
  rings = pow(rings, 2.0);
  float edgeFade = 1.0 - smoothstep(0.0, 1.2, dist);
  // Uniform, continuous rings — same speed and amount everywhere (no speech/talk-envelope modulation).
  return rings * edgeFade;
}

// Include Three.js shader chunks for lighting and common functions
#include <common>                    // Common GLSL functions and constants
#include <packing>
#include <bsdfs>                     // Bidirectional Scattering Distribution Functions
#include <lights_pars_begin>         // Light parsing functions
#include <lights_phong_pars_fragment> // Phong lighting model functions
#include <shadowmap_pars_fragment>

/*
 * CLOTH — the bare bookcloth is lit as fabric, not as glossy plastic (Nick, 2026-10-18: "these covers feel like they are
 * made of plastic"). Stock Blinn-Phong put a broad highlight on everything and a glint on every weave crest. Over cloth
 * (gClothMask: 1 on bare cloth, 0 under foil/gloss/glitter, which keep their metal look):
 *  - Phong specular is scaled by clothGloss (matte cloth);
 *  - a Charlie sheen lobe (Estevez & Kulla 2017, Neubelt visibility) brightens toward grazing light and view — the soft
 *    fuzzy lift fibres give folds, board edges and the spine joint;
 *  - diffuse wraps a little (clothWrap) for fabric's soft light-to-shadow roll-off.
 * Defaults are per grain (components/Book/clothDefaults.ts); every value is tunable in the Shift+C "cloth" cluster.
 */
uniform float clothGloss;      // multiplier on Phong specular over cloth (1 = the old plastic look)
uniform float clothSheen;      // fibre sheen strength
uniform float clothSheenRough; // sheen lobe width (0.3 tight … 1 broad)
uniform float clothWrap;       // diffuse wrap over cloth (0 = Lambert)
uniform float clothWeave;      // how much the weave's gaps darken the cloth colour
uniform float clothFibre;      // directional fibre noise in the cloth colour
float gClothMask = 0.0;

/*
 * FOIL GLINT — with foilSilver > 0 the foil is shiny silver where it reflects little light and shows its swatch rainbow
 * where it catches a highlight, as holographic foil does. gFoilMask is the foil's coverage (0 when foilSilver is off);
 * gFoilGlint sums a broad Blinn lobe of every direct light (the key, the sun and the mouse spot), so the rainbow follows
 * the lights and the cursor as the book turns.
 */
const vec3 FOIL_SILVER = vec3( 0.86, 0.88, 0.92 );
float gFoilMask = 0.0;
float gFoilGlint = 0.0;
vec3 gFoilRainbow = vec3( 0.0 );
vec3 gFoilBase = vec3( 1.0 );

void RE_Direct_Cloth( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
  float rawNL = dot( geometryNormal, directLight.direction );
  float dotNL = saturate( rawNL );
  float w = clothWrap * gClothMask;
  vec3 diffuseIrradiance = saturate( ( rawNL + w ) / ( 1.0 + w ) ) * directLight.color;
  reflectedLight.directDiffuse += diffuseIrradiance * BRDF_Lambert( material.diffuseColor );

  vec3 irradiance = dotNL * directLight.color;
  float specScale = mix( 1.0, clothGloss, gClothMask );
  reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess / max( 1.0, 1.0 + uBookBlinnSpecSpread ) ) * material.specularStrength * specScale;

  if ( gFoilMask > 0.001 ) {
    float foilNoH = saturate( dot( geometryNormal, normalize( directLight.direction + geometryViewDir ) ) );
    gFoilGlint += pow( foilNoH, 8.0 ) * dotNL * dot( directLight.color, vec3( 0.2126, 0.7152, 0.0722 ) );
  }

  if ( gClothMask > 0.001 && clothSheen > 0.0 ) {
    vec3 H = normalize( directLight.direction + geometryViewDir );
    float NoH = saturate( dot( geometryNormal, H ) );
    float NoV = saturate( dot( geometryNormal, geometryViewDir ) );
    float r = max( clothSheenRough, 0.07 );
    float invR = 1.0 / r;
    float sin2h = max( 1.0 - NoH * NoH, 0.0078125 );
    float D = ( 2.0 + invR ) * pow( sin2h, invR * 0.5 ) / ( 2.0 * PI );
    float V = 1.0 / ( 4.0 * ( dotNL + NoV - dotNL * NoV ) + 0.05 );
    vec3 sheenColor = mix( material.diffuseColor, vec3( 1.0 ), 0.35 );
    reflectedLight.directSpecular += irradiance * sheenColor * D * V * clothSheen * gClothMask;
  }
}
#undef RE_Direct
#define RE_Direct RE_Direct_Cloth

/* Value noise for the fibre streaks. */
float clothHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float clothNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( clothHash( i ), clothHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( clothHash( i + vec2( 0.0, 1.0 ) ), clothHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}

//
// UTILITY FUNCTIONS
//

/*
 * Pseudo-random number generator
 * Creates deterministic "random" values from 2D coordinates
 * Used for procedural effects and noise generation
 */
float randy(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

/*
 * OVERLAY BLENDING MODE
 *
 * Overlay blending combines two values using Photoshop's overlay mode:
 * - If base < 0.5: Multiply blend (darkens)
 * - If base >= 0.5: Screen blend (lightens)
 *
 * This creates contrast enhancement - dark areas get darker,
 * light areas get lighter, mid-tones stay similar.
 */
float blendOverlay(float base, float blend) {
  return base < 0.5
    ? 2.0 * base * blend                    // Multiply: darkens
    : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend); // Screen: lightens
}

/*
 * Overlay blending with opacity control
 * Blends between overlay result and original base value
 */
float blendOverlay(float base, float blend, float opacity) {
  return blendOverlay(base, blend) * opacity + base * (1.0 - opacity);
}

/*
 * Vector version of overlay blending for RGBA colors
 * Applies overlay blending to each color channel separately
 */
vec4 blendOverlay(vec4 base, vec4 blend) {
  return vec4(
    blendOverlay(base.r, blend.r),
    blendOverlay(base.g, blend.g),
    blendOverlay(base.b, blend.b),
    (base.a + blend.a) / 2.0  // Average alpha channels
  );
}

/*
 * Vector overlay blending with opacity control
 * Allows fine-tuning of blend strength
 */
vec4 blendOverlay(vec4 base, vec4 blend, float opacity) {
  return vec4(
    blendOverlay(base.r, blend.r, opacity),
    blendOverlay(base.g, blend.g, opacity),
    blendOverlay(base.b, blend.b, opacity),
    (base.a + blend.a) / 2.0
  );
}

//
// BUMP MAPPING SYSTEM
//

/*
 * CALCULATE HEIGHT GRADIENTS FOR BUMP MAPPING
 *
 * This function calculates the gradient of the height field (bump map)
 * in screen space. It uses finite differences to compute how the
 * surface height changes in X and Y directions.
 *
 * The function combines multiple bump maps using overlay blending
 * and modulates their influence based on other effects (foil, gloss, glitter).
 */
vec2 dHdxy_fwd() {
  vec2 dSTdx = dFdx( vUv );
  vec2 dSTdy = dFdy( vUv );

  float inverseFoilCoverage = 1.0 - texture2D( foilMap, vUv ).r * foilOpacity;
  float inverseGlossCoverage = 1.0 - texture2D( glossMap, vUv ).r * (glossOpacity * 10.);
  float inverseGlitterCoverage = 1.0 - texture2D( glitterMap, vUv ).r * (glitterOpacity);

  float scaleMax = max(bumpScaleBase, bumpScaleCustom);
  float scaleBaseNorm = bumpScaleBase / scaleMax;
  float scaleCustomNorm = bumpScaleCustom / scaleMax;

  // Sample current book bump
  float bumpC  = texture2D( bumpMapCustom, vUv ).x;
  float bumpCx = texture2D( bumpMapCustom, vUv + dSTdx ).x;
  float bumpCy = texture2D( bumpMapCustom, vUv + dSTdy ).x;

  // Blend with incoming book bump when wipe is active
  if (uCoverWipe > 0.001) {
    float wm = smoothstep(uCoverWipe - 0.008, uCoverWipe + 0.008, vUv.y);
    float b2  = texture2D( bumpMapCustom2, vUv ).x;
    float b2x = texture2D( bumpMapCustom2, vUv + dSTdx ).x;
    float b2y = texture2D( bumpMapCustom2, vUv + dSTdy ).x;
    // wm=1 at top (current book), wm=0 at bottom (incoming)
    bumpC  = mix(b2,  bumpC,  wm);
    bumpCx = mix(b2x, bumpCx, wm);
    bumpCy = mix(b2y, bumpCy, wm);

    float scaleMax2 = max(bumpScaleBase2, bumpScaleCustom2);
    scaleMax = mix(scaleMax2, scaleMax, wm);
    scaleBaseNorm = mix(bumpScaleBase2 / max(scaleMax2, 0.001), scaleBaseNorm, wm);
    scaleCustomNorm = mix(bumpScaleCustom2 / max(scaleMax2, 0.001), scaleCustomNorm, wm);
  }

  float invMask = inverseFoilCoverage * inverseGlossCoverage * inverseGlitterCoverage;
  float Hll = scaleMax * blendOverlay(
    0.5 + (texture2D( bumpMapBase, vUv ).x - 0.5) * scaleBaseNorm * invMask,
    0.5 + (bumpC - 0.5) * scaleCustomNorm
  );
  float dBx = scaleMax * blendOverlay(
    0.5 + (texture2D( bumpMapBase, vUv + dSTdx ).x - 0.5) * scaleBaseNorm * invMask,
    0.5 + (bumpCx - 0.5) * scaleCustomNorm
  ) - Hll;
  float dBy = scaleMax * blendOverlay(
    0.5 + (texture2D( bumpMapBase, vUv + dSTdy ).x - 0.5) * scaleBaseNorm * invMask,
    0.5 + (bumpCy - 0.5) * scaleCustomNorm
  ) - Hll;

  return vec2( dBx, dBy );
}

vec2 dHdxy_buckramOnly() {
  // Match the look-inside turning pages (PhysicsPageFragmentShader): sample the shared paper bump on the
  // flipped UV cropped to the bottom 3/4 (pageUv * 0.75) so the grain scale / shading reads identically.
  vec2 bumpUv = vec2( vUv.x, 1.0 - vUv.y ) * 0.75;
  vec2 dSTdx = dFdx( bumpUv );
  vec2 dSTdy = dFdy( bumpUv );
  float Hll = bumpScaleBase * texture2D( bumpMapBase, bumpUv ).x;
  float dBx = bumpScaleBase * texture2D( bumpMapBase, bumpUv + dSTdx ).x - Hll;
  float dBy = bumpScaleBase * texture2D( bumpMapBase, bumpUv + dSTdy ).x - Hll;
  return vec2( dBx, dBy );
}

/*
 * PERTURB SURFACE NORMAL USING BUMP MAPPING
 *
 * This function modifies the surface normal based on bump map gradients.
 * It implements arbitrary surface perturbation, which works on any
 * surface orientation (not just flat surfaces).
 *
 * The algorithm:
 * 1. Calculate tangent vectors from surface position derivatives
 * 2. Create a coordinate system using the surface normal
 * 3. Apply bump gradients to perturb the normal
 * 4. Return the new, perturbed normal vector
 */
vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {

  // Workaround for Adreno 3XX GPU bug with dFdx/dFdy on vec3
  // See Three.js issue #9988 for details

  // Calculate tangent vectors from surface position derivatives
  // These represent how the surface changes in screen space
  vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
  vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
  vec3 vN = surf_norm;		// Original surface normal (normalized)

  // Create coordinate system vectors using cross products
  // R1 and R2 form a basis for the tangent space
  vec3 R1 = cross( vSigmaY, vN );  // Tangent vector 1
  vec3 R2 = cross( vN, vSigmaX );  // Tangent vector 2

  // Calculate determinant to check orientation
  // This ensures we maintain correct surface orientation
  float fDet = dot( vSigmaX, R1 ) * faceDirection;

  // Apply bump gradients to perturb the normal
  // dHdxy contains the height gradients from bump mapping
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );

  // Combine original normal with perturbation and normalize
  return normalize( abs( fDet ) * surf_norm - vGrad );
}

//
// MAIN FRAGMENT SHADER FUNCTION
//

void main() {

  // STEP 1: CALCULATE PERTURBED SURFACE NORMAL
  vec2 bumpGrad = uIsPageStack > 0.5 ? dHdxy_buckramOnly() : dHdxy_fwd();
  // Page stacks normalize the base normal first (matches the turning pages' perturbNormalBuckram).
  vec3 baseNormalForBump = uIsPageStack > 0.5 ? normalize( vNormal ) : vNormal;
  vec3 normal = perturbNormalArb( -vViewPosition, baseNormalForBump, bumpGrad, 1.0 );

  // Radio-wave surface ripple: tilt the normal by the ring field gradient so lighting reacts like the
  // surface is rippling outward from the center (music-visualizer feel).
  if (uRadioIntensity > 0.001 && uRadioNormalAmp > 0.0) {
    float eps = 0.004;
    float rC = radioRingField(vUv);
    float rX = radioRingField(vUv + vec2(eps, 0.0));
    float rY = radioRingField(vUv + vec2(0.0, eps));
    vec2 grad = vec2(rX - rC, rY - rC) / eps;
    normal = normalize(normal - vec3(grad, 0.0) * uRadioNormalAmp * uRadioIntensity);
  }

  // STEP 2: COMBINE DIFFUSE TEXTURES
  vec4 diffuseColor;
  if (uIsPageStack > 0.5) {
    vec2 pageUv = vec2(vUv.x, 1.0 - vUv.y);
    diffuseColor = texture2D( uPageDiffuseMap, pageUv );
  } else {
    if (uDiffuseReady < 0.5) {
      diffuseColor = vec4(diffuseBaseColor, 1.0);
    } else {
      // Blend base texture (paper grain) with custom texture (book cover design)
      diffuseColor = blendOverlay(
        texture2D( diffuseMapBase, vUv ),    // Shared base texture
        texture2D( diffuseMapCustom, vUv )   // Custom cover texture
      );

      // Fallback to base color if textures are completely black
      if (diffuseColor.rgb == vec3(0.0, 0.0, 0.0)) {
        diffuseColor = vec4(diffuseBaseColor, 1.0);
      }
    }
  }

  float foilCoverage = 0.0;
  vec4 foilColor = vec4(0.0);
  float glossCoverage = 0.0;
  vec4 glossColor = vec4(0.0);
  float glitterCoverage = 0.0;
  float specularStrength = reflectiveness;

  if (uIsPageStack < 0.5) {
    // STEP 3: APPLY FOIL EFFECT
    vec2 foilIndex = vec2(
      sin(-normal.y * foilDetail  +  vViewPosition.y * foilDetail / 10.0 + foilOffset),
      cos(-normal.x * foilDetail  +  vViewPosition.x * foilDetail / 10.0 + foilOffset)
    ) / 2.0;
    foilIndex = vec2(0.0, 1.0) + foilUvSize / 2.0 + foilIndex * foilUvSize;
    foilColor = texture2D( diffuseMapCustom, foilIndex );
    foilCoverage = texture2D( foilMap, vUv ).r;
    if (foilSilver > 0.0 && foilColor.rgb != vec3(0.0)) {
      // Lit as silver; the lighting pass measures how much light the foil throws back (gFoilGlint) and turns it back to
      // the swatch's rainbow where it catches a highlight — see "FOIL GLINT" after the lights.
      gFoilRainbow = foilColor.rgb;
      foilColor.rgb = mix(foilColor.rgb, FOIL_SILVER, foilSilver);
      gFoilBase = foilColor.rgb;
      gFoilMask = clamp(foilCoverage * foilOpacity, 0.0, 1.0);
    }
    diffuseColor = mix(diffuseColor, foilColor, foilCoverage * foilOpacity);
    if (foilColor.rgb == vec3(0.0, 0.0, 0.0)) {
      foilColor = vec4(diffuseBaseColor, 1.0);
      foilCoverage = foilColor.r;
    }

    // STEP 4: APPLY GLOSS EFFECT
    glossColor = vec4(
      0.5 * (0.5 + 0.5 * (sin(-normal.y * vViewPosition.y * 2. + normal.x * vViewPosition.x * 2.))),
      0.5 * (0.5 + 0.5 * (sin(normal.y * vViewPosition.x * 2.))),
      0.5 * (0.5 + 0.5 * (sin(normal.x * vViewPosition.x * 2.))), 1.);
    glossCoverage = texture2D( glossMap, vUv ).r;
    diffuseColor = mix(diffuseColor, glossColor, glossCoverage * glossOpacity);

    // STEP 5: APPLY GLITTER EFFECT
    glitterCoverage = texture2D( glitterMap, fract(vUv * 30.) ).r;
    vec4 glitterColor = texture2D( glitterMap, fract(vUv * 30.) );
    diffuseColor = mix(diffuseColor, glitterColor * 0.3, glitterCoverage * 0.3);

    specularStrength = reflectiveness + foilCoverage * foilSpecular + glossCoverage * glossSpecular + glitterCoverage * glitterSpecular * glitterOpacity;

    // COVER WIPE: incoming cover slides in from bottom, over top of current
    if (uCoverWipe > 0.001) {
      float wipeEdge = uCoverWipe;
      float wipeMask = smoothstep(wipeEdge - 0.008, wipeEdge + 0.008, vUv.y);

      // Incoming book diffuse (same overlay blend with shared base)
      vec4 diffuseColor2 = blendOverlay(
        texture2D(diffuseMapBase, vUv),
        texture2D(diffuseMapCustom2, vUv)
      );
      if (diffuseColor2.rgb == vec3(0.0)) diffuseColor2 = vec4(diffuseBaseColor, 1.0);

      // Incoming foil
      vec2 foilIndex2 = vec2(
        sin(-normal.y * foilDetail2 + vViewPosition.y * foilDetail2 / 10.0),
        cos(-normal.x * foilDetail2 + vViewPosition.x * foilDetail2 / 10.0)
      ) / 2.0;
      foilIndex2 = vec2(0.0, 1.0) + foilUvSize / 2.0 + foilIndex2 * foilUvSize;
      vec4 foilColor2 = texture2D(diffuseMapCustom2, foilIndex2);
      float foilCoverage2 = texture2D(foilMap2, vUv).r;
      diffuseColor2 = mix(diffuseColor2, foilColor2, foilCoverage2 * foilOpacity2);

      diffuseColor = mix(diffuseColor2, diffuseColor, wipeMask);
      foilCoverage = mix(foilCoverage2, foilCoverage, wipeMask);
      foilColor = mix(foilColor2, foilColor, wipeMask);
      gFoilMask *= wipeMask;
      specularStrength = mix(
        reflectiveness + foilCoverage2 * foilSpecular2,
        specularStrength,
        wipeMask
      );
    }
  }

  // CLOTH SURFACE — bare cloth only (foil, gloss and glitter keep their metal), covers only (not the page stacks).
  if ( uIsPageStack < 0.5 ) {
    gClothMask = clamp( 1.0 - foilCoverage * foilOpacity - glossCoverage * glossOpacity * 10.0 - glitterCoverage * glitterOpacity, 0.0, 1.0 );
    // Atlas texels per screen pixel: the weave and fibres fade out where they are too fine to resolve, so a small or
    // distant cover reads as smooth cloth instead of shimmering grain.
    float texelsPerPx = length( fwidth( vUv ) ) * 1920.0;
    float weaveVis = 1.0 - smoothstep( 1.0, 3.0, texelsPerPx );
    // Weave: the grain map's low points are the gaps between threads; darken them (occlusion, not glints).
    float grain = texture2D( bumpMapBase, vUv ).x;
    float gap = smoothstep( 0.0, 0.3, 0.52 - grain );
    float weave = 1.0 - clothWeave * gap * weaveVis;
    // Fibres: faint streaks along warp and weft.
    float fib = clothNoise( vUv * vec2( 1100.0, 55.0 ) ) + clothNoise( vUv * vec2( 55.0, 1100.0 ) ) - 1.0;
    float fibre = 1.0 + fib * clothFibre * weaveVis;
    diffuseColor.rgb *= mix( 1.0, weave * fibre, gClothMask );
  }

  // Initialize lighting accumulator
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );

  // Apply Three.js Phong lighting model
  #include <lights_phong_fragment>    // Calculate Phong lighting
  #include <lights_fragment_begin>    // Initialize light calculations
  #include <lights_fragment_maps>      // Apply texture maps to lighting
  #include <lights_fragment_end>      // Finalize light calculations

  // Combine all lighting contributions
  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse
                      + reflectedLight.directSpecular + reflectedLight.indirectSpecular;

  // FOIL GLINT: where the foil catches light, swap its silver albedo for the rainbow (highlight included, so the glint
  // itself is coloured); elsewhere it stays silver.
  if (gFoilMask > 0.001) {
    float glint = smoothstep(0.15, 1.5, gFoilGlint);
    outgoingLight *= mix(vec3(1.0), gFoilRainbow / max(gFoilBase, vec3(0.05)), glint * gFoilMask);
  }

  // STEP 7: APPLY EMISSIVE EFFECTS
  // Add glow from foil, gloss, and glitter effects
  // This creates the "self-illuminated" appearance of metallic materials
  outgoingLight = mix(outgoingLight, foilColor.rgb * glossColor.rgb, foilCoverage * foilEmissive * foilOpacity * glossCoverage * glossEmissive * glossOpacity * glitterCoverage * glitterEmissive * glitterOpacity);

  if (uIsPageStack > 0.5) {
    outgoingLight *= (1.0 - uPageDarken);
    // Bounce light blobs (match PhysicsPage turning pages)
    vec2 puv = vec2(vUv.x, 1.0 - vUv.y);
    float bScale = max(0.1, uBounceScale);
    float blob1 = 1.0 - clamp(length(puv - vec2(0.3, 0.7)) / bScale, 0.0, 1.0);
    float blob2 = 1.0 - clamp(length(puv - vec2(0.7, 0.3)) / (bScale * 0.9), 0.0, 1.0);
    float blob3 = 1.0 - clamp(length(puv - vec2(0.5, 0.5)) / (bScale * 1.1), 0.0, 1.0);
    float blob4 = 1.0 - clamp(length(puv - vec2(0.2, 0.4)) / (bScale * 0.8), 0.0, 1.0);
    blob1 *= blob1; blob2 *= blob2; blob3 *= blob3; blob4 *= blob4;
    vec3 bounceBase = uBounceColor;
    vec3 bounce = vec3(0.0);
    bounce += blob1 * bounceBase * vec3(1.0, 0.85, 0.7);
    bounce += blob2 * bounceBase * vec3(0.7, 0.85, 1.0);
    bounce += blob3 * bounceBase * vec3(0.9, 1.0, 0.8);
    bounce += blob4 * bounceBase * vec3(0.8, 0.7, 1.0);
    outgoingLight += bounce * uBounceIntensity * 0.06;
  }

  // Hologram: wave displacement + chromatic aberration + scanlines + grain
  if (uHologramIntensity > 0.001) {
    float hI = uHologramIntensity;
    // Horizontal pixel shift in striped waves synced with scanline scroll (amplitude modulated by noise)
    float wavePhase = vUv.y * uHologramScanlineFreq * 0.5 + uHologramTime * uHologramScanlineSpeed;
    float waveShift = sin(wavePhase) * 0.003 * hI * uHologramWaveAmpMul;
    // Second pass: 6x larger waves at a different frequency
    float wavePhase2 = vUv.y * uHologramScanlineFreq * 0.0833 + uHologramTime * uHologramScanlineSpeed * 0.37;
    float waveShift2 = sin(wavePhase2) * 0.006 * hI * uHologramWaveAmpMul;
    float combinedShift = waveShift + waveShift2;
    vec2 shiftedUv = vUv + vec2(combinedShift, 0.0);
    // Re-sample the diffuse with shifted UVs and blend into outgoing light
    vec3 shiftedColor = (uIsPageStack > 0.5)
      ? texture2D(uPageDiffuseMap, shiftedUv).rgb
      : texture2D(diffuseMapCustom, shiftedUv).rgb;
    outgoingLight = mix(outgoingLight, shiftedColor, 0.5 * hI);
    // Scanlines: fine + coarse (6x scale, different speed)
    float scanline = sin(vUv.y * uHologramScanlineFreq + uHologramTime * uHologramScanlineSpeed) * uHologramScanlineStrength * hI;
    float scanline2 = sin(vUv.y * uHologramScanlineFreq / 6.0 + uHologramTime * uHologramScanlineSpeed * 0.61) * uHologramScanlineStrength * 0.7 * hI;
    outgoingLight += scanline + scanline2;
    // Chromatic aberration: mouse + time-animated component in phase with waves
    float chromTime = sin(uHologramTime * 1.3 + 2.1) * 0.6 + sin(uHologramTime * 2.7) * 0.4;
    vec2 abDir = (uHologramMouse + vec2(chromTime * 0.3, chromTime * 0.2) * uHologramChromaticTimeMul) * uHologramChromaticStrength * hI;
    vec3 rSample = (uIsPageStack > 0.5)
      ? texture2D(uPageDiffuseMap, shiftedUv + abDir).rgb
      : texture2D(diffuseMapCustom, shiftedUv + abDir).rgb;
    vec3 bSample = (uIsPageStack > 0.5)
      ? texture2D(uPageDiffuseMap, shiftedUv - abDir).rgb
      : texture2D(diffuseMapCustom, shiftedUv - abDir).rgb;
    outgoingLight.r = mix(outgoingLight.r, rSample.r, 0.3 * hI);
    outgoingLight.b = mix(outgoingLight.b, bSample.b, 0.3 * hI);
    // Large-pixel animated grain
    vec2 grainCoord = floor(gl_FragCoord.xy / 4.0);
    float grainSeed = fract(sin(dot(grainCoord, vec2(12.9898, 78.233)) + floor(uHologramTime * 12.0)) * 43758.5453);
    outgoingLight += (grainSeed - 0.5) * 0.08 * hI;
    // Light intensity boost (+30% pulsing)
    outgoingLight *= 1.0 + uHologramLightBoost;
    // Tint
    outgoingLight += uHologramTint * hI;
  }

  // Radio waves: concentric rings emanating from uRadioCenter (audiobook hover). Uses the shared
  // radioRingField so the visible rings emanate from the SAME origin as the vertex displacement and
  // normal ripple (previously this used a separate hardcoded center, giving two misaligned signals).
  if (uRadioIntensity > 0.001) {
    float wave = radioRingField(vUv) * uRadioIntensity;
    outgoingLight += uRadioTint * wave * (uRadioRingStrength / 0.16);
    outgoingLight *= 1.0 + wave * 0.35;
  }

  // Film grain weighted toward shadows (page stack face)
  if (uIsPageStack > 0.5) {
    vec2 pgGrainCoord = gl_FragCoord.xy;
    float pgGrain = fract(sin(dot(pgGrainCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    float pgLum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    float pgShadowMask = 0.3 + 0.7 * (1.0 - smoothstep(0.3, 1.2, pgLum));
    outgoingLight += pgGrain * pgShadowMask * uShadowGrain;
  }

  // Transparent gap at the cover wipe edge — fragments near the boundary fade out
  float wipeAlpha = 1.0;
  if (uCoverWipe > 0.001 && uCoverWipe < 0.999 && uIsPageStack < 0.5) {
    float distToEdge = abs(vUv.y - uCoverWipe);
    float gapHalf = 0.04;
    wipeAlpha = smoothstep(0.0, gapHalf, distToEdge);
  }

  gl_FragColor = vec4( outgoingLight, uOpacity * wipeAlpha );
}`;e.s(["f",0,A],70665)},64284,99205,e=>{var t=e.i(91788),A=e.i(82936),a=e.i(92381),i=e.i(32369);let o={chromaticStrength:.0147,chromaticRadialFalloff:.96,scanlineFrequency:817,scanlineSpeed:10,scanlineStrength:.055,waveFrequency:38.2,waveAmplitude:.0127,waveSpeed:12,waveDirection:6.2832,tintR:.004,tintG:.015,tintB:.087,fadeInSpeed:6,fadeOutSpeed:6,mouseLerpSpeed:11.5},r={current:{...o}},n={intensity:0,time:0,mouse:new i.wq(0,0),lightBoost:0,waveAmpMul:1,chromaticTimeMul:0};e.s(["_",0,o,"U",0,({active:e})=>{let o=(0,t.useRef)(!1),l=(0,t.useRef)(null),s=(0,t.useRef)(new i.wq(0,0)),{size:g}=(0,a.f)();return t.default.useEffect(()=>(e?l.current=setTimeout(()=>{o.current=!0},50):(l.current&&(clearTimeout(l.current),l.current=null),o.current=!1),()=>{l.current&&clearTimeout(l.current)}),[e]),t.default.useEffect(()=>{let e=e=>{s.current.set(e.clientX/g.width*2-1,-(e.clientY/g.height*2-1))};return window.addEventListener("pointermove",e),()=>window.removeEventListener("pointermove",e)},[g]),(0,A.f)((e,t)=>{let A=r.current,a=+!!o.current,i=a>n.intensity?A.fadeInSpeed:A.fadeOutSpeed;n.intensity+=(a-n.intensity)*Math.min(1,t*i),n.time+=t,n.mouse.lerp(s.current,Math.min(1,t*A.mouseLerpSpeed));let l=n.time,g=n.intensity;n.lightBoost=.3*g*(.5*(.5*Math.sin(1.7*l)+.3*Math.sin(2.9*l)+.2*Math.sin(.7*l))+.5),n.waveAmpMul=.6+(.5*(.4*Math.sin(.8*l)+.35*Math.sin(1.3*l+2.1)+.25*Math.sin(2.7*l+.5))+.5)*.8,n.chromaticTimeMul=.5*Math.sin(1.3*l+2.1)+.5}),null},"e",0,n,"V",0,r],64284);let l={current:{ringFrequency:69.8,ringSpeed:1.53,ringStrength:.32,centerX:1,centerY:0,displaceAmp:.92,normalAmp:.09,noiseAmp:.28,noiseScale:84,noiseSpeed:6.5,tintR:.065,tintG:.064,tintB:.062,fadeInSpeed:20,fadeOutSpeed:10}},s={intensity:0,time:0};e.s(["U",0,({active:e})=>{let a=(0,t.useRef)(!1),i=(0,t.useRef)(null);return t.default.useEffect(()=>(e?i.current=setTimeout(()=>{a.current=!0},50):(i.current&&(clearTimeout(i.current),i.current=null),a.current=!1),()=>{i.current&&clearTimeout(i.current)}),[e]),(0,A.f)((e,t)=>{let A=l.current;s.time+=t;let i=+!!a.current,o=i>s.intensity?A.fadeInSpeed:A.fadeOutSpeed;s.intensity+=(i-s.intensity)*Math.min(1,t*o)}),null},"l",0,s,"V",0,l],99205)},11566,e=>{var t=e.i(91398),A=e.i(91788),a=e.i(82936),i=e.i(32369),o=e.i(19592),r=e.i(67291),n=e.i(64691),l=e.i(14013);let s=e=>e<0?0:e>1?1:e,g={u0:.368,u1:.9949,v0:.8035,v1:.8937},u={u0:.5759,u1:.9937,v0:.9941,v1:.904},c={u0:.1491,u1:.5669,v0:.9041,v1:.9942};function f(e,t,A){let{bottomLeaf:a,topLeaf:n,leafCount:l,bendScale:f,splitLeaf:d,thicknessPct:h=1,leftZShiftStacks:I=0,invertDroop:p=!1,negateBaseZ:C=!1,pageWidth:m=o.c,pageHeight:B=o.V,curlStiffness:E=0,curlFrontPower:v=r.k,curlEndReverse:Q=0,curlReversePower:y=3,curlSweepMax:w,thinCurlEase:S=0,thinHeadStart:x=0,thinTurnStart:D=0,thinTurnEnd:M=1,thinRampStart:b=.5,thinFrontRelax:R=0,morphFrames:F=0,minThicknessWorld:k=.11,heightSegments:L=1}=A,U={headStart:x,turnStart:D,turnEnd:M,rampStart:b},N=o.O*h,P=n>a,_=Math.max(1e-4,e*o.O),T=Math.max(1,Math.round(L)),G=new i.kG(m,B,_,48,T,2),H=G.attributes.position,O="right"===t?-m/2:m/2,q="right"===t?0:Math.PI,Y=-Math.cos(q),J=(0,r.l)(E,w),W=new Float32Array(H.count),K=new Float32Array(H.count);for(let e=0;e<H.count;e++)W[e]=H.getX(e),K[e]=H.getZ(e);let V=new Uint8Array(H.count),X=new Uint8Array(H.count),z=new Uint8Array(H.count);for(let e=0;e<H.count;e++){let t=(K[e]+_/2)/_;z[e]=Math.round(s((H.getY(e)+B/2)/B)*T),V[e]=Math.round(2*s(t)),X[e]=Math.round(48*s(Math.abs(W[e]-O)/m))}let j=!C,Z=j?n:a,$=((l-1)/2-Z)*N,ee=((l-1)/2-(j?a:n))*N-$,et=$+(0!==ee?Math.sign(ee):Z>=d?-1:1)*Math.max(Math.abs(ee),k),eA=j?$:et,ea=(j?et:$)-eA,ei=new Float64Array(3),eo=0,er=0,en=0/0,el=e=>{if(e===en)return;en=e;let t=((l-1)/2-e)*N,A=C?-t:t;for(let a=0;a<3;a++){let i=eA+ea*(1-a/2),o=C?-i:P?2*t-i+I*e*N:i;ei[a]=o-A}eo=-Math.sin(q)*A,er=Math.cos(q)*A};el(d);let es=Math.min(a,n),eg=Math.max(a,n);G.userData.leafAtF=e=>Math.min(eg,Math.max(es,(l-1)/2-(eA+ea*(1-s(e)))/N));let eu=Array.from({length:3},()=>new Float32Array(98)),ec=e=>{for(let t=0;t<3;t++)(0,r.t)(e,m,ei[t],eu[t],49);for(let e=0;e<H.count;e++){let t=eu[V[e]],A=X[e];H.setX(e,O+eo+t[2*A]),H.setZ(e,er+t[2*A+1])}H.needsUpdate=!0,G.computeVertexNormals()},ef=(e,t,A=d)=>{el(A);let a=s(e),i=s(a*s(t)),o=(0,r.M)(a,Math.max(1,v-S*i*(v-1)),R),n=(0,r.m)(a,b),l=Y*J*i;ec(e=>{let t=q+l*(0,r.u)(e,o,Q,y,n,U);return p?2*q-t:t})};G.userData.blockPoseCurve=(e,t)=>{el(t),ec(e)};let ed=T>1?Array.from({length:(T+1)*3},()=>new Float32Array(98)):null;G.userData.blockPoseTwist=(e,t)=>{if(el(t),!ed)return void ec(e(.5));for(let t=0;t<=T;t++){let A=e(t/T);for(let e=0;e<3;e++)(0,r.t)(A,m,ei[e],ed[3*t+e],49)}for(let e=0;e<H.count;e++){let t=ed[3*z[e]+V[e]],A=X[e];H.setX(e,O+eo+t[2*A]),H.setZ(e,er+t[2*A+1])}H.needsUpdate=!0,G.computeVertexNormals()};let eh=new Float32Array(3*H.count);for(let e=0;e<H.count;e++){let t=(Math.round(a+(K[e]+_/2)/_*(n-a))%2+2)%2==0?1:.86;eh[3*e]=.949*t,eh[3*e+1]=.925*t,eh[3*e+2]=.867*t}G.setAttribute("color",new i.f5(eh,3));let eI=+!!C,ep=Math.abs(ea),eC=new Float32Array(4*H.count);for(let e=0;e<H.count;e++){let t=H.getY(e)+B/2;eC[4*e]=Math.abs(s((K[e]+_/2)/_)-eI)*ep,eC[4*e+1]=Math.abs(W[e]-O),eC[4*e+2]=t,eC[4*e+3]=B-t}let em=G.index;if(em){for(let e of G.groups)if(2===e.materialIndex||3===e.materialIndex)for(let t=e.start;t<e.start+e.count;t++){let e=em.getX(t);eC[4*e+2]=B,eC[4*e+3]=B}}G.setAttribute("edgeAo",new i.f5(eC,4));let eB=new Float32Array(4*H.count);if(em){let e=Math.max(1,l-1);for(let t=0;t<4;t++){let A=G.groups[t];if(A)for(let a=A.start;a<A.start+A.count;a++){let A=em.getX(a),i=s(Math.abs(W[A]-O)/m);if(t<2&&i<.5)continue;let o=G.userData.leafAtF((K[A]+_/2)/_),r=1-o/e,n=s(H.getY(A)/B+.5),l=t<2?g:2===t?u:c,f=t<2?n:i;eB[4*A]=l.u0+(l.u1-l.u0)*f,eB[4*A+1]=l.v0+(l.v1-l.v0)*r,eB[4*A+2]=1,eB[4*A+3]=o}}}return G.setAttribute("edgeArtUv",new i.f5(eB,4)),F>1?(G.userData.blockPose=(e,t,A)=>ef(e,t*Math.max(0,f),A),ef(0,0)):ef(f,1),G}e.s(["h",0,({leaves:e,side:r,bottomLeaf:g,topLeaf:u,leafCount:c,restProfile:d,restNodeCount:h,bendScale:I,splitLeaf:p,thicknessPct:C=1,leftZShiftStacks:m=0,invertDroop:B=!1,negateBaseZ:E=!1,pageWidth:v=o.c,pageHeight:Q=o.V,curlStiffness:y=0,curlFrontPower:w,curlEndReverse:S,curlReversePower:x,fanShearGain:D,fanPower:M,curlSweepMax:b,curlStretchGain:R,thinCurlEase:F,foreTaperDeg:k,thinHeadStart:L=0,thinTurnStart:U=0,thinTurnEnd:N=1,thinRampStart:P=.5,thinFrontRelax:_=0,poseRegistry:T,materialSide:G=i.de,topFaceImageUrl:H,faceDebug:O=!1,castShadow:q=!1,receiveShadow:Y=!0,wireframe:J=!1,pageColor:W,coverOpenRef:K,morphFrames:V=0,openAmountRef:X,dropBendRef:z,dropBendInvert:j=!1,splitLeafRef:Z,edgeArtMap:$,tintedLeaves:ee})=>{let et=(0,A.useMemo)(()=>f(Math.max(0,e),r,{bottomLeaf:g,topLeaf:u,leafCount:c,restProfile:d,restNodeCount:h,bendScale:I,splitLeaf:p,thicknessPct:C,leftZShiftStacks:m,invertDroop:B,negateBaseZ:E,pageWidth:v,pageHeight:Q,curlStiffness:y,curlFrontPower:w,curlEndReverse:S,curlReversePower:x,fanShearGain:D,fanPower:M,curlSweepMax:b,curlStretchGain:R,thinCurlEase:F,foreTaperDeg:k,thinHeadStart:L,thinTurnStart:U,thinTurnEnd:N,thinRampStart:P,thinFrontRelax:_,morphFrames:V}),[e,r,g,u,c,d,h,I,p,C,m,B,E,v,Q,y,w,S,x,D,M,b,R,F,k,L,U,N,P,_,V]),eA=(0,A.useRef)({drop:-1,open:-1,split:0/0}),ea=(0,A.useRef)(null),ei=()=>{let e=et.userData.blockPose;if(!e||!X||!z)return;let t=j?1-z.current:z.current,A=X.current,a=Z?Z.current:p,i=et!==ea.current,o=eA.current;(i||t!==o.drop||A!==o.open||a!==o.split)&&(o.drop=t,o.open=A,o.split=a,ea.current=et,e(t,A,a))},eo=(0,A.useRef)(ei);(0,A.useEffect)(()=>{eo.current=ei}),(0,A.useEffect)(()=>{if(!T)return;let e=()=>eo.current();return T.add(e),()=>{T.delete(e)}},[T]),(0,a.f)(()=>ei()),(0,A.useEffect)(()=>()=>et.dispose(),[et]);let{edgeX:er,edgeY:en,coverOcc:el}=(0,n.C)(c>0?e/c:1,E,W,!0,$,ee);(0,a.f)(()=>{let e=K?s(K.current/.12):0;el.value=1-e*e*(3-2*e)});let es=(0,n.J)(G,E?-1:1,H,W);(0,A.useEffect)(()=>{es.uniforms.uPageWidth.value=v},[es,v]);let eg=(0,n.n)(W),eu=(0,A.useMemo)(()=>new i.p$({color:0xff0000,side:i.Vs}),[]);(0,A.useEffect)(()=>()=>eu.dispose(),[eu]);let ec=O?eu:H?es:eg,ef=(0,A.useMemo)(()=>[er,er,en,en,E?eg:ec,E?ec:eg],[er,en,ec,eg,E]),ed=(0,A.useRef)(null),eh=(0,A.useId)();if((0,a.f)(()=>{if(l.m.enabled){if(!ed.current||e<=0)return void l.m.blocks.delete(eh);l.m.blocks.set(eh,{label:E?"left":"right",topLeaf:u,bottomLeaf:g,leaves:e,mesh:ed.current,geometry:et,topGroup:E?5:4})}}),(0,A.useEffect)(()=>()=>{l.m.blocks.delete(eh)},[eh]),(0,A.useEffect)(()=>{for(let e of ef)e.wireframe=J},[ef,J]),e<=0)return null;let eI="right"===r?v/2:-v/2;return(0,t.jsx)("mesh",{ref:ed,geometry:et,material:ef,position:[eI,0,0],castShadow:q,receiveShadow:Y,userData:{pencilSurface:!0,blockPickSide:E?"left":"right"}})},"M",0,f])},67291,e=>{let t=1.1*Math.PI;function A(e,a=t){return Math.min(a,6*e)}function a(e,t,A,i,o=0,r){let n=1-Math.pow(1-e,t)-A*Math.pow(e,i);return o<=0||!r?n:n+(r.headStart+(1-A-r.headStart)*l(r.turnStart,r.turnEnd,e)-n)*o}let i=new Float64Array(193),o=new Float64Array(193),r=new Float64Array(193);function n(e,t,A,a,n){let l=t/192,s=e(0),g=0,u=s;for(let t=1;t<=192;t+=1){let a=e(t/192),i=(a-u)/l;A*i>g&&(g=A*i),u=a}let c=g>.9?.9*A/g:A,f=0,d=0;i[0]=-Math.sin(s)*c,o[0]=Math.cos(s)*c,r[0]=0;for(let t=1;t<=192;t+=1){let A=e((t-.5)/192);f+=Math.cos(A)*l,d+=Math.sin(A)*l;let a=e(t/192);i[t]=f-Math.sin(a)*c,o[t]=d+Math.cos(a)*c,r[t]=t*l-c*(a-s)}let h=e(1),I=r[192],p=0;for(let e=0;e<n;e+=1){let A=e/(n-1)*t;if(A>=I){let t=A-I;a[2*e]=i[192]+Math.cos(h)*t,a[2*e+1]=o[192]+Math.sin(h)*t;continue}for(;p<191&&r[p+1]<A;)p+=1;let l=r[p+1]-r[p],s=l>1e-9?(A-r[p])/l:0;a[2*e]=i[p]+(i[p+1]-i[p])*s,a[2*e+1]=o[p]+(o[p+1]-o[p])*s}}function l(e,t,A){if(e===t)return A<e?0:1;let a=Math.min(1,Math.max(0,(A-e)/(t-e)));return a*a*(3-2*a)}function s(e,t){let i=t/Math.PI,o=i*Math.PI,r=e.stiffness,n=-Math.cos(o),s=A(r,e.curlSweepMax),g=Math.max(.2,e.curlFrontPower??2),u=Math.max(0,e.curlEndReverse??0),c=Math.max(.2,e.curlReversePower??3),f=e.liveTurn?e.liveTurnRoll??0:o,d=e.liveTurn?e.liveCurl??0:n,h=(e.liveTurn?e.liveFlop??0:0)*Math.max(0,(Math.sin(Math.PI*i)-.6)/.4),I=-Math.tanh(8*d),p=Math.min(.98,Math.max(0,e.liveTipFlopFromU??.5)),C=Math.max(.05,e.liveTipFlopFalloff??1),m=e.liveTurn?e.liveTipFlop??0:0,B=Math.min(1,Math.max(0,e.curlThin??0)),E=e.curlThinShape,v=e.liveTurn?e.liveLift??0:0,Q=Math.max(.01,e.liveLiftSpanU??.2);return e=>f+d*s*a(e,g,u,c,B,E)+I*h*(e*e)+m*Math.pow(l(p,1,e),C)+(0!==v?v*l(0,Q,e):0)}e.s(["k",0,2,"K",0,function(e){let{nodeCount:t,pageWidth:A}=e,a=A/(t-1),i=new Float32Array(2*t),o=new Float32Array(2*t),r=new Float32Array(2*t);for(let e=0;e<t;e++)i[2*e]=e*a,i[2*e+1]=0,r[2*e]=i[2*e],r[2*e+1]=0;return{positions:i,velocities:o,prevPositions:r,nodeCount:t,segmentLength:a,totalLength:A,initialized:!1}},"u",0,a,"l",0,A,"J",0,s,"t",0,n,"Q",0,function(e,t){let A=Math.cos(t),a=Math.sin(t);for(let t=0;t<e.nodeCount;t++){let i=t*e.segmentLength;e.positions[2*t]=A*i,e.positions[2*t+1]=a*i,e.prevPositions[2*t]=e.positions[2*t],e.prevPositions[2*t+1]=e.positions[2*t+1],e.velocities[2*t]=0,e.velocities[2*t+1]=0}e.initialized=!1},"j",0,l,"P",0,function(e,t,i,o,r,g){let{nodeCount:u,segmentLength:c}=e,{stiffness:f,gravity:d,bendFalloff:h,flatRest:I,curlTurn:p}=t,C=Math.PI/180*d,m=o/Math.PI,B=m*Math.PI;e.initialized=!0,e.positions[0]=0,e.positions[1]=0;let E=Array(u);if(p){let e=Math.max(.01,t.curlWidth??.25),i=Math.max(.05,t.curlFrontBias??1),o=t.curlOvershoot??.5,r=1-Math.min(1,Math.max(0,t.curlReadingFade??1))*Math.min(1,Math.max(0,t.readingProgress??0)),n=-e+(1+2*e)*Math.pow(m,i),s=A(f,t.curlSweepMax),g=Math.max(.2,t.curlFrontPower??2),c=Math.max(0,t.curlEndReverse??0),d=Math.max(.2,t.curlReversePower??3);for(let t=0;t<u;t++){let A=t/(u-1),i=a(A,g,c,d),f=-s*i,h=Math.PI+s*i,I=1-l(n-e,n+e,A),p=(A-n)/e,C=1>Math.abs(p)?.5*(1+Math.cos(Math.PI*p)):0;E[t]=(1-I)*f+I*h+r*o*C}}else{if(I)return void n(s(t,o),(u-1)*c,t.leafOffset??0,e.positions,u);let A=Math.PI/2+(m-.5)*C;E[0]=A;for(let e=1;e<u;e++){let t=Math.pow(e/(u-1),h),a=Math.min(1,(t<.5?2*t*t:1-2*(1-t)*(1-t))*f);E[e]=A+(B-A)*a}}for(let t=1;t<u;t++){let A=E[t];e.positions[2*t]=e.positions[(t-1)*2]+Math.cos(A)*c,e.positions[2*t+1]=e.positions[(t-1)*2+1]+Math.sin(A)*c}let v=t.nestOffset??0;if(0!==v)for(let t=1;t<u;t++){let A=.25+t/(u-1)*.75,a=E[t];e.positions[2*t]+=-Math.sin(a)*v*A,e.positions[2*t+1]+=Math.cos(a)*v*A}},"m",0,function(e,t=.5){return l(Math.min(.99,t),1,Math.min(1,Math.abs(e)))},"M",0,function(e,t,A){return Math.max(1,t*(1-Math.min(1,Math.max(0,A))*l(.5,.8,Math.min(1,Math.abs(e)))))}])},69444,48180,49322,28137,14013,47525,12312,e=>{let t=`
vec3 occlusionLightHue() {
	vec3 c = vec3( 0.0 );
	#if NUM_DIR_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		c += directionalLights[ i ].color;
	}
	#pragma unroll_loop_end
	#endif
	float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	return l > 1e-4 ? c / l : vec3( 1.0 );
}
`;e.s(["f",0,t],48180);var A=e.i(78424);let a=`
uniform float uPhysicsShadowPcfRadiusMul;
uniform float uPhysicsShadowPasses;
uniform vec3 uPhysicsShadowColorDark;
uniform vec3 uPhysicsShadowColorMid;
uniform vec3 uPhysicsShadowColorLight;

float physicsPageRand01( vec2 p ) {
	return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

// Map the shadow visibility (0 = full shadow … 1 = lit) through a 3-stop color gradient. Multiplies the directional
// light, so it both darkens (via the colors' luminance) and TINTS the shadow. Black/grey/white → plain grayscale.
// (The COLORED FILM GRAIN lives in the page fragment shaders' uShadowGrain block, not here.)
vec3 physicsPageShadowTint( float vis ) {
	float v = clamp( vis, 0.0, 1.0 );
	return ( v < 0.5 )
		? mix( uPhysicsShadowColorDark, uPhysicsShadowColorMid, v * 2.0 )
		: mix( uPhysicsShadowColorMid, uPhysicsShadowColorLight, ( v - 0.5 ) * 2.0 );
}

// Jittered shadow coord: a small FIXED penumbra dither (independent of the grain control) so passes>1 decorrelate
// and banding softens; the tap arg offsets each super-sample pass. litUnjit scales it off where fully lit.
vec4 physicsPageJitteredDirShadowCoordFromVec4( vec4 sc, float litUnjit, float tap ) {
	float jw = 0.35 * 0.00055 * clamp( 1.4 * ( 1.0 - litUnjit ), 0.0, 1.0 );
	vec2 seed = sc.xy + vec2( tap * 1.7, tap * 2.3 );
	vec2 j = ( vec2( physicsPageRand01( seed ), physicsPageRand01( seed + vec2( 3.13, 9.17 ) ) ) - 0.5 ) * jw;
	vec2 uvd = sc.xy + j * sc.w;
	return vec4( uvd.x, uvd.y, sc.z, sc.w );
}

// Average up to PHYSICS_PAGE_SHADOW_MAX_PASSES super-samples of the shadow map, each offset by a rotated poisson
// step (radius grows with the PCF blur) plus its own UV jitter. passes=1 → the original single tap.
#define PHYSICS_PAGE_SHADOW_MAX_PASSES 8
#if defined( SHADOWMAP_TYPE_PCF )
	#define PHYSICS_PAGE_SHADOW_SAMPLER sampler2DShadow
#else
	#define PHYSICS_PAGE_SHADOW_SAMPLER sampler2D
#endif
float physicsPageMultiTapShadow( PHYSICS_PAGE_SHADOW_SAMPLER smap, vec2 mapSize, float intensity, float bias, float radius, vec4 sc, float litUnjit ) {
	int passes = int( clamp( uPhysicsShadowPasses, 1.0, float( PHYSICS_PAGE_SHADOW_MAX_PASSES ) ) + 0.5 );
	float sum = 0.0;
	float wsum = 0.0;
	float spread = radius * 0.75;
	for ( int t = 0; t < PHYSICS_PAGE_SHADOW_MAX_PASSES; t ++ ) {
		if ( t >= passes ) break;
		float a = ( float( t ) + 0.5 ) * 2.3999632; // golden-angle spiral
		float rr = ( passes > 1 ) ? ( sqrt( ( float( t ) + 0.5 ) / float( passes ) ) * spread ) : 0.0;
		vec2 off = vec2( cos( a ), sin( a ) ) * rr;
		vec4 jc = physicsPageJitteredDirShadowCoordFromVec4( sc, litUnjit, float( t ) );
		jc.xy += off * jc.w * ( 1.0 / max( 1.0, mapSize.x ) );
		sum += getShadow( smap, mapSize, intensity, bias, radius, jc );
		wsum += 1.0;
	}
	return sum / max( 1.0, wsum );
}
#undef PHYSICS_PAGE_SHADOW_SAMPLER
`,i=/directLight\.color \*= \( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \], directionalLightShadow\.shadowMapSize, directionalLightShadow\.shadowIntensity, directionalLightShadow\.shadowBias, directionalLightShadow\.shadowRadius, vDirectionalShadowCoord\[ i \] \) : 1\.0;/,o=`		float _ppUnjit_UNROLLED_LOOP_INDEX = getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] );
		directLight.color *= ( directLight.visible && receiveShadow ) ? physicsPageShadowTint( physicsPageMultiTapShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius * max( 0.25, uPhysicsShadowPcfRadiusMul ), vDirectionalShadowCoord[ i ], _ppUnjit_UNROLLED_LOOP_INDEX ) ) : vec3( 1.0 );`;e.s(["T",0,a,"d",0,function(e){e.fragmentShader=function(e){if(!e.includes("#include <lights_fragment_begin>"))return e;let t=A.Y.lights_fragment_begin;return i.test(t)?(t=t.replace(i,o),e.replace("#include <lights_fragment_begin>",t)):e}(e.fragmentShader)}],49322);let r=`
uniform float uHologramIntensity;
uniform float uHologramTime;
uniform vec2 uHologramMouse;
uniform float uHologramScanlineFreq;
uniform float uHologramScanlineSpeed;
uniform float uHologramScanlineStrength;
uniform float uHologramChromaticStrength;
uniform float uHologramLightBoost;
uniform float uHologramWaveAmpMul;
uniform float uHologramChromaticTimeMul;
uniform vec3 uHologramTint;
uniform float uRadioIntensity;
uniform float uRadioTime;
uniform float uRadioRingFreq;
uniform float uRadioRingSpeed;
uniform float uRadioRingStrength;
uniform float uRadioNormalAmp;
uniform vec2 uRadioCenter;
uniform vec3 uRadioTint;
uniform float uRadioNoiseScale;
uniform float uRadioNoiseSpeed;
`,n=`
float radioHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float radioValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = radioHash(i);
  float b = radioHash(i + vec2(1.0, 0.0));
  float c = radioHash(i + vec2(0.0, 1.0));
  float d = radioHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float radioGlitch(vec2 uvIn) {
  float c1 = radioValueNoise(uvIn * uRadioNoiseScale);
  float c2 = radioValueNoise(uvIn * uRadioNoiseScale * 0.37 + 11.3);
  float f1 = sin(uRadioTime * uRadioNoiseSpeed + c1 * 6.2831853) * 0.5 + 0.5;
  float f2 = sin(uRadioTime * uRadioNoiseSpeed * 1.7 + c2 * 6.2831853) * 0.5 + 0.5;
  return pow(c1 * f1, 3.0) * 0.7 + pow(c2 * f2, 2.0) * 0.3;
}
// Speech-like burst envelope (matches RadioWaveEffect): irregular phrase gating \xd7 syllable flutter.
float radioTalkEnv(float t) {
  float phrase = 0.55 * sin(t * 3.1) + 0.45 * sin(t * 1.7 + 1.4);
  float speaking = max(0.0, phrase);
  float syllable = 0.65 + 0.35 * sin(t * 9.0);
  return clamp(speaking * 1.8, 0.0, 1.0) * syllable;
}

float radioRingField(vec2 uvIn) {
  vec2 rUv = uvIn - uRadioCenter;
  float dist = length(rUv);
  float TAU = 6.2831853;
  // One carrier only — evenly spaced rings (detuned partials beat into uneven gaps).
  float rings = sin(dist * uRadioRingFreq - uRadioTime * uRadioRingSpeed * TAU) * 0.5 + 0.5;
  rings = pow(rings, 2.0);
  float edgeFade = 1.0 - smoothstep(0.0, 1.2, dist);
  // Each ring carries the loudness of its birth moment (talk env sampled at now − travel time to this
  // radius): a ring born during a word grows outward and only dies at the edge; pauses emit dim gaps —
  // the field never fades as a whole between words.
  float travelSpeed = max(1e-4, uRadioRingSpeed * TAU / max(1.0, uRadioRingFreq));
  float tBirth = uRadioTime - dist / travelSpeed;
  return rings * edgeFade * radioTalkEnv(tBirth);
}
`,l=`
  if (uRadioIntensity > 0.001 && uRadioNormalAmp > 0.0) {
    float _eps = 0.004;
    float _rC = radioRingField(vUv);
    float _rX = radioRingField(vUv + vec2(_eps, 0.0));
    float _rY = radioRingField(vUv + vec2(0.0, _eps));
    vec2 _grad = vec2(_rX - _rC, _rY - _rC) / _eps;
    normal = normalize(normal - vec3(_grad, 0.0) * uRadioNormalAmp * uRadioIntensity);
  }
`,s=`
  {
    vec2 _effUv = vec2(vUv.x, 1.0 - vUv.y);
    if (uHologramIntensity > 0.001) {
      float hI = uHologramIntensity;
      float wavePhase = vUv.y * uHologramScanlineFreq * 0.5 + uHologramTime * uHologramScanlineSpeed;
      float waveShift = sin(wavePhase) * 0.003 * hI * uHologramWaveAmpMul;
      float wavePhase2 = vUv.y * uHologramScanlineFreq * 0.0833 + uHologramTime * uHologramScanlineSpeed * 0.37;
      float waveShift2 = sin(wavePhase2) * 0.006 * hI * uHologramWaveAmpMul;
      vec2 shiftedUv = (_effUv + vec2(waveShift + waveShift2, 0.0)) * uPageMapRepeat;
      vec3 shiftedColor = texture2D(uPageMap, shiftedUv).rgb;
      outgoingLight = mix(outgoingLight, shiftedColor, 0.5 * hI);
      float scanline = sin(vUv.y * uHologramScanlineFreq + uHologramTime * uHologramScanlineSpeed) * uHologramScanlineStrength * hI;
      float scanline2 = sin(vUv.y * uHologramScanlineFreq / 6.0 + uHologramTime * uHologramScanlineSpeed * 0.61) * uHologramScanlineStrength * 0.7 * hI;
      outgoingLight += scanline + scanline2;
      float chromTime = sin(uHologramTime * 1.3 + 2.1) * 0.6 + sin(uHologramTime * 2.7) * 0.4;
      vec2 abDir = (uHologramMouse + vec2(chromTime * 0.3, chromTime * 0.2) * uHologramChromaticTimeMul) * uHologramChromaticStrength * hI;
      vec3 rSample = texture2D(uPageMap, shiftedUv + abDir * uPageMapRepeat).rgb;
      vec3 bSample = texture2D(uPageMap, shiftedUv - abDir * uPageMapRepeat).rgb;
      outgoingLight.r = mix(outgoingLight.r, rSample.r, 0.3 * hI);
      outgoingLight.b = mix(outgoingLight.b, bSample.b, 0.3 * hI);
      vec2 grainCoord = floor(gl_FragCoord.xy / 4.0);
      float grainSeed = fract(sin(dot(grainCoord, vec2(12.9898, 78.233)) + floor(uHologramTime * 12.0)) * 43758.5453);
      outgoingLight += (grainSeed - 0.5) * 0.08 * hI;
      outgoingLight *= 1.0 + uHologramLightBoost;
      outgoingLight += uHologramTint * hI;
    }
    if (uRadioIntensity > 0.001) {
      float wave = radioRingField(vUv) * uRadioIntensity;
      outgoingLight += uRadioTint * wave * (uRadioRingStrength / 0.16);
      outgoingLight *= 1.0 + wave * 0.35;
    }
  }
`,g=`
uniform float uRadioIntensity;
uniform float uRadioTime;
uniform float uRadioRingFreq;
uniform float uRadioRingSpeed;
uniform float uRadioDisplaceAmp;
uniform vec2 uRadioCenter;
uniform float uRadioNoiseAmp;
uniform float uRadioNoiseScale;
uniform float uRadioNoiseSpeed;
`,u=`
float radioHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float radioValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = radioHash(i);
  float b = radioHash(i + vec2(1.0, 0.0));
  float c = radioHash(i + vec2(0.0, 1.0));
  float d = radioHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float radioGlitch(vec2 uvIn) {
  float c1 = radioValueNoise(uvIn * uRadioNoiseScale);
  float c2 = radioValueNoise(uvIn * uRadioNoiseScale * 0.37 + 11.3);
  float f1 = sin(uRadioTime * uRadioNoiseSpeed + c1 * 6.2831853) * 0.5 + 0.5;
  float f2 = sin(uRadioTime * uRadioNoiseSpeed * 1.7 + c2 * 6.2831853) * 0.5 + 0.5;
  return pow(c1 * f1, 3.0) * 0.7 + pow(c2 * f2, 2.0) * 0.3;
}
float radioNoiseSpikes(vec2 uvIn) {
  float cell = radioValueNoise(uvIn * uRadioNoiseScale);
  float flick = sin(uRadioTime * uRadioNoiseSpeed + cell * 6.2831853) * 0.5 + 0.5;
  return pow(cell * flick, 3.0);
}
// Speech-like burst envelope (matches RadioWaveEffect): irregular phrase gating \xd7 syllable flutter.
float radioTalkEnv(float t) {
  float phrase = 0.55 * sin(t * 3.1) + 0.45 * sin(t * 1.7 + 1.4);
  float speaking = max(0.0, phrase);
  float syllable = 0.65 + 0.35 * sin(t * 9.0);
  return clamp(speaking * 1.8, 0.0, 1.0) * syllable;
}

float radioRingField(vec2 uvIn) {
  vec2 rUv = uvIn - uRadioCenter;
  float dist = length(rUv);
  float TAU = 6.2831853;
  // One carrier only — evenly spaced rings (detuned partials beat into uneven gaps).
  float rings = sin(dist * uRadioRingFreq - uRadioTime * uRadioRingSpeed * TAU) * 0.5 + 0.5;
  rings = pow(rings, 2.0);
  float edgeFade = 1.0 - smoothstep(0.0, 1.2, dist);
  // Each ring carries the loudness of its birth moment (talk env sampled at now − travel time to this
  // radius): a ring born during a word grows outward and only dies at the edge; pauses emit dim gaps —
  // the field never fades as a whole between words.
  float travelSpeed = max(1e-4, uRadioRingSpeed * TAU / max(1.0, uRadioRingFreq));
  float tBirth = uRadioTime - dist / travelSpeed;
  return rings * edgeFade * radioTalkEnv(tBirth);
}
`,c=`
  if (uRadioIntensity > 0.001) {
    float _rw = radioRingField(vUv);
    worldPos += N * (_rw * uRadioDisplaceAmp) * uRadioIntensity;
  }
`;e.s(["m",0,n,"w",0,r,"K",0,s,"H",0,l,"p",0,c,"S",0,u,"b",0,g],28137);var f=e.i(50016);let d={value:0};new URLSearchParams(window.location.search).has("stretchdbg")&&(d.value=1),window.__stretchDebug=(e=!0)=>(d.value=+!!e,d.value);let h=`
uniform float uStretchDebug;
uniform float uPageWidth;
varying vec3 vStretchPos;
`,I=`
  if (uStretchDebug > 0.5) {
    vec3 dpx = dFdx(vStretchPos);
    vec3 dpy = dFdy(vStretchPos);
    vec2 dux = dFdx(vUv);
    vec2 duy = dFdy(vUv);
    float det = dux.x * duy.y - duy.x * dux.y;
    float su = abs(det) > 1e-12 ? length((dpx * duy.y - dpy * dux.y) / det) / max(uPageWidth, 1e-4) : 1.0;
    float band = mod(floor(vUv.x * 32.0), 2.0);
    vec3 dbg = mix(vec3(0.93), vec3(0.80), band);
    float e = su - 1.0;
    vec3 tint = e > 0.0 ? vec3(1.0, 0.12, 0.12) : vec3(0.12, 0.35, 1.0);
    dbg = mix(dbg, tint, clamp(abs(e) * 8.0, 0.0, 1.0));
    vec2 gq = vUv * 16.0;
    vec2 g = abs(fract(gq - 0.5) - 0.5) / max(fwidth(gq), vec2(1e-5));
    dbg = mix(dbg, vec3(0.0), (1.0 - clamp(min(g.x, g.y), 0.0, 1.0)) * 0.85);
    outgoingLight = dbg;
  }
`,p={enabled:d.value>0,frame:null,camera:null,pages:new Map,blocks:new Map};function C(e,t,A,a){let i=e[3]*t+e[7]*A+e[11]*a+e[15]||1;return[(e[0]*t+e[4]*A+e[8]*a+e[12])/i,(e[1]*t+e[5]*A+e[9]*a+e[13])/i,(e[2]*t+e[6]*A+e[10]*a+e[14])/i]}function m(e){let t=e[0],A=e[4],a=e[8],i=e[1],o=e[5],r=e[9],n=e[2],l=e[6],s=e[10],g=o*s-r*l,u=-(i*s-r*n),c=i*l-o*n,f=t*g+A*u+a*c||1e-12,d=[g/f,u/f,c/f,0,-(A*s-a*l)/f,(t*s-a*n)/f,-(t*l-A*n)/f,0,(A*r-a*o)/f,-(t*r-a*i)/f,(t*o-A*i)/f,0,0,0,0,1],h=e[12],I=e[13],p=e[14];return d[12]=-(d[0]*h+d[4]*I+d[8]*p),d[13]=-(d[1]*h+d[5]*I+d[9]*p),d[14]=-(d[2]*h+d[6]*I+d[10]*p),d}p.enabled&&(window.__pageProbe={probe:p,tune:e=>(0,f.setLookInsideStackTune)(e),hingeInset:e=>{f.coverOpenHingeInsetLiveRef.current=e},renderState:()=>{let e=e=>({name:e.name,renderOrder:e.renderOrder,mats:[].concat(e.material??[]).map(e=>({type:e.type,depthTest:e.depthTest,depthWrite:e.depthWrite,po:e.polygonOffset?[e.polygonOffsetFactor,e.polygonOffsetUnits]:null,transparent:e.transparent,opacity:e.opacity,side:e.side}))}),t=null;for(let e=p.frame;e;e=e.parent)if("book"===e.name){t=e;break}let A=[],a=t=>{t.isSkinnedMesh&&A.push(e(t)),t.children.forEach(a)};return t&&a(t),{covers:A,pages:[...p.pages.values()].slice(0,2).map(t=>e(t.mesh))}},coverOrigin:e=>{let t=null;for(let e=p.frame;e;e=e.parent)if("book"===e.name){t=e;break}let A=t;for(;A&&A.parent&&!A.parent.children.some(e=>e.isBone);)A=A.parent;let a={},i=t=>{t.isBone&&("frontcover1"===t.name||"backcover1"===t.name)&&(void 0===t.userData.probeBaseX&&(t.userData.probeBaseX=t.position.x),t.position.x=t.userData.probeBaseX*e,t.updateMatrix(),a[t.name]=t.position.x),t.children.forEach(i)};for(let e=t;e&&(i(e),!(Object.keys(a).length>=2));e=e.parent);return a},bones:()=>{let e=null;for(let t=p.frame;t;t=t.parent)if("book"===t.name){e=t;break}let t=p.frame;t.updateWorldMatrix(!0,!1);let A=m(t.matrixWorld.elements),a={},i=[],o=e=>{!i.length&&e.isSkinnedMesh&&e.skeleton&&(i=e.skeleton.bones),e.children.forEach(e=>o(e))};e&&o(e);let r=new Set,n=e=>{if(!r.has(e)){if(r.add(e),i.length&&!i.includes(e))return void e.children.forEach(n);if(e.isBone&&/cover|spine|endfold/.test(e.name)){e.updateWorldMatrix(!0,!1);let t=e.matrixWorld.elements,i=C(A,t[12],t[13],t[14]).map(e=>+e.toFixed(3));a[e.name]={parent:e.parent?.name,local:[e.position.x,e.position.y,e.position.z].map(e=>+e.toFixed(4)),scale:[e.scale.x,e.scale.y,e.scale.z].map(e=>+e.toFixed(3)),frame:i}}e.children.forEach(n)}};return i.forEach(n),a},hide:(e,t=!0)=>{let A=e=>{e&&(e.visible=!t)};if("leftBlock"===e||"rightBlock"===e)for(let t of p.blocks.values())t.label===("leftBlock"===e?"left":"right")&&A(t.mesh);else if("pages"===e)for(let e of p.pages.values())A(e.mesh);else if("cover"===e){let e=null;for(let t=p.frame;t;t=t.parent)if("book"===t.name){e=t;break}let A=e=>{e.isSkinnedMesh&&/cover/i.test(e.name)&&(e.visible=!t),e.children.forEach(A)};e&&A(e)}},dump:e=>{let t=p.frame;if(!t)return null;if("book"===e){for(let e=t;e;e=e.parent)if("book"===e.name){t=e;break}}t.updateWorldMatrix(!0,!1);let A=m(t.matrixWorld.elements),a=(e,t,a,i)=>{let o=C(e.matrixWorld.elements,t,a,i);return C(A,o[0],o[1],o[2]).map(e=>+e.toFixed(5))},i=[...p.pages.values()].filter(e=>e.mesh&&e.visible()).map(e=>{e.mesh.updateWorldMatrix(!0,!1);let t=[];for(let A=0;A<33;A+=1)t.push(a(e.mesh,e.data[4*A],0,e.data[4*A+1]));return{leaf:e.leaf,stackOff:e.stackOff,angle:+e.angle.toFixed(4),pts:t}}),o=[...p.blocks.values()].filter(e=>e.mesh&&(e=>{let A=!1;for(let a=e;a;a=a.parent){if(!a.visible)return!1;a===t&&(A=!0)}return A})(e.mesh)).map(e=>{e.mesh.updateWorldMatrix(!0,!1);let t=e.geometry.groups[e.topGroup],A=e.geometry.index.array,i=new Set;for(let e=t.start;e<t.start+t.count;e+=1)i.add(A[e]);let o=e.geometry.attributes.position.array,r=e.geometry.attributes.uv.array,n=[...i],l=Math.max(...n.map(e=>o[3*e+1])),s=n.filter(e=>1e-4>Math.abs(o[3*e+1]-l)).map(t=>({u:r[2*t],p:a(e.mesh,o[3*t],0,o[3*t+2])}));s.sort((e,t)=>e.u-t.u);let g=e.geometry.groups[4===e.topGroup?5:4],u=new Set;for(let e=g.start;e<g.start+g.count;e+=1)u.add(A[e]);let c=[...u],f=Math.max(...c.map(e=>o[3*e+1])),d=c.filter(e=>1e-4>Math.abs(o[3*e+1]-f)).map(t=>({u:r[2*t],p:a(e.mesh,o[3*t],0,o[3*t+2])}));return d.sort((e,t)=>e.u-t.u),{label:e.label,topLeaf:e.topLeaf,bottomLeaf:e.bottomLeaf,leaves:e.leaves,row:s,back:d}}),r=p.camera?a(p.camera,0,0,0):null,n=null;for(let e=t;e;e=e.parent)if("book"===e.name){n=e;break}let l=[],s=e=>{if(e.isSkinnedMesh&&/cover/i.test(e.name)&&e.getVertexPosition&&e.geometry){e.updateWorldMatrix(!0,!1);let t=new e.position.constructor,A=[];for(let i=0;i<e.geometry.attributes.position.count;i+=1){e.getVertexPosition(i,t);let o=a(e,t.x,t.y,t.z);A.push(o)}let i=e.geometry.index;l.push({name:e.name,pts:A,tris:i?Array.from(i.array):[]})}for(let t of e.children??[])s(t)};return n&&s(n),{camera:r,pages:i,blocks:o,covers:l}}}),e.s(["T",0,I,"h",0,h,"x",0,d,"r",0,"varying vec3 vStretchPos;","m",0,p],14013);let B=`
#define PHONG

varying vec2 vUv;
${h}
varying vec3 vNormal;

uniform sampler2D uPageMap;
uniform sampler2D uPageMapBack;
uniform sampler2D uBuckramMap;
uniform sampler2D uMarkerMap; // pencil black ink layer for this leaf/side (transparent where unmarked)
uniform sampler2D uHighlightMap; // highlighter layer: rgb = multiply color (yellow), a = coverage
uniform vec2 uPageMapRepeat; // albedo tiling (1,1 = normal page art; >1 tiles, e.g. the repeated Press-logo endpaper page)
uniform float uBackBleedScale; // 1 = normal show-through of the back page; 0 = opaque (thick endpaper leaves: first/last)
uniform float uPageTurnProgress;
uniform vec3 specular;
uniform float shininess;
uniform float reflectiveness;
uniform float uOpacity;
uniform float uBounceScale;
uniform float uBounceIntensity;
uniform float uBounceVariation;
uniform vec3 uBounceColor;
uniform float uUvFlipX; // 1 on turned (mirrored) pages — flips vUv.x, so recover the true spine coord below
uniform sampler2D uFoilMap; // foil stamp mask for this face (white = foil); only read when uFoilAmount > 0
uniform float uFoilAmount;  // 0 = no foil on this face (every page but a foil-stamped zine cover)

#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
${t}
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
${a}

uniform float bumpScaleBase;
uniform float uShadowGrain;
uniform float uTime;
${r}
${n}

vec3 perturbNormalBuckram( vec3 surfPos, vec3 surfNorm, vec2 uv ) {
  vec2 dSTdx = dFdx( uv );
  vec2 dSTdy = dFdy( uv );
  float Hll = bumpScaleBase * texture2D( uBuckramMap, uv ).x;
  float dBx = bumpScaleBase * texture2D( uBuckramMap, uv + dSTdx ).x - Hll;
  float dBy = bumpScaleBase * texture2D( uBuckramMap, uv + dSTdy ).x - Hll;
  vec3 vSigmaX = vec3( dFdx( surfPos.x ), dFdx( surfPos.y ), dFdx( surfPos.z ) );
  vec3 vSigmaY = vec3( dFdy( surfPos.x ), dFdy( surfPos.y ), dFdy( surfPos.z ) );
  vec3 R1 = cross( vSigmaY, surfNorm );
  vec3 R2 = cross( surfNorm, vSigmaX );
  float fDet = dot( vSigmaX, R1 );
  vec3 vGrad = sign( fDet ) * ( dBx * R1 + dBy * R2 );
  return normalize( abs( fDet ) * surfNorm - vGrad );
}

void main() {
  vec2 pageUv = vec2(vUv.x, 1.0 - vUv.y);
  // Paper bump: confine sampling to the bottom 3/4 of the shared texture — the top 1/4 of the source is
  // blank, so scale the sampled region up by 25% to crop it out. (Albedo still uses the full pageUv.)
  vec2 bumpUv = pageUv * 0.75;
  vec3 normal = perturbNormalBuckram( -vViewPosition, normalize(vNormal), bumpUv );
${l}

  vec3 albedo = texture2D(uPageMap, pageUv * uPageMapRepeat).rgb;
  float p = uPageTurnProgress;
  float edgeFade = 1.0 - clamp((p - 0.85) / 0.15, 0.0, 1.0);
  float outerBleed = mix(0.1, 0.3, clamp(p / 0.5, 0.0, 1.0)) * edgeFade * clamp(p * 50.0, 0.0, 1.0);
  float innerRise = clamp(p / 0.5, 0.0, 1.0) * 0.3;
  float innerFall = clamp((p - 0.5) / 0.2, 0.0, 1.0);
  float innerBleed = innerRise * (1.0 - innerFall) * edgeFade;
  float bleedStrength = mix(innerBleed, outerBleed, pageUv.x) * uBackBleedScale;
  vec2 backUv = vec2(1.0 - pageUv.x, pageUv.y);
  vec3 backBleed = texture2D(uPageMapBack, backUv, 1.0).rgb;
  albedo = mix(albedo, backBleed * 0.5 + albedo * 0.5, bleedStrength);
  // Ghost the mirrored back-page image faintly over the front, as if it shows through the paper — a little
  // when laying flat, more at the half-turn apex (where light can reach both sides). Pages stay fully opaque.
  // uBackBleedScale is 0 on the thick endpaper leaves (first/last) so nothing ghosts through them.
  // Blur the ghost: sample a lower-res mip (bias 2.5) and average a few jittered taps so the previous page reads
  // as a soft, scattered impression rather than a crisp mirror. Applied at 60% of the old opacity (40% less).
  // Blur reduced ~50% (mip bias 3.5→2.5 = half the footprint radius; jitter offsets halved).
  vec3 ghostBleed = (
      texture2D(uPageMapBack, backUv, 2.5).rgb
    + texture2D(uPageMapBack, backUv + vec2( 0.005,  0.0035), 2.5).rgb
    + texture2D(uPageMapBack, backUv + vec2(-0.004,  0.0045), 2.5).rgb
    + texture2D(uPageMapBack, backUv + vec2( 0.0035, -0.005), 2.5).rgb
    + texture2D(uPageMapBack, backUv + vec2(-0.0045, -0.0035), 2.5).rgb
  ) * 0.2;
  float ghostMix = (0.0672 + 0.126 * sin(p * PI)) * uBackBleedScale * 0.6;
  albedo = mix(albedo, ghostBleed, ghostMix);
  // Marker-tool ink: composite black over the page art where the user drew (alpha = ink coverage).
  vec4 highlightInk = texture2D(uHighlightMap, pageUv);
  albedo *= mix(vec3(1.0), highlightInk.rgb, highlightInk.a); // highlighter MULTIPLIES onto the art
  vec4 markerInk = texture2D(uMarkerMap, pageUv);
  albedo = mix(albedo, vec3(0.0), markerInk.a); // pencil ink over the top
  vec4 diffuseColor = vec4(albedo, uOpacity);
  float foilCov = uFoilAmount > 0.0 ? texture2D(uFoilMap, pageUv).r * uFoilAmount : 0.0;

  float specularStrength = reflectiveness;

  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );

  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse
                     + reflectedLight.directSpecular + reflectedLight.indirectSpecular;

  /**
   * FOIL STAMP (a zine cover — Built to Grow's silver pattern). A matte, gritty silver rather than a mirror: the stamp
   * sits on uncoated stock, so it reads as pale metal with a soft sheen that slides across as the zine tilts, broken up
   * by the paper's tooth. Cousin of the Nomad cover's foil (Book FragmentShader "FOIL GLINT") with the rainbow turned
   * down to a trace and the grain turned up.
   *   irr      what the lights put on the page here (the lit albedo with the albedo taken back out), so the foil keeps
   *            the scene's light colour and falls into the same shadows as the paper around it.
   *   band     the sheen: a broad highlight placed by the surface normal and the position on the page, both in view
   *            space, so tilting the zine or moving across it walks the bright band over the stamp.
   *   nA / nB  grit at two sizes, fixed to the page. The fine one fades out as its cells shrink under a pixel, so a
   *            small or distant cover holds a steady silver instead of crawling.
   */
  if (foilCov > 0.001) {
    vec3 irr = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(albedo, vec3(0.05));
    vec2 gA = floor(pageUv * vec2(540.0, 810.0));
    vec2 gB = floor(pageUv * vec2(230.0, 345.0));
    float gFade = clamp(1.0 / max(1e-4, fwidth(pageUv.x) * 540.0), 0.0, 1.0);
    float nA = mix(0.5, fract(sin(dot(gA, vec2(12.9898, 78.233))) * 43758.5453), gFade);
    float nA2 = mix(0.5, fract(sin(dot(gA, vec2(39.3467, 11.1357))) * 24634.6345), gFade);
    float nB = fract(sin(dot(gB, vec2(63.7264, 92.1234))) * 19928.1863);
    vec3 fN = normalize(normal + vec3(nA - 0.5, nA2 - 0.5, 0.0) * 0.04);
    float band = 0.5 + 0.5 * sin(fN.x * 9.0 - fN.y * 6.0 + vViewPosition.x * 0.22 - vViewPosition.y * 0.15);
    float sheen = band * band;
    // What it reflects: satin silver that picks up the room — cool where it faces the sky side of the sweep, a warm
    // peach where it faces the other — in one smooth gradient across the stamp (Nick's photo, 2026-11-16), plus a trace
    // of the Nomad foil's rainbow.
    float envT = smoothstep(0.15, 0.95, 0.5 + 0.5 * sin(fN.x * 7.0 + fN.y * 4.0 + vViewPosition.x * 0.14 + vViewPosition.y * 0.2 + 1.3));
    vec3 foilCol = mix(vec3(0.86, 0.89, 0.94), vec3(1.0, 0.76, 0.6), envT * 0.6) * (1.0 + 0.55 * sheen);
    vec3 irid = 0.5 + 0.5 * cos(6.2831853 * (band * 0.9 + fN.x * 1.5 + vec3(0.0, 0.33, 0.67)));
    foilCol *= mix(vec3(1.0), 0.6 + 0.8 * irid, 0.08);
    // Grit: the stock's tooth showing through the stamp — a fine, low-contrast grain, not glitter. Finer cells, half the
    // contrast and a little less metal over the paper than the first pass, which read gritty and too foily on the
    // Scaling Era cover (Nick, 2026-11-16).
    foilCol *= 0.97 + 0.05 * (nA - 0.5) + 0.03 * (nB - 0.5);
    outgoingLight = mix(outgoingLight, foilCol * irr + reflectedLight.directSpecular, foilCov * (0.86 + 0.03 * nB));
  }

  // Soft inter-page bounce: a smooth warm gradient glowing from the gutter outward on BOTH facing pages
  // (radiosity-style fill) — brightest at the spine, fading toward the fore-edge, with a gentle extra lift on the
  // curl (surfaces tilted away from view). Uses only the UV gradient + the analytic vNormal (no screen-space
  // derivatives), so it reads as a clean gradient with no texture striping. uBounce*: Intensity = strength,
  // Scale = reach, Variation = falloff shape (soft↔tight, never zero), Color = tint.
  vec3 Nb = normalize(vNormal);
  vec3 viewDirB = normalize(vViewPosition);
  // Distance from the spine, flip-independent: turned pages mirror vUv.x, so the spine sits at x=1 there.
  float spineCoord = mix(pageUv.x, 1.0 - pageUv.x, uUvFlipX);
  float gutterFall = pow(1.0 - smoothstep(0.0, max(0.05, uBounceScale), spineCoord), max(0.25, uBounceVariation));
  float curlLift = pow(clamp(1.0 - abs(dot(Nb, viewDirB)), 0.0, 1.0), 1.5);   // extra on the tilted/curled surface
  float refl = gutterFall * (0.8 + 0.6 * curlLift);
  outgoingLight += uBounceColor * refl * uBounceIntensity * 0.6;
  // Gutter contact shade: a narrow band where the spread dives into the spine, deeper where the page curls away from
  // view. Quadratic falloff so it stays a crease shade rather than a wash over the bounce glow above; it leans toward
  // the lights' hue as it deepens so it isn't grey.
  float gutterBand = 1.0 - smoothstep(0.0, 0.14, spineCoord);
  float gutterShade = 0.18 * gutterBand * gutterBand * (0.6 + 0.4 * curlLift);
  // The crease itself: a much narrower, darker core down the very middle of the gutter, on top of the band, so the
  // spread reads as diving into the spine rather than just dimming toward it (Nick, 2026-11-13). Cubed, so it is gone
  // within a few percent of the page width and never reaches the text column.
  float gutterCore = 1.0 - smoothstep(0.0, 0.045, spineCoord);
  gutterShade = min(0.6, gutterShade + 0.34 * gutterCore * gutterCore * gutterCore);
  outgoingLight *= (1.0 - gutterShade) * mix(vec3(1.0), occlusionLightHue(), clamp(gutterShade * 3.3, 0.0, 0.6));

  // Film grain — stronger in shadows, animated like shadow catcher. COLORED (not monochromatic): each channel gets
  // its own independent noise (different seeds) so it reads like real film grain, not a grey luminance dither.
  vec2 grainCoord = gl_FragCoord.xy + fract(uTime * 7.13) * 100.0;
  vec3 grain = vec3(
    fract(sin(dot(grainCoord, vec2(12.9898, 78.233))) * 43758.5453),
    fract(sin(dot(grainCoord, vec2(39.3467, 11.1357))) * 24634.6345),
    fract(sin(dot(grainCoord, vec2(63.7264, 92.1234))) * 19928.1863)
  ) - 0.5;
  float grainLum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
  float grainShadowMask = 0.3 + 0.7 * (1.0 - smoothstep(0.3, 1.2, grainLum));
  outgoingLight += grain * grainShadowMask * uShadowGrain * 0.75;
${s}

  // Page-edge thickness illusion: only reveals when that specific edge rotates toward the camera (silhouette).
  // Each edge has an outward direction perpendicular to the page face; the effect strength is gated by how much
  // that edge direction faces the view (dot > 0 = visible edge, dot ≤ 0 = edge faces away = no effect).
  {
    float edgeBand = 0.006;
    vec3 viewDir = normalize(vViewPosition);
    vec3 N = normalize(vNormal);
    // Approximate the page's local tangent (along width/U) and bitangent (along height/V) from screen derivatives.
    vec3 T = normalize(dFdx(vViewPosition));
    vec3 B = normalize(dFdy(vViewPosition));
    // Each edge's outward normal (perpendicular to page face, pointing OUT from that edge):
    // fore-edge (+U direction = T), top (+V = B), bottom (-V = -B)
    float foreVis = max(0.0, dot(viewDir, T));   // visible when fore-edge faces camera
    float topVis = max(0.0, dot(viewDir, B));    // visible when top edge faces camera
    float botVis = max(0.0, dot(viewDir, -B));   // visible when bottom edge faces camera
    float foreEdge = smoothstep(1.0 - edgeBand, 1.0, vUv.x) * foreVis;
    float topEdge = smoothstep(1.0 - edgeBand, 1.0, vUv.y) * topVis;
    float botEdge = smoothstep(edgeBand, 0.0, vUv.y) * botVis;
    float edge = max(foreEdge, max(topEdge, botEdge));
    // Fresnel on the edge: edge-on to camera = bright catch; face-on = darken (absorption).
    float facingCamera = abs(dot(N, viewDir));
    float edgeLighting = mix(1.4, 0.7, facingCamera);
    outgoingLight = mix(outgoingLight, outgoingLight * edgeLighting, edge);
  }

${I}
  gl_FragColor = vec4( outgoingLight, diffuseColor.a );
}
`;e.s(["f",0,B],69444);var E=e.i(32369);let v=["highlighter"],Q={pink:{body:"#ff5fa8",collar:"#e8458c",nib:"#ff8fc1",ink:[255,150,200],inkAlpha:.48},yellow:{body:"#f4e400",collar:"#e6b800",nib:"#f0a83c",ink:[255,240,130],inkAlpha:.8}};function y(e,t,A,a){return`${e}:${t}:${A}:${a}`}let w={current:null},S=null,x=new Set;function D(e){S!==e&&(S=e,w.current=e,x.forEach(e=>e()))}let M="yellow",b=new Map,R=new Map,F="pressPageMarks",k=!1;function L(){if(!k){k=!0;try{let e=window.localStorage.getItem(F);if(!e)return;let t=JSON.parse(e);if(!t||"object"!=typeof t)return;for(let e of Object.keys(t))for(let A of Object.keys(t[e])){let a=t[e][A];["front","back"].forEach(t=>{let i=a[t];i&&v.forEach(a=>{let o=i[a];Array.isArray(o)&&o.length&&b.set(y(e,Number(A),t,a),o)})})}}catch{}}}let U=null;function N(e){R.get(e)?.forEach(e=>e())}function P(e){return L(),b.get(e)??[]}function _(e,t){let A=R.get(e);return A||(A=new Set,R.set(e,A)),A.add(t),()=>{A.delete(t)}}function T(e,t,A,a="yellow"){L();let i=b.get(e)??[];i.push({pts:[{u:t,v:A}],color:a}),b.set(e,i),N(e)}function G(e,t,A){let a=t.x-e.x,i=t.y-e.y,o=Math.hypot(a,i);if(o<=A||o<1e-6)return t;let r=A/o;return{x:e.x+a*r,y:e.y+i*r}}e.s(["w",0,["pink","yellow"],"u",0,Q,"g",0,function(e,t,A){let a=b.get(e);a&&a.length?(a[a.length-1].pts.push({u:t,v:A}),N(e)):T(e,t,A)},"Z",0,T,"$",0,function(e){let t=b.get(e);t&&t.length&&t[t.length-1].pts.length<2&&(t.pop(),t.length||b.delete(e),N(e)),null!=U&&clearTimeout(U),U=setTimeout(()=>{U=null;try{let e={};b.forEach((t,A)=>{if(!t.length)return;let a=function(e){let t=e.split(":");if(t.length<4)return null;let A=t.pop(),a=t.pop(),i=t.pop();return{bookId:t.join(":"),leaf:i,side:a,tool:A}}(A);a&&(e[a.bookId]??={},e[a.bookId][a.leaf]??={},e[a.bookId][a.leaf][a.side]??={},e[a.bookId][a.leaf][a.side][a.tool]=t)}),window.localStorage.setItem(F,JSON.stringify(e))}catch{}},400)},"s",0,function(){return S},"z",0,function(){return M},"E",0,P,"l",0,y,"m",0,w,"C",0,function(e){"highlighter"===S&&M===e?D(null):(M!==e&&(M=e,x.forEach(e=>e())),D("highlighter"))},"e",0,D,"i",0,_,"t",0,function(e){return x.add(e),()=>{x.delete(e)}},"f",0,function(e){D(S===e?null:e)}],47525);let H={highlighter:{widthPx:21}},O=new Map,q=null;function Y(){return q||((q=new E.U7(new Uint8Array([0,0,0,0]),1,1,E.W1)).needsUpdate=!0),q}function J(e,t){return{x:1024*e,y:(1-t)*1024}}function W(e,t,A){let a=e.canvas.getContext("2d");if(!a)return;let i=H[A];for(let e of(a.clearRect(0,0,1024,1024),a.lineWidth=i.widthPx,a.lineJoin="round",a.lineCap="round",P(t))){let t=e.pts;if(!t.length)continue;let A=Q[e.color??"yellow"],o=`rgba(${A.ink.join(",")},${A.inkAlpha})`;if(a.strokeStyle=o,a.fillStyle=o,1===t.length){let e=J(t[0].u,t[0].v);a.beginPath(),a.arc(e.x,e.y,i.widthPx/2,0,2*Math.PI),a.fill();continue}let r={last:J(t[0].u,t[0].v),prev:null};a.beginPath(),a.moveTo(r.last.x,r.last.y);for(let e=1;e<t.length;e++){let A=J(t[e].u,t[e].v),i=function(e,t,A=.5,a=.45){let i=e.last;if(!i)return null;let o=t.x-i.x,r=t.y-i.y,n=Math.hypot(o,r);if(n<A)return null;let l=e.prev,s=l??{x:i.x-o,y:i.y-r},g={x:t.x+o,y:t.y+r},u=a;if(l){let e=i.x-l.x,t=i.y-l.y,A=Math.hypot(e,t);if(A>.001){let a=Math.acos(Math.min(1,Math.max(-1,e/A*(o/n)+t/A*(r/n))));a>Math.PI/5&&(u*=1-.65*Math.min(1,Math.max(0,(a-Math.PI/5)/(Math.PI-Math.PI/5))))}}let c=n*u;return{p1:i,cp1:G(i,{x:i.x+(t.x-s.x)/6,y:i.y+(t.y-s.y)/6},c),cp2:G(t,{x:t.x-(g.x-i.x)/6,y:t.y-(g.y-i.y)/6},c),p2:t}}(r,A,.5);i&&(a.bezierCurveTo(i.cp1.x,i.cp1.y,i.cp2.x,i.cp2.y,i.p2.x,i.p2.y),r.last&&(r.prev=r.last,r.last=A))}a.stroke()}e.texture.needsUpdate=!0}e.s(["t",0,function(e,t,A,a){let i=y(e,t,A,a),o=O.get(i);if(o)return o;if(0===P(i).length)return{texture:Y()};let r=document.createElement("canvas");r.width=1024,r.height=1024;let n=new E.Nk(r);n.colorSpace=E.nj,n.minFilter=E.VV,n.magFilter=E.VV;let l={texture:n,canvas:r,unsub:()=>{}};return l.unsub=_(i,()=>W(l,i,a)),W(l,i,a),O.set(i,l),l},"E",0,Y,"F",0,function(e){return H[e].widthPx/1024}],12312)},63320,e=>{var t=e.i(91398),A=e.i(91788),a=e.i(82936),i=e.i(32369),o=e.i(11566),r=e.i(67291),n=e.i(23736),l=e.i(50016);let s=1/60,g=new i.cE(1,0,0),u=new i.cE(0,1,0),c=new i.cE(0,0,1),f=new i.as;n.c,e.s(["F",0,({restProfileRight:e,restNodeCount:r,leafCount:n,splitLeaf:s,rightLeaves:d,rightBottomLeaf:h,rightTopLeaf:I,leftLeaves:p,leftBottomLeaf:C,bendScale:m,morphFrames:B,openAmountRef:E,rightOpenAmountRef:v,leftOpenAmountRef:Q,rightCoverOpenRef:y,leftCoverOpenRef:w,leftInvertDroop:S=!1,dropBendRef:x,thicknessPct:D,leftZShiftStacks:M=0,pageWidth:b,pageHeight:R,curlStiffness:F,curlFrontPower:k,curlEndReverse:L,curlReversePower:U,fanShearGain:N,fanPower:P,curlSweepMax:_,curlStretchGain:T,thinCurlEase:G,foreTaperDeg:H,thinHeadStart:O=0,thinTurnStart:q=0,thinTurnEnd:Y=1,thinRampStart:J=.5,thinFrontRelax:W=0,poseRegistry:K,splitLeafRef:V,easedReadingPRef:X,xShiftThicknessMul:z,rightDecoyUrl:j,leftDecoyUrl:Z,pageCastShadow:$=!0,wireframe:ee=!1,pageColor:et,edgeArtMap:eA,tintedLeaves:ea})=>{let ei=(0,A.useRef)(null),eo=(0,A.useRef)(null);return(0,a.f)(()=>{if(eo.current){let e=eo.current,t=l.lookInsideLeftFlipLiveRef.current;e.quaternion.identity();let A=(t,A,a)=>{let i=A*Math.PI*(a?-1:1)/180;1e-6>Math.abs(i)||(f.setFromAxisAngle(t,i),e.quaternion.multiply(f))};A(g,t.xDeg,t.reverseX),A(u,t.yDeg,t.reverseY),A(c,t.zDeg,t.reverseZ),e.scale.set(1,1,-1);let a=X.current;e.position.set(t.offsetXPW*b*(1-a)*z,t.offsetYPW*b,t.offsetZPW*b)}if(ei.current){let e=l.lookInsideLeftFlipLiveRef.current;ei.current.position.x=-e.offsetXPW*b*X.current*z}}),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("group",{ref:ei,children:(0,t.jsx)(o.h,{side:"right",leaves:d,bottomLeaf:h,topLeaf:I,leafCount:n,restProfile:e,restNodeCount:r,bendScale:m,morphFrames:B,openAmountRef:v??E,dropBendRef:x,splitLeaf:s,thicknessPct:D,leftZShiftStacks:M,pageWidth:b,pageHeight:R,curlStiffness:F,curlFrontPower:k,curlEndReverse:L,curlReversePower:U,fanShearGain:N,fanPower:P,curlSweepMax:_,curlStretchGain:T,thinCurlEase:G,foreTaperDeg:H,thinHeadStart:O,thinTurnStart:q,thinTurnEnd:Y,thinRampStart:J,thinFrontRelax:W,poseRegistry:K,splitLeafRef:V,materialSide:i.Vs,topFaceImageUrl:j,castShadow:$,wireframe:ee,pageColor:et,edgeArtMap:eA,tintedLeaves:ea,coverOpenRef:y})}),(0,t.jsx)("group",{ref:eo,children:(0,t.jsx)(o.h,{side:"right",leaves:p,bottomLeaf:C,topLeaf:0,leafCount:n,restProfile:e,restNodeCount:r,bendScale:m,morphFrames:B,openAmountRef:Q??E,dropBendRef:x,dropBendInvert:!0,invertDroop:S,splitLeaf:s,thicknessPct:D,pageWidth:b,pageHeight:R,curlStiffness:F,curlFrontPower:k,curlEndReverse:L,curlReversePower:U,fanShearGain:N,fanPower:P,curlSweepMax:_,curlStretchGain:T,thinCurlEase:G,foreTaperDeg:H,thinHeadStart:O,thinTurnStart:q,thinTurnEnd:Y,thinRampStart:J,thinFrontRelax:W,poseRegistry:K,splitLeafRef:V,negateBaseZ:!0,materialSide:i.Vs,topFaceImageUrl:Z,castShadow:$,wireframe:ee,pageColor:et,edgeArtMap:eA,tintedLeaves:ea,coverOpenRef:w})})]})},"Y",0,function(e,t,A,a){let i={rightStackZ:0,leftStackZ:0,spineX:0},o={...e,tipFold:t,tipFoldFalloff:A},n=(0,r.K)(o);(0,r.Q)(n,a);let l=a<Math.PI/2?Math.PI:0;for(let e=0;e<90;e++)(0,r.P)(n,o,i,a,l,s);return Float32Array.from(n.positions)}])},76471,77368,8571,e=>{var t=e.i(91398),A=e.i(91788),a=e.i(31810),i=e.i(82936),o=e.i(63320),r=e.i(73726),n=e.i(45610),l=e.i(23736),s=e.i(19592),g=e.i(50016);e.s(["f",0,({host:e,leafCount:u,bookThicknessRatio:c=1,stackThicknessPct:f,coverFlapOpenRef:d,backCoverFlapOpenRef:h,centerFrontUrl:I,centerBackUrl:p,wireframe:C=!1,pageColor:m,edgeArtMap:B,tintedLeaves:E})=>{let v=(0,A.useRef)(null),Q=(0,A.useRef)(null),y=(0,A.useRef)(0),w=(0,A.useRef)(0),S=(0,A.useRef)(.5),x=(0,A.useRef)(.5),[D]=(0,A.useState)(()=>new Set);(0,i.f)(()=>{let t=v.current;if(t){t.scale.setScalar(Math.max(1e-4,g.lookInsidePhysicsPortalScaleLiveRef.current));let A=e?(0,r.Q)(e):null;e&&A&&(0,r.M)(t,e,A)}let A=Q.current;if(A){let e=g.lookInsidePhysicsPortalOffsetLiveRef.current;A.position.set(e.x,e.y,e.z-g.LOOK_INSIDE_STACK_SPINE_OUT_Z),A.rotation.set(0,g.lookInsidePhysicsPortalRotYLiveRef.current,0)}let a=Math.min(1,Math.max(0,(d??g.coverFlapOpenLiveRef).current)),i=Math.min(1,Math.max(0,h?.current??0));w.current=a,y.current=i,D.forEach(e=>e())});let M=(0,A.useSyncExternalStore)(g.subscribeLookInsideStackTune,()=>g.lookInsideStackTuneLiveRef.current,()=>g.lookInsideStackTuneLiveRef.current),b=Math.max(1e-4,c),R=s.c*g.LOOK_INSIDE_PHYSICS_PORTAL_PAGE_SCALE_X+g.LOOK_INSIDE_PAGE_WIDTH_EXTEND,F=s.V*g.LOOK_INSIDE_PHYSICS_PORTAL_PAGE_SCALE_Y,k=(0,A.useMemo)(()=>{let e={nodeCount:l.c,pageWidth:R,gravity:34,stiffness:1.35,damping:.4,iterations:8,bendFalloff:.49,groundOpenRad:0,flatRest:!0,curlTurn:!1,curlFrontPower:M.curlFrontPower,curlEndReverse:M.curlEndReverse,curlReversePower:M.curlReversePower};return(0,o.Y)(e,1,.45,0)},[R,M.curlFrontPower,M.curlEndReverse,M.curlReversePower]);if(!e||u<=0)return null;let L=(f??M.thicknessPct)*b,U=.5+1.5*Math.min(1,Math.max(0,(b-.57)/(1.11-.57))),N=[g.LOOK_INSIDE_STACK_X_OFFSET*g.LOOK_INSIDE_PHYSICS_PORTAL_PAGE_SCALE_X,0,0],P=Math.floor((u-1)/2);return(0,a.f)((0,t.jsx)("group",{ref:v,scale:Math.max(1e-4,g.LOOK_INSIDE_PHYSICS_PORTAL_SCALE),userData:{[n.N]:!0,[r.y]:!0},children:(0,t.jsx)("group",{ref:Q,position:[g.LOOK_INSIDE_PHYSICS_PORTAL_OFFSET[0],g.LOOK_INSIDE_PHYSICS_PORTAL_OFFSET[1],g.LOOK_INSIDE_PHYSICS_PORTAL_OFFSET[2]-g.LOOK_INSIDE_STACK_SPINE_OUT_Z],rotation:[0,g.LOOK_INSIDE_PHYSICS_PORTAL_ROT_Y_RAD,0],children:(0,t.jsx)("group",{position:N,children:(0,t.jsx)(A.Suspense,{fallback:null,children:(0,t.jsx)(o.F,{restProfileRight:k,restNodeCount:l.c,leafCount:u,splitLeaf:P,rightLeaves:u-P,rightBottomLeaf:u-1,rightTopLeaf:P,leftLeaves:P,leftBottomLeaf:P-1,bendScale:1,morphFrames:7,openAmountRef:y,rightOpenAmountRef:y,leftOpenAmountRef:w,rightCoverOpenRef:y,leftCoverOpenRef:w,dropBendRef:S,poseRegistry:D,thicknessPct:L,leftZShiftStacks:M.leftZShiftStacks,pageWidth:R,pageHeight:F,curlStiffness:1.35,curlFrontPower:M.stackCurlFrontPower,curlEndReverse:M.curlEndReverse,curlReversePower:M.curlReversePower,fanShearGain:M.fanShearGain,fanPower:M.fanPower,curlSweepMax:M.curlSweepMaxDeg*Math.PI/180,curlStretchGain:M.curlStretchGain,thinCurlEase:M.thinCurlEase,foreTaperDeg:M.foreTaperDeg,thinHeadStart:M.thinHeadStart,thinTurnStart:M.thinTurnStart,thinTurnEnd:M.thinTurnEnd,thinRampStart:M.thinRampStart,thinFrontRelax:M.thinFrontRelax,easedReadingPRef:x,xShiftThicknessMul:U,rightDecoyUrl:I,leftDecoyUrl:p,pageCastShadow:!0,wireframe:C,pageColor:m,edgeArtMap:B,tintedLeaves:E})})})})}),e)}],76471);let u={shared_bump_buckram:{gloss:.3,sheen:.6,weave:.3,fibre:.05,sheenRough:.55,wrap:.3},shared_bump_cardboard:{gloss:.6,sheen:.2,weave:.18,fibre:.03,sheenRough:.75,wrap:.2},shared_bump_paper:{gloss:.7,sheen:.15,weave:.12,fibre:.02,sheenRough:.8,wrap:.15}},c={gloss:1,sheen:0,weave:0,fibre:0,sheenRough:.6,wrap:0};e.s(["f",0,function(e){let t=u[e.bumpMapBase]??c;return{...t,gloss:e.clothGloss??t.gloss,sheen:e.clothSheen??t.sheen,weave:e.clothWeave??t.weave,fibre:e.clothFibre??t.fibre}}],77368),e.s(["f",0,function({shellRef:e,devCoverDrag:a,onDragHandlePointerDown:i,bookPageStackFanMode:o,devShelfFlapGainPct:r,setDevShelfFlapGainPct:n,devShelfFlapMaxDeg:l,setDevShelfFlapMaxDeg:s,devPageFanAxis:u,setDevPageFanAxis:c}){let[f,d]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.stiffness),[h,I]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.damping),[p,C]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.curveMul),[m,B]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.rotationFollow),[E,v]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.dragCurl),[Q,y]=(0,A.useState)(g.PAGE_STACK_SPRING_DEFAULT.tipFold);return(0,t.jsx)("div",{style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:g.BOOK_STACK_DEV_HUD_Z_INDEX},children:(0,t.jsxs)("div",{ref:e,style:{position:"absolute",right:16,bottom:16,width:340,maxWidth:"calc(100vw - 32px)",maxHeight:"min(560px, calc(100vh - 32px))",display:"flex",flexDirection:"column",boxSizing:"border-box",borderRadius:10,background:"rgba(12,12,14,0.92)",border:"1px solid rgba(255,255,255,0.12)",boxShadow:"0 8px 32px rgba(0,0,0,0.45)",pointerEvents:"auto",fontFamily:"system-ui, sans-serif",color:"#e8e8ec",overflow:"hidden",transform:`translate(${a.x}px, ${a.y}px)`},children:[(0,t.jsxs)("div",{onPointerDown:i,style:{flexShrink:0,display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.08)",cursor:"grab",touchAction:"none",userSelect:"none"},children:[(0,t.jsx)("span",{style:{fontSize:12,letterSpacing:-1,color:"#666",opacity:.95},"aria-hidden":!0,children:"⋮⋮"}),(0,t.jsx)("span",{style:{fontSize:11,fontWeight:600,letterSpacing:"0.04em",color:"#888",flex:1,minWidth:0},children:"COVERS & PAGE STACK — / to hide"})]}),(0,t.jsxs)("div",{style:{overflowY:"auto",flex:1,minHeight:0,padding:"12px 14px"},children:[(0,t.jsxs)("div",{style:{fontSize:10,color:"#5a5d66",marginBottom:8},children:["Stack fan mode: ",(0,t.jsx)("strong",{style:{color:"#98a4b8"},children:o})," — ",(0,t.jsx)("code",{style:{fontSize:9},children:"off"})," = GLB clip only · ",(0,t.jsx)("code",{style:{fontSize:9},children:"rigid"})," /"," ",(0,t.jsx)("code",{style:{fontSize:9},children:"shader"})," add extra procedural tilt (legacy). Set in Book.tsx."]}),(0,t.jsxs)("div",{style:{fontSize:11,color:"#7a7d88",lineHeight:1.4,marginBottom:12},children:["Opening this panel does ",(0,t.jsx)("strong",{style:{color:"#aeb4c4"},children:"not"})," change cover or page-stack open amounts — those follow shelf drag / refs. Use the sliders below for flap tuning and procedural fan axis only."]}),(0,t.jsx)("div",{style:{fontSize:11,fontWeight:600,color:"#888",marginBottom:6},children:"Shelf cover flap (ω → bones)"}),(0,t.jsxs)("div",{style:{fontSize:10,color:"#5a5d66",lineHeight:1.35,marginBottom:8},children:["Drag / twirl / scroll drive ",(0,t.jsx)("code",{style:{fontSize:9},children:"coverBoneLagRadRef"})," in"," ",(0,t.jsx)("code",{style:{fontSize:9},children:"useBookInteraction"})," — these sliders tune gain and max open for that path."]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Floppiness (gain %)"}),(0,t.jsx)("input",{type:"range",min:15,max:300,step:5,value:r,onChange:e=>{let t=Number(e.target.value);n(t),g.coverShelfFlapInteractionTuneRef.current.gainMul=t/100},style:{flex:1,minWidth:0}}),(0,t.jsxs)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:[r,"%"]})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Max rotation (°)"}),(0,t.jsx)("input",{type:"range",min:5,max:120,step:1,value:l,onChange:e=>{let t=Number(e.target.value);s(t),g.coverShelfFlapInteractionTuneRef.current.maxOpenRad=t*Math.PI/180},style:{flex:1,minWidth:0}}),(0,t.jsxs)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:[l,"°"]})]}),(0,t.jsx)("div",{style:{fontSize:11,fontWeight:600,color:"#888",marginBottom:6,marginTop:12},children:"Page stack spring"}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Stiffness"}),(0,t.jsx)("input",{type:"range",min:2,max:60,step:1,value:f,onChange:e=>{let t=Number(e.target.value);d(t),g.pageStackSpringTuneRef.current.stiffness=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:f})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Damping"}),(0,t.jsx)("input",{type:"range",min:1,max:30,step:.5,value:h,onChange:e=>{let t=Number(e.target.value);I(t),g.pageStackSpringTuneRef.current.damping=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:h})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Rotation follow"}),(0,t.jsx)("input",{type:"range",min:0,max:2,step:.01,value:m,onChange:e=>{let t=Number(e.target.value);B(t),g.pageStackSpringTuneRef.current.rotationFollow=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:m.toFixed(2)})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Tip fold"}),(0,t.jsx)("input",{type:"range",min:0,max:1,step:.01,value:Q,onChange:e=>{let t=Number(e.target.value);y(t),g.pageStackSpringTuneRef.current.tipFold=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:Q.toFixed(2)})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Drag curl"}),(0,t.jsx)("input",{type:"range",min:0,max:3,step:.05,value:E,onChange:e=>{let t=Number(e.target.value);v(t),g.pageStackSpringTuneRef.current.dragCurl=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:E.toFixed(2)})]}),(0,t.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:12},children:[(0,t.jsx)("span",{style:{flex:"0 0 118px"},children:"Curve mul"}),(0,t.jsx)("input",{type:"range",min:0,max:3,step:.05,value:p,onChange:e=>{let t=Number(e.target.value);C(t),g.pageStackSpringTuneRef.current.curveMul=t},style:{flex:1,minWidth:0}}),(0,t.jsx)("span",{style:{flex:"0 0 44px",textAlign:"right",fontVariantNumeric:"tabular-nums"},children:p.toFixed(2)})]}),(0,t.jsx)("div",{style:{fontSize:11,fontWeight:600,color:"#888",marginBottom:6},children:"Page fan axis (local)"}),(0,t.jsx)("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10},children:["x","y","z"].map(e=>(0,t.jsx)("button",{type:"button",onClick:()=>c(e),style:{padding:"6px 12px",fontSize:11,fontWeight:600,borderRadius:6,border:u===e?"1px solid rgba(120,180,255,0.55)":"1px solid rgba(255,255,255,0.15)",background:u===e?"rgba(80,140,255,0.22)":"rgba(255,255,255,0.06)",color:"#e8e8ec",cursor:"pointer"},children:e.toUpperCase()},e))}),(0,t.jsx)("button",{type:"button",onClick:()=>{c("y");let e=g.coverShelfFlapInteractionTuneRef.current;e.gainMul=1.2,e.smoothMul=1,e.maxOpenRad=g.COVER_FLAP_OPEN_MAX_RAD,n(220),s(Math.round(180*g.COVER_FLAP_OPEN_MAX_RAD/Math.PI))},style:{padding:"6px 10px",fontSize:11,fontWeight:600,borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.06)",color:"#aaa",cursor:"pointer"},children:"Reset defaults"})]})]})})}],8571)},64691,e=>{var t=e.i(91788),A=e.i(82936),a=e.i(92381),i=e.i(77964),o=e.i(72889),r=e.i(99891),n=e.i(32369),l=e.i(78424),s=e.i(69444),g=e.i(48180),u=e.i(12312),c=e.i(49322),f=e.i(28137),d=e.i(14013),h=e.i(48585),I=e.i(55946),p=e.i(28810),C=e.i(50016);let m=`
uniform float uUvFlipX;
uniform float uNormalSign; // −1 for the mirror-reflected (negative-scale) left block, so its page faces light outward
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
${d.r}
${f.b}

#include <common>
#include <shadowmap_pars_vertex>
${f.S}

void main() {
  vUv = vec2(mix(uv.x, 1.0 - uv.x, uUvFlipX), 1.0 - uv.y);
  vec3 N = normalize(normal) * uNormalSign;
  vec3 worldPos = position;
  vStretchPos = position;
  vNormal = normalize(normalMatrix * N);
  ${f.p}
  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vViewPosition = -mvPosition.xyz;
  vec3 transformedNormal = vNormal;
  vec4 worldPosition = modelMatrix * vec4(worldPos, 1.0);
  #include <shadowmap_vertex>
}
`;function B(e,t){(0,p.o)(e,t)}let E=null;function v(e){let t=e?parseInt(e.replace("#",""),16):0/0;return Number.isFinite(t)?t:0xffffff}function Q(e,t){let A=Math.imul(e,0x165667b1)+Math.imul(t,0x27d4eb2f);return(((A=Math.imul(A^A>>>13,0x4bf19f61))^A>>>16)>>>0)/0x100000000}function y(e,t){let A=Math.floor(e),a=Math.floor(t),i=e-A,o=t-a,r=i*i*(3-2*i),n=o*o*(3-2*o),l=Q(A,a),s=Q(A+1,a),g=Q(A,a+1);return l+(s-l)*r+(g-l)*n+(l-s-g+Q(A+1,a+1))*r*n}let w=null,S=`
  float edgeAoCover = 1.0 - 0.33 * uEdgeCoverOcc * edgeAoBand(vEdgeAo.x, 0.56);
  float edgeAoSpine = 1.0 - 0.21 * edgeAoBand(vEdgeAo.y, 1.0);
  float edgeAoEnds = 1.0 - 0.12 * edgeAoBand(min(vEdgeAo.z, vEdgeAo.w), 0.32);
  float edgeAoMul = edgeAoCover * edgeAoSpine * edgeAoEnds;
  diffuseColor.rgb *= edgeAoMul * mix(vec3(1.0), occlusionLightHue(), clamp((1.0 - edgeAoMul) * 2.0, 0.0, 0.6));
`,x=`
varying vec4 vEdgeAo;
uniform float uEdgeCoverOcc;
float edgeAoBand(float d, float r) {
  float k = 1.0 - smoothstep(0.0, r, d);
  return k * k;
}
`,D=`
  vec2 edgeArtDx = dFdx(vEdgeArtUv.xy);
  vec2 edgeArtDy = dFdy(vEdgeArtUv.xy);
  // Texel j holds leaf j − 1, and leaf k spans [k − \xbd, k + \xbd), so texel j spans [j, j + 1) of tintL.
  float tintL = vEdgeArtUv.w + 1.5;
  float tintDx = dFdx(tintL);
  float tintDy = dFdy(tintL);
  float tintW = max(abs(tintDx) + abs(tintDy), 1e-4);
  if (vEdgeArtUv.z > 0.5) {
    int tintN = textureSize(uLeafTints, 0).x;
    float tintI = floor(tintL);
    float tintF = tintL - tintI;
    float tintMix = clamp(0.5 - min(tintF, 1.0 - tintF) / tintW, 0.0, 0.5);
    int tintJ = int(tintI);
    int tintNb = tintJ + (tintF < 0.5 ? -1 : 1);
    vec4 tint = mix(texelFetch(uLeafTints, ivec2(clamp(tintJ, 0, tintN - 1), 0), 0), texelFetch(uLeafTints, ivec2(clamp(tintNb, 0, tintN - 1), 0), 0), tintMix);
    float tintInvN = 1.0 / float(tintN);
    vec4 tintAvg = textureGrad(uLeafTints, vec2(tintL * tintInvN, 0.5), vec2(tintDx * tintInvN, 0.0), vec2(tintDy * tintInvN, 0.0));
    tint = mix(tint, tintAvg, smoothstep(0.75, 2.0, tintW));
    diffuseColor.rgb *= mix(vec3(1.0), sRGBTransferEOTF(vec4(tint.rgb, 1.0)).rgb, tint.a);
  }
  if (uEdgeArtOn > 0.5 && vEdgeArtUv.z > 0.5) {
    // Cap the sample footprint at ~4 texels (mip ≤ 2): an edge-on face is a sliver on screen, and a full-size footprint
    // averages the band into its neighbouring atlas cells.
    vec2 edgeArtSize = vec2(textureSize(uEdgeArtMap, 0));
    float edgeArtFoot = max(length(edgeArtDx * edgeArtSize), length(edgeArtDy * edgeArtSize));
    float edgeArtK = min(1.0, 4.0 / max(edgeArtFoot, 1e-4));
    vec3 edgeArt = textureGrad(uEdgeArtMap, vEdgeArtUv.xy, edgeArtDx * edgeArtK, edgeArtDy * edgeArtK).rgb;
    float edgeArtChroma = max(edgeArt.r, max(edgeArt.g, edgeArt.b)) - min(edgeArt.r, min(edgeArt.g, edgeArt.b));
    diffuseColor.rgb *= mix(vec3(1.0), sRGBTransferEOTF(vec4(edgeArt, 1.0)).rgb, smoothstep(0.03, 0.12, edgeArtChroma));
  }
`,M=`
varying vec4 vEdgeArtUv;
uniform sampler2D uEdgeArtMap;
uniform float uEdgeArtOn;
uniform sampler2D uLeafTints;
`,b=new WeakMap,R=null;function F(e,t){let A=new Uint8Array(4*e).fill(255);for(let e=3;e<A.length;e+=4)A[e]=0;t(A);let a=new n.U7(A,e,1,n.W1);return a.colorSpace=n.Ik,a.magFilter=n.r8,a.minFilter=n.Q4,a.generateMipmaps=!0,a.needsUpdate=!0,a}function k(e){if(!e||0===e.length)return R??=F(1,()=>{});let t=b.get(e);return t||(t=F(Math.max(...e.map(e=>e.to))+3,t=>{for(let A of e){let e=parseInt(A.color.slice(1),16);for(let a=Math.max(0,A.from);a<=A.to;a++)t.set([e>>16&255,e>>8&255,255&e,255],(a+1)*4)}}),b.set(e,t)),t}let L=()=>"pressBlockEdgeArtAo",U=()=>"pressBlockEdgeArt",N=new n.Es,P=null,_=new Map;e.s(["F",0,function(e){return!!(!e||(0,I.k)()&&"/assets/three/book/shared/blank.png"!==e)||(0,p.g)(e)},"l",0,B,"C",0,function(e=1,a=!1,i,o=!0,r,l){let s=(0,t.useMemo)(()=>({map:{value:null},on:{value:0},tints:{value:k(void 0)}}),[]),u=!!l&&l.length>0;(0,A.f)(()=>{let e=r?.value??null;s.map.value=e,s.on.value=e&&!u?1:0,s.tints.value=k(l)});let c=(0,t.useMemo)(()=>{var e;let t=function(){if(w)return w;if("u"<typeof document)return null;let e=function(){let e,t=(e=24301,()=>{let t=e=e+0x6d2b79f5>>>0;return t=Math.imul(t^t>>>15,1|t),(((t^=t+Math.imul(t^t>>>7,61|t))^t>>>14)>>>0)/0x100000000}),A=new Float32Array(4096),a=new Float32Array(4096),i=new Float32Array(4096),o=[],r=[],n=[],l=[];for(let e=0;e<1032;){o.push(e),r.push(.08+t()*t()*.32),n.push((t()-.5)*.04);let A=t(),a=t();l.push(A<.1?[-.012*a,-.006*a,.014*a]:A<.15?[.01*a,.004*a,-.01*a]:[0,0,0]),e+=2.4+2.4*t()+2.5*(.05>t())}let s=0;for(let e=0;e<4096;e++){let t=e/4;for(;s+1<o.length&&o[s+1]<=t;)s++;let g=o[s],u=o[s+1]??g+3.5,c=t-g,f=u-t,d=c<f?r[s]*Math.exp(-(c*c)/(1.3*.65)):(r[s+1]??.05)*Math.exp(-(f*f)/(1.3*.65)),h=.026*Math.sin(Math.PI*Math.min(1,Math.max(0,c/(u-g)))),I=(y(t/37,3.1)-.5)*.05+(y(t/160,9.7)-.5)*.04,p=.93+n[s]+I+h-d;A[e]=p+l[s][0],a[e]=p+l[s][1],i[e]=p+l[s][2]}let g=new Uint8ClampedArray(1048576);for(let e=0;e<256;e++)for(let t=0;t<1024;t++){let o=(y(t/28,e/48)-.5)*2+(y(t/90+7.3,e/110+2.1)-.5)*1.6,r=Math.min(4094.999,Math.max(0,(t+o)*4)),n=Math.floor(r),l=r-n,s=(y(.9*t,e/7)-.5)*.03+(Q(t+9173,e)-.5)*.022,u=(1024*e+t)*4;g[u]=(A[n]+(A[n+1]-A[n])*l+s)*255,g[u+1]=(a[n]+(a[n+1]-a[n])*l+s)*255,g[u+2]=(i[n]+(i[n+1]-i[n])*l+s)*255,g[u+3]=255}return g}(),t=document.createElement("canvas");t.width=1024,t.height=256,t.getContext("2d")?.putImageData(new ImageData(e,1024,256),0,0);let A=new Uint8ClampedArray(e.length);for(let t=0;t<256;t++)for(let a=0;a<1024;a++){let i=(1024*t+a)*4,o=(256*a+t)*4;A[o]=e[i],A[o+1]=e[i+1],A[o+2]=e[i+2],A[o+3]=255}let a=document.createElement("canvas");return a.width=256,a.height=1024,a.getContext("2d")?.putImageData(new ImageData(A,256,1024),0,0),w={x:new n.Nk(t),y:new n.Nk(a)}}(),A={value:1},a=(e=o?A:null,t=>{t.uniforms.uEdgeArtMap=s.map,t.uniforms.uEdgeArtOn=s.on,t.uniforms.uLeafTints=s.tints;let A="attribute vec4 edgeArtUv;\nvarying vec4 vEdgeArtUv;",a="  vEdgeArtUv = edgeArtUv;",i=M,o=D;e&&(t.uniforms.uEdgeCoverOcc=e,A+="\nattribute vec4 edgeAo;\nvarying vec4 vEdgeAo;",a+="\n  vEdgeAo = edgeAo;",i+=x,o+=S,t.fragmentShader=t.fragmentShader.replace("#include <lights_pars_begin>",`#include <lights_pars_begin>
${g.f}`)),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
${A}`).replace("#include <begin_vertex>",`#include <begin_vertex>
${a}`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${i}`).replace("#include <map_fragment>",`#include <map_fragment>
${o}`)}),i=e=>{let t=new n.aV({roughness:.85,metalness:0,side:n.Vs});if(e){let A=e.clone();A.wrapS=n.Jr,A.wrapT=n.Jr,A.colorSpace=n.nj,A.anisotropy=8,A.needsUpdate=!0,t.map=A}return t.onBeforeCompile=a,t.customProgramCacheKey=o?L:U,t};return{edgeX:i(t?.x),edgeY:i(t?.y),coverOcc:A}},[o,s]),f=.125+.875*(e<0?0:e>1?1:e),d=c.edgeX.map;d&&(d.repeat.set(a?-f:f,1),d.offset.set(a?f:0,0));let h=c.edgeY.map;h&&(h.repeat.set(1,a?-f:f),h.offset.set(0,a?f:0));let I=v(i);return(0,t.useLayoutEffect)(()=>{c.edgeX.color.setHex(0xd9d5cd).multiply(N.setHex(I)),c.edgeY.color.copy(c.edgeX.color)},[c,I]),c},"n",0,function(e){let A=(0,a.f)(e=>e.gl),i=(0,o.f)("/assets/three/book/shared/blank.png"),r=v(e),l=(0,t.useMemo)(()=>(function(e,t){let A=_.get(t);if(A)return A;if(!P){let t=e.clone();t.wrapS=n.FP,t.wrapT=n.FP,t.colorSpace=n.nj,t.repeat.set(25,15),t.needsUpdate=!0,P=t}let a=new n.aV({map:P,color:t,roughness:.9,metalness:0,side:n.Vs});return _.set(t,a),a})(i,r),[i,r]);return(0,t.useEffect)(()=>{let e=l.map;e&&A.initTexture(e)},[A,l]),l},"J",0,function(e=n.de,o=1,g,f){let{gl:Q}=(0,a.f)(),y=(0,t.useCallback)(e=>{e.setTranscoderPath("/basis/"),(0,r.w)(Q)},[Q]),w=(0,i.f)(r.R,(0,h.K)("shared_bump_paper"),y),S=(0,t.useMemo)(()=>(function(e){if(E)return E;let t=e.clone();return t.wrapS=n.FP,t.wrapT=n.FP,t.colorSpace=n.Ik,t.needsUpdate=!0,E=t,t})(w),[w]),x=(0,t.useMemo)(()=>{let e=new n.U7(new Uint8Array([255,255,255,255]),1,1,n.W1);return e.needsUpdate=!0,e},[]),D=(0,t.useMemo)(()=>{var t,A;let a=C.lookInsidePhysicsShaderTuningLiveRef.current,i=new n.Es(a.specularR,a.specularG,a.specularB),o=new n.Zg({vertexShader:m,fragmentShader:s.f,uniforms:(t=a.shininess,A=a.reflectiveness,{uUvFlipX:{value:0},uChainData:{value:null},uPageWidth:{value:1},uPageHeight:{value:1},uStretchDebug:d.x,uNormalSign:{value:1},uPageMap:{value:x},uPageMapBack:{value:x},uPageMapRepeat:{value:new n.wq(1,1)},uFoilMap:{value:null},uFoilAmount:{value:0},uBuckramMap:{value:x},uMarkerMap:{value:(0,u.E)()},uHighlightMap:{value:(0,u.E)()},bumpScaleBase:{value:.0416},uShadowGrain:{value:.15},uTime:{value:0},uPageTurnProgress:{value:0},uCurlAmount:{value:0},uCurlPower:{value:.77},uCurlAngle:{value:0},uCurlPivotU:{value:.25},uCurlPivotV:{value:.5},uCurlSpan:{value:40},uCurlStretch:{value:0},uCurlLiftSign:{value:1},specular:{value:i.clone()},shininess:{value:t},reflectiveness:{value:A},uOpacity:{value:1},uBounceScale:{value:.23},uBounceIntensity:{value:.34},uBounceVariation:{value:.85},uBounceColor:{value:new n.Es(100/255,96/255,99/255)},uPhysicsShadowPcfRadiusMul:{value:1},uPhysicsShadowPasses:{value:1},uPhysicsShadowColorDark:{value:new n.Es(0,0,0)},uPhysicsShadowColorMid:{value:new n.Es(.5,.5,.5)},uPhysicsShadowColorLight:{value:new n.Es(1,1,1)},uHologramIntensity:{value:0},uHologramTime:{value:0},uHologramMouse:{value:new n.wq(0,0)},uHologramScanlineFreq:{value:817},uHologramScanlineSpeed:{value:10},uHologramScanlineStrength:{value:.055},uHologramChromaticStrength:{value:.0147},uHologramLightBoost:{value:0},uHologramWaveAmpMul:{value:1},uHologramChromaticTimeMul:{value:0},uHologramTint:{value:new n.cE(.004,.015,.087)},uRadioIntensity:{value:0},uRadioTime:{value:0},uRadioRingFreq:{value:44},uRadioRingSpeed:{value:1.6},uRadioRingStrength:{value:.16},uRadioDisplaceAmp:{value:.12},uRadioNormalAmp:{value:.6},uRadioNoiseAmp:{value:.16},uRadioNoiseScale:{value:42},uRadioNoiseSpeed:{value:7},uRadioCenter:{value:new n.wq(.78,.72)},uRadioTint:{value:new n.cE(.02,.06,.09)},...l.O.lights}),side:e,lights:!0,defines:{USE_UV:""},extensions:{derivatives:!0},polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:4});return o.onBeforeCompile=c.d,o},[x,e]);D.uniforms.uNormalSign.value=o,(0,t.useEffect)(()=>{D.uniforms.uBuckramMap.value=S,D.uniforms.uPageMap.value=x,D.uniforms.uPageMapBack.value=x},[D,S,x]),(0,t.useEffect)(()=>{if(!g||(0,I.k)()&&"/assets/three/book/shared/blank.png"!==g){D.uniforms.uPageMap.value=x,D.uniforms.uPageMapBack.value=x,D.uniforms.uPageMapRepeat.value.set(1,1);return}let e="/assets/three/book/shared/blank.png"===g;D.uniforms.uPageMapRepeat.value.set(e?25:1,e?15:1);let t=!1,A=(0,p.p)(g);return B(g,A=>{t||(e&&(A.wrapS=n.FP,A.wrapT=n.FP,A.needsUpdate=!0),D.uniforms.uPageMap.value=A,D.uniforms.uPageMapBack.value=A)}),()=>{t=!0,A()}},[D,x,g]);let M=v(f);return(0,t.useEffect)(()=>{let e=x.image.data;e[0]=M>>16&255,e[1]=M>>8&255,e[2]=255&M,x.needsUpdate=!0},[x,M]),(0,A.f)(e=>{let t=C.lookInsidePhysicsShaderTuningLiveRef.current,A=D.uniforms;A.uTime.value=e.clock.elapsedTime,A.shininess.value=t.shininess,A.reflectiveness.value=t.reflectiveness,A.bumpScaleBase.value=t.bumpScale,A.uShadowGrain.value=t.shadowGrain;let a=C.pageShadowQualityTuningLiveRef.current;A.uPhysicsShadowPcfRadiusMul.value=a.blurMul,A.uPhysicsShadowPasses.value=a.passes;let i=(0,C.shadowGradientColorsFromTheme)(C.activeBookThemeColorLiveRef.current);A.uPhysicsShadowColorMid.value.setRGB(i.mid[0],i.mid[1],i.mid[2]),A.uPhysicsShadowColorDark.value.setRGB(i.dark[0],i.dark[1],i.dark[2]);let o=a.colorLight;A.uPhysicsShadowColorLight.value.setRGB((o>>16&255)/255,(o>>8&255)/255,(255&o)/255),A.specular.value.setRGB(t.specularR,t.specularG,t.specularB)}),D}])},73726,45610,e=>{var t=e.i(32369);e.s(["y",0,"pressStaticPageStack","M",0,function(e,t,A){e.quaternion.copy(t.quaternion).invert().multiply(A)},"P",0,function(e){return e?.userData?.pressEdgeArtMap},"Q",0,function(e){let A=e.userData?.pressLookInsideHostRestQuat;return A instanceof t.as?A:null},"N",0,function(e){return e?.userData?.pressTintedLeaves}],73726);let A=new t.cE,a=new t.cE,i=new t.cE,o=new t.cE,r=new t.as,n="detailBoundarySkip";function l(e,t,A){e.updateWorldMatrix(!0,!0);let a=1/0,i=-1/0,r=e=>{if(!e.visible||e.userData[n])return;let l=e.isMesh?e.geometry:void 0;if(l){l.boundingBox||l.computeBoundingBox();let r=l.boundingBox;if(r&&!r.isEmpty())for(let n=0;n<8;n+=1){if(o.set(1&n?r.max.x:r.min.x,2&n?r.max.y:r.min.y,4&n?r.max.z:r.min.z),o.applyMatrix4(e.matrixWorld).project(t),!Number.isFinite(o.y)||Math.abs(o.y)>100)continue;let l=(-(.5*o.y)+.5)*A.height+A.top;l<a&&(a=l),l>i&&(i=l)}}for(let t of e.children)r(t)};return r(e),Number.isFinite(a)?{top:a,bottom:i}:null}let s=new t.cE,g=new t.cE;e.s(["N",0,n,"q",0,function(e,t,o,n,s,g){let u=o.getBoundingClientRect();if(!Number.isFinite(n)||u.height<=0||n<=u.top)return s?.offset.set(0,0,0),!1;if(n+24>=u.bottom)return e.visible=!1,!0;if(s?.hold)return e.position.add(s.offset),!0;i.copy(e.position);let c=g?.node&&Math.abs(g.node.quaternion.dot(g.quaternion))<1-1e-9?g.node:null;c&&(r.copy(c.quaternion),c.quaternion.copy(g.quaternion));for(let i=0;i<2;i+=1){let i=l(e,t,u)?.top??null;if(null==i||i>=n+24)break;let o=n+24-i;e.getWorldPosition(A),A.project(t),a.copy(A),a.y-=2*o/u.height,A.unproject(t),a.unproject(t),e.parent?.worldToLocal(A),e.parent?.worldToLocal(a),e.position.add(a.sub(A))}return c&&(c.quaternion.copy(r),e.updateWorldMatrix(!1,!0)),s?.offset.copy(e.position).sub(i),!0},"B",0,l,"_",0,function(e,t){let A=-1/0,a=e=>{if(!e.visible||e.userData[n])return;let t=e.isMesh?e.geometry:void 0;if(t){t.boundingBox||t.computeBoundingBox();let a=t.boundingBox;if(a&&!a.isEmpty())for(let t=0;t<8;t+=1)o.set(1&t?a.max.x:a.min.x,2&t?a.max.y:a.min.y,4&t?a.max.z:a.min.z),o.applyMatrix4(e.matrixWorld),o.y>A&&(A=o.y)}for(let t of e.children)a(t)};if(a(e),!Number.isFinite(A))return null;t.matrixWorld.decompose(s,r,g);let i=Math.abs(g.y);return i>1e-6?(A-s.y)/i:null}],45610)},23736,e=>{var t=e.i(14013),A=e.i(28137);function a(e,t,A){return`
vec4 ${e}(float uu) {
  float cp = clamp(uu, 0.0, 1.0) * (NODE_COUNT_F - 1.0);
  float i0 = min(floor(cp), NODE_COUNT_F - 2.0);
  float i1 = i0 + 1.0;
  float f = cp - i0;
  vec2 q0 = ${t}(i0);
  vec2 q1 = ${t}(i1);
  vec2 m0 = ${A}(i0) * (uPageWidth / (NODE_COUNT_F - 1.0));
  vec2 m1 = ${A}(i1) * (uPageWidth / (NODE_COUNT_F - 1.0));
  float f2 = f * f;
  float f3 = f2 * f;
  vec2 pos = (2.0*f3 - 3.0*f2 + 1.0)*q0 + (f3 - 2.0*f2 + f)*m0 + (-2.0*f3 + 3.0*f2)*q1 + (f3 - f2)*m1;
  vec2 tng = (6.0*f2 - 6.0*f)*q0 + (3.0*f2 - 4.0*f + 1.0)*m0 + (-6.0*f2 + 6.0*f)*q1 + (3.0*f2 - 2.0*f)*m1;
  float tl = length(tng);
  return vec4(pos, tl > 0.0001 ? tng / tl : vec2(1.0, 0.0));
}
`}function i(e){return`
    float landX = Xspine + dAlong * ca;
    float landU = clamp(landX / uPageWidth, 0.0, 1.0);
    vec4 land = ${e}(landU);
    vec3 TL = normalize(vec3(land.z, 0.0, land.w));
    vec3 NoutL = normalize(cross(TL, B)) * uCurlLiftSign;
    vec3 dirL = ca * TL + sa * B;
    worldPos = vec3(land.x, Yc + dAlong * sa, land.y) + TL * (landX - landU * uPageWidth) + dOut * NoutL;
`}let o=`
uniform sampler2D uChainData; // 33x2 texture: row 0 = positions, row 1 = tangents
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uNormalSign;
uniform float uUvFlipX;
// Analytic drag-curl roll (ported from /page-curl), applied on top of the physics base.
uniform float uCurlAmount;   // total roll (radians) at a full drag; 0 = flat (identity, base untouched)
uniform float uCurlPower;    // fore-edge falloff exponent: angle(s) = uCurlAmount * s^uCurlPower
uniform float uCurlAngle;    // fold-direction rotation (rad) about the pivot — the drag-angle tilt
uniform float uCurlPivotU;   // pivot across width (0 = spine, 1 = fore-edge); roll develops from here outward
uniform float uCurlPivotV;   // pivot across height (0 = bottom, 1 = top)
uniform float uCurlSpan;     // length over which the roll fully develops from the pivot
uniform float uCurlStretch;  // extra arc length toward the fore-edge (0 = length-preserving)
uniform float uCurlLiftSign; // +1 right of the apex, −1 once turned past it — keeps the lift pointing up/out
${A.b}


varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
${t.r}

#include <common>
#include <shadowmap_pars_vertex>
${A.S}

#define NODE_COUNT 33
#define NODE_COUNT_F 33.0

vec2 getChainPosition(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.25)).xy;
}

vec2 getChainTangent(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.75)).xy;
}
${a("pageChainAt","getChainPosition","getChainTangent")}

void main() {
  vUv = vec2(mix(uv.x, 1.0 - uv.x, uUvFlipX), 1.0 - uv.y);

  float halfW = uPageWidth * 0.5;
  float halfH = uPageHeight * 0.5;

  float u = (position.x + halfW) / uPageWidth;
  float v = (position.y + halfH) / uPageHeight;

  // Sample the physics base (turn + gravity + bend + tip-fold). The drag curl is added analytically below.
  // Cubic Hermite interpolation along chain
  float chainParam = u * (NODE_COUNT_F - 1.0);
  float idx = floor(chainParam);
  float nextIdx = min(idx + 1.0, NODE_COUNT_F - 1.0);
  float t = chainParam - idx;

  vec2 p0 = getChainPosition(idx);
  vec2 p1 = getChainPosition(nextIdx);
  vec2 t0 = getChainTangent(idx) * (uPageWidth / (NODE_COUNT_F - 1.0));
  vec2 t1 = getChainTangent(nextIdx) * (uPageWidth / (NODE_COUNT_F - 1.0));

  // Hermite basis functions
  float t2 = t * t;
  float t3 = t2 * t;
  float h00 = 2.0*t3 - 3.0*t2 + 1.0;
  float h10 = t3 - 2.0*t2 + t;
  float h01 = -2.0*t3 + 3.0*t2;
  float h11 = t3 - t2;

  vec2 pos2D = h00*p0 + h10*t0 + h01*p1 + h11*t1;

  // Tangent from Hermite derivative
  float dh00 = 6.0*t2 - 6.0*t;
  float dh10 = 3.0*t2 - 4.0*t + 1.0;
  float dh01 = -6.0*t2 + 6.0*t;
  float dh11 = 3.0*t2 - 2.0*t;

  vec2 tangent2D = dh00*p0 + dh10*t0 + dh01*p1 + dh11*t1;
  float tLen = length(tangent2D);
  if (tLen > 0.0001) {
    tangent2D /= tLen;
  } else {
    tangent2D = vec2(1.0, 0.0);
  }

  // Physics base position + local frame. Ngeo is the geometric (unsigned) normal, shared by both faces so the
  // sheet doesn't inflate; T = base tangent along the width, B = height axis.
  vec3 worldPos = vec3(pos2D.x, (v - 0.5) * uPageHeight, pos2D.y);
  vec3 T = normalize(vec3(tangent2D.x, 0.0, tangent2D.y));
  vec3 B = vec3(0.0, 1.0, 0.0);
  vec3 Ngeo = normalize(cross(T, B));
  vec3 N = Ngeo * uNormalSign;

  // Analytic developable roll (mirrors /page-curl), added ON TOP of the base. The roll direction d rotates
  // about the pivot by uCurlAngle; the roll develops from the pivot along d, integrating the same
  // angle(s) = uCurlAmount * s^uCurlPower. Each vertex is placed on the base where its flap lands, lifted only
  // outward along the normal there (never into the stack — see curlLandGlsl), and it is exact identity when
  // uCurlAmount = 0 — the gravity base is untouched.
  {
    float ca = cos(uCurlAngle);
    float sa = sin(uCurlAngle);
    vec2 d = vec2(ca, sa);
    float Xspine = position.x + halfW;                     // 0 spine → uPageWidth fore-edge
    float Yc = position.y;                                 // centered height
    vec2 pivot = vec2(uCurlPivotU * uPageWidth, (uCurlPivotV - 0.5) * uPageHeight);
    float xi = dot(vec2(Xspine, Yc) - pivot, d);           // distance from the pivot line along the curl dir

    float stepLen = uCurlSpan / 64.0;
    float nsteps = xi / stepLen;
    float an = abs(nsteps);
    float sgn = nsteps < 0.0 ? -1.0 : 1.0;
    vec2 roll = vec2(0.0);                                  // (along d, out of plane); flat behind pivot → (xi, 0)
    for (int i = 0; i < 128; i++) {
      float fi = float(i);
      if (fi >= an) break;
      float w = clamp(an - fi, 0.0, 1.0);
      float tt = (fi + 0.5) * stepLen * sgn;
      float s = tt / uCurlSpan;
      // Capped at π: past half a turn the roll would start coming back DOWN, and since the angle keeps rising more
      // slowly than it began (power < 1), the descent outruns the climb — the flap lands back on the page and is
      // clamped flat into it, under the page beneath. At π the flap runs straight back, parallel and above the page.
      float a = min(uCurlAmount * pow(clamp(s, 0.0, 1.0), uCurlPower), 3.14159265);
      float sl = stepLen * (1.0 + uCurlStretch * clamp(s, 0.0, 1.0));
      roll += vec2(cos(a), sin(a)) * sl * sgn * w;
    }

    // Ngeo flips when the page turns past the apex; uCurlLiftSign (inside curlLandGlsl) keeps "out" pointing up off the
    // stack so a left-side page still curls UP, not down.
    float dAlong = roll.x - xi;                            // ≤ 0: rolls toward the pivot (in-plane, curl "in")
    float dOut = max(roll.y, 0.0);                         // OUTWARD only — never push a vertex into the stack
${i("pageChainAt")}
    // Shading normal: tilt the base normal by the local roll angle about the fold. Identity at uCurlAmount = 0.
    float av = min(uCurlAmount * pow(clamp(xi / uCurlSpan, 0.0, 1.0), uCurlPower), 3.14159265);
    N = normalize(cos(av) * NoutL - sin(av) * dirL) * (uNormalSign * uCurlLiftSign);
  }

  worldPos.z += position.z;
  vStretchPos = worldPos;

  vNormal = normalize(normalMatrix * N);
${A.p}
  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vViewPosition = -mvPosition.xyz;

  // Unit view-space normal so directional shadow normal-bias + shadowmap_vertex stay stable on bent pages.
  vec3 transformedNormal = normalize(normalMatrix * N);
  vec4 worldPosition = modelMatrix * vec4(worldPos, 1.0);
  #include <shadowmap_vertex>
}
`;e.s(["c",0,33,"g",0,function(e,t,A){let o=`
uniform sampler2D uChainData;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uCurlAmount;
uniform float uCurlPower;
uniform float uCurlAngle;
uniform float uCurlPivotU;
uniform float uCurlPivotV;
uniform float uCurlSpan;
uniform float uCurlStretch;
uniform float uCurlLiftSign;

#define NODE_COUNT 33
#define NODE_COUNT_F 33.0

vec2 physicsPageDepth_getChainPosition(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.25)).xy;
}

vec2 physicsPageDepth_getChainTangent(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.75)).xy;
}
${a("physicsPageDepth_chainAt","physicsPageDepth_getChainPosition","physicsPageDepth_getChainTangent")}
`,r=`
	// Physics page chain + analytic curl (must match pageVertexShader)
	float halfW = uPageWidth * 0.5;
	float halfH = uPageHeight * 0.5;
	float pu = (position.x + halfW) / uPageWidth;
	float pv = (position.y + halfH) / uPageHeight;
	float chainParam = pu * (NODE_COUNT_F - 1.0);
	float idx = floor(chainParam);
	float nextIdx = min(idx + 1.0, NODE_COUNT_F - 1.0);
	float t = chainParam - idx;
	vec2 p0 = physicsPageDepth_getChainPosition(idx);
	vec2 p1 = physicsPageDepth_getChainPosition(nextIdx);
	vec2 t0 = physicsPageDepth_getChainTangent(idx) * (uPageWidth / (NODE_COUNT_F - 1.0));
	vec2 t1 = physicsPageDepth_getChainTangent(nextIdx) * (uPageWidth / (NODE_COUNT_F - 1.0));
	float t2 = t * t;
	float t3 = t2 * t;
	float h00 = 2.0*t3 - 3.0*t2 + 1.0;
	float h10 = t3 - 2.0*t2 + t;
	float h01 = -2.0*t3 + 3.0*t2;
	float h11 = t3 - t2;
	vec2 pos2D = h00*p0 + h10*t0 + h01*p1 + h11*t1;
	// Tangent for curl direction
	float dh00 = 6.0*t2 - 6.0*t;
	float dh10 = 3.0*t2 - 4.0*t + 1.0;
	float dh01 = -6.0*t2 + 6.0*t;
	float dh11 = 3.0*t2 - 2.0*t;
	vec2 tangent2D = dh00*p0 + dh10*t0 + dh01*p1 + dh11*t1;
	float tLen = length(tangent2D);
	tangent2D = tLen > 0.0001 ? tangent2D / tLen : vec2(1.0, 0.0);
	vec3 worldPos = vec3(pos2D.x, (pv - 0.5) * uPageHeight, pos2D.y);
	vec3 T = normalize(vec3(tangent2D.x, 0.0, tangent2D.y));
	vec3 B = vec3(0.0, 1.0, 0.0);
	vec3 Ngeo = normalize(cross(T, B));
	// Analytic curl deformation (same loop as the lit vertex shader)
	{
		float ca = cos(uCurlAngle);
		float sa = sin(uCurlAngle);
		vec2 d = vec2(ca, sa);
		float Xspine = position.x + halfW;
		float Yc = position.y;
		vec2 pivot = vec2(uCurlPivotU * uPageWidth, (uCurlPivotV - 0.5) * uPageHeight);
		float xi = dot(vec2(Xspine, Yc) - pivot, d);
		float stepLen = uCurlSpan / 64.0;
		float nsteps = xi / stepLen;
		float an = abs(nsteps);
		float sgn = nsteps < 0.0 ? -1.0 : 1.0;
		vec2 roll = vec2(0.0);
		for (int i = 0; i < 128; i++) {
			float fi = float(i);
			if (fi >= an) break;
			float w = clamp(an - fi, 0.0, 1.0);
			float tt = (fi + 0.5) * stepLen * sgn;
			float s = tt / uCurlSpan;
			float a = min(uCurlAmount * pow(clamp(s, 0.0, 1.0), uCurlPower), 3.14159265); // capped at π — see the lit shader
			float sl = stepLen * (1.0 + uCurlStretch * clamp(s, 0.0, 1.0));
			roll += vec2(cos(a), sin(a)) * sl * sgn * w;
		}
		float dAlong = roll.x - xi;
		float dOut = max(roll.y, 0.0);
${i("physicsPageDepth_chainAt")}	}
	worldPos.z += position.z;
	vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
	gl_Position = projectionMatrix * mvPosition;
`;return a=>{Object.assign(a.uniforms,{uChainData:{value:e},uPageWidth:{value:t},uPageHeight:{value:A},uCurlAmount:{value:0},uCurlPower:{value:.77},uCurlAngle:{value:0},uCurlPivotU:{value:.25},uCurlPivotV:{value:.5},uCurlSpan:{value:40},uCurlStretch:{value:0},uCurlLiftSign:{value:1}}),a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
${o}`),a.vertexShader=a.vertexShader.replace(/#include <begin_vertex>\s*#include <morphtarget_vertex>\s*#include <skinning_vertex>\s*#include <displacementmap_vertex>\s*#include <project_vertex>/,r)}},"N",0,function(e,t,A){let o=`
uniform sampler2D uChainData;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uCurlAmount;
uniform float uCurlPower;
uniform float uCurlAngle;
uniform float uCurlPivotU;
uniform float uCurlPivotV;
uniform float uCurlSpan;
uniform float uCurlStretch;
uniform float uCurlLiftSign;

#define NODE_COUNT 33
#define NODE_COUNT_F 33.0

vec2 physicsPageDist_getChainPosition(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.25)).xy;
}

vec2 physicsPageDist_getChainTangent(float nodeIdx) {
  return texture2D(uChainData, vec2((nodeIdx + 0.5) / NODE_COUNT_F, 0.75)).xy;
}
${a("physicsPageDist_chainAt","physicsPageDist_getChainPosition","physicsPageDist_getChainTangent")}
`,r=`
	#include <begin_vertex>
	{
		float halfW = uPageWidth * 0.5;
		float halfH = uPageHeight * 0.5;
		float pu = (position.x + halfW) / uPageWidth;
		float pv = (position.y + halfH) / uPageHeight;
		float chainParam = pu * (NODE_COUNT_F - 1.0);
		float idx = floor(chainParam);
		float nextIdx = min(idx + 1.0, NODE_COUNT_F - 1.0);
		float tt = chainParam - idx;
		vec2 p0 = physicsPageDist_getChainPosition(idx);
		vec2 p1 = physicsPageDist_getChainPosition(nextIdx);
		vec2 tan0 = physicsPageDist_getChainTangent(idx) * (uPageWidth / (NODE_COUNT_F - 1.0));
		vec2 tan1 = physicsPageDist_getChainTangent(nextIdx) * (uPageWidth / (NODE_COUNT_F - 1.0));
		float t2 = tt * tt;
		float t3 = t2 * tt;
		float h00 = 2.0*t3 - 3.0*t2 + 1.0;
		float h10 = t3 - 2.0*t2 + tt;
		float h01 = -2.0*t3 + 3.0*t2;
		float h11 = t3 - t2;
		vec2 pos2D = h00*p0 + h10*tan0 + h01*p1 + h11*tan1;
		// Tangent for curl
		float dh00 = 6.0*t2 - 6.0*tt;
		float dh10 = 3.0*t2 - 4.0*tt + 1.0;
		float dh01 = -6.0*t2 + 6.0*tt;
		float dh11 = 3.0*t2 - 2.0*tt;
		vec2 tangent2D = dh00*p0 + dh10*tan0 + dh01*p1 + dh11*tan1;
		float tLen = length(tangent2D);
		tangent2D = tLen > 0.0001 ? tangent2D / tLen : vec2(1.0, 0.0);
		vec3 worldPos = vec3(pos2D.x, (pv - 0.5) * uPageHeight, pos2D.y);
		vec3 T = normalize(vec3(tangent2D.x, 0.0, tangent2D.y));
		vec3 B = vec3(0.0, 1.0, 0.0);
		vec3 Ngeo = normalize(cross(T, B));
		// Curl deformation
		{
			float ca = cos(uCurlAngle);
			float sa = sin(uCurlAngle);
			vec2 d = vec2(ca, sa);
			float Xspine = position.x + halfW;
			float Yc = position.y;
			vec2 pivot = vec2(uCurlPivotU * uPageWidth, (uCurlPivotV - 0.5) * uPageHeight);
			float xi = dot(vec2(Xspine, Yc) - pivot, d);
			float stepLen = uCurlSpan / 64.0;
			float nsteps = xi / stepLen;
			float an = abs(nsteps);
			float sgn = nsteps < 0.0 ? -1.0 : 1.0;
			vec2 roll = vec2(0.0);
			for (int i = 0; i < 128; i++) {
				float fi = float(i);
				if (fi >= an) break;
				float w = clamp(an - fi, 0.0, 1.0);
				float ttt = (fi + 0.5) * stepLen * sgn;
				float s = ttt / uCurlSpan;
				float a = min(uCurlAmount * pow(clamp(s, 0.0, 1.0), uCurlPower), 3.14159265); // capped at π — see the lit shader
				float sl = stepLen * (1.0 + uCurlStretch * clamp(s, 0.0, 1.0));
				roll += vec2(cos(a), sin(a)) * sl * sgn * w;
			}
			float dAlong = roll.x - xi;
			float dOut = max(roll.y, 0.0);
${i("physicsPageDist_chainAt")}		}
		worldPos.z += position.z;
		transformed = worldPos;
	}
`;return a=>{Object.assign(a.uniforms,{uChainData:{value:e},uPageWidth:{value:t},uPageHeight:{value:A},uCurlAmount:{value:0},uCurlPower:{value:.77},uCurlAngle:{value:0},uCurlPivotU:{value:.25},uCurlPivotV:{value:.5},uCurlSpan:{value:40},uCurlStretch:{value:0},uCurlLiftSign:{value:1}}),a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
${o}`),a.vertexShader=a.vertexShader.replace("#include <begin_vertex>",r)}},"I",0,o])},28810,e=>{var t=e.i(32369),A=e.i(91788),a=e.i(55946);let i=new Map,o=new t.H5,r=new Set(["/assets/three/book/shared/blank.png"]);function n(e){let t=e?.image;return t?.width&&t?.height?t.width*t.height*4*(e.generateMipmaps?4/3:1):0}let l=!1;function s(){l||(l=!0,setTimeout(()=>{l=!1,function(){let e=(0,a.k)()?0x6000000:0x20000000,t=0;for(let e of i.values())t+=n(e.texture);if(t<=e)return;let A=performance.now();for(let[a,o]of[...i].filter(([e,t])=>0===t.refs&&null!=t.texture&&!r.has(e)&&!e.startsWith("data:")&&A-t.lastUsed>2e3).sort((e,t)=>e[1].lastUsed-t[1].lastUsed)){if(t<=e)break;t-=n(o.texture),o.texture.dispose(),i.delete(a)}}()},0))}function g(e){let A=i.get(e);if(!A){let r={texture:null,refs:0,lastUsed:performance.now(),promise:null};r.promise=new Promise((A,i)=>{o.load(e,e=>{let i;i=(0,a.k)(),e.colorSpace=t.nj,e.minFilter=i?t.VV:t.Q4,e.magFilter=t.VV,e.generateMipmaps=!i,e.anisotropy=i?1:8,e.needsUpdate=!0,r.texture=e,r.lastUsed=performance.now(),s(),A(e)},void 0,t=>{r.error=Error(`Could not load ${e}: ${t?.message??t}`),i(r.error)})}),r.promise.catch(()=>{}),i.set(e,r),A=r}return A.lastUsed=performance.now(),A}function u(e){let t=g(e);t.refs+=1;let A=!1;return()=>{A||(A=!0,t.refs-=1,t.lastUsed=performance.now(),s())}}function c(e){let t=g(e);if(t.texture)return t.texture;if(t.error)throw t.error;throw t.promise}e.s(["g",0,function(e){return i.get(e)?.texture!=null},"o",0,function(e,t){let A=g(e);t&&(A.texture?t(A.texture):A.promise.then(t,()=>{}))},"p",0,u,"x",0,function(e,t){let a=c(e),i=c(t);return(0,A.useEffect)(()=>{let A=u(e),a=u(t);return()=>{A(),a()}},[e,t]),(0,A.useMemo)(()=>({pageFront:a,pageBack:i}),[a,i])}])},19592,e=>{var t=e.i(55946);let A=[{front:"/images/home/p1.jpg",back:"/images/home/p2.jpg"},{front:"/images/home/p3.jpg",back:"/images/home/p4.jpg"},{front:"/images/home/p5.jpg",back:"/images/home/p6.jpg"}],a=[...A,...A,...A,A[0]],i=a.length;function o(e){let A=[];for(let a=0;a<e.length;a+=2)A.push({front:(0,t.A)(e[a]),back:a+1<e.length?(0,t.A)(e[a+1]):"#f8f4ea"});return A}function r(e){return e?Math.max(1,Math.ceil(e/2)):120}e.s(["w",0,6,"T",0,2,"x",0,.0035,"V",0,21.45,"G",0,0,"X",0,a,"O",0,.0234,"c",0,15.6,"U",0,i,"Y",0,function(){return{phase:"idle",side:"right",gatherPx:0,countLocked:!1,turnAngle:0,commit:!1,busy:!1,fixedCount:null,hover:!1,pickEdge:null,regrab:null}},"v",0,function(e,t){let A=Math.ceil(e/2),a=e=>String(e).padStart(3,"0"),i=[];for(let o=1;o<=A;o++){let A=2*o-1,r=2*o;i.push({front:`${t}${a(A)}.jpg`,back:r<=e?`${t}${a(r)}.jpg`:"#f8f4ea"})}return i},"d",0,o,"M",0,{current:{split:0,ms:-1/0}},"l",0,function(e,t,A){let a=Math.max(0,Math.min(Math.max(0,e.length-A),t-2)),i=[];for(let t=a;t<a+A;t++){let A=e[t];A&&(A.front&&!A.front.startsWith("#")&&i.push(A.front),A.back&&!A.back.startsWith("#")&&i.push(A.back))}return i},"D",0,function(e,t){if(!t||0===t.length)return{};let A=o(t),a=Math.floor((r(e)-1)/2);return{front:A[Math.min(A.length-1,a)]?.front,back:A[Math.max(0,a-1)]?.back}},"E",0,r])},99891,e=>{let t,A,a,i;var o=e.i(32369);class r{constructor(e=4){this.pool=e,this.queue=[],this.workers=[],this.workersResolve=[],this.workerStatus=0,this.workerCreator=null}_initWorker(e){if(!this.workers[e]){let t=this.workerCreator();t.addEventListener("message",this._onMessage.bind(this,e)),this.workers[e]=t}}_getIdleWorker(){for(let e=0;e<this.pool;e++)if(!(this.workerStatus&1<<e))return e;return -1}_onMessage(e,t){let A=this.workersResolve[e];if(A&&A(t),this.queue.length){let{resolve:t,msg:A,transfer:a}=this.queue.shift();this.workersResolve[e]=t,this.workers[e].postMessage(A,a)}else this.workerStatus^=1<<e}setWorkerCreator(e){this.workerCreator=e}setWorkerLimit(e){this.pool=e}postMessage(e,t){return new Promise(A=>{let a=this._getIdleWorker();-1!==a?(this._initWorker(a),this.workerStatus|=1<<a,this.workersResolve[a]=A,this.workers[a].postMessage(e,t)):this.queue.push({resolve:A,msg:e,transfer:t})})}dispose(){this.workers.forEach(e=>e.terminate()),this.workersResolve.length=0,this.workers.length=0,this.queue.length=0,this.workerStatus=0}}class n{constructor(e,t,A,a){this._dataView=void 0,this._littleEndian=void 0,this._offset=void 0,this._dataView=new DataView(e.buffer,e.byteOffset+t,A),this._littleEndian=a,this._offset=0}_nextUint8(){let e=this._dataView.getUint8(this._offset);return this._offset+=1,e}_nextUint16(){let e=this._dataView.getUint16(this._offset,this._littleEndian);return this._offset+=2,e}_nextUint32(){let e=this._dataView.getUint32(this._offset,this._littleEndian);return this._offset+=4,e}_nextUint64(){let e=this._dataView.getUint32(this._offset,this._littleEndian)+0x100000000*this._dataView.getUint32(this._offset+4,this._littleEndian);return this._offset+=8,e}_nextInt32(){let e=this._dataView.getInt32(this._offset,this._littleEndian);return this._offset+=4,e}_nextUint8Array(e){let t=new Uint8Array(this._dataView.buffer,this._dataView.byteOffset+this._offset,e);return this._offset+=e,t}_skip(e){return this._offset+=e,this}_scan(e,t=0){let A=this._offset,a=0;for(;this._dataView.getUint8(this._offset)!==t&&a<e;)a++,this._offset++;return a<e&&this._offset++,new Uint8Array(this._dataView.buffer,this._dataView.byteOffset+A,a)}}new Uint8Array([0]);let l=[171,75,84,88,32,50,48,187,13,10,26,10];function s(e){return(new TextDecoder).decode(e)}var g=e.i(21168);let u={env:{emscripten_notify_memory_growth:function(e){a=new Uint8Array(A.exports.memory.buffer)}}};class c{init(){return t||(t="u">typeof fetch?fetch("data:application/wasm;base64,"+f).then(e=>e.arrayBuffer()).then(e=>WebAssembly.instantiate(e,u)).then(this._init):WebAssembly.instantiate(g.Buffer.from(f,"base64"),u).then(this._init))}_init(e){A=e.instance,u.env.emscripten_notify_memory_growth(0)}decode(e,t=0){if(!A)throw Error("ZSTDDecoder: Await .init() before decoding.");let i=e.byteLength,o=A.exports.malloc(i);a.set(e,o),t=t||Number(A.exports.ZSTD_findDecompressedSize(o,i));let r=A.exports.malloc(t),n=A.exports.ZSTD_decompress(r,t,o,i),l=a.slice(r,r+n);return A.exports.free(o),A.exports.free(r),l}}let f="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IAMNACAEQQNxBEADQCACRQ0FIAAgAkF/aiICaiIDIAEgAmotAAA6AAAgA0EDcQ0ACwsgAkEDTQ0AA0AgACACQXxqIgJqIAEgAmooAgA2AgAgAkEDSw0ACwsgAkUNAgNAIAAgAkF/aiICaiABIAJqLQAAOgAAIAINAAsMAgsgAkEDTQ0AIAIhBANAIAMgASgCADYCACABQQRqIQEgA0EEaiEDIARBfGoiBEEDSw0ACyACQQNxIQILIAJFDQADQCADIAEtAAA6AAAgA0EBaiEDIAFBAWohASACQX9qIgINAAsLIAAL8wICAn8BfgJAIAJFDQAgACACaiIDQX9qIAE6AAAgACABOgAAIAJBA0kNACADQX5qIAE6AAAgACABOgABIANBfWogAToAACAAIAE6AAIgAkEHSQ0AIANBfGogAToAACAAIAE6AAMgAkEJSQ0AIABBACAAa0EDcSIEaiIDIAFB/wFxQYGChAhsIgE2AgAgAyACIARrQXxxIgRqIgJBfGogATYCACAEQQlJDQAgAyABNgIIIAMgATYCBCACQXhqIAE2AgAgAkF0aiABNgIAIARBGUkNACADIAE2AhggAyABNgIUIAMgATYCECADIAE2AgwgAkFwaiABNgIAIAJBbGogATYCACACQWhqIAE2AgAgAkFkaiABNgIAIAQgA0EEcUEYciIEayICQSBJDQAgAa0iBUIghiAFhCEFIAMgBGohAQNAIAEgBTcDGCABIAU3AxAgASAFNwMIIAEgBTcDACABQSBqIQEgAkFgaiICQR9LDQALCyAACy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAIajYCACADCy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAFajYCACADCx8AIAAgASACKAIEEAg2AgAgARAEGiAAIAJBCGo2AgQLCAAgAGdBH3MLugUBDX8jAEEQayIKJAACfyAEQQNNBEAgCkEANgIMIApBDGogAyAEEAsaIAAgASACIApBDGpBBBAVIgBBbCAAEAMbIAAgACAESxsMAQsgAEEAIAEoAgBBAXRBAmoQECENQVQgAygAACIGQQ9xIgBBCksNABogAiAAQQVqNgIAIAMgBGoiAkF8aiEMIAJBeWohDiACQXtqIRAgAEEGaiELQQQh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ASIDNgLE4AEgACgCvOABIQQgACABNgK84AEgACABIAJqNgK44AEgACABIAQgA2tqNgLA4AELpgEBAX8gACAAKALs4QEQFjYCyOABIABCADcD+OABIABCADcDuOABIABBwOABakIANwMAIABBqNAAaiIBQYyAgOAANgIAIABBADYCmOIBIABCADcDiOEBIABCAzcDgOEBIABBrNABakHgEikCADcCACAAQbTQAWpB6BIoAgA2AgAgACABNgIMIAAgAEGYIGo2AgggACAAQaAwajYCBCAAIABBEGo2AgALYQEBf0G4fyEDAkAgAUEDSQ0AIAIgABAhIgFBA3YiADYCCCACIAFBAXE2AgQgAiABQQF2QQNxIgM2AgACQCADQX9qIgFBAksNAAJAIAFBAWsOAgEAAgtBbA8LIAAhAwsgAwsMACAAIAEgAkEAEC4LiAQCA38CfiADEBYhBCAAQQBBKBAQIQAgBCACSwRAIAQPCyABRQRAQX8PCwJAAkAgA0EBRg0AIAEoAAAiBkGo6r5pRg0AQXYhAyAGQXBxQdDUtMIBRw0BQQghAyACQQhJDQEgAEEAQSgQECEAIAEoAAQhASAAQQE2AhQgACABrTcDAEEADwsgASACIAMQLyIDIAJLDQAgACADNgIYQXIhAyABIARqIgVBf2otAAAiAkEIcQ0AIAJBIHEiBkUEQEFwIQMgBS0AACIFQacBSw0BIAVBB3GtQgEgBUEDdkEKaq2GIgdCA4h+IAd8IQggBEEBaiEECyACQQZ2IQMgAkECdiEFAkAgAkEDcUF/aiICQQJLBEBBACECDAELAkACQAJAIAJBAWsOAgECAAsgASAEai0AACECIARBAWohBAwCCyABIARqLwAAIQIgBEECaiEEDAELIAEgBGooAAAhAiAEQQRqIQQLIAVBAXEhBQJ+AkACQAJAIANBf2oiA0ECTQRAIANBAWsOAgIDAQtCfyAGRQ0DGiABIARqMQAADAMLIAEgBGovAACtQoACfAwCCyABIARqKAAArQwBCyABIARqKQAACyEHIAAgBTYCICAAIAI2AhwgACAHNwMAQQAhAyAAQQA2AhQgACAHIAggBhsiBzcDCCAAIAdCgIAIIAdCgIAIVBs+AhALIAMLWwEBf0G4fyEDIAIQFiICIAFNBH8gACACakF/ai0AACIAQQNxQQJ0QaAeaigC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C0Egak8NAQsgByAHKQNoNwMQIAcgBykDYDcDCCAEIA0gB0EIaiAHQdwAaiAPIA4gESAQEB4hCwwBCyACIARqIQggBCAKEAcgAkERTwRAIARBEGohAgNAIAIgCkEQaiIKEAcgAkEQaiICIAhJDQALCyAIIAlrIQIgByATNgJcIAkgCCAOa0sEQCAJIAggEWtLBEBBbCELDAILIBAgAiAOayICaiIKIANqIBBNBEAgCCAKIAMQDxoMAgsgCCAKQQAgAmsQDyEIIAcgAiADaiIDNgJkIAggAmshCCAOIQILIAlBEE8EQCADIAhqIQMDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALDAELAkAgCUEHTQRAIAggAi0AADoAACAIIAItAAE6AAEgCCACLQACOgACIAggAi0AAzoAAyAIQQRqIAIgCUECdCIDQcAeaigCAGoiAhAXIAIgA0HgHmooAgBrIQIgBygCZCEDDAELIAggAhAMCyADQQlJDQAgAyAIaiEDIAhBCGoiCCACQQhqIgJrQQ9MBEADQCAIIAIQDCACQQhqIQIgCEEIaiIIIANJDQAMAgALAAsDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALCyAHQRhqEAQaIAsgDCALEAMiAhshDCAEIAQgC2ogAhshBCAFQX9qIgUNAAsgDBADDQFBbCEMIAdBGGoQBEECSQ0BQQAhCANAIAhBA0cEQCAAIAhBAnQiAmpBrNABaiACIAdqKAJENgIAIAhBAWohCAwBCwsgBygCXCEIC0G6fyEMIA8gCGsiACANIARrSw0AIAQEfyAEIAggABALIABqBUEACyABayEMCyAHQfAAaiQAIAwLkRcCFn8FfiMAQdABayIHJAAgByAAKALw4QEiCDYCvAEgASACaiESIAggACgCgOIBaiETAkACQCAFRQRAIAEhAwwBCyAAKALE4AEhESAAKALA4AEhFSAAKAK84AEhDyAAQQE2AozhAUEAIQgDQCAIQQNHBEAgByAIQQJ0IgJqIAAgAmpBrNABaigCADYCVCAIQQFqIQgMAQsLIAcgETYCZCAHIA82AmAgByABIA9rNgJoQWwhECAHQShqIAMgBBAGEAMNASAFQQQgBUEESBshFyAHQTxqIAdBKGogACgCABATIAdBxABqIAdBKGogACgCCBATIAdBzABqIAdB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IAdB0AFqJAAgEAslACAAQgA3AgAgAEEAOwEIIABBADoACyAAIAE2AgwgACACOgAKC7QFAQN/IwBBMGsiBCQAIABB/wFqIgVBfWohBgJAIAMvAQIEQCAEQRhqIAEgAhAGIgIQAw0BIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahASOgAAIAMgBEEIaiAEQRhqEBI6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0FIAEgBEEQaiAEQRhqEBI6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBSABIARBCGogBEEYahASOgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEjoAACABIAJqIABrIQIMAwsgAyAEQRBqIARBGGoQEjoAAiADIARBCGogBEEYahASOgADIANBBGohAwwAAAsACyAEQRhqIAEgAhAGIgIQAw0AIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahAROgAAIAMgBEEIaiAEQRhqEBE6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0EIAEgBEEQaiAEQRhqEBE6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBCABIARBCGogBEEYahAROgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEToAACABIAJqIABrIQIMAgsgAyAEQRBqIARBGGoQEToAAiADIARBCGogBEEYahAROgADIANBBGohAwwAAAsACyAEQTBqJAAgAgtpAQF/An8CQAJAIAJBB00NACABKAAAQbfIwuF+Rw0AIAAgASgABDYCmOIBQWIgAEEQaiABIAIQPiIDEAMNAhogAEKBgICAEDcDiOEBIAAgASADaiACIANrECoMAQsgACABIAIQKgtBAAsLrQMBBn8jAEGAAWsiAyQAQWIhCAJAIAJBCUkNACAAQZjQAGogAUEIaiIEIAJBeGogAEGY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wOABCwutAgIEfwF+IwBBQGoiBCQAAkACQCACQQhJDQAgASgAAEFwcUHQ1LTCAUcNACABIAIQIiEBIABCADcDCCAAQQA2AgQgACABNgIADAELIARBGGogASACEC0iAxADBEAgACADEBoMAQsgAwRAIABBuH8QGgwBCyACIAQoAjAiA2shAiABIANqIQMDQAJAIAAgAyACIARBCGoQLCIFEAMEfyAFBSACIAVBA2oiBU8NAUG4fwsQGgwCCyAGQQFqIQYgAiAFayECIAMgBWohAyAEKAIMRQ0ACyAEKAI4BEAgAkEDTQRAIABBuH8QGgwCCyADQQRqIQMLIAQoAighAiAEKQMYIQcgAEEANgIEIAAgAyABazYCACAAIAIgBmytIAcgB0J/URs3AwgLIARBQGskAAslAQF/IwBBEGsiAiQAIAIgACABEFEgAigCACEAIAJBEGokACAAC30BBH8jAEGQBGsiBCQAIARB/wE2AggCQCAEQRBqIARBCGogBEEMaiABIAIQFSIGEAMEQCAGIQUMAQtBVCEFIAQoAgwiB0EGSw0AIAMgBEEQaiAEKAIIIAcQQSIFEAMNACAAIAEgBmogAiAGayADEDwhBQsgBEGQBGokACAFC4cBAgJ/An5BABAWIQMCQANAIAEgA08EQAJAIAAoAABBcHFB0NS0wgFGBEAgACABECIiAhADRQ0BQn4PCyAAIAEQVSIEQn1WDQMgBCAFfCIFIARUIQJCfiEEIAINAyAAIAEQUiICEAMNAwsgASACayEBIAAgAmohAAwBCwtCfiAFIAEbIQQLIAQLPwIBfwF+IwBBMGsiAiQAAn5CfiACQQhqIAAgARAtDQAaQgAgAigCHEEBRg0AGiACKQMICyEDIAJBMGokACADC40BAQJ/IwBBMGsiASQAAkAgAEUNACAAKAKI4gENACABIABB/OEBaigCADYCKCABIAApAvThATcDICAAEDAgACgCqOIBIQIgASABKAIoNgIYIAEgASkDIDcDECACIAFBEGoQGyAAQQA2AqjiASABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALKgECfyMAQRBrIgAkACAAQQA2AgggAEIANwMAIAAQWCEBIABBEGokACABC4cBAQN/IwBBEGsiAiQAAkAgACgCAEUgACgCBEVzDQAgAiAAKAIINgIIIAIgACkCADcDAAJ/IAIoAgAiAQRAIAIoAghBqOMJIAERBQAMAQtBqOMJECgLIgFFDQAgASAAKQIANwL04QEgAUH84QFqIAAoAgg2AgAgARBZIAEhAwsgAkEQaiQAIAMLywEBAn8jAEEgayIBJAAgAEGBgIDAADYCtOIBIABBADYCiOIBIABBADYC7OEBIABCADcDkOIBIABBADYCpOMJIABBADYC3OIBIABCADcCzOIBIABBADYCvOIBIABBADYCxOABIABCADcCnOIBIABBpOIBakIANwIAIABBrOIBakEANgIAIAFCADcCECABQgA3AhggASABKQMYNwMIIAEgASkDEDcDACABKAIIQQh2QQFxIQIgAEEANgLg4gEgACACNgKM4gEgAUEgaiQAC3YBA38jAEEwayIBJAAgAARAIAEgAEHE0AFqIgIoAgA2AiggASAAKQK80AE3AyAgACgCACEDIAEgAigCADYCGCABIAApArzQATcDECADIAFBEGoQGyABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALzAEBAX8gACABKAK00AE2ApjiASAAIAEoAgQiAjYCwOABIAAgAjYCvOABIAAgAiABKAIIaiICNgK44AEgACACNgLE4AEgASgCuNABBEAgAEKBgICAEDcDiOEBIAAgAUGk0ABqNgIMIAAgAUGUIGo2AgggACABQZwwajYCBCAAIAFBDGo2AgAgAEGs0AFqIAFBqNABaigCADYCACAAQbDQAWogAUGs0AFqKAIANgIAIABBtNABaiABQbDQAWooAgA2AgAPCyAAQgA3A4jhAQs7ACACRQRAQbp/DwsgBEUEQEFsDwsgAiAEEGAEQCAAIAEgAiADIAQgBRBhDwsgACABIAIgAyAEIAUQZQtGAQF/IwBBEGsiBSQAIAVBCGogBBAOAn8gBS0ACQRAIAAgASACIAMgBBAyDAELIAAgASACIAMgBBA0CyEAIAVBEGokACAACzQAIAAgAyAEIAUQNiIFEAMEQCAFDwsgBSAESQR/IAEgAiADIAVqIAQgBWsgABA1BUG4fwsLRgEBfyMAQRBrIgUkACAFQQhqIAQQDgJ/IAUtAAkEQCAAIAEgAiADIAQQYgwBCyAAIAEgAiADIAQQNQshACAFQRBqJAAgAAtZAQF/QQ8hAiABIABJBEAgAUEE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";o.W7,o.R7,o.R7,o.v0.spaces[o.nj],o.nj;let d=new e.U(e.r(23564)).toString(),h=new e.U(e.r(77884)).toString(),I=new WeakMap,p=0;class C extends o.cD{constructor(e){super(e),this.transcoderPath="",this.transcoderBinary=null,this.transcoderPending=null,this.workerPool=new r,this.workerSourceURL="",this.workerConfig=null,"u">typeof MSC_TRANSCODER&&console.warn('THREE.KTX2Loader: Please update to latest "basis_transcoder". "msc_basis_transcoder" is no longer supported in three.js r125+.')}setTranscoderPath(e){return this.transcoderPath=e,this}setWorkerLimit(e){return this.workerPool.setWorkerLimit(e),this}async detectSupportAsync(e){return console.warn('KTX2Loader: "detectSupportAsync()" has been deprecated. Use "detectSupport()" and "await renderer.init();" when creating the renderer.'),await e.init(),this.detectSupport(e)}detectSupport(e){return!0===e.isWebGPURenderer?this.workerConfig={astcSupported:e.hasFeature("texture-compression-astc"),astcHDRSupported:!1,etc1Supported:e.hasFeature("texture-compression-etc1"),etc2Supported:e.hasFeature("texture-compression-etc2"),dxtSupported:e.hasFeature("texture-compression-s3tc"),bptcSupported:e.hasFeature("texture-compression-bc"),pvrtcSupported:e.hasFeature("texture-compression-pvrtc")}:(this.workerConfig={astcSupported:e.extensions.has("WEBGL_compressed_texture_astc"),astcHDRSupported:e.extensions.has("WEBGL_compressed_texture_astc")&&e.extensions.get("WEBGL_compressed_texture_astc").getSupportedProfiles().includes("hdr"),etc1Supported:e.extensions.has("WEBGL_compressed_texture_etc1"),etc2Supported:e.extensions.has("WEBGL_compressed_texture_etc"),dxtSupported:e.extensions.has("WEBGL_compressed_texture_s3tc"),bptcSupported:e.extensions.has("EXT_texture_compression_bptc"),pvrtcSupported:e.extensions.has("WEBGL_compressed_texture_pvrtc")||e.extensions.has("WEBKIT_WEBGL_compressed_texture_pvrtc")},"u">typeof navigator&&void 0!==navigator.platform&&void 0!==navigator.userAgent&&navigator.platform.indexOf("Linux")>=0&&0>navigator.userAgent.indexOf("Android")&&this.workerConfig.astcSupported&&this.workerConfig.etc2Supported&&this.workerConfig.bptcSupported&&this.workerConfig.dxtSupported&&(this.workerConfig.astcSupported=!1,this.workerConfig.etc1Supported=!1,this.workerConfig.etc2Supported=!1)),this}init(){if(!this.transcoderPending){let e,t,A=new o.qJ(this.manager);A.setWithCredentials(this.withCredentials);let a=new o.qJ(this.manager);a.setWithCredentials(this.withCredentials),a.setResponseType("arraybuffer"),""===this.transcoderPath?(e=A.loadAsync(h),t=a.loadAsync(d)):(A.setPath(this.transcoderPath),e=A.loadAsync("basis_transcoder.js"),a.setPath(this.transcoderPath),t=a.loadAsync("basis_transcoder.wasm")),this.transcoderPending=Promise.all([e,t]).then(([e,t])=>{let A=C.BasisWorker.toString(),a=["/* constants */","let _EngineFormat = "+JSON.stringify(C.EngineFormat),"let _EngineType = "+JSON.stringify(C.EngineType),"let _TranscoderFormat = "+JSON.stringify(C.TranscoderFormat),"let _BasisFormat = "+JSON.stringify(C.BasisFormat),"/* basis_transcoder.js */",e,"/* worker */",A.substring(A.indexOf("{")+1,A.lastIndexOf("}"))].join("\n");this.workerSourceURL=URL.createObjectURL(new Blob([a])),this.transcoderBinary=t,this.workerPool.setWorkerCreator(()=>{let e=new Worker(this.workerSourceURL),t=this.transcoderBinary.slice(0);return e.postMessage({type:"init",config:this.workerConfig,transcoderBinary:t},[t]),e})}),p>0&&console.warn("THREE.KTX2Loader: Multiple active KTX2 loaders may cause performance issues. Use a single KTX2Loader instance, or call .dispose() on old instances."),p++}return this.transcoderPending}load(e,t,A,a){if(null===this.workerConfig)throw Error("THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.");let i=new o.qJ(this.manager);i.setPath(this.path),i.setCrossOrigin(this.crossOrigin),i.setWithCredentials(this.withCredentials),i.setRequestHeader(this.requestHeader),i.setResponseType("arraybuffer"),i.load(e,e=>{this.parse(e,t,a)},A,a)}parse(e,t,A){if(null===this.workerConfig)throw Error("THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.");if(I.has(e))return I.get(e).promise.then(t).catch(A);this._createTexture(e).then(e=>t?t(e):null).catch(A)}_createTextureFrom(e,t){let A,{type:a,error:i,data:{faces:r,width:n,height:l,format:s,type:g,dfdFlags:u}}=e;if("error"===a)return Promise.reject(i);if(6===t.faceCount)A=new o.zn(r,s,g);else{let e=r[0].mipmaps;A=t.layerCount>1?new o.wQ(e,n,l,t.layerCount,s,g):new o.ZR(e,n,l,s,g)}return A.minFilter=1===r[0].mipmaps.length?o.VV:o.Q4,A.magFilter=o.VV,A.generateMipmaps=!1,A.needsUpdate=!0,A.colorSpace=y(t),A.premultiplyAlpha=!!(1&u),A}async _createTexture(e,t={}){let A=function(e){let t=new Uint8Array(e.buffer,e.byteOffset,l.length);if(t[0]!==l[0]||t[1]!==l[1]||t[2]!==l[2]||t[3]!==l[3]||t[4]!==l[4]||t[5]!==l[5]||t[6]!==l[6]||t[7]!==l[7]||t[8]!==l[8]||t[9]!==l[9]||t[10]!==l[10]||t[11]!==l[11])throw Error("Missing KTX 2.0 identifier.");let A={vkFormat:0,typeSize:1,pixelWidth:0,pixelHeight:0,pixelDepth:0,layerCount:0,faceCount:1,levelCount:0,supercompressionScheme:0,levels:[],dataFormatDescriptor:[{vendorId:0,descriptorType:0,versionNumber:2,colorModel:0,colorPrimaries:1,transferFunction:2,flags:0,texelBlockDimension:[0,0,0,0],bytesPlane:[0,0,0,0,0,0,0,0],samples:[]}],keyValue:{},globalData:null},a=17*Uint32Array.BYTES_PER_ELEMENT,i=new n(e,l.length,a,!0);A.vkFormat=i._nextUint32(),A.typeSize=i._nextUint32(),A.pixelWidth=i._nextUint32(),A.pixelHeight=i._nextUint32(),A.pixelDepth=i._nextUint32(),A.layerCount=i._nextUint32(),A.faceCount=i._nextUint32(),A.levelCount=i._nextUint32(),A.supercompressionScheme=i._nextUint32();let o=i._nextUint32(),r=i._nextUint32(),g=i._nextUint32(),u=i._nextUint32(),c=i._nextUint64(),f=i._nextUint64(),d=3*Math.max(A.levelCount,1)*8,h=new n(e,l.length+a,d,!0);for(let t=0,a=Math.max(A.levelCount,1);t<a;t++)A.levels.push({levelData:new Uint8Array(e.buffer,e.byteOffset+h._nextUint64(),h._nextUint64()),uncompressedByteLength:h._nextUint64()});let I=new n(e,o,r,!0);I._skip(4);let p=I._nextUint16(),C=I._nextUint16(),m=I._nextUint16(),B=I._nextUint16(),E={vendorId:p,descriptorType:C,versionNumber:m,colorModel:I._nextUint8(),colorPrimaries:I._nextUint8(),transferFunction:I._nextUint8(),flags:I._nextUint8(),texelBlockDimension:[I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8()],bytesPlane:[I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8()],samples:[]},v=(B/4-6)/4;for(let e=0;e<v;e++){let t={bitOffset:I._nextUint16(),bitLength:I._nextUint8(),channelType:I._nextUint8(),samplePosition:[I._nextUint8(),I._nextUint8(),I._nextUint8(),I._nextUint8()],sampleLower:-1/0,sampleUpper:1/0};64&t.channelType?(t.sampleLower=I._nextInt32(),t.sampleUpper=I._nextInt32()):(t.sampleLower=I._nextUint32(),t.sampleUpper=I._nextUint32()),E.samples[e]=t}A.dataFormatDescriptor.length=0,A.dataFormatDescriptor.push(E);let Q=new n(e,g,u,!0);for(;Q._offset<u;){let e=Q._nextUint32(),t=Q._scan(e),a=s(t);if(A.keyValue[a]=Q._nextUint8Array(e-t.byteLength-1),a.match(/^ktx/i)){let e=s(A.keyValue[a]);A.keyValue[a]=e.substring(0,e.lastIndexOf("\0"))}Q._skip(e%4?4-e%4:0)}if(f<=0)return A;let y=new n(e,c,f,!0),w=y._nextUint16(),S=y._nextUint16(),x=y._nextUint32(),D=y._nextUint32(),M=y._nextUint32(),b=y._nextUint32(),R=[];for(let e=0,t=Math.max(A.levelCount,1);e<t;e++)R.push({imageFlags:y._nextUint32(),rgbSliceByteOffset:y._nextUint32(),rgbSliceByteLength:y._nextUint32(),alphaSliceByteOffset:y._nextUint32(),alphaSliceByteLength:y._nextUint32()});let F=c+y._offset,k=F+x,L=k+D,U=L+M;return A.globalData={endpointCount:w,selectorCount:S,imageDescs:R,endpointsData:new Uint8Array(e.buffer,e.byteOffset+F,x),selectorsData:new Uint8Array(e.buffer,e.byteOffset+k,D),tablesData:new Uint8Array(e.buffer,e.byteOffset+L,M),extendedData:new Uint8Array(e.buffer,e.byteOffset+U,b)},A}(new Uint8Array(e)),a=1000066e3===A.vkFormat&&167===A.dataFormatDescriptor[0].colorModel;if(!(0===A.vkFormat||a&&!this.workerConfig.astcHDRSupported))return Q(A);let i=this.init().then(()=>this.workerPool.postMessage({type:"transcode",buffer:e,taskConfig:t},[e])).then(e=>this._createTextureFrom(e.data,A));return I.set(e,{promise:i}),i}dispose(){this.workerPool.dispose(),this.workerSourceURL&&URL.revokeObjectURL(this.workerSourceURL),p--}}C.BasisFormat={ETC1S:0,UASTC:1,UASTC_HDR:2},C.TranscoderFormat={ETC1:0,ETC2:1,BC1:2,BC3:3,BC4:4,BC5:5,BC7_M6_OPAQUE_ONLY:6,BC7_M5:7,PVRTC1_4_RGB:8,PVRTC1_4_RGBA:9,ASTC_4x4:10,ATC_RGB:11,ATC_RGBA_INTERPOLATED_ALPHA:12,RGBA32:13,RGB565:14,BGR565:15,RGBA4444:16,BC6H:22,RGB_HALF:24,RGBA_HALF:25},C.EngineFormat={RGBAFormat:o.W1,RGBA_ASTC_4x4_Format:o.Ap,RGB_BPTC_UNSIGNED_Format:o.J2,RGBA_BPTC_Format:o.Sh,RGBA_ETC2_EAC_Format:o.zJ,RGBA_PVRTC_4BPPV1_Format:o.kQ,RGBA_S3TC_DXT5_Format:o.U8,RGB_ETC1_Format:o.Lx,RGB_ETC2_Format:o.PE,RGB_PVRTC_4BPPV1_Format:o.BF,RGBA_S3TC_DXT1_Format:o.UP},C.EngineType={UnsignedByteType:o.Zi,HalfFloatType:o.HN,FloatType:o.h5},C.BasisWorker=function(){let e,t,A,a=_EngineFormat,i=_EngineType,o=_TranscoderFormat,r=_BasisFormat;self.addEventListener("message",function(a){let o=a.data;switch(o.type){case"init":var n;e=o.config,n=o.transcoderBinary,t=new Promise(e=>{BASIS(A={wasmBinary:n,onRuntimeInitialized:e})}).then(()=>{A.initializeBasis(),void 0===A.KTX2File&&console.warn("THREE.KTX2Loader: Please update Basis Universal transcoder.")});break;case"transcode":t.then(()=>{try{let{faces:t,buffers:a,width:n,height:g,hasAlpha:u,format:c,type:f,dfdFlags:d}=function(t){let a,o=new A.KTX2File(new Uint8Array(t));function n(){o.close(),o.delete()}if(!o.isValid())throw n(),Error("THREE.KTX2Loader:	Invalid or unsupported .ktx2 file");if(o.isUASTC())a=r.UASTC;else if(o.isETC1S())a=r.ETC1S;else if(o.isHDR())a=r.UASTC_HDR;else throw Error("THREE.KTX2Loader: Unknown Basis encoding");let g=o.getWidth(),u=o.getHeight(),c=o.getLayers()||1,f=o.getLevels(),d=o.getFaces(),h=o.getHasAlpha(),I=o.getDFDFlags(),{transcoderFormat:p,engineFormat:C,engineType:m}=function(t,A,a,i){let o=l[t];for(let r=0;r<o.length;r++){let n=o[r];if(n.if&&!e[n.if]||!n.basisFormat.includes(t)||i&&n.transcoderFormat.length<2||n.needsPowerOfTwo&&!(s(A)&&s(a)))continue;let l=n.transcoderFormat[+!!i];return{transcoderFormat:l,engineFormat:n.engineFormat[+!!i],engineType:n.engineType[0]}}throw Error("THREE.KTX2Loader: Failed to identify transcoding target.")}(a,g,u,h);if(!g||!u||!f)throw n(),Error("THREE.KTX2Loader:	Invalid texture");if(!o.startTranscoding())throw n(),Error("THREE.KTX2Loader: .startTranscoding failed");let B=[],E=[];for(let e=0;e<d;e++){let t=[];for(let A=0;A<f;A++){let a,r,l=[];for(let t=0;t<c;t++){let s=o.getImageLevelInfo(A,t,e);0===e&&0===A&&0===t&&(s.origWidth%4!=0||s.origHeight%4!=0)&&console.warn("THREE.KTX2Loader: ETC1S and UASTC textures should use multiple-of-four dimensions."),f>1?(a=s.origWidth,r=s.origHeight):(a=s.width,r=s.height);let g=new Uint8Array(o.getImageTranscodedSizeInBytes(A,t,0,p)),u=o.transcodeImage(g,A,t,e,p,0,-1,-1);if(m===i.HalfFloatType&&(g=new Uint16Array(g.buffer,g.byteOffset,g.byteLength/Uint16Array.BYTES_PER_ELEMENT)),!u)throw n(),Error("THREE.KTX2Loader: .transcodeImage failed.");l.push(g)}let s=function(e){if(1===e.length)return e[0];let t=0;for(let A=0;A<e.length;A++)t+=e[A].byteLength;let A=new Uint8Array(t),a=0;for(let t=0;t<e.length;t++){let i=e[t];A.set(i,a),a+=i.byteLength}return A}(l);t.push({data:s,width:a,height:r}),E.push(s.buffer)}B.push({mipmaps:t,width:g,height:u,format:C,type:m})}return n(),{faces:B,buffers:E,width:g,height:u,hasAlpha:h,dfdFlags:I,format:C,type:m}}(o.buffer);self.postMessage({type:"transcode",id:o.id,data:{faces:t,width:n,height:g,hasAlpha:u,format:c,type:f,dfdFlags:d}},a)}catch(e){console.error(e),self.postMessage({type:"error",id:o.id,error:e.message})}})}});let n=[{if:"astcSupported",basisFormat:[r.UASTC],transcoderFormat:[o.ASTC_4x4,o.ASTC_4x4],engineFormat:[a.RGBA_ASTC_4x4_Format,a.RGBA_ASTC_4x4_Format],engineType:[i.UnsignedByteType],priorityETC1S:1/0,priorityUASTC:1,needsPowerOfTwo:!1},{if:"bptcSupported",basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.BC7_M5,o.BC7_M5],engineFormat:[a.RGBA_BPTC_Format,a.RGBA_BPTC_Format],engineType:[i.UnsignedByteType],priorityETC1S:3,priorityUASTC:2,needsPowerOfTwo:!1},{if:"dxtSupported",basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.BC1,o.BC3],engineFormat:[a.RGBA_S3TC_DXT1_Format,a.RGBA_S3TC_DXT5_Format],engineType:[i.UnsignedByteType],priorityETC1S:4,priorityUASTC:5,needsPowerOfTwo:!1},{if:"etc2Supported",basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.ETC1,o.ETC2],engineFormat:[a.RGB_ETC2_Format,a.RGBA_ETC2_EAC_Format],engineType:[i.UnsignedByteType],priorityETC1S:1,priorityUASTC:3,needsPowerOfTwo:!1},{if:"etc1Supported",basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.ETC1],engineFormat:[a.RGB_ETC1_Format],engineType:[i.UnsignedByteType],priorityETC1S:2,priorityUASTC:4,needsPowerOfTwo:!1},{if:"pvrtcSupported",basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.PVRTC1_4_RGB,o.PVRTC1_4_RGBA],engineFormat:[a.RGB_PVRTC_4BPPV1_Format,a.RGBA_PVRTC_4BPPV1_Format],engineType:[i.UnsignedByteType],priorityETC1S:5,priorityUASTC:6,needsPowerOfTwo:!0},{if:"bptcSupported",basisFormat:[r.UASTC_HDR],transcoderFormat:[o.BC6H],engineFormat:[a.RGB_BPTC_UNSIGNED_Format],engineType:[i.HalfFloatType],priorityHDR:1,needsPowerOfTwo:!1},{basisFormat:[r.ETC1S,r.UASTC],transcoderFormat:[o.RGBA32,o.RGBA32],engineFormat:[a.RGBAFormat,a.RGBAFormat],engineType:[i.UnsignedByteType,i.UnsignedByteType],priorityETC1S:100,priorityUASTC:100,needsPowerOfTwo:!1},{basisFormat:[r.UASTC_HDR],transcoderFormat:[o.RGBA_HALF],engineFormat:[a.RGBAFormat],engineType:[i.HalfFloatType],priorityHDR:100,needsPowerOfTwo:!1}],l={[r.ETC1S]:n.filter(e=>e.basisFormat.includes(r.ETC1S)).sort((e,t)=>e.priorityETC1S-t.priorityETC1S),[r.UASTC]:n.filter(e=>e.basisFormat.includes(r.UASTC)).sort((e,t)=>e.priorityUASTC-t.priorityUASTC),[r.UASTC_HDR]:n.filter(e=>e.basisFormat.includes(r.UASTC_HDR)).sort((e,t)=>e.priorityHDR-t.priorityHDR)};function s(e){return e<=2||(e&e-1)==0&&0!==e}};let m=new Set([o.W1,o.rs,o.V9,o.Tr]),B=new Set([91]),E={109:o.W1,103:o.V9,100:o.Tr,97:o.W1,83:o.V9,76:o.Tr,91:o.W1,43:o.W1,37:o.W1,22:o.V9,16:o.V9,15:o.Tr,9:o.Tr,123:o.rs,122:o.rs,152:o.zJ,148:o.PE,153:o.va,154:o.QR,155:o.M7,156:o.j6,1000066e3:o.Ap,158:o.Ap,157:o.Ap,0x3b9bcbd4:o.GB,166:o.GB,165:o.GB,134:o.UP,133:o.UP,132:o.Ba,131:o.Ba,138:o.U8,137:o.U8,140:o.N3,139:o.jX,142:o.r2,141:o.an,146:o.Sh,145:o.Sh,0x3b9b9cf5:o.kQ,0x3b9b9cf1:o.kQ,0x3b9b9cf4:o.bM,1000054e3:o.bM},v={109:o.h5,103:o.h5,100:o.h5,97:o.HN,83:o.HN,76:o.HN,91:o.Za,43:o.Zi,37:o.Zi,22:o.Zi,16:o.Zi,15:o.Zi,9:o.Zi,123:o.CV,122:o._L,152:o.Zi,148:o.Zi,153:o.Zi,154:o.Zi,155:o.Zi,156:o.Zi,1000066e3:o.HN,158:o.Zi,157:o.Zi,0x3b9bcbd4:o.HN,166:o.Zi,165:o.Zi,134:o.Zi,133:o.Zi,132:o.Zi,131:o.Zi,138:o.Zi,137:o.Zi,140:o.Zi,139:o.Zi,142:o.Zi,141:o.Zi,146:o.Zi,145:o.Zi,0x3b9b9cf5:o.Zi,0x3b9b9cf1:o.Zi,0x3b9b9cf4:o.Zi,1000054e3:o.Zi};async function Q(e){let t,A,{vkFormat:a}=e;if(void 0===E[a])throw Error("THREE.KTX2Loader: Unsupported vkFormat: "+a);void 0===v[a]&&console.warn('THREE.KTX2Loader: Missing ".type" for vkFormat: '+a),2===e.supercompressionScheme&&(i||(i=new Promise(async e=>{let t=new c;await t.init(),e(t)})),t=await i);let r=[];for(let A=0;A<e.levels.length;A++){let i,n,l=Math.max(1,e.pixelWidth>>A),s=Math.max(1,e.pixelHeight>>A),g=e.pixelDepth?Math.max(1,e.pixelDepth>>A):0,u=e.levels[A];if(0===e.supercompressionScheme)i=u.levelData;else if(2===e.supercompressionScheme)i=t.decode(u.levelData,u.uncompressedByteLength);else throw Error("THREE.KTX2Loader: Unsupported supercompressionScheme.");n=v[a]===o.h5?new Float32Array(i.buffer,i.byteOffset,i.byteLength/Float32Array.BYTES_PER_ELEMENT):v[a]===o.HN||v[a]===o.Za?new Uint16Array(i.buffer,i.byteOffset,i.byteLength/Uint16Array.BYTES_PER_ELEMENT):v[a]===o.CV||v[a]===o._L?new Uint32Array(i.buffer,i.byteOffset,i.byteLength/Uint32Array.BYTES_PER_ELEMENT):i,r.push({data:n,width:l,height:s,depth:g})}let n=0===e.levelCount||r.length>1;if(m.has(E[a]))(A=0===e.pixelDepth?new o.U7(r[0].data,e.pixelWidth,e.pixelHeight):new o.HY(r[0].data,e.pixelWidth,e.pixelHeight,e.pixelDepth)).minFilter=n?o.o8:o.r8,A.magFilter=o.r8,A.generateMipmaps=0===e.levelCount,A.normalized=B.has(a);else{if(e.pixelDepth>0)throw Error("THREE.KTX2Loader: Unsupported pixelDepth.");(A=new o.ZR(r,e.pixelWidth,e.pixelHeight)).minFilter=n?o.Q4:o.VV,A.magFilter=o.VV}return A.mipmaps=r,A.type=v[a],A.format=E[a],A.colorSpace=y(e),A.needsUpdate=!0,Promise.resolve(A)}function y(e){let t=e.dataFormatDescriptor[0];return 1===t.colorPrimaries?2===t.transferFunction?o.nj:o.Rg:10===t.colorPrimaries?2===t.transferFunction?"display-p3":"display-p3-linear":(0===t.colorPrimaries||console.warn(`THREE.KTX2Loader: Unsupported color primaries, "${t.colorPrimaries}"`),o.Ik)}e.i(48585);var w=e.i(65249);let S=null,x=!1,D=[];function M(e){if(!S){var t;let e,A;(S=new C).setTranscoderPath("/basis/"),S.setWorkerLimit(4),e=(t=S).load.bind(t),A=new o.H5,t.load=(t,a,i,o)=>{if(/\.ktx2(\?|$)/i.test(t))return e(t,a,i,o);A.load(t,a,i,o)}}if(e&&(S.detectSupport(e),(0,w.u)(S.workerConfig),!x))for(let e of(x=!0,D.splice(0)))e();return S}e.s(["R",0,class extends C{constructor(){return super(),M()}},"w",0,M,"x",0,function(e){x?e():D.push(e)}],99891)},65675,3055,e=>{let t,A,a;var i=e.i(75907),o=e.i(91788),r=e.i(81912),n=e.i(32369),l=e.i(92381),s=e.i(82936);let g=new n.cE,u=new n.cE,c=new n.cE,f=new n.wq;function d(e,t,A){let a=g.setFromMatrixPosition(e.matrixWorld);a.project(t);let i=A.width/2,o=A.height/2;return[a.x*i+i,-(a.y*o)+o]}let h=e=>1e-10>Math.abs(e)?0:e;function I(e,t,A=""){let a="matrix3d(";for(let A=0;16!==A;A++)a+=h(t[A]*e.elements[A])+(15!==A?",":")");return A+a}let p=(A=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>I(e,A)),C=(a=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>I(e,a(t),"translate(-50%,-50%)")),m=o.forwardRef(({children:e,eps:t=.001,style:A,className:a,prepend:I,center:m,fullscreen:B,portal:E,distanceFactor:v,sprite:Q=!1,transform:y=!1,occlude:w,onOcclude:S,castShadow:x,receiveShadow:D,material:M,geometry:b,zIndexRange:R=[0x1000037,0],calculatePosition:F=d,as:k="div",wrapperClass:L,pointerEvents:U="auto",...N},P)=>{let{gl:_,camera:T,scene:G,size:H,raycaster:O,events:q,viewport:Y}=(0,l.f)(),[J]=o.useState(()=>document.createElement(k)),W=o.useRef(null),K=o.useRef(null),V=o.useRef(0),X=o.useRef([0,0]),z=o.useRef(null),j=o.useRef(null),Z=(null==E?void 0:E.current)||q.connected||_.domElement.parentNode,$=o.useRef(null),ee=o.useRef(!1),et=o.useMemo(()=>{var e;return w&&"blending"!==w||Array.isArray(w)&&w.length&&(e=w[0])&&"object"==typeof e&&"current"in e},[w]);o.useLayoutEffect(()=>{let e=_.domElement;w&&"blending"===w?(e.style.zIndex=`${Math.floor(R[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[w]),o.useLayoutEffect(()=>{if(K.current){let e=W.current=r.createRoot(J);if(G.updateMatrixWorld(),y)J.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=F(K.current,T,H);J.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return Z&&(I?Z.prepend(J):Z.appendChild(J)),()=>{Z&&Z.removeChild(J),e.unmount()}}},[Z,y]),o.useLayoutEffect(()=>{L&&(J.className=L)},[L]);let eA=o.useMemo(()=>y?{position:"absolute",top:0,left:0,width:H.width,height:H.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:m?"translate3d(-50%,-50%,0)":"none",...B&&{top:-H.height/2,left:-H.width/2,width:H.width,height:H.height},...A},[A,m,B,H,y]),ea=o.useMemo(()=>({position:"absolute",pointerEvents:U}),[U]);o.useLayoutEffect(()=>{var t,i;ee.current=!1,y?null==(t=W.current)||t.render(o.createElement("div",{ref:z,style:eA},o.createElement("div",{ref:j,style:ea},o.createElement("div",{ref:P,className:a,style:A,children:e})))):null==(i=W.current)||i.render(o.createElement("div",{ref:P,style:eA,className:a,children:e}))});let ei=o.useRef(!0);(0,s.f)(e=>{if(K.current){T.updateMatrixWorld(),K.current.updateWorldMatrix(!0,!1);let e=y?X.current:F(K.current,T,H);if(y||Math.abs(V.current-T.zoom)>t||Math.abs(X.current[0]-e[0])>t||Math.abs(X.current[1]-e[1])>t){var A;let t,a,i,o,r=(A=K.current,t=g.setFromMatrixPosition(A.matrixWorld),a=u.setFromMatrixPosition(T.matrixWorld),i=t.sub(a),o=T.getWorldDirection(c),i.angleTo(o)>Math.PI/2),l=!1;et&&(Array.isArray(w)?l=w.map(e=>e.current):"blending"!==w&&(l=[G]));let s=ei.current;l?ei.current=function(e,t,A,a){let i=g.setFromMatrixPosition(e.matrixWorld),o=i.clone();o.project(t),f.set(o.x,o.y),A.setFromCamera(f,t);let r=A.intersectObjects(a,!0);if(r.length){let e=r[0].distance;return i.distanceTo(A.ray.origin)<e}return!0}(K.current,T,O,l)&&!r:ei.current=!r,s!==ei.current&&(S?S(!ei.current):J.style.display=ei.current?"block":"none");let d=Math.floor(R[0]/2),I=w?et?[R[0],d]:[d-1,0]:R;if(J.style.zIndex=`${function(e,t,A){if(t instanceof n.zm||t instanceof n.Sc){let a=g.setFromMatrixPosition(e.matrixWorld),i=u.setFromMatrixPosition(t.matrixWorld),o=a.distanceTo(i),r=(A[1]-A[0])/(t.far-t.near),n=A[1]-r*t.far;return Math.round(r*o+n)}}(K.current,T,I)}`,y){let[e,t]=[H.width/2,H.height/2],A=T.projectionMatrix.elements[5]*t,{isOrthographicCamera:a,top:i,left:o,bottom:r,right:n}=T,l=p(T.matrixWorldInverse),s=a?`scale(${A})translate(${h(-(n+o)/2)}px,${h((i+r)/2)}px)`:`translateZ(${A}px)`,g=K.current.matrixWorld;Q&&((g=T.matrixWorldInverse.clone().transpose().copyPosition(g).scale(K.current.scale)).elements[3]=g.elements[7]=g.elements[11]=0,g.elements[15]=1),J.style.width=H.width+"px",J.style.height=H.height+"px",J.style.perspective=a?"":`${A}px`,z.current&&j.current&&(z.current.style.transform=`${s}${l}translate(${e}px,${t}px)`,j.current.style.transform=C(g,1/((v||10)/400)))}else{let t=void 0===v?1:function(e,t){if(t instanceof n.Sc)return t.zoom;if(!(t instanceof n.zm))return 1;{let A=g.setFromMatrixPosition(e.matrixWorld),a=u.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*A.distanceTo(a))}}(K.current,T)*v;J.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}X.current=e,V.current=T.zoom}}if(!et&&$.current&&!ee.current)if(y){if(z.current){let e=z.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=T;if(t||b)N.scale&&(Array.isArray(N.scale)?N.scale instanceof n.cE?$.current.scale.copy(N.scale.clone().divideScalar(1)):$.current.scale.set(1/N.scale[0],1/N.scale[1],1/N.scale[2]):$.current.scale.setScalar(1/N.scale));else{let t=(v||10)/400,A=e.clientWidth*t,a=e.clientHeight*t;$.current.scale.set(A,a,1)}ee.current=!0}}}else{let t=J.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/Y.factor,A=t.clientWidth*e,a=t.clientHeight*e;$.current.scale.set(A,a,1),ee.current=!0}$.current.lookAt(e.camera.position)}});let eo=o.useMemo(()=>({vertexShader:y?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[y]);return o.createElement("group",(0,i.f)({},N,{ref:K}),w&&!et&&o.createElement("mesh",{castShadow:x,receiveShadow:D,ref:$},b||o.createElement("planeGeometry",null),M||o.createElement("shaderMaterial",{side:n.Vs,vertexShader:eo.vertexShader,fragmentShader:eo.fragmentShader})))});e.s(["f",0,m],65675);let B={fast:3,slow:1.5,holdMs:160};function E(e,t,A=B){let{fast:a,slow:i,holdMs:o}=A,r=e,n=t,l=!1,s=null;return{sample(e,t,A){let g=Math.abs(e-r);if(0===g)return l;let u=1e3*g/Math.max(8,Math.min(100,t-n))/Math.max(1,A);return r=e,n=t,u>=a?(l=!0,s=null):l&&(u<=i?s??=t:s=null,null!=s&&t-s>=o&&(l=!1)),l},settle:()=>(s=null,l=!1)}}let v=!1,Q=new Set;function y(e){e!==v&&(v=e,Q.forEach(e=>e()))}e.s(["W",0,E,"N",0,()=>v,"H",0,function(){(0,o.useEffect)(()=>(function(e){if(Q.add(e),1===Q.size){let e=E(window.scrollY,performance.now()),A=0,a=()=>{y(e.sample(window.scrollY,performance.now(),window.innerHeight)),window.clearTimeout(A),A=window.setTimeout(()=>{y(e.settle())},160)};window.addEventListener("scroll",a,{passive:!0}),t=()=>{window.removeEventListener("scroll",a),window.clearTimeout(A),v=!1}}return()=>{Q.delete(e),0===Q.size&&(t?.(),t=void 0)}})(()=>{}),[])}],3055)},31810,e=>{var t=e.i(60522);e.s(["f",()=>t.o])}],77884,e=>{e.q("/_next/static/immutable/media/basis_transcoder.3agrovkbalovf.js")},23564,e=>{e.q("/_next/static/immutable/media/basis_transcoder.3xwlc7m9nv7pu.wasm")}]);

//# debugId=a005fc73-e668-39d9-d5a9-e1b0a7b50155