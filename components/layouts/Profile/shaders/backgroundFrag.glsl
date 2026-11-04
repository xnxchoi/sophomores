varying vec2 vUv;
uniform vec3 cBg;
uniform float opacity;

vec3 LinearTosRGB(vec3 linear) { return pow(linear, vec3(1.0 / 2.2)); }

void main() {
    gl_FragColor = vec4(cBg, 1.0);
    gl_FragColor = vec4(LinearTosRGB(gl_FragColor.rgb), 1.0);
    gl_FragColor.a = opacity;
}