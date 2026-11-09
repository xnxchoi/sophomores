varying vec2 v_texcoord;
varying vec3 vVertexPosition;
uniform float u_time;
uniform float uIntensity;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_pxRange;
uniform float u_alpha;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform sampler2D canvasTexture;

/* common constants */
#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif

/* variation constant */
#ifndef VAR
#define VAR 0
#endif

/* Coordinate and unit utils */
#ifndef FNC_COORD
#define FNC_COORD
vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    // correct aspect ratio
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    // centering
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}
#endif

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse * u_pixelRatio)

#include <clipping_planes_pars_fragment>
float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed); }
vec4 boxBlur(sampler2D tex, vec2 uv, vec2 surf) {
    vec4 color = vec4(0);
    float total = 0., offset = random(vec3(12.9898, 38.233, 151.7182), 0.);
    for (float t = -20.;t <= 20.; t++) {
        float percent = (t + offset - .8) / 20.;
        float weight = 1. - abs(percent);
        vec4 bsample = texture2D(tex, uv + surf * percent);
        bsample.xyz *= bsample.w;
        color += bsample * weight;total += weight; }color /= total;color.xyz /= color.w + 1e-5;
    return u_alpha * color;
}
// functions from the original msdf repo:
// https://github.com/Chlumsky/msdfgen#using-a-multi-channel-distance-field

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float screenPxRange() {
    vec2 unitRange = vec2(u_pxRange) / vec2(textureSize(canvasTexture, 0));
    vec2 screenTexSize = vec2(1.0) / fwidth(v_texcoord);
    return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}

float tap(vec2 offsetUV) {
    vec3 msd = texture(canvasTexture, offsetUV).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = screenPxRange() * (sd - 0.5);
    float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    return alpha;
}
/* signed distance functions */
float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}
float sdCircle(in vec2 st, in vec2 center) {
    return length(st - center) * 2.0;
}
float sdPoly(in vec2 p, in float w, in int sides) {
    float a = atan(p.x, p.y) + PI;
    float r = TWO_PI / float(sides);
    float d = cos(floor(0.5 + a / r) * r - a) * length(max(abs(p) * 1.0, 0.0));
    return d * 2.0 - w;
}

/* antialiased step function */
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}
/* Signed distance drawing methods */
float fill(in float x) { return 1.0 - aastep(0.0, x); }
float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}

float stroke(in float d, in float t) { return (1.0 - aastep(t, abs(d))); }
float stroke(float x, float size, float w, float edge) {
    float d = smoothstep(size - edge, size + edge, x + w * 0.5) - smoothstep(size - edge, size + edge, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

void main() {
    vec2 pixel = 1.0 / u_resolution.xy;
    vec2 st = st0 + 0.5;
    vec2 posMouse = mx * vec2(1., -1.) + 0.5;

    /* sdf (Round Rect) params */
    float size = 1.2;
    float roundness = 0.4;
    float borderSize = 0.02;

    /* sdf Circle params */
    float circleSize = 0.6;
    float circleEdge = 0.5;

    /* sdf Circle */
    float sdfCircle = fill(
    sdCircle(st, posMouse),
    circleSize,
    circleEdge
    );

    float sdf;
    if (VAR == 0) {
        /* sdf round rectangle with stroke param adjusted by sdf circle */
        sdf = sdRoundRect(st, vec2(size), roundness);
        sdf = stroke(sdf, 0.0, borderSize, sdfCircle) * 4.0;
        vec3 color = vec3(sdf);
        float alpha = clamp(sdf, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb, alpha);
    } else if (VAR == 1) {
        /* sdf circle with fill param adjusted by sdf circle */
        sdf = sdCircle(st, vec2(0.5));
        sdf = fill(sdf, 0.6, sdfCircle) * 1.2;
        vec3 color = vec3(sdf);
        float alpha = clamp(sdf, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb, alpha);
    } else if (VAR == 2) {
        /* sdf circle with stroke param adjusted by sdf circle */
        sdf = sdCircle(st, vec2(0.5));
        sdf = stroke(sdf, 0.58, 0.02, sdfCircle) * 4.0;
        vec3 color = vec3(sdf);
        float alpha = clamp(sdf, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb, alpha);
    } else if (VAR == 3) {
        /* sdf circle with fill param adjusted by sdf circle */
        sdf = sdPoly(st - vec2(0.5, 0.45), 0.3, 3);
        sdf = fill(sdf, 0.05, sdfCircle) * 1.4;
        vec3 color = vec3(sdf);
        float alpha = clamp(sdf, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb, alpha);
    } else if (VAR == 45) {
        /*trying something*/
        vec2 st = (gl_FragCoord.xy - .5 * u_resolution) / min(u_resolution.x, u_resolution.y), mouse = (u_mouse - .125 * u_resolution) / min(u_resolution.x, u_resolution.y);
        vec4 bBox = boxBlur(canvasTexture, v_texcoord, vec2((mouse - st) * pow(clamp(.5 - length(st - mouse) / .5, 0., 1.), .82)));
        gl_FragColor = bBox;
    }


}
