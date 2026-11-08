varying vec2 vUv;

uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uSize;
uniform vec2 uOffset;
uniform float uSpeed;
uniform sampler2D uNoiseTexture;
uniform sampler2D uSimulationTexture;
uniform vec2 uResolution;
uniform float uColorMixer;
uniform float uMenuMode;
uniform float uAdditionalZoom;
uniform vec2 uAdditionalOffset;
uniform float uScrollOffset;
uniform float u_opacity;

void main() {
    vec2 nUv = (-.5 + vUv) * 2.;
    if (uResolution.x < uResolution.y) {
        nUv.x *= uResolution.x / uResolution.y;
    } else {
        nUv.y *= uResolution.y / uResolution.x;
    }
    nUv = nUv / 2. + .5;

    float additionalZoom = uAdditionalZoom * (1. - uMenuMode);
    vec2 offset = uOffset + uAdditionalOffset * (1. - uMenuMode);
    offset.y -= uScrollOffset;

    vec2 bUv = nUv * (uSize * 2. + additionalZoom) + offset * uMenuMode;// dUv
    vec2 nUv1 = bUv + offset * (1. - uMenuMode) + uTime * uSpeed;
    bUv.y -= .5;
    vec2 nUv2 = bUv + offset * (1. - uMenuMode) - uTime * uSpeed;

    vec4 noiseColor1 = texture2D(uNoiseTexture, nUv1);
    float noise1 = noiseColor1.r;

    vec4 noiseColor2 = texture2D(uNoiseTexture, nUv2);
    float noise2 = noiseColor2.r;

    //float noise = clamp(noise1 * .5 + noise2 * .5, 0., 1.);
    float noise = clamp((noise1 + noise2) / 2., 0., 1.);

    vec2 nUv3 = bUv + noise * .5;
    noise = texture2D(uNoiseTexture, nUv3).r;


    // coloring
    vec3 color = vec3(0.);
    noise = mix(noise, noise * 1.25 + .15, uMenuMode);
    if (noise < 0.25) {
        color = mix(uColor1, uColor2, noise / 0.25);
    } else if (noise < 0.5) {
        color = mix(uColor2, uColor3, (noise - 0.25) / 0.25);
    } else if (noise < 0.75) {
        color = mix(uColor3, uColor4, (noise - 0.5) / 0.25);
    } else {
        color = uColor4;
    }

    //color = step(.5, color);

    //color = mix(color, pow(color, vec3(2.)), uColorMixer);
    vec3 alt = pow(color, vec3(2.));
    alt = alt * 1. - step(.01, color);
    color = mix(color, alt, uColorMixer);

    gl_FragColor = vec4(color, u_opacity);
    //gl_FragColor = gpgpuColor;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
