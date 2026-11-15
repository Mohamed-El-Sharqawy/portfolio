// Door glow outline: a wobbly hand-drawn rectangle that glows on hover/focus.
#include noise.glsl;

uniform float uHover;   // 0..1
uniform float uTime;
uniform vec2 uSize;     // plane size in world units
uniform float uInset;   // distance of the line from the plane edge (world units)
uniform vec3 uColor;
uniform vec3 uCore;

varying vec2 vUv;

void main() {
  vec2 p = vUv * uSize;
  float e = min(min(p.x, uSize.x - p.x), p.y);           // no line on the floor edge
  e = min(e, uSize.y - p.y);
  float along = (vUv.x * uSize.x + vUv.y * uSize.y) * 3.0;
  float wob = (vnoise(vec2(along, uTime * 0.6)) - 0.5) * 0.05;
  float d = abs(e - uInset + wob);

  float core = 1.0 - smoothstep(0.008, 0.022, d);
  float glow = exp(-d * 26.0) * (0.75 + 0.25 * sin(uTime * 3.0 + along * 0.5));
  float a = (core * 0.95 + glow * 0.6) * uHover;
  if (a < 0.003) discard;
  vec3 col = mix(uColor, uCore, core);
  gl_FragColor = vec4(col, a);
}
