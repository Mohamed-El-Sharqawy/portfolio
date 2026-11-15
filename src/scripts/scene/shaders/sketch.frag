// Sketch material — "hand-drawn pencil on paper".
//
//  * Tone from a fixed light is turned into up to three hatching layers taken
//    from a pencil-stroke atlas (R/G/B = light/mid/dark hatching).
//  * uProgress (0..1, driven by camera distance on the CPU) reveals strokes:
//    a stroke shows where its draw-order id (atlas alpha) is below a noisy
//    threshold, so strokes appear one by one and grow along their length.
//  * Face outlines are drawn from the UV border with a wobbly pencil line.
//  * Hover "paint reveal" (under the drawn lines): watercolor (terracotta/ochre) spreads from the
//    cursor's UV point through an expanding noise mask (uPaint radius,
//    animated with GSAP).

#include noise.glsl;

uniform sampler2D uPaperTex;
uniform sampler2D uStrokeTex;
uniform sampler2D uMap;
uniform float uHasMap;

uniform float uProgress;
uniform float uTime;
uniform float uSeed;
uniform float uQuality;     // 0 = low, 1 = high

uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uTint;
uniform float uTintAmount;
uniform vec2 uEdge;         // outline width in UV units per axis (0 = no outline)
uniform float uHatchScale;
uniform vec3 uLightDir;

uniform float uPaint;       // paint radius in UV units (0 = none)
uniform vec2 uPaintUV;
uniform vec3 uPaintColor;

uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;

// Planar world-space projection: keeps stroke size constant across meshes.
vec2 planarUV(vec3 n) {
  vec3 a = abs(n);
  if (a.y > a.x && a.y > a.z) return vWorldPos.xz;
  if (a.x > a.z) return vWorldPos.zy;
  return vWorldPos.xy;
}

float reveal(float id, float threshold) {
  return 1.0 - smoothstep(threshold - 0.06, threshold, id);
}

void main() {
  vec3 N = normalize(vNormalW);
  if (!gl_FrontFacing) N = -N;

  vec2 huv = planarUV(N) * uHatchScale + uSeed * 0.37;
  vec4 strokes = texture2D(uStrokeTex, huv);

  // Noisy reveal threshold: some regions get "drawn" before others.
  float n = fbm(huv * 1.7 + uSeed);
  float threshold = uProgress * 1.25 - 0.1 - (n - 0.5) * 0.35;
  float rev = reveal(strokes.a, threshold);

  // Tone: half-lambert from a fixed sketch light + soft rim.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float lambert = dot(N, normalize(uLightDir)) * 0.5 + 0.5;
  float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 5.0);
  // compressed tone range: paper stays light, only the shadow sides get dense
  float dark = clamp((1.0 - lambert) * 0.82 + rim * 0.1, 0.0, 1.0);

  float h1 = strokes.r * smoothstep(0.2, 0.42, dark);
  float h2 = strokes.g * smoothstep(0.48, 0.68, dark) * 0.8;
  float h3 = strokes.b * smoothstep(0.7, 0.9, dark) * 0.7 * uQuality;
  float hatch = max(h1, max(h2, h3)) * rev;

  // Paper base with grain, plus a watercolor wash that fades in as drawn.
  float grain = texture2D(uPaperTex, huv * 0.3).r;
  vec3 col = uPaper * mix(0.955, 1.0, grain);
  float washMask = smoothstep(0.25, 0.9, uProgress) * (0.82 + 0.18 * vnoise(vUv * 9.0 + uSeed));
  col = mix(col, uTint * mix(0.92, 1.0, grain), uTintAmount * washMask);

  // Hover paint reveal.
  if (uPaint > 0.001) {
    float d = distance(vUv, uPaintUV);
    float edgeNoise = (fbm(vUv * 6.0 + uTime * 0.15) - 0.5) * 0.3;
    float dd = d + edgeNoise;
    float mask = 1.0 - smoothstep(uPaint - 0.06, uPaint, dd);
    float bleed = smoothstep(uPaint - 0.12, uPaint - 0.01, dd) * mask; // darker pigment rim
    vec3 pigment = uPaintColor * mix(0.9, 1.05, grain);
    col = mix(col, pigment, mask * 0.62);
    col *= 1.0 - bleed * 0.18;
  }

  // Drawn texture (signs, frames, letters): revealed through the same noise.
  if (uHasMap > 0.5) {
    vec4 m = texture2D(uMap, vUv);
    float mRev = reveal(fbm(vUv * 7.0 + uSeed) * 0.85, uProgress * 1.2);
    col = mix(col, m.rgb, m.a * mRev);
  }

  // Pencil outline along the UV border (box faces / planes).
  float line = 0.0;
  if (uEdge.x > 0.0) {
    // distance to the nearest UV border, normalised so 1.0 == line width
    float ex = min(vUv.x, 1.0 - vUv.x) / uEdge.x;
    float ey = min(vUv.y, 1.0 - vUv.y) / uEdge.y;
    float e = min(ex, ey);
    float along = (vUv.x + vUv.y) * 9.0 + uSeed;
    e += (vnoise(vec2(along, uSeed)) - 0.5) * 0.8;
    line = 1.0 - smoothstep(0.35, 1.0, e);
    float lineRev = reveal(vnoise(vec2(along * 0.6, uSeed * 3.1)), uProgress * 1.3);
    line *= lineRev * (0.75 + 0.25 * vnoise(vec2(along * 4.0, 1.0)));
  }

  float inkAmt = clamp(hatch * 0.55 + line * 0.9 + rim * 0.12 * rev, 0.0, 1.0);
  col = mix(col, uInk, inkAmt);

  // Fade into the paper with distance (sketch "fog").
  float fog = smoothstep(uFogNear, uFogFar, vViewDist);
  col = mix(col, uPaper, fog);

  gl_FragColor = vec4(col, 1.0);
}
