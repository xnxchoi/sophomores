uniform float u_progress;
uniform float u_time;
uniform vec3 u_color[4];
uniform float u_colorMixer;
uniform vec2 u_pixels;
uniform float u_opacity;
uniform vec2 u_additionalOffset;
uniform float u_additionalZoom;
uniform float u_size;
uniform vec2 u_offset;
uniform float u_speed;
uniform vec2 u_resolution;
uniform sampler2D u_noiseTexture;
varying vec2 v_uv;
varying vec3 v_color;
varying vec3 v_position;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
    dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {

    vec3 color = vec3(0.);

        color = v_color;
    vec3 alt = pow(color, vec3(2.));
    alt = alt * 1. - step(.01, color);
    color = mix(color, alt, u_colorMixer);
    gl_FragColor = vec4(v_uv, 0.0, 1.);

    //    gl_FragColor = vec4(v_color, 1.);
    gl_FragColor = vec4(color, u_opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
