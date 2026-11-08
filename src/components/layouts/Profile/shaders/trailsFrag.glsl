const int MAX_TRAIL_SIZE=20;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time;

uniform vec3 cBlack;

uniform vec2 mouse;
uniform int mouseTrailsCount;
uniform vec2 mouseTrailsArray[MAX_TRAIL_SIZE];
uniform float mouseTrailsIntensity[MAX_TRAIL_SIZE];
uniform float mouseTrailsAge[MAX_TRAIL_SIZE];
uniform float mouseTrailsMaxAge;
uniform float mouseTrailsSize;
uniform float mouseTrailsAgeRatio;

uniform float edgePower;
uniform float noiseSpeed;
uniform float noiseDensity;
uniform float waveSpeed;
uniform vec2 waveDisp;
uniform float wavePower;

uniform float yuenyePower;
uniform float yuenyeEdge;
uniform float yuenyeRatio;

vec3 hash(vec3 p) { p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float cnoise(vec3 p) { vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f); float a = dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)); float b = dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)); float c = dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)); float d = dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)); float element = dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)); float f_val = dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)); float g = dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)); float h = dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)); float k0 = mix(a, b, u.x); float k1 = mix(c, d, u.x); float k2 = mix(element, f_val, u.x); float k3 = mix(g, h, u.x); float l0 = mix(k0, k1, u.y); float l1 = mix(k2, k3, u.y); return mix(l0, l1, u.z); }

vec3 random3(vec3 c) { float j = 4096.0*sin(dot(c, vec3(17.0, 59.4, 15.0))); vec3 end; end.z = fract(512.0*j); j *= .125; end.x = fract(512.0*j); j *= .125; end.y = fract(512.0*j); return end-0.5; }
const float F3 =  0.3333333; const float G3 =  0.1666667;
float snoise(vec3 p) { vec3 s = floor(p + dot(p, vec3(F3))); vec3 x = p - s + dot(s, vec3(G3)); vec3 element = step(vec3(0.0), x - x.yzx); vec3 i1 = element*(1.0 - element.zxy); vec3 i2 = 1.0 - element.zxy*(1.0 - element); vec3 x1 = x - i1 + G3; vec3 x2 = x - i2 + 2.0*G3; vec3 x3 = x - 1.0 + 3.0*G3; vec4 w, d; w.x = dot(x, x); w.y = dot(x1, x1); w.z = dot(x2, x2); w.w = dot(x3, x3); w = max(0.6 - w, 0.0); d.x = dot(random3(s), x); d.y = dot(random3(s + i1), x1); d.z = dot(random3(s + i2), x2); d.w = dot(random3(s + 1.0), x3); w *= w; w *= w; d *= w; return dot(d, vec4(52.0)); }
float snoiseFractal(vec3 m) { return 0.5333333* snoise(m) +0.2666667* snoise(2.0*m) +0.1333333* snoise(4.0*m) +0.0666667* snoise(8.0*m); }

float calculateTotalTrailColor(vec2 uv) {
    float totalTrailColor = 0.0;
    for (int i = 0; i < mouseTrailsCount; i++) {
        if (mouseTrailsIntensity[i] != 0.0){
            vec2 trailPos = vec2(mouseTrailsArray[i].x, mouseTrailsArray[i].y * resolution.y / resolution.x);
            float distance = distance(uv, trailPos);
            float ageFactor = 1.0 - mouseTrailsAge[i] / mouseTrailsMaxAge;
            float adjustedSize = mouseTrailsSize * (1.0 + ageFactor * mouseTrailsAgeRatio) * 0.1;
            float trailIntensity = mouseTrailsIntensity[i] * (1.0 - mouseTrailsAge[i] / mouseTrailsMaxAge);
            float trailValue = 1.0 - smoothstep(0.0, adjustedSize, distance);
            float trailAdd = clamp(trailValue * trailIntensity, 0.0, 1.0);
            totalTrailColor += trailAdd;
        }
    }
    return totalTrailColor;
}

void main() {


    vec2 vUvA = vec2(vUv.x, vUv.y * resolution.y / resolution.x);




    float trailColor = calculateTotalTrailColor(vUvA);
    float nPower = cnoise(vec3(vUvA * waveDisp * 3.0, 1.0));


    vec3 p3 = vec3(vUvA.xy * noiseDensity, time * noiseSpeed * 0.1);
    float fractalValue = snoiseFractal(p3 * 8.0 + 8.0);
    fractalValue = 0.5 + 0.5 * fractalValue;
    fractalValue = clamp(pow(fractalValue + nPower, 1.0), 0.0, 1.0);


    vec2 uvMouse = vec2(mouse.x, mouse.y * resolution.y / resolution.x);
    float uvMouseDistance = distance(vUvA, uvMouse);
    float l1 = (mouseTrailsSize / uvMouseDistance) * 0.1;
    float cEdge = clamp(pow(l1 * l1 * fractalValue + trailColor * fractalValue, edgePower), 0.0, 1.0);


    float l2 = pow((mouseTrailsSize / uvMouseDistance) * 0.1, yuenyePower);
    float cHome = clamp(pow(l2 * fractalValue + trailColor * fractalValue, yuenyeEdge), 0.0, 1.0);
    cHome = cHome * l2 * yuenyeRatio;


    gl_FragColor = vec4(cEdge, cHome, 0, 1.0);

}