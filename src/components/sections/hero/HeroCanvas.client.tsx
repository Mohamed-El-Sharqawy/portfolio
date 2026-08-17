"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/react_logo.glb";
const NODE_COUNT = 7;
const NODE_RADIUS = 2.3;
const PULSE_COUNT = 4;
const MAX_PARALLAX = 0.3;

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push(
      new THREE.Vector3(
        Math.cos(theta) * ring * radius,
        y * radius,
        Math.sin(theta) * ring * radius,
      ),
    );
  }
  return points;
}

function Pulses({
  nodes,
  reduced,
}: {
  nodes: THREE.Vector3[];
  reduced: boolean;
}) {
  const meshes = useRef<Array<THREE.Mesh | null>>([]);
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const pulses = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, i) => ({
        target: i % nodes.length,
        progress: -i * 0.4,
        speed: 0.3 + i * 0.08,
      })),
    [nodes],
  );

  useFrame((_, delta) => {
    if (reduced) return;
    pulses.forEach((pulse, i) => {
      pulse.progress += delta * pulse.speed;
      if (pulse.progress > 1) {
        pulse.progress = -Math.random() * 0.6;
        pulse.target = Math.floor(Math.random() * nodes.length);
      }
      const mesh = meshes.current[i];
      if (!mesh) return;
      const clamped = Math.min(Math.max(pulse.progress, 0), 1);
      const eased = clamped * clamped * (3 - 2 * clamped);
      mesh.position.lerpVectors(origin, nodes[pulse.target], eased);
      mesh.visible = pulse.progress > 0;
    });
  });

  return (
    <>
      {Array.from({ length: PULSE_COUNT }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
        >
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      ))}
    </>
  );
}

function AgentNetwork({
  reduced,
  onReady,
}: {
  reduced: boolean;
  onReady: () => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const parallax = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);

  const nodes = useMemo(() => fibonacciSphere(NODE_COUNT, NODE_RADIUS), []);

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(nodes.length * 6);
    nodes.forEach((point, i) => {
      positions.set([0, 0, 0, point.x, point.y, point.z], i * 6);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [nodes]);

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.8 / Math.max(size.x, size.y, size.z);
    scene.scale.setScalar(scale);
    scene.position.copy(center).multiplyScalar(-scale);
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.isMeshStandardMaterial) {
          standard.metalness = Math.min(standard.metalness, 0.5);
          standard.roughness = Math.max(standard.roughness, 0.35);
        }
      });
    });
  }, [scene]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((state, delta) => {
    if (reduced) return;
    if (spin.current) {
      spin.current.rotation.y += 0.15 * delta;
    }
    if (parallax.current) {
      const ease = 1 - Math.exp(-3.5 * delta);
      parallax.current.rotation.x +=
        (state.pointer.y * MAX_PARALLAX - parallax.current.rotation.x) * ease;
      parallax.current.rotation.y +=
        (state.pointer.x * MAX_PARALLAX - parallax.current.rotation.y) * ease;
    }
  });

  return (
    <group ref={parallax}>
      <group ref={spin} rotation={[0, 0.35, 0]}>
        <Float
          enabled={!reduced}
          speed={1.4}
          rotationIntensity={0.25}
          floatIntensity={0.7}
        >
          <primitive object={scene} />
        </Float>
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#52525b" transparent opacity={0.35} />
        </lineSegments>
        {nodes.map((point, i) => (
          <group key={i} position={point}>
            <mesh>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color="#34d399" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshBasicMaterial
                color="#34d399"
                transparent
                opacity={0.15}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <Pulses nodes={nodes} reduced={reduced} />
      </group>
    </group>
  );
}

function AdaptiveCamera() {
  const camera = useThree(
    (state) => state.camera,
  ) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const aspect = Math.max(0.1, size.width / size.height);
    const tan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const distance = 2.55 / (tan * Math.min(aspect, 1));
    camera.position.set(0, 0, Math.min(9.2, Math.max(6.5, distance)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  return null;
}

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export default function HeroCanvas() {
  const isClient = useIsClient();
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!isClient) return null;

  return (
    <div className="relative h-full min-h-[max(420px,52vh)] w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_65%)]"
      />
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <Canvas
          camera={{ position: [0, 0, 6.5], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          frameloop={reduced ? "demand" : "always"}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1.6} />
          <directionalLight position={[-5, -3, -4]} intensity={0.5} />
          <AdaptiveCamera />
          <Suspense fallback={null}>
            <AgentNetwork reduced={reduced} onReady={handleReady} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
