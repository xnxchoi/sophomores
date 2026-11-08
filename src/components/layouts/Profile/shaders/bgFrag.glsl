const int MAX_TRAIL_SIZE = 20;

varying vec2 vUv;
uniform vec3 cBg;
uniform float opacity;

vec3 linearTosRGB(vec3 linear) {
    return pow(linear, vec3(1.0 / 2.2));
}

void main() {
    gl_FragColor = vec4(cBg, 1.0);
    gl_FragColor.a = opacity;
}
