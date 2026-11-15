// Noise helpers. The sketch shader samples a precomputed tileable noise
// texture (uNoiseTex, 8 noise cells per tile) instead of evaluating fbm per
// pixel — several times cheaper on mobile GPUs.
uniform sampler2D uNoiseTex;

float fbm(vec2 p) {
  return texture2D(uNoiseTex, p * 0.125).r;
}

float vnoise(vec2 p) {
  return texture2D(uNoiseTex, p * 0.125).g;
}
