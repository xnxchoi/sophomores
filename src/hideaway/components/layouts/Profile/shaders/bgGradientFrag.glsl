varying vec2 vUv;
uniform vec2 pivot;
uniform vec2 radius;

uniform float noisePower;
uniform float noiseSpeed;
uniform float noiseDensity;

uniform vec2 mouse;
uniform vec2 move;
uniform float time;
uniform float opacity;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform float gradient1st;
uniform float gradient2nd;
uniform float gradient3rd;

uniform vec2 resolution;
uniform float borderRadius;

vec3 hash(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float cnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0));
    float b = dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
    float c = dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
    float d = dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
    float e = dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
    float f_val = dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
    float g = dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
    float h = dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
    float k0 = mix(a, b, u.x);
    float k1 = mix(c, d, u.x);
    float k2 = mix(e, f_val, u.x);
    float k3 = mix(g, h, u.x);
    float l0 = mix(k0, k1, u.y);
    float l1 = mix(k2, k3, u.y);
    return mix(l0, l1, u.z);
}

float borderAlpha(vec2 uv, float radius) {
    vec2 aspectCorrectedUV = uv * resolution.xy / min(resolution.x, resolution.y);
    vec2 q = aspectCorrectedUV - 0.5 * resolution.xy / min(resolution.x, resolution.y);
    vec2 p = abs(q) - (vec2(0.5 * resolution.xy / min(resolution.x, resolution.y)) - radius);
    float dist = length(max(vec2(max(p.x, 0.0), max(p.y, 0.0)), 0.0));
    float alpha = max(p.x, p.y) < 0.0 ? 1.0 : 1.0 - smoothstep(radius - 0.001, radius, dist);
    return alpha;
}

void main() {

    float noise = cnoise(vec3(vUv * noiseDensity, time * noiseSpeed)) * noisePower;

    vec2 adjustedUv = vUv - pivot;
    adjustedUv.x /= radius.x;
    adjustedUv.y /= radius.y;
    adjustedUv -= mouse * move;

    vec2 centerOffset = adjustedUv - vec2(0.5, 0.5);

    float angle = radians(mouse.x * 5.0);
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    centerOffset = rotationMatrix * centerOffset;
    adjustedUv = centerOffset + vec2(0.5, 0.5);

    float dist = length(adjustedUv) + noise;

    vec3 color;
    float t = 0.0;
    color = (dist < gradient1st) ? (t = dist / gradient1st, mix(color1, color2, t)) : (dist < gradient2nd) ? (t = (dist - gradient1st) / (gradient2nd - gradient1st), mix(color2, color3, t)) : (dist < gradient3rd) ? (t = (dist - gradient2nd) / (gradient3rd - gradient2nd), mix(color3, color4, t)) : color4;

    float alpha = 1.0 - smoothstep(1.0, 1.01, dist);
    alpha *= borderAlpha(vUv, borderRadius);

    gl_FragColor = vec4(color, alpha * opacity);

}