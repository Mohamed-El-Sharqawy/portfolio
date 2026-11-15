// Avatar flipbook sprite — vertex stage.
varying vec2 vUv;
varying float vViewDist;

void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
