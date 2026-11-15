import { DoubleSide, Group, Mesh, PlaneGeometry } from 'three';
import { ROOM, COLORS } from '../config';
import { edgeFor, sketchMaterial } from '../materials';

/**
 * Room box in door-local space: x ∈ [-w/2, w/2], z ∈ [-depth, 0], y ∈ [0, h].
 * The front face (z = 0) is the corridor wall, which is double-sided.
 */
export function buildShell(tint: number = COLORS.paper, tintAmount = 0) {
  const g = new Group();
  const { width: W, depth: D, height: H } = ROOM;
  const add = (w: number, h: number, set: (m: Mesh) => void, t = tint, a = tintAmount) => {
    const m = new Mesh(new PlaneGeometry(w, h), sketchMaterial({ tint: t, tintAmount: a, edge: edgeFor(w, h, 0.03) }));
    set(m);
    g.add(m);
  };
  // floor in 2 strips + ceiling
  for (let i = 0; i < 2; i++)
    add(W, D / 2, (m) => { m.rotation.x = -Math.PI / 2; m.position.set(0, 0, -D / 4 - (i * D) / 2); }, COLORS.ochre, 0.14);
  add(W, D, (m) => { m.rotation.x = Math.PI / 2; m.position.set(0, H, -D / 2); }, COLORS.paper, 0);
  // back wall (faces +z), side walls face inward
  add(W, H, (m) => m.position.set(0, H / 2, -D));
  add(D, H, (m) => { m.rotation.y = Math.PI / 2; m.position.set(-W / 2, H / 2, -D / 2); });
  add(D, H, (m) => { m.rotation.y = -Math.PI / 2; m.position.set(W / 2, H / 2, -D / 2); });
  g.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) (m.material as { side: number }).side = DoubleSide;
  });
  return g;
}
