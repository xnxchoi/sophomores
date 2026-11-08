varying vec2 vUv;

uniform float opacity;

uniform sampler2D tDiffuse;

uniform vec2 resolution;
uniform vec2 i_repeat;
uniform float time;
uniform float borderRadius;
uniform vec3 cBlack;
uniform vec3 cFg;
uniform float textureAspect;
uniform float planeAspect;


float borderAlpha(vec2 uv, float radius) {
    vec2 aspectCorrectedUV = uv * resolution.xy / min(resolution.x, resolution.y);
    vec2 q = aspectCorrectedUV - 0.5 * resolution.xy / min(resolution.x, resolution.y);
    vec2 p = abs(q) - (vec2(0.5 * resolution.xy / min(resolution.x, resolution.y)) - radius);
    float dist = length(max(vec2(max(p.x, 0.0), max(p.y, 0.0)), 0.0));
    float alpha = max(p.x, p.y) < 0.0 ? 1.0 : 1.0 - smoothstep(radius - 0.01, radius, dist);
    return alpha;
}

float random (float v) {
    return fract(sin(v) * 1e4);
}

void main() {


    vec2 uv = vUv;
    uv.y = 1.0 - uv.y;
    vec2 uvScale = uv * (1.0/i_repeat);
    uvScale.y = 1.0 - uvScale.y;


    vec2 ipos = floor(uvScale);
    float fpos = fract(uvScale.y);


    float randx = clamp(random(ipos.y), 0.1, 1.0);
    float speed = (randx * 2.0 - 1.0) * time;
    uvScale.x = uvScale.x + speed;
    vec4 iFin = texture(tDiffuse, uvScale);
    float geoAlpha = borderAlpha(vUv, borderRadius) * opacity;
    float texAlpha=iFin.a;
    //fpos >= 0.95 || fpos <= 0.05 ||
    texAlpha= (texAlpha < 0.3) ? 0.0 : texAlpha;
    float finalAlpha= geoAlpha * texAlpha;
    //    if(cFg.r>0.5){
    //        if( iFin.r < 0.1 ) alpha = 0.0;
    //    }else{
    //        if( iFin.r > 0.9 ) alpha = 0.0;
    //    }
    gl_FragColor = vec4(cFg, finalAlpha);
}
