import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type SceneUpdate = (t: number, dt: number, aspect: number) => void;

export type SceneInstance = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  update?: SceneUpdate;
  fitRadius?: number;
  minZ?: number;
  maxZ?: number;
};

const EMERALD = 0x10b981;
const EMERALD_BRIGHT = 0x34d399;
const EMERALD_DEEP = 0x064e3b;
const ZINC_LINE = 0x52525b;

function baseScene(fov: number, z: number) {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-5, -3, -4);
  scene.add(fill);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, z);
  return { scene, camera };
}

export function makeKnot(): SceneInstance {
  const { scene, camera } = baseScene(40, 8);
  const root = new THREE.Group();
  const spin = new THREE.Group();
  spin.rotation.y = 0.35;
  root.add(spin);
  scene.add(root);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.05, 0.3, 220, 24),
    new THREE.MeshStandardMaterial({
      color: 0x0a2018,
      metalness: 0.55,
      roughness: 0.35,
    }),
  );
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.TorusKnotGeometry(1.05, 0.3, 60, 10),
      18,
    ),
    new THREE.LineBasicMaterial({
      color: EMERALD_BRIGHT,
      transparent: true,
      opacity: 0.5,
    }),
  );
  spin.add(knot, wire);

  const rings = [2.15, 2.5].map((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.008, 8, 120),
      new THREE.MeshBasicMaterial({
        color: i ? ZINC_LINE : EMERALD,
        transparent: true,
        opacity: 0.6,
      }),
    );
    ring.rotation.x = Math.PI / 2.3 + i * 0.5;
    ring.rotation.y = i * 0.7;
    return ring;
  });
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 14),
    new THREE.MeshBasicMaterial({ color: EMERALD_BRIGHT }),
  );
  orb.position.set(2.15, 0, 0);
  rings[0].add(orb);
  root.add(rings[0], rings[1]);

  const update: SceneUpdate = (t, dt) => {
    spin.rotation.y += 0.15 * dt;
    spin.position.y = Math.sin(t * 1.4) * 0.1;
    rings[0].rotation.z += 0.7 * dt;
  };

  return { scene, camera, root, update, fitRadius: 3.1, minZ: 6, maxZ: 13 };
}

export function makeBlob(): SceneInstance {
  const { scene, camera } = baseScene(40, 6);
  const root = new THREE.Group();
  root.scale.setScalar(0.6);
  scene.add(root);

  const geo = mergeVertices(new THREE.IcosahedronGeometry(1.75, 5));
  const blob = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x06281e,
      metalness: 0.25,
      roughness: 0.3,
      emissive: EMERALD_DEEP,
      emissiveIntensity: 0.4,
    }),
  );
  root.add(blob);

  const base = Float32Array.from(
    geo.attributes.position.array as Float32Array,
  );
  let phase = 0;
  const update: SceneUpdate = (t, dt) => {
    phase += 0.72 * dt;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const z = base[i + 2];
      const n =
        Math.sin(x * 1.8 + phase) *
        Math.cos(y * 2.1 + phase * 1.3) *
        Math.sin(z * 1.6 + phase * 0.7);
      const s = 1 + n * 0.14;
      pos[i] = x * s;
      pos[i + 1] = y * s;
      pos[i + 2] = z * s;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    root.rotation.y += 0.1 * dt;
    root.position.y = Math.sin(t * 0.8) * 0.15;
  };

  return { scene, camera, root, update, fitRadius: 1.4 };
}

export function makeParticles(): SceneInstance {
  const { scene, camera } = baseScene(40, 7);
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.55;
  root.add(tilt);
  scene.add(root);

  const COUNT = 3600;
  const COLS = 60;
  const SPAN = 4.2;
  const pos = new Float32Array(COUNT * 3);
  const sphere = new Float32Array(COUNT * 3);
  const grid = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963;
    sphere[i * 3] = Math.cos(th) * r * 1.9;
    sphere[i * 3 + 1] = y * 1.9;
    sphere[i * 3 + 2] = Math.sin(th) * r * 1.9;
    grid[i * 3] = ((i % COLS) / (COLS - 1) - 0.5) * SPAN;
    grid[i * 3 + 1] = 0;
    grid[i * 3 + 2] =
      (Math.floor(i / COLS) / (COLS - 1) - 0.5) * SPAN;
    seed[i] = Math.random() * Math.PI * 2;
  }
  pos.set(sphere);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: EMERALD_BRIGHT,
      size: 0.035,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  tilt.add(points);

  let phase = 0;
  const update: SceneUpdate = (_t, dt) => {
    phase += 0.24 * dt;
    const m = (Math.sin(phase) + 1) / 2;
    for (let i = 0; i < COUNT; i++) {
      const j = Math.sin(phase * 2 + seed[i]) * 0.07;
      for (let k = 0; k < 3; k++) {
        pos[i * 3 + k] =
          sphere[i * 3 + k] * (1 - m) + grid[i * 3 + k] * m + j;
      }
    }
    geo.attributes.position.needsUpdate = true;
    root.rotation.y += 0.12 * dt;
  };

  return { scene, camera, root, update, fitRadius: 2.6 };
}

export function makeConstellation(): SceneInstance {
  const { scene, camera } = baseScene(40, 6.5);
  const root = new THREE.Group();
  scene.add(root);

  const core = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.72, 1)),
    new THREE.LineBasicMaterial({
      color: EMERALD_BRIGHT,
      transparent: true,
      opacity: 0.85,
    }),
  );
  root.add(core);

  const NODES = 8;
  const linkPos: number[] = [];
  const nodes: { mesh: THREE.Mesh; y: number }[] = [];
  for (let i = 0; i < NODES; i++) {
    const y = 1 - (i / (NODES - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963;
    const x = Math.cos(th) * r * 1.95;
    const ny = y * 1.55;
    const z = Math.sin(th) * r * 1.95;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 12, 12),
      new THREE.MeshBasicMaterial({ color: EMERALD_BRIGHT }),
    );
    mesh.position.set(x, ny, z);
    root.add(mesh);
    nodes.push({ mesh, y: ny });
    linkPos.push(0, 0, 0, x, ny, z);
  }
  const links = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linkPos, 3),
    ),
    new THREE.LineBasicMaterial({
      color: ZINC_LINE,
      transparent: true,
      opacity: 0.5,
    }),
  );
  root.add(links);

  let phase = 0;
  const update: SceneUpdate = (_t, dt) => {
    phase += 0.72 * dt;
    core.rotation.y += 0.48 * dt;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.mesh.position.y =
        node.y + Math.sin(phase + i * 1.3) * 0.14;
    }
    root.rotation.y += 0.1 * dt;
  };

  return { scene, camera, root, update, fitRadius: 2.1 };
}

export function makeHelix(): SceneInstance {
  const { scene, camera } = baseScene(40, 6);
  const root = new THREE.Group();
  scene.add(root);

  const strand = (phase: number, color: number) => {
    const n = 520;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const a = t * Math.PI * 5 + phase;
      const r = 0.55 + t;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (t - 0.5) * 4.1;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color,
        size: 0.045,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
  };
  root.add(strand(0, EMERALD_BRIGHT), strand(Math.PI, EMERALD));

  const update: SceneUpdate = (_t, dt, aspect) => {
    root.rotation.y += 0.36 * dt;
    root.scale.setScalar(
      THREE.MathUtils.clamp(aspect / 0.6, 0.4, 1),
    );
  };

  return {
    scene,
    camera,
    root,
    update,
    fitRadius: 1.7,
    minZ: 5.8,
    maxZ: 7.4,
  };
}
