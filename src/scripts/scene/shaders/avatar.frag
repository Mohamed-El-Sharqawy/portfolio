// Avatar flipbook sprite.
// Two atlases with the same frame layout: the pencil drawing and a painted
// version. uFrame picks the cell; on hover the painted version spreads out
// from the cursor through the same noisy watercolour mask as the sketches.
#include noise.glsl;

uniform sampler2D uSketch;
uniform sampler2D uPainted;
uniform float uFrame;
uniform float uGrid;
uniform float uPaint;
uniform vec2 uPaintUV;
uniform float uTime;
uniform vec3 uPaper;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying float vViewDist;

void main() {
  float col = mod(uFrame, uGrid);
  float row = floor(uFrame / uGrid);
  // atlas row 0 is the top of the image (the KTX2 is y-flipped on encode)
  vec2 uv = (vec2(col, uGrid - 1.0 - row) + vUv) / uGrid;

  vec4 sketch = texture2D(uSketch, uv);
  if (sketch.a < 0.5) discard;

  vec3 c = sketch.rgb;
  if (uPaint > 0.001) {
    vec4 painted = texture2D(uPainted, uv);
    float d = distance(vUv * vec2(0.5, 1.0), uPaintUV * vec2(0.5, 1.0)) + (fbm(vUv * 6.0 + uTime * 0.15) - 0.5) * 0.25;
    float mask = 1.0 - smoothstep(uPaint - 0.06, uPaint, d);
    c = mix(c, painted.rgb, mask);
  }

  c = mix(c, uPaper, smoothstep(uFogNear, uFogFar, vViewDist));
  gl_FragColor = vec4(c, 1.0);
}
