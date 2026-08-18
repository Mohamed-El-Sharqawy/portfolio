"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  makeBlob,
  makeConstellation,
  makeHelix,
  makeKnot,
  makeParticles,
} from "./scenes";
import type { SceneInstance } from "./scenes";

type SceneName = "knot" | "blob" | "particles" | "constellation" | "helix";

const FACTORIES: Record<SceneName, () => SceneInstance> = {
  knot: makeKnot,
  blob: makeBlob,
  particles: makeParticles,
  constellation: makeConstellation,
  helix: makeHelix,
};

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const DPR_MAX = 1.75;
const ROOT_MARGIN = "200px";
const DRAG_CLAMP = 0.85;

type DragState = {
  active: boolean;
  lastX: number;
  lastY: number;
  velX: number;
  velY: number;
};

type Entry = {
  anchor: HTMLElement;
  instance: SceneInstance;
  interactive: boolean;
  visible: boolean;
  lastAspect: number;
  drag: DragState;
};

export default function SceneDirector() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
    } catch {
      host.remove();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    const applySize = () => {
      renderer.setPixelRatio(
        Math.max(1, Math.min(window.devicePixelRatio, DPR_MAX)),
      );
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    };
    applySize();
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const entries: Entry[] = [];
    const dragCleanups: Array<() => void> = [];
    let raf = 0;
    const clock = new THREE.Clock();

    const reduced = () =>
      window.matchMedia(REDUCED_QUERY).matches;
    const mobile = () => window.matchMedia(MOBILE_QUERY).matches;

    let initObserver = new IntersectionObserver(() => {}, {});
    let visibilityObserver = new IntersectionObserver(() => {}, {});

    const fitCamera = (entry: Entry, width: number, height: number) => {
      const aspect = Math.max(0.1, width / Math.max(1, height));
      if (Math.abs(aspect - entry.lastAspect) > 0.001) {
        entry.lastAspect = aspect;
        entry.instance.camera.aspect = aspect;
        entry.instance.camera.updateProjectionMatrix();
      }
      const { fitRadius, minZ, maxZ, camera } = entry.instance;
      if (!fitRadius) return;
      const tan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
      const distance = fitRadius / (tan * Math.min(aspect, 1));
      camera.position.z = THREE.MathUtils.clamp(
        distance,
        minZ ?? 4,
        maxZ ?? 14,
      );
      camera.lookAt(0, 0, 0);
    };

    const renderScene = (entry: Entry, animate: boolean, t: number, dt: number) => {
      const rect = entry.anchor.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        return;
      }
      fitCamera(entry, rect.width, rect.height);
      if (animate && entry.instance.update) {
        entry.instance.update(t, dt, entry.lastAspect);
      }
      const left = rect.left;
      const bottom = window.innerHeight - rect.bottom;
      renderer.setViewport(left, bottom, rect.width, rect.height);
      renderer.setScissor(left, bottom, rect.width, rect.height);
      renderer.render(entry.instance.scene, entry.instance.camera);
    };

    const applyInertia = (dt: number) => {
      for (const entry of entries) {
        if (!entry.interactive) continue;
        const drag = entry.drag;
        if (drag.active) continue;
        if (
          Math.abs(drag.velX) < 0.00005 &&
          Math.abs(drag.velY) < 0.00005
        ) {
          continue;
        }
        const decay = Math.pow(0.94, dt * 60);
        drag.velX *= decay;
        drag.velY *= decay;
        const root = entry.instance.root;
        root.rotation.y += drag.velY;
        root.rotation.x = THREE.MathUtils.clamp(
          root.rotation.x + drag.velX,
          -DRAG_CLAMP,
          DRAG_CLAMP,
        );
      }
    };

    const renderAll = (animate: boolean) => {
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (animate) applyInertia(dt);
      for (const entry of entries) {
        if (animate && !entry.visible) continue;
        renderScene(entry, animate, t, dt);
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      renderAll(true);
    };

    const attachDrag = (entry: Entry) => {
      if (!entry.interactive) return;
      const drag = entry.drag;
      const root = entry.instance.root;
      const anchor = entry.anchor;
      const clampX = (x: number) =>
        THREE.MathUtils.clamp(x, -DRAG_CLAMP, DRAG_CLAMP);
      const onDown = (e: PointerEvent) => {
        drag.active = true;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.velX = 0;
        drag.velY = 0;
      };
      const onMove = (e: PointerEvent) => {
        if (!drag.active) return;
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.velY = dx * 0.005;
        drag.velX = dy * 0.005;
        root.rotation.y += drag.velY;
        root.rotation.x = clampX(root.rotation.x + drag.velX);
        if (reduced()) renderAll(false);
      };
      const onUp = () => {
        drag.active = false;
      };
      anchor.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      dragCleanups.push(() => {
        anchor.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      });
    };

    const buildEntry = (anchor: HTMLElement) => {
      const name = anchor.dataset.scene as SceneName | undefined;
      const factory = name ? FACTORIES[name] : undefined;
      if (!factory) return;
      const entry: Entry = {
        anchor,
        instance: factory(),
        interactive: anchor.hasAttribute("data-interactive"),
        visible: false,
        lastAspect: 0,
        drag: { active: false, lastX: 0, lastY: 0, velX: 0, velY: 0 },
      };
      entries.push(entry);
      visibilityObserver.observe(anchor);
      attachDrag(entry);
      if (reduced()) {
        renderAll(false);
      } else if (!raf) {
        clock.getDelta();
        raf = requestAnimationFrame(frame);
      }
    };

    const disposeEntries = () => {
      for (const entry of entries) {
        entry.instance.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
              ? [mesh.material]
              : [];
          for (const material of materials) material.dispose();
        });
      }
      entries.length = 0;
    };

    const boot = () => {
      initObserver = new IntersectionObserver(
        (records, observer) => {
          for (const record of records) {
            if (!record.isIntersecting) continue;
            observer.unobserve(record.target);
            buildEntry(record.target as HTMLElement);
          }
        },
        { rootMargin: ROOT_MARGIN },
      );
      visibilityObserver = new IntersectionObserver((records) => {
        for (const record of records) {
          const entry = entries.find(
            (candidate) => candidate.anchor === record.target,
          );
          if (entry) entry.visible = record.isIntersecting;
        }
      });
      const anchors = Array.from(
        document.querySelectorAll<HTMLElement>("[data-scene]"),
      );
      for (const anchor of anchors) {
        if (anchor.dataset.mobile === "off" && mobile()) continue;
        initObserver.observe(anchor);
      }
    };

    const teardown = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      initObserver.disconnect();
      visibilityObserver.disconnect();
      for (const cleanup of dragCleanups.splice(0)) cleanup();
      disposeEntries();
      renderer.setScissorTest(false);
    };

    const onResize = () => {
      applySize();
      if (reduced()) renderAll(false);
    };

    const bodyObserver = new ResizeObserver(() => {
      if (reduced()) renderAll(false);
    });

    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const reducedQuery = window.matchMedia(REDUCED_QUERY);
    const onMediaChange = () => {
      teardown();
      boot();
    };

    boot();
    window.addEventListener("resize", onResize);
    bodyObserver.observe(document.body);
    mobileQuery.addEventListener("change", onMediaChange);
    reducedQuery.addEventListener("change", onMediaChange);

    return () => {
      teardown();
      window.removeEventListener("resize", onResize);
      bodyObserver.disconnect();
      mobileQuery.removeEventListener("change", onMediaChange);
      reducedQuery.removeEventListener("change", onMediaChange);
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
