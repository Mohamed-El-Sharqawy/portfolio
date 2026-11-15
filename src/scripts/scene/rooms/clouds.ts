import {
  CanvasTexture, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, NormalBlending,
  PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type Camera, type Texture,
} from 'three';
import { rng } from '../texgen';

/**
 * Soft, volumetric-looking clouds in the style of drei's <Clouds>/<Cloud>
 * (the SkyDive section of the Fizzi site): each cloud is a cluster of
 * camera-facing "puffs" drawn with a blurry cloud texture. Puffs near the
 * middle of a cloud are bigger, every puff slowly turns and breathes, and
 * puffs fade out as they reach the camera, so you can fly straight through.
 *
 * Everything is one InstancedMesh (one draw call), re-sorted back-to-front
 * every frame so the soft edges blend properly.
 */

export interface CloudOptions {
  /** Centre, in the parent's space. */
  position: [number, number, number];
  /** Half-extents of the box puffs are scattered in. */
  bounds: [number, number, number];
  /** Number of puffs. */
  segments?: number;
  /** Diameter of the biggest (central) puffs. */
  volume?: number;
  /** Smallest volume, as a fraction of `volume`. */
  smallestVolume?: number;
  /** How much each puff swells and shrinks. */
  growth?: number;
  /** Turning / breathing speed. */
  speed?: number;
  opacity?: number;
  /** Puffs fade to nothing over this distance from the camera. */
  fade?: number;
  /** Underside shading, 0 = flat white, 1 = strong blue-grey belly. */
  shade?: number;
  seed?: number;
}

interface Puff {
  local: Vector3; // relative to its cloud
  cloud: CloudState;
  volume: number;
  growth: number;
  density: number;
  speed: number;
  rotation: number;
  rotationFactor: number;
  opacity: number;
  fade: number;
  shade: number;
  // per frame
  world: Vector3;
  dist: number;
  scale: number;
  alpha: number;
}

export interface CloudState {
  /** Move a whole cloud (e.g. a slow drift). Offsets are added to `position`. */
  offset: Vector3;
  position: Vector3;
}

/** Blurry, lumpy cloud puff (alpha only), like drei's cloud.png. */
export function puffTexture(seed = 5): Texture {
  const r = rng(seed);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  // overlapping soft blobs → a cauliflower-ish puff
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.7) * S * 0.2;
    const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.85;
    const rad = S * (0.12 + r() * 0.17);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const k = 0.4 + r() * 0.3;
    g.addColorStop(0, `rgba(255,255,255,${k})`);
    g.addColorStop(0.6, `rgba(255,255,255,${k * 0.6})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  // wispy grain so it isn't a perfect airbrush blob
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 140; i++) {
    const x = r() * S, y = r() * S, rad = 3 + r() * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // soft round falloff: never a hard square edge
  ctx.globalCompositeOperation = 'destination-in';
  const m = ctx.createRadialGradient(S / 2, S / 2, S * 0.08, S / 2, S / 2, S * 0.5);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.55, 'rgba(0,0,0,0.85)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, S, S);
  const tex = new CanvasTexture(c);
  tex.anisotropy = 2;
  return tex;
}

const VERT = /* glsl */ `
attribute float aOpacity;
attribute float aRot;
attribute float aShade;
varying vec2 vUv;
varying float vOpacity;
varying float vUp;
varying float vShade;
void main() {
  vUv = uv;
  vOpacity = aOpacity;
  vShade = aShade;
  // height of this corner on screen (the quad itself is spun around its centre)
  vUp = cos(aRot) * position.y + sin(aRot) * position.x;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uLit;
uniform vec3 uShadow;
varying vec2 vUv;
varying float vOpacity;
varying float vUp;
varying float vShade;
void main() {
  float a = texture2D(uMap, vUv).a * vOpacity;
  if (a < 0.004) discard;
  // lit from above (the light-blue ambient of the reference): bright tops, soft blue-grey bellies
  float lit = clamp(0.85 + vUp * 0.9 - vShade * 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(uShadow, uLit, lit), a);
}`;

export function createCloudField(limit: number, map: Texture = puffTexture()) {
  const geo = new PlaneGeometry(1, 1);
  const opacity = new InstancedBufferAttribute(new Float32Array(limit), 1).setUsage(DynamicDrawUsage);
  const rot = new InstancedBufferAttribute(new Float32Array(limit), 1).setUsage(DynamicDrawUsage);
  const shade = new InstancedBufferAttribute(new Float32Array(limit), 1).setUsage(DynamicDrawUsage);
  geo.setAttribute('aOpacity', opacity);
  geo.setAttribute('aRot', rot);
  geo.setAttribute('aShade', shade);
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uMap: { value: map },
      uLit: { value: new Color(0xffffff) },
      uShadow: { value: new Color(0xc9dbe8) },
    },
  });
  const mesh = new InstancedMesh(geo, material, limit);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  mesh.count = 0;

  const puffs: Puff[] = [];
  const clouds: CloudState[] = [];

  function addCloud(o: CloudOptions): CloudState {
    const r = rng(o.seed ?? 1);
    const cloud: CloudState = { offset: new Vector3(), position: new Vector3(...o.position) };
    clouds.push(cloud);
    const n = o.segments ?? 20;
    const [bx, by, bz] = o.bounds;
    const volume = o.volume ?? 4;
    const smallest = o.smallestVolume ?? 0.25;
    const speed = o.speed ?? 0.3;
    for (let i = 0; i < n && puffs.length < limit; i++) {
      // same scatter as drei: anywhere in the box; puffs near the middle grow biggest
      const p = new Vector3((r() * 2 - 1) * bx, (r() * 2 - 1) * by, (r() * 2 - 1) * bz);
      const edge = Math.max(Math.abs(p.x) / bx, Math.abs(p.y) / by, Math.abs(p.z) / bz);
      const inside = Math.max(smallest, 1 - edge);
      puffs.push({
        local: p,
        cloud,
        volume: inside * volume,
        growth: o.growth ?? volume * 0.25,
        density: Math.max(0.5, r()),
        speed,
        rotation: (Math.PI / n) * i + r() * 6,
        rotationFactor: Math.max(0.2, 0.5 * r()) * speed * (r() < 0.5 ? -1 : 1),
        opacity: o.opacity ?? 1,
        fade: o.fade ?? 5,
        // lower puffs are the shaded belly of the cloud
        shade: (o.shade ?? 0.6) * Math.min(1, Math.max(0, 0.5 - p.y / (by * 2))),
        world: new Vector3(),
        dist: 0,
        scale: 0,
        alpha: 0,
      });
    }
    return cloud;
  }

  const inv = new Matrix4();
  const camPos = new Vector3();
  const camQuat = new Quaternion();
  const camScale = new Vector3();
  const camDir = new Vector3();
  const spin = new Quaternion();
  const Z = new Vector3(0, 0, 1);
  const q = new Quaternion();
  const s = new Vector3();
  const m = new Matrix4();
  const tmp = new Vector3();
  const order: Puff[] = [];
  let time = 0;

  /**
   * Billboard, fade and depth-sort every puff. Call after the parent's world
   * matrix is current. `farFade` = [start, end] distance where puffs dissolve
   * into the haze.
   */
  function update(dt: number, camera: Camera, still: boolean, farFade: [number, number] = [30, 52]) {
    time += still ? dt : 0;
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(camPos, camQuat, camScale);
    camera.getWorldDirection(camDir);
    inv.copy(mesh.matrixWorld).invert();
    order.length = 0;
    for (const p of puffs) {
      if (still) p.rotation += dt * p.rotationFactor;
      p.world.copy(p.local).add(p.cloud.position).add(p.cloud.offset).applyMatrix4(mesh.matrixWorld);
      p.dist = p.world.distanceTo(camPos);
      // behind the camera: a camera-facing quad there is entirely behind you
      const ahead = tmp.copy(p.world).sub(camPos).dot(camDir);
      let a = p.opacity * Math.min(1, p.dist / p.fade);
      a *= 1 - smooth(farFade[0], farFade[1], p.dist);
      if (ahead < 0.05) a = 0;
      p.alpha = a;
      p.scale = p.volume + ((1 + Math.sin(time * p.density * p.speed * 2)) / 2) * p.growth;
      if (a > 0.003) order.push(p);
    }
    order.sort((a, b) => b.dist - a.dist);
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      q.copy(camQuat).multiply(spin.setFromAxisAngle(Z, p.rotation));
      s.set(p.scale, p.scale, p.scale);
      m.compose(p.world, q, s).premultiply(inv);
      mesh.setMatrixAt(i, m);
      opacity.setX(i, p.alpha);
      rot.setX(i, p.rotation);
      shade.setX(i, p.shade);
    }
    mesh.count = order.length;
    mesh.instanceMatrix.needsUpdate = true;
    opacity.needsUpdate = rot.needsUpdate = shade.needsUpdate = true;
  }

  return { mesh, addCloud, update, clouds };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
