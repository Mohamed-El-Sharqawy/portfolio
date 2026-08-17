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

if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_URL);
}

function HeroModel({
  reduced,
  onReady,
}: {
  reduced: boolean;
  onReady: () => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const drag = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const dragState = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
  });
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.9 / Math.max(size.x, size.y, size.z);
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

  useEffect(() => {
    const el = gl.domElement;
    const s = dragState.current;
    const clampX = (x: number) =>
      THREE.MathUtils.clamp(x, -0.85, 0.85);
    const onDown = (e: PointerEvent) => {
      s.active = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.velX = 0;
      s.velY = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!s.active || !drag.current) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.velY = dx * 0.005;
      s.velX = dy * 0.005;
      drag.current.rotation.y += s.velY;
      drag.current.rotation.x = clampX(drag.current.rotation.x + s.velX);
      invalidate();
    };
    const onUp = () => {
      s.active = false;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, invalidate]);

  useFrame((_, delta) => {
    const s = dragState.current;
    if (spin.current && !reduced) {
      spin.current.rotation.y += 0.15 * delta;
    }
    if (s.active || reduced || !drag.current) return;
    if (Math.abs(s.velX) < 0.00005 && Math.abs(s.velY) < 0.00005) return;
    const decay = Math.pow(0.94, delta * 60);
    s.velX *= decay;
    s.velY *= decay;
    drag.current.rotation.y += s.velY;
    drag.current.rotation.x = THREE.MathUtils.clamp(
      drag.current.rotation.x + s.velX,
      -0.85,
      0.85,
    );
  });

  return (
    <group ref={drag}>
      <group ref={spin} rotation={[0, 0.35, 0]}>
        <Float
          enabled={!reduced}
          speed={1.4}
          rotationIntensity={0.25}
          floatIntensity={0.7}
        >
          <primitive object={scene} />
        </Float>
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
          className="cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1.6} />
          <directionalLight position={[-5, -3, -4]} intensity={0.5} />
          <AdaptiveCamera />
          <Suspense fallback={null}>
            <HeroModel reduced={reduced} onReady={handleReady} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
