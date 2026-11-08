attribute vec2 aTextureCoord;
varying vec2 v_texcoord;
varying vec2 vUv;

#ifdef GL_ES
precision mediump float;
#define GLSLIFY 1
#endif
#define PI 3.14159265359

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}