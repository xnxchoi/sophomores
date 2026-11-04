varying vec2 vUv;

uniform sampler2D tMouse;
uniform sampler2D tFront;
uniform sampler2D tBack;
uniform vec3 cBlack;
uniform vec3 cBg;

uniform vec2 resolution;
uniform vec2 i_resolution;

const float PI = 3.1415926;
uniform float time;

uniform float wakuNaiVisible;
uniform float wakuSenOpacity;

vec3 LinearTosRGB(vec3 linear) {
    return pow(linear, vec3(1.0 / 2.2));
}

void main() {

    vec2 vUvA = vec2(vUv.x, vUv.y * resolution.y / resolution.x);

    vec3 tBg = LinearTosRGB(cBg);
    vec3 tBlack = LinearTosRGB(cBlack);

    vec4 iMouse = texture(tMouse, vUv);
    vec4 iFront = texture(tFront, vUv);

    vec4 iBack = texture(tBack, vUv);

    vec3 col = vec3(1.0);
    float alpha = iBack.a * iFront.a;

    alpha = iMouse.r > 0.99 ? mix(iFront.a, iBack.a, wakuNaiVisible) : iMouse.r > 0.1 ? ((iFront.r + iFront.g + iFront.b) * iFront.a + (iBack.r + iBack.g + iBack.b) * iBack.a) / 6.0 != 0.0 ? wakuSenOpacity : 0.0 : iFront.a;

    col = iMouse.r > 0.99 ? mix(iFront.rgb, iBack.rgb, wakuNaiVisible) : iMouse.r > 0.1 ? tBlack * 0.9 : iFront.rgb;

    gl_FragColor = vec4(col, alpha);

}