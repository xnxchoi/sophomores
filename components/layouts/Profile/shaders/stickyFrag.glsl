varying vec2 vUv;

uniform float opacity;

uniform vec2 resolution;
uniform vec2 i_resolution;
uniform float borderRadius;

uniform float slidePower1;
uniform float slidePower2;
uniform float slidePower3;
uniform float slidePower4;

uniform sampler2D tSlide1;
uniform sampler2D tSlide2;
uniform sampler2D tSlide3;
uniform sampler2D tSlide4;

float borderAlpha(vec2 uv, float radius) {

    vec2 aspectCorrectedUV = uv * resolution.xy / min(resolution.x, resolution.y);
    vec2 q = aspectCorrectedUV - 0.5 * resolution.xy / min(resolution.x, resolution.y);
    vec2 p = abs(q) - (vec2(0.5 * resolution.xy / min(resolution.x, resolution.y)) - radius);
    float dist = length(max(vec2(max(p.x, 0.0), max(p.y, 0.0)), 0.0));
    float alpha = max(p.x, p.y) < 0.0 ? 1.0 : 1.0 - smoothstep(radius - 0.001, radius, dist);
    return alpha;
}

vec3 hash(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float cnoise(vec3 p) { vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f); float a = dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)); float b = dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)); float c = dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)); float d = dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)); float element = dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)); float f_val = dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)); float g = dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)); float h = dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)); float k0 = mix(a, b, u.x); float k1 = mix(c, d, u.x); float k2 = mix(element, f_val, u.x); float k3 = mix(g, h, u.x); float l0 = mix(k0, k1, u.y); float l1 = mix(k2, k3, u.y); return mix(l0, l1, u.z); }

vec3 random3(vec3 c) { float j = 4096.0*sin(dot(c, vec3(17.0, 59.4, 15.0))); vec3 end; end.z = fract(512.0*j); j *= .125; end.x = fract(512.0*j); j *= .125; end.y = fract(512.0*j); return end-0.5; }
const float F3 =  0.3333333;
const float G3 =  0.1666667;
float snoise(vec3 p) { vec3 s = floor(p + dot(p, vec3(F3))); vec3 x = p - s + dot(s, vec3(G3)); vec3 element = step(vec3(0.0), x - x.yzx); vec3 i1 = element*(1.0 - element.zxy); vec3 i2 = 1.0 - element.zxy*(1.0 - element); vec3 x1 = x - i1 + G3; vec3 x2 = x - i2 + 2.0*G3; vec3 x3 = x - 1.0 + 3.0*G3; vec4 w, d; w.x = dot(x, x); w.y = dot(x1, x1); w.z = dot(x2, x2); w.w = dot(x3, x3); w = max(0.6 - w, 0.0); d.x = dot(random3(s), x); d.y = dot(random3(s + i1), x1); d.z = dot(random3(s + i2), x2); d.w = dot(random3(s + 1.0), x3); w *= w; w *= w; d *= w; return dot(d, vec4(52.0)); }
float snoiseFractal(vec3 m) { return 0.5333333* snoise(m) +0.2666667* snoise(2.0*m) +0.1333333* snoise(4.0*m) +0.0666667* snoise(8.0*m); }

uniform float fadeDensity;
uniform float fadePower;
uniform float borderWidth;
uniform vec3 borderColor;
vec3 LinearTosRGB(vec3 linear) { return pow(linear, vec3(1.0 / 2.2)); }
vec4 getFadeColor(float power, float fog, float noise, vec4 color1, vec4 color2){
    float wave = (1.0 + vUv.y - power * 2.0) * fadePower;
    float fade = 1.0 - clamp(wave + wave * fog + wave * noise, 0.0, 1.0);
    vec4 finalColor = vec4(1.0);
    if (fade > 0.0 && fade < borderWidth){
        vec3 col = (1.0 - color1.rgb) - (fade - borderWidth);
        finalColor = vec4(LinearTosRGB(col * 0.3), 1.0);
    } else {
        finalColor = mix(color1, color2, 1.0 - step(fade, borderWidth));
    }
    return finalColor;
}

void main() {

    vec2 vUvA = vec2(vUv.x, vUv.y * resolution.y / resolution.x);
    float noise = cnoise(vec3(vUvA * 3.0, fadeDensity));


    vec3 p3 = vec3(vUvA * fadeDensity, 1.0);
    float fog = snoiseFractal(p3);



    float alpha = borderAlpha(vUv, borderRadius);





    vec4 color1 = texture(tSlide1, vUv);
    vec4 color2 = texture(tSlide2, vUv);
    vec4 color3 = texture(tSlide3, vUv);
    vec4 color4 = texture(tSlide4, vUv);


    vec4 finalColor = color1;
    float fade = 0.0;
    if (slidePower2 > 0.0) {
        finalColor = getFadeColor(slidePower2, fog, noise, color1, color2);
    }
    if (slidePower3 > 0.0) {
        finalColor = getFadeColor(slidePower3, fog, noise, color2, color3);
    }
    if (slidePower4 > 0.0) {
        finalColor = getFadeColor(slidePower4, fog, noise, color3, color4);
    }

    gl_FragColor = finalColor;
    gl_FragColor.a = alpha * opacity;


}