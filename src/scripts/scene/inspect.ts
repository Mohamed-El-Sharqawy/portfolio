import {
  Box3, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3,
  type Object3D, type PerspectiveCamera, type Scene,
} from 'three';
import { COLORS } from './config';

/**
 * "Take it off the wall": a picked frame / board glides to the middle of the
 * view, turns to face you and is sized to fit the screen, while the scene
 * behind it fades back. It follows the view while you look around, and glides
 * back to its exact spot on the wall when closed.
 *
 * The object never leaves its parent: every frame its wanted world transform
 * is worked out (wall pose ⇄ in-front-of-you pose) and converted back into
 * its parent's space. Objects are expected to face their local +z.
 */
export function createInspector(scene: Scene, camera: PerspectiveCamera, reducedMotion: boolean) {
  interface Open {
    obj: Object3D;
    pos: Vector3;
    quat: Quaternion;
    scale: Vector3;
    /** Size of the object in its own space (before its own scale). */
    size: Vector3;
    /** Its materials' sketch light, and where it pointed on the wall. */
    lights: Array<{ dir: Vector3; home: Vector3 }>;
    k: number; // 0 = on the wall, 1 = in front of you
    dir: 1 | -1;
    onDone?: () => void;
  }
  let cur: Open | null = null;

  // a paper veil just behind the object, so the scene steps back
  const veilMat = new MeshBasicMaterial({ color: COLORS.paper, transparent: true, opacity: 0, depthWrite: false });
  const veil = new Mesh(new PlaneGeometry(1, 1), veilMat);
  veil.visible = false;
  veil.renderOrder = 50;
  veil.raycast = () => {};
  veil.matrixAutoUpdate = true;
  scene.add(veil);

  const hint = document.createElement('p');
  hint.className = 'inspect-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = `${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click'} anywhere to put it back`;
  document.body.appendChild(hint);

  const box = new Box3();
  const inv = new Matrix4();
  const m = new Matrix4();
  const camPos = new Vector3(), camQuat = new Quaternion(), fwd = new Vector3(), up = new Vector3();
  const homeP = new Vector3(), homeQ = new Quaternion(), homeS = new Vector3();
  const tp = new Vector3(), tq = new Quaternion(), lightTo = new Vector3();
  const p = new Vector3(), q = new Quaternion();
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /** The sketch-light uniforms of every material in `obj`. */
  function lightsOf(obj: Object3D) {
    const out: Array<{ dir: Vector3; home: Vector3 }> = [];
    obj.traverse((o) => {
      const dir = ((o as Mesh).material as { uniforms?: { uLightDir?: { value: Vector3 } } } | undefined)?.uniforms?.uLightDir?.value;
      if (dir && !out.some((l) => l.dir === dir)) out.push({ dir, home: dir.clone() });
    });
    return out;
  }

  /** Size of `obj` in its own space (meshes' bounds, without the object's own transform). */
  function localSize(obj: Object3D) {
    obj.updateMatrixWorld(true);
    inv.copy(obj.matrixWorld).invert();
    box.makeEmpty();
    const b = new Box3();
    obj.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      mesh.geometry.computeBoundingBox();
      b.copy(mesh.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld));
      box.union(b);
    });
    return box.getSize(new Vector3());
  }

  function open(obj: Object3D) {
    if (cur?.obj === obj) return;
    if (cur) snapHome();
    cur = {
      obj,
      pos: obj.position.clone(),
      quat: obj.quaternion.clone(),
      scale: obj.scale.clone(),
      size: localSize(obj),
      lights: lightsOf(obj),
      k: 0,
      dir: 1,
    };
    // you're reading it: finish drawing it in now (the draw-in follows its spot on the wall)
    obj.traverse((o) => {
      const u = ((o as Mesh).material as { uniforms?: { uProgress?: { value: number } } } | undefined)?.uniforms?.uProgress;
      if (u) u.value = 1;
    });
    hint.classList.add('is-on');
  }

  function close(onDone?: () => void) {
    if (!cur) return onDone?.();
    cur.dir = -1;
    cur.onDone = onDone;
    hint.classList.remove('is-on');
  }

  /** Straight back to the wall, no animation (leaving the room / corridor). */
  function snapHome() {
    if (!cur) return;
    const c = cur;
    c.obj.position.copy(c.pos);
    c.obj.quaternion.copy(c.quat);
    c.obj.scale.copy(c.scale);
    c.obj.updateMatrixWorld(true);
    for (const l of c.lights) l.dir.copy(l.home);
    veil.visible = false;
    hint.classList.remove('is-on');
    cur = null;
    c.onDone?.();
  }

  /** Per frame, after the camera is placed. Returns true while something is shown or moving. */
  function update(dt: number): boolean {
    if (!cur) return false;
    const c = cur;
    c.k = reducedMotion ? (c.dir > 0 ? 1 : 0) : Math.min(1, Math.max(0, c.k + (c.dir * dt) / 0.55));
    const parent = c.obj.parent;
    if (!parent) return (cur = null), false;

    // where it hangs on the wall (world)
    m.compose(c.pos, c.quat, c.scale).premultiply(parent.matrixWorld);
    m.decompose(homeP, homeQ, homeS);

    // where it goes: in front of the eye, facing it, fitted to the view
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(camPos, camQuat, fwd);
    fwd.set(0, 0, -1).applyQuaternion(camQuat);
    up.set(0, 1, 0).applyQuaternion(camQuat);
    const w = c.size.x * homeS.x, h = c.size.y * homeS.y;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const fitH = 0.66, fitW = camera.aspect < 1 ? 0.9 : 0.8;
    const dist = Math.max(0.45, h / (2 * tan * fitH), w / (2 * tan * camera.aspect * fitW));
    // a touch below the middle: the top bar sits over the upper edge
    tp.copy(camPos).addScaledVector(fwd, dist).addScaledVector(up, -dist * tan * 0.04);
    tq.copy(camQuat);

    const e = ease(c.k);
    p.lerpVectors(homeP, tp, e);
    // a little lift on the way, so it comes off the wall rather than sliding through it
    p.addScaledVector(up, Math.sin(Math.PI * e) * 0.12);
    q.slerpQuaternions(homeQ, tq, e);
    m.compose(p, q, homeS).premultiply(inv.copy(parent.matrixWorld).invert());
    m.decompose(c.obj.position, c.obj.quaternion, c.obj.scale);
    c.obj.updateMatrixWorld(true);

    // light it from your side (a room's turned walls can leave its face in shadow, i.e. heavily hatched)
    lightTo.copy(fwd).negate().addScaledVector(up, 0.35).normalize();
    for (const l of c.lights) l.dir.copy(l.home).lerp(lightTo, e).normalize();

    // the veil, just behind it
    veil.visible = e > 0.001;
    veilMat.opacity = 0.72 * e;
    veil.position.copy(tp).addScaledVector(fwd, Math.max(0.15, c.size.z * homeS.z + 0.1));
    veil.quaternion.copy(camQuat);
    const vd = dist + 0.3;
    veil.scale.set(2 * vd * tan * camera.aspect * 1.3, 2 * vd * tan * 1.3, 1);
    veil.updateMatrixWorld();

    if (c.dir < 0 && c.k <= 0) snapHome();
    return true;
  }

  return {
    open,
    close,
    snapHome,
    update,
    /** The object being looked at (also while it glides back). */
    get object() {
      return cur?.obj ?? null;
    },
    /** True while an object is up (not on its way back). */
    get active() {
      return !!cur && cur.dir > 0;
    },
  };
}
