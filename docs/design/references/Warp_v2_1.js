// Warp revision 10 — smooth overlapping intro and soft click/touch lens warp.
import{jsx as _jsx}from"react/jsx-runtime";import*as React from"react";import{addPropertyControls,ControlType,RenderTarget}from"framer";const vertexShader=`
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;const fragmentShader=`
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_time;
uniform float u_density;
uniform float u_glow;
uniform float u_intensity;
uniform float u_hover;
uniform vec2 u_pointer;
uniform vec3 u_color;
uniform vec3 u_background;
uniform vec3 u_centerColor;
uniform float u_centerBrightness;
uniform float u_intro;
uniform float u_heartbeat;
uniform float u_oppositeGlow;
uniform float u_warp;
uniform vec2 u_warpPointer;
const float TAU = 6.28318530718;
float hash(float p) { return fract(sin(p * 127.1 + 311.7) * 43758.5453); }
float ease(float lo, float hi, float value) {
    float t = clamp((value-lo)/(hi-lo),0.0,1.0);
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}
void main() {
    vec2 p = (gl_FragCoord.xy - vec2(u_center.x, 1.0-u_center.y)*u_resolution) / u_resolution.y;
    float screenRadius = length(p);
    // A local lens gently twists and stretches the rays, keeping the core anchored.
    vec2 warpPointer = (vec2(u_warpPointer.x,1.0-u_warpPointer.y)-vec2(u_center.x,1.0-u_center.y))*u_resolution/u_resolution.y;
    vec2 offset = p-warpPointer;
    float field = exp(-dot(offset,offset)/(0.24*0.24));
    float bend = u_warp*field*smoothstep(0.025,0.15,screenRadius);
    float turn = bend*1.35;
    float cs = cos(turn), sn = sin(turn);
    vec2 bentOffset = vec2(cs*offset.x-sn*offset.y,sn*offset.x+cs*offset.y);
    vec2 rayPoint = p+(bentOffset-offset)+offset*bend*0.18;
    float r = length(rayPoint);
    float angle = atan(rayPoint.y, rayPoint.x);
    float a = angle / TAU + 0.5;
    float pixel = 1.0 / u_resolution.y;
    vec3 light = vec3(0.0);
    vec2 pointer = (vec2(u_pointer.x,1.0-u_pointer.y)-vec2(u_center.x,1.0-u_center.y))*u_resolution/u_resolution.y;
    float pointerAngle = length(pointer) > 0.000001 ? atan(pointer.y,pointer.x) : 0.0;
    // Near the center, illuminate a broad fan; toward the edge, a narrow group.
    float pointerDistance = length(pointer);
    float focusWidth = mix(1.65,0.075,smoothstep(0.025,0.55,pointerDistance));
    float allAround = 1.0-smoothstep(0.015,0.075,pointerDistance);
    float totalRays = 0.0;
    for (int k = 0; k < 5; k++) totalRays += floor((19.0+float(k)*17.0)*u_density);
    float rayOffset = 0.0;
    // Several circular fields of narrow rays, with outward travelling highlights.
    for (int layer = 0; layer < 5; layer++) {
        float l = float(layer);
        float count = floor((19.0 + l*17.0) * u_density);
        float cell = a * count;
        float id = floor(cell);
        for (int neighbor = -1; neighbor <= 1; neighbor++) {
            float rawId = id + float(neighbor);
            float seed = mod(rawId + count, count) + l*317.0;
            float h = hash(seed);
            float ray = rawId + 0.15 + 0.7*h;
            float delta = (cell-ray)/count * TAU;
            float dist = abs(sin(delta))*r;
            float width = (0.00022 + pow(hash(seed+21.0), 9.0)*0.006)*(0.45+r*1.8);
            float core = exp(-pow(dist / (width+pixel*0.48), 2.0));
            float halo = exp(-dist / (width*5.0+pixel)) * 0.17*u_glow;
            float direction = (ray/count-0.5)*TAU;
            // Two broad diagonal bundles, as in the reference clip.
            float bundle = max(pow(abs(cos(direction-1.02)), 15.0), pow(abs(cos(direction-2.00)), 18.0));
            float weight = (0.055+bundle*1.85) * (0.22+hash(seed+8.0)*1.4);
            float travel = log(max(r,0.008))*1.8-u_time*(1.5+h*1.3)+h*30.0;
            float pulse = pow(0.5+0.5*sin(travel), 7.0);
            float envelope = 0.28+1.6*pulse;
            float fade = smoothstep(0.004,0.05,r) * (0.7+0.3*exp(-r*1.3));
            vec3 tint = mix(u_color, vec3(0.80,0.89,1.0), pow(hash(seed+6.0),0.7));
            // Illuminate the small group of rays aimed toward the pointer/touch.
            // The additive term also reveals rays in the darker angular gaps.
            float angularDistance = atan(sin(direction-pointerAngle),cos(direction-pointerAngle));
            float focus = mix(exp(-pow(angularDistance/focusWidth,2.0)),1.0,allAround);
            // A faint second beam points exactly away from the primary hover beam.
            float oppositeDistance = atan(sin(angularDistance+TAU*0.5),cos(angularDistance+TAU*0.5));
            float oppositeFocus = exp(-pow(oppositeDistance/focusWidth,2.0));
            focus += oppositeFocus*u_oppositeGlow*(1.0-focus);
            float selected = focus*u_hover*u_heartbeat;
            vec3 activeTint = mix(tint,vec3(0.72,0.9,1.0),min(selected,1.0));
            float activeHalo = exp(-dist/(width*10.0+pixel*2.0))*selected*0.22;
            // Long overlapping fades keep the individual reveals seamless over two seconds.
            float ordinal = rayOffset+mod(rawId+count,count);
            float rank = mod(ordinal*997.0,totalRays);
            float revealStart = 0.42*rank/max(totalRays-1.0,1.0);
            float reveal = ease(revealStart,revealStart+0.58,u_intro);
            light += activeTint*(core+halo+activeHalo)*(weight*envelope+selected*5.0)*fade*reveal;
        }
        rayOffset += count;
    }
    float centerReveal = ease(0.12,1.0,u_intro);
    float bloom = 0.007*u_glow / (screenRadius*screenRadius+0.004);
    float centerPower = u_centerBrightness * max(u_centerColor.r,max(u_centerColor.g,u_centerColor.b));
    light += u_color*bloom*centerPower*centerReveal;
    light += u_centerColor*exp(-screenRadius*screenRadius/(0.00035*max(u_glow,0.05)))*5.0*u_centerBrightness*centerReveal;
    // Soft horizontal lens flare.
    light += u_color*exp(-abs(p.y)*210.0)*exp(-abs(p.x)*3.0)*0.12*u_glow*centerReveal;
    vec3 color = u_background*ease(0.0,0.6,u_intro) + light*u_intensity;
    color = 1.0-exp(-color);
    gl_FragColor = vec4(color,1.0);
}
`;// CSS color parsing also supports Framer's rgb()/rgba() color values.
function rgb(value){const ctx=document.createElement("canvas").getContext("2d");if(!ctx)return[.05,.4,1];ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const data=ctx.getImageData(0,0,1,1).data;return[data[0]/255,data[1]/255,data[2]/255];}/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 692
 */export default function Warp(props){const{intro=true,heartbeat=.04,heartRate=64,speed=1,density=1,glow=1,intensity=1.3,hoverStrength=.8,oppositeGlow=.05,warpStrength=.75,hoverDelay=.2,scrollBoost=2.5,centerColor="#DBF0FF",centerBrightness=1,color="#087FEF",background="#010617",centerX=50,centerY=51,quality=1.5,playing=true,animateInEditor=false,style}=props;const canvasRef=React.useRef(null);const[showFallback,setShowFallback]=React.useState(false);const current=React.useRef({intro,heartbeat,heartRate,speed,density,glow,intensity,hoverStrength,oppositeGlow,warpStrength,hoverDelay,centerBrightness,scrollBoost,centerX,centerY,quality,playing,animateInEditor});current.current={intro,heartbeat,heartRate,speed,density,glow,intensity,hoverStrength,oppositeGlow,warpStrength,hoverDelay,centerBrightness,scrollBoost,centerX,centerY,quality,playing,animateInEditor};const colors=React.useRef({color:[.03,.5,.94],background:[.004,.024,.09],centerColor:[.86,.94,1]});const refresh=React.useRef(null);React.useEffect(()=>{colors.current={color:rgb(color),background:rgb(background),centerColor:rgb(centerColor)};refresh.current?.();},[color,background,centerColor]);React.useEffect(()=>{refresh.current?.();},[intro,heartbeat,heartRate,speed,density,glow,intensity,hoverStrength,oppositeGlow,warpStrength,hoverDelay,centerBrightness,scrollBoost,centerX,centerY,quality,playing,animateInEditor]);React.useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const gl=canvas.getContext("webgl",{alpha:false,antialias:false,depth:false,powerPreference:"low-power"});if(!gl){setShowFallback(true);return;}let introStarted=null;let introWasEnabled=false;let program=null;let buffer=null;let frame=0,last=0,elapsed=2.4;const initialRect=canvas.getBoundingClientRect();let visible=initialRect.width>0&&initialRect.height>0&&initialRect.bottom>0&&initialRect.top<window.innerHeight&&initialRect.right>0&&initialRect.left<window.innerWidth;let lost=false,disposed=false;let hover=0;let active=false;let hoverStarted=0;let pointerX=.5,pointerY=.5;let targetPointerX=.5,targetPointerY=.5;let pointerInitialized=false;let contactId=null;let warpContactId=null;let warpStarted=-Infinity;let warpEnergy=0,warp=0;let warpX=.5,warpY=.5;let targetWarpX=.5,targetWarpY=.5;let scrollEnergy=0;let lastWheel=-Infinity;let lastScrollY=window.scrollY||0;let scrollUpdatedAt=0;function locate(clientX,clientY){const rect=canvas.getBoundingClientRect();const inside=clientX>=rect.left&&clientX<rect.right&&clientY>=rect.top&&clientY<rect.bottom;if(inside){targetPointerX=(clientX-rect.left)/Math.max(1,rect.width);targetPointerY=(clientY-rect.top)/Math.max(1,rect.height);if(!pointerInitialized){pointerX=targetPointerX;pointerY=targetPointerY;pointerInitialized=true;}}return inside;}// Passive document listeners also work through text/buttons above the effect.
function onPointer(event){const wasActive=active;if(event.pointerType==="touch"||event.pointerType==="pen"){if(event.type==="pointerdown"&&locate(event.clientX,event.clientY)){contactId=event.pointerId;active=true;}else if(contactId===event.pointerId){active=locate(event.clientX,event.clientY);}}else{active=locate(event.clientX,event.clientY);}if(active&&!wasActive)hoverStarted=performance.now();if(event.type==="pointerdown"&&active){warpContactId=event.pointerId;warpStarted=performance.now();targetWarpX=targetPointerX;targetWarpY=targetPointerY;// Reposition only while invisible; repeated clicks blend between locations.
if(warp<.001){warpX=targetWarpX;warpY=targetWarpY;}}else if(warpContactId===event.pointerId&&active){targetWarpX=targetPointerX;targetWarpY=targetPointerY;}wake();}function onRelease(event){if(warpContactId===event.pointerId){warpContactId=null;wake();}if(contactId===event.pointerId){contactId=null;active=false;wake();}}function resetPointer(){contactId=null;warpContactId=null;warpStarted=-Infinity;active=false;wake();}function onPointerOut(event){if(event.pointerType==="mouse"&&!event.relatedTarget)resetPointer();}// Scrolling only writes a bounded speed impulse; it never changes canvas state.
function accelerate(delta){if(!Number.isFinite(delta)||reducedMotion.matches||!visible)return;const now=performance.now();scrollEnergy*=Math.exp(-(now-scrollUpdatedAt)/550);scrollEnergy=Math.min(1.6,scrollEnergy+Math.min(Math.abs(delta)/180,.8));scrollUpdatedAt=now;wake();}function onWheel(event){if(event.ctrlKey)return;lastWheel=performance.now();const unit=event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1;accelerate(Math.hypot(event.deltaX,event.deltaY)*unit);}function onScroll(){const y=window.scrollY||document.documentElement.scrollTop||0;const delta=y-lastScrollY;lastScrollY=y;if(performance.now()-lastWheel>120)accelerate(delta);}let cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");const editor=RenderTarget.current()===RenderTarget.canvas;let uniforms={};function compile(type,source){const shader=gl.createShader(type);if(!shader)throw new Error("Unable to create shader");gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message||"Shader compilation failed");}return shader;}function setup(){const vertex=compile(gl.VERTEX_SHADER,vertexShader);let fragment;try{fragment=compile(gl.FRAGMENT_SHADER,fragmentShader);}catch(error){gl.deleteShader(vertex);throw error;}program=gl.createProgram();if(!program){gl.deleteShader(vertex);gl.deleteShader(fragment);throw new Error("Unable to create program");}gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||"Shader link failed");buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.useProgram(program);const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);for(const name of["resolution","center","time","density","glow","intensity","hover","pointer","color","background","centerColor","centerBrightness","intro","heartbeat","oppositeGlow","warp","warpPointer"])uniforms[name]=gl.getUniformLocation(program,`u_${name}`);}function draw(now){frame=0;if(disposed||lost||!program||!visible||document.hidden){last=0;return;}const p=current.current;const animate=p.playing&&!reducedMotion.matches&&(!editor||p.animateInEditor);const introEnabled=p.intro&&!reducedMotion.matches&&(!editor||p.animateInEditor);if(introEnabled&&!introWasEnabled)introStarted=now;if(!introEnabled)introStarted=null;introWasEnabled=introEnabled;const introProgress=introEnabled?Math.min(1,(now-(introStarted??now))/2e3):1;const dt=last?Math.min((now-last)/1e3,.25):1/60;const scrollAmount=reducedMotion.matches?0:scrollEnergy*Math.exp(-(now-scrollUpdatedAt)/550);const speedMultiplier=1+scrollAmount*Math.max(0,p.scrollBoost);if(last&&animate)elapsed+=Math.min(dt,.1)*p.speed*speedMultiplier;const delay=Math.max(0,p.hoverDelay);const waitingForHover=active&&!reducedMotion.matches&&now-hoverStarted<delay*1e3;const targetHover=active&&!waitingForHover?p.hoverStrength:0;hover=reducedMotion.matches?targetHover:hover+(targetHover-hover)*(1-Math.exp(-dt/(targetHover>hover?.26:.32)));// Let the illuminated beams follow the pointer gently, including on touch.
const follow=reducedMotion.matches?1:1-Math.exp(-dt/Math.max(.1,delay));pointerX+=(targetPointerX-pointerX)*follow;pointerY+=(targetPointerY-pointerY)*follow;if(Math.abs(targetPointerX-pointerX)<1e-4)pointerX=targetPointerX;if(Math.abs(targetPointerY-pointerY)<1e-4)pointerY=targetPointerY;const pointerSettling=pointerX!==targetPointerX||pointerY!==targetPointerY;if(Math.abs(targetHover-hover)<.001)hover=targetHover;// Two eased stages make a short click bloom into a soft bend, with no hard impulse.
const warpHeld=warpContactId!==null||now-warpStarted<400;const targetWarp=!reducedMotion.matches&&(!editor||p.animateInEditor)&&warpHeld?Math.max(0,Math.min(1.5,p.warpStrength)):0;const rising=targetWarp>warpEnergy;warpEnergy+=(targetWarp-warpEnergy)*(1-Math.exp(-dt/(rising?.16:.28)));warp+=(warpEnergy-warp)*(1-Math.exp(-dt/(rising?.18:.36)));if(reducedMotion.matches||targetWarp===0&&warp<5e-4&&warpEnergy<5e-4){warp=0;warpEnergy=0;}const warpFollow=1-Math.exp(-dt/.22);warpX+=(targetWarpX-warpX)*warpFollow;warpY+=(targetWarpY-warpY)*warpFollow;const warpRunning=targetWarp>0||warp>0;// A small double pulse, independent of beam speed and scroll acceleration.
const heartbeatRunning=animate&&p.heartbeat>0&&hover>0;const heartbeatSeconds=Math.max(0,(now-hoverStarted)/1e3-delay);const phase=heartbeatSeconds*Math.max(1,p.heartRate)/60%1;const beat=Math.exp(-Math.pow((phase-.16)/.05,2))+.4*Math.exp(-Math.pow((phase-.31)/.065,2));const heartbeatGain=heartbeatRunning?1+Math.max(0,p.heartbeat)*beat:1;last=now;// Bound both pixel ratio and total work on very large screens.
const dpr=Math.min(window.devicePixelRatio||1,p.quality,Math.sqrt(26e5/Math.max(1,cssWidth*cssHeight)));const width=Math.max(1,Math.round(cssWidth*dpr)),height=Math.max(1,Math.round(cssHeight*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}gl.viewport(0,0,width,height);gl.uniform2f(uniforms.resolution,width,height);gl.uniform2f(uniforms.center,p.centerX/100,p.centerY/100);gl.uniform1f(uniforms.time,elapsed);gl.uniform1f(uniforms.density,Math.max(.25,p.density));gl.uniform1f(uniforms.glow,p.glow);gl.uniform1f(uniforms.intensity,p.intensity);gl.uniform1f(uniforms.hover,hover);gl.uniform2f(uniforms.pointer,pointerX,pointerY);gl.uniform3fv(uniforms.color,colors.current.color);gl.uniform3fv(uniforms.background,colors.current.background);gl.uniform3fv(uniforms.centerColor,colors.current.centerColor);gl.uniform1f(uniforms.centerBrightness,p.centerBrightness);gl.uniform1f(uniforms.intro,introProgress);gl.uniform1f(uniforms.heartbeat,heartbeatGain);gl.uniform1f(uniforms.oppositeGlow,Math.max(0,Math.min(.2,p.oppositeGlow)));gl.uniform1f(uniforms.warp,warp);gl.uniform2f(uniforms.warpPointer,warpX,warpY);gl.drawArrays(gl.TRIANGLES,0,3);canvas.style.opacity="1";if(animate&&p.speed>0||hover!==targetHover||waitingForHover||active&&pointerSettling||introProgress<1||heartbeatRunning||warpRunning)frame=requestAnimationFrame(draw);}function wake(){if(!frame&&!disposed&&!lost){last=0;frame=requestAnimationFrame(draw);}}function onLost(event){event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;canvas.style.opacity="0";setShowFallback(true);}function onRestored(){lost=false;try{setup();setShowFallback(false);wake();}catch(error){console.warn("Warp:",error);}}try{setup();}catch(error){console.warn("Warp:",error);setShowFallback(true);if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);return;}const resize=new ResizeObserver(entries=>{const rect=entries[0].contentRect;cssWidth=rect.width;cssHeight=rect.height;wake();});resize.observe(canvas);const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;last=0;}});intersection.observe(canvas);canvas.addEventListener("webglcontextlost",onLost);canvas.addEventListener("webglcontextrestored",onRestored);document.addEventListener("pointerdown",onPointer,{passive:true,capture:true});document.addEventListener("pointermove",onPointer,{passive:true,capture:true});document.addEventListener("pointerup",onRelease,{passive:true,capture:true});document.addEventListener("pointercancel",onRelease,{passive:true,capture:true});document.addEventListener("pointerout",onPointerOut,{passive:true,capture:true});window.addEventListener("scroll",onScroll,{passive:true});document.addEventListener("wheel",onWheel,{passive:true,capture:true});window.addEventListener("blur",resetPointer);document.addEventListener("visibilitychange",resetPointer);reducedMotion.addEventListener("change",wake);refresh.current=wake;draw(performance.now());return()=>{disposed=true;refresh.current=null;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener("pointerdown",onPointer,true);document.removeEventListener("pointermove",onPointer,true);document.removeEventListener("pointerup",onRelease,true);document.removeEventListener("pointercancel",onRelease,true);document.removeEventListener("pointerout",onPointerOut,true);window.removeEventListener("scroll",onScroll);document.removeEventListener("wheel",onWheel,true);window.removeEventListener("blur",resetPointer);document.removeEventListener("visibilitychange",resetPointer);reducedMotion.removeEventListener("change",wake);canvas.removeEventListener("webglcontextlost",onLost);canvas.removeEventListener("webglcontextrestored",onRestored);gl.deleteBuffer(buffer);gl.deleteProgram(program);};},[]);return /*#__PURE__*/_jsx("div",{"data-warp-version":"10","aria-hidden":"true",style:{width:1e3,height:692,position:"relative",...style,overflow:"hidden",background:showFallback?`radial-gradient(ellipse at ${centerX}% ${centerY}%, ${centerColor} 0%, ${color} 2%, ${background} 30%)`:"#000000",pointerEvents:"none"},children:/*#__PURE__*/_jsx("canvas",{ref:canvasRef,style:{display:"block",width:"100%",height:"100%",opacity:0}})});}addPropertyControls(Warp,{intro:{type:ControlType.Boolean,title:"Intro",defaultValue:true},heartbeat:{type:ControlType.Number,title:"Heartbeat",defaultValue:.04,min:0,max:.15,step:.01},heartRate:{type:ControlType.Number,title:"Heart Rate",defaultValue:64,min:40,max:100,step:1,unit:"bpm"},color:{type:ControlType.Color,title:"Light",defaultValue:"#087FEF"},centerColor:{type:ControlType.Color,title:"Center Color",defaultValue:"#DBF0FF"},centerBrightness:{type:ControlType.Number,title:"Center Power",defaultValue:1,min:0,max:2,step:.05},background:{type:ControlType.Color,title:"Background",defaultValue:"#010617"},speed:{type:ControlType.Number,title:"Speed",defaultValue:1,min:0,max:4,step:.1},density:{type:ControlType.Number,title:"Density",defaultValue:1,min:.25,max:2.5,step:.05},glow:{type:ControlType.Number,title:"Glow",defaultValue:1,min:0,max:3,step:.1},intensity:{type:ControlType.Number,title:"Brightness",defaultValue:1.3,min:.1,max:3,step:.1},hoverStrength:{type:ControlType.Number,title:"Beam Glow",defaultValue:.8,min:0,max:2,step:.05},warpStrength:{type:ControlType.Number,title:"Warp Amount",defaultValue:.75,min:0,max:1.5,step:.05,description:"Soft lens distortion on click or touch. Set 0 to disable."},oppositeGlow:{type:ControlType.Number,title:"Opposite Glow",defaultValue:.05,min:0,max:.2,step:.01,description:"Faint opposite beam. 0.05 is 5% of the main hover glow."},hoverDelay:{type:ControlType.Number,title:"Hover Delay",defaultValue:.2,min:0,max:1,step:.05,unit:"s"},scrollBoost:{type:ControlType.Number,title:"Scroll Boost",defaultValue:2.5,min:0,max:5,step:.1},centerX:{type:ControlType.Number,title:"Center X",defaultValue:50,min:0,max:100,unit:"%"},centerY:{type:ControlType.Number,title:"Center Y",defaultValue:51,min:0,max:100,unit:"%"},quality:{type:ControlType.Number,title:"Quality",defaultValue:1.5,min:.5,max:2,step:.5},playing:{type:ControlType.Boolean,title:"Playing",defaultValue:true},animateInEditor:{type:ControlType.Boolean,title:"Editor Motion",defaultValue:false}});
export const __FramerMetadata__ = {"exports":{"default":{"type":"reactComponent","name":"Warp","slots":[],"annotations":{"framerContractVersion":"1","framerSupportedLayoutWidth":"any-prefer-fixed","framerIntrinsicWidth":"1000","framerSupportedLayoutHeight":"any-prefer-fixed","framerIntrinsicHeight":"692"}},"__FramerMetadata__":{"type":"variable"}}}
//# sourceMappingURL=./Warp_v2_1.map