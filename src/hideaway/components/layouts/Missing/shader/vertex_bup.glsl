#ifdef GL_ES
precision mediump float;
#define GLSLIFY 1
#endif
#ifndef PI
#define PI 3.14159265359
#endif

varying vec2 v_texcoord;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_texcoord = uv;
}



attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uMVMatrix, uPMatrix, canvasTexture;
varying vec3 vVertexPosition;
varying vec2 vTextureCoord;
void main() { vec3 position = aVertexPosition;
    gl_Position = uPMatrix * uMVMatrix * vec4(position, 1);
    vTextureCoord = (planeTextureMatrix * vec4(aTextureCoord, 0, 1)).xy;vVertexPosition = position; }
