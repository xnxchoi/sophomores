const fragmentShader=`uniform float u_time;
uniform float u_progress;
uniform sampler2D u_texture1;
uniform vec4 u_resolution;

varying vec2 v_uv;
varying vec3 v_color;
varying vec3 v_position;
void main() {
    gl_FragColor = vec4(v_uv, 0.0, 1.);
}
`
export default fragmentShader
