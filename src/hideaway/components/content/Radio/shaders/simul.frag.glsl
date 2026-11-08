// The size of the computation (sizeX * sizeY) is defined as 'resolution' automatically in the shader.
// For example:
// #DEFINE resolution vec2( 1024.0, 1024.0 )

uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform float uTime;
uniform float uDelta;
uniform float uMouseFactor;

// Function to calculate the minimum distance from a point to a line segment
float distanceToSegment(vec2 point, vec2 start, vec2 end) {
    vec2 lineVec = end - start;
    vec2 pointVec = point - start;
    float lineLen = length(lineVec);
    vec2 lineUnitVec = lineVec / lineLen;
    float projLength = dot(pointVec, lineUnitVec);
    projLength = clamp(projLength, 0.0, lineLen);
    vec2 projPoint = start + lineUnitVec * projLength;
    return length(point - projPoint);
}

void main()
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 data = texture2D(tPosition, uv);

    // blacken over time
    data.r = mix(data.r, .5, uDelta * .002);
    data.g = mix(data.g, .5, uDelta * .002);
    data.b = mix(data.b, 0., uDelta * .001);

    float dist = distance(uMouse, uPrevMouse);
    dist *= 1. - step(.2, dist); // avoid big straight lines when entering the canvas

    //float aspect = min(resolution.x, resolution.y) / max(resolution.x, resolution.y);
    //float mixer = smoothstep(.65, .85, aspect);
    //float aspectCorrection = mix(1., 1., mixer);
    vec2 direction = normalize(uMouse - uPrevMouse);// * aspectCorrection;

    //direction = vec2(10., 10.);
    //float angle = atan(direction.y, direction.x);
    //float hue = degrees(angle);

    // Normalize hue from -180 to 180 to 0 to 1
    //hue = mod((hue / 360.0) + 1.0, 1.0);

    // Calculate the distance to the line segment from last mouse position to current
    float distanceToLine = distanceToSegment(uv, uPrevMouse, uMouse);

    float lineInfluence = 1. - smoothstep(0., .2, distanceToLine);
    lineInfluence = clamp(lineInfluence, 0., 1.);
    lineInfluence = pow(lineInfluence, .5);

    float velocityFactor = dist * 1.;
    float influence = lineInfluence * velocityFactor * uMouseFactor;
    data.r += direction.x * 2. * influence;
    data.g += direction.y * 2. * influence;
    data.b += influence;

    data.r = clamp(data.r, 0., 1.);
    data.g = clamp(data.g, 0., 1.);
    data.b = clamp(data.b, 0., 1.);

    gl_FragColor = data;
}