varying vec2 vUv;
uniform float u_time;
uniform float u_scrollPhase;
uniform vec2 u_resolution;
uniform vec3 u_bgColor;
uniform vec3 u_color1;        // shadow valley
uniform vec3 u_color2;        // secondary shadow
uniform vec3 u_color3;        // lit ridge – vivid rosso / teal
uniform vec3 u_color4;        // secondary lit
uniform float u_audioLevel;
uniform float u_audioBeat;       // smooth peak-envelope (~280ms decay)
uniform float u_audioGain;       // slow play-state ramp (~700ms) — gates audio response
uniform float u_fogProgress;
uniform float u_opacity;
uniform float u_blobIntensity;
uniform sampler2D u_noiseTexture;
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    vUv = position.xy * 0.5 + 0.5;
}
