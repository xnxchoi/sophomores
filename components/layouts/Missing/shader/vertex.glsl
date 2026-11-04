attribute vec2 aTextureCoord;
varying vec3 vVertexPosition;
varying vec2 v_texcoord;

#ifdef GL_ES
precision mediump float;
#define GLSLIFY 1
#endif
#define PI 3.14159265359


void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_texcoord = uv;
    vVertexPosition = position;

}
