// Sketch material — vertex stage.
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vViewDist;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * wp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
