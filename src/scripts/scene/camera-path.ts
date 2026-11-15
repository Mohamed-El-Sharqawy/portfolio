import { CatmullRomCurve3, Vector3 } from 'three';
import { EYE_HEIGHT } from './config';

/**
 * First-person path down the corridor. Scroll progress (0–1) maps to a
 * position on the curve; the look target sits a little further along it.
 * The slight left/right weave gives each door a three-quarter view.
 */
export function createCameraPath() {
  const y = EYE_HEIGHT;
  const curve = new CatmullRomCurve3(
    [
      new Vector3(0.0, y, 6.0),
      new Vector3(0.15, y, 1.0),
      new Vector3(0.35, y, -6.0),
      new Vector3(-0.35, y, -15.0),
      new Vector3(0.35, y, -24.0),
      new Vector3(-0.35, y, -33.0),
      new Vector3(0.0, y, -39.5),
    ],
    false,
    'centripetal',
  );
  const LOOK_AHEAD = 0.06;
  const tangent = new Vector3();

  /** Writes the camera position and look target for curve parameter t ∈ [0, 1]. */
  function pose(t: number, pos: Vector3, target: Vector3) {
    const tt = Math.min(1, Math.max(0, t));
    curve.getPointAt(tt, pos);
    const ahead = tt + LOOK_AHEAD;
    if (ahead <= 1) {
      curve.getPointAt(ahead, target);
    } else {
      curve.getTangentAt(1, tangent);
      target.copy(curve.getPointAt(1)).addScaledVector(tangent, (ahead - 1) * curve.getLength());
    }
    target.y = EYE_HEIGHT - 0.05;
  }

  /** Curve parameter at which the camera is level with world z (z decreases along the path). */
  function tForZ(z: number) {
    let lo = 0;
    let hi = 1;
    const p = new Vector3();
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      curve.getPointAt(mid, p);
      if (p.z > z) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** A look target a little *behind* t on the path (for walking backwards). */
  function behind(t: number, target: Vector3) {
    const tt = Math.min(1, Math.max(0, t));
    const back = tt - LOOK_AHEAD;
    if (back >= 0) curve.getPointAt(back, target);
    else {
      curve.getTangentAt(0, tangent);
      target.copy(curve.getPointAt(0)).addScaledVector(tangent, back * curve.getLength());
    }
    target.y = EYE_HEIGHT - 0.05;
  }

  return { curve, pose, behind, tForZ };
}
export type CameraPath = ReturnType<typeof createCameraPath>;
