/**
 * 3D entry point — loaded lazily by boot.ts (dynamic import inside
 * requestIdleCallback, hardware WebGL2 only). Everything three.js lives behind
 * this module, so the initial page JS never includes it.
 */
import gsap from 'gsap';
import { LoadingManager, Matrix4, Mesh, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, type Object3D, type Texture } from 'three';
import { doors as DOOR_DEFS, type DoorId } from '../../data/profile';
import { createRenderer, detectQuality } from './renderer';
import { createAssets, proceduralTexture } from './assets';
import { initMaterials, updateMaterials } from './materials';
import { createCameraPath } from './camera-path';
import { createCorridor, createEasel, type Interactive } from './corridor';
import { createDoors, decorateSkillsDoor, type Door } from './doors';
import { createAvatar, type Avatar } from './avatar';
import { createProps } from './props';
import { createEntrance, outsidePose } from './entrance';
import { createRoom, type Room } from './rooms/index';
import { createInput } from './input';
import { glow, headingTo, paint, swingDoor, tearIntro, walkCamera, type CameraRig } from './transitions';
import { createOverlays, type PanelId } from '../ui/overlays';
import { DOOR_LAYOUT, LOOK_PITCH_MAX, LOOK_YAW_MAX, ROOM_PRELOAD_DISTANCE } from './config';

/**
 * intro      – paper still covering the scene
 * outside    – in front of the building; click the door to come in
 * corridor   – camera follows scroll progress along the corridor path
 * walk       – scripted walk along the corridor (camera still follows the path)
 * transition – scripted move through a door (camera follows the rig)
 * room       – inside a room
 */
type Mode = 'intro' | 'outside' | 'corridor' | 'walk' | 'transition' | 'room';

export async function start({ reducedMotion }: { reducedMotion: boolean }) {
  const root = document.documentElement;
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const progressBar = document.getElementById('intro-progress');
  const progressLabel = document.getElementById('intro-label');
  const hint = document.getElementById('hint');
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-door]'));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- renderer, camera, loaders ---------- */
  const quality = detectQuality();
  const { renderer, applySize, sampleFrame } = createRenderer(canvas, quality);
  const scene = new Scene();
  // Static scene: world matrices are updated once when objects are placed,
  // not traversed on every frame.
  scene.matrixWorldAutoUpdate = false;
  const camera = new PerspectiveCamera(60, 1, 0.05, 60);
  camera.rotation.order = 'YXZ'; // yaw, then pitch, never roll
  applySize(camera);

  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (progressBar) progressBar.style.width = `${Math.round((loaded / Math.max(total, 1)) * 100)}%`;
  };
  const assets = createAssets(renderer, manager);
  const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

  /* ---------- base textures + fonts (sign textures are drawn with Caveat) ---------- */
  if (progressLabel) progressLabel.textContent = 'loading paper…';
  const loadTex = (url: string, kind: 'paper' | 'strokes') =>
    assets.texture(url).catch((err): Texture => {
      console.warn('[portfolio] KTX2 failed, using procedural texture', err);
      return proceduralTexture(kind);
    });
  const [paperTex, strokeTex] = await Promise.all([
    loadTex('/textures/paper.ktx2', 'paper'),
    loadTex('/textures/strokes.ktx2', 'strokes'),
    document.fonts.load('700 64px Caveat'),
    document.fonts.load('500 32px Inter'),
  ]);
  initMaterials({ paper: paperTex, strokes: strokeTex, noise: proceduralTexture('noise'), quality, reducedMotion });
  await yieldToMain();

  /* ---------- world ---------- */
  if (progressLabel) progressLabel.textContent = 'sketching the corridor…';
  const corridor = createCorridor();
  scene.add(corridor.group);
  const doors = createDoors(DOOR_DEFS);
  for (const d of doors) scene.add(d.group);
  await yieldToMain();
  const [easel, props, avatarSketch, avatarPainted] = await Promise.all([
    createEasel(assets),
    createProps(assets),
    assets.texture('/textures/avatar-sketch.ktx2'),
    assets.texture('/textures/avatar-paint.ktx2'),
  ]);
  scene.add(easel, props.group);
  // The hand-drawn avatar: greets you beside the About easel, and waves goodbye at the FAQ board.
  const avatars: Avatar[] = [
    createAvatar({ id: 'hello', sketch: avatarSketch, painted: avatarPainted, position: [-0.3, 0, 2.0], reducedMotion, greetDistance: 9 }),
    createAvatar({ id: 'bye', sketch: avatarSketch, painted: avatarPainted, position: [-1.35, 0, -44.6], reducedMotion, greetDistance: 7 }),
  ];
  const avatarById = new Map(avatars.map((a) => [a.mesh.userData.interactive.id as string, a]));
  for (const a of avatars) scene.add(a.group);
  // the outside of the building (you start here and click the front door)
  const entrance = await createEntrance(assets, { sketch: avatarSketch, painted: avatarPainted }, reducedMotion);
  scene.add(entrance.group);
  scene.updateMatrixWorld(true);

  const doorById = new Map<DoorId, Door>(doors.map((d) => [d.id, d]));
  const rooms = new Map<DoorId, Room>(doors.map((d) => [d.id, createRoom(d, { assets })]));

  const path = createCameraPath();
  const input = createInput({ reducedMotion, canvas });
  input.lenis.stop();
  window.scrollTo(0, 0);

  /* ---------- overlays ---------- */
  let mode: Mode = 'intro';
  let currentRoom: DoorId | null = null;
  let busy = false; // a scripted move is running
  /** Panels the visitor closed with × (until they reopen them or move on). */
  const dismissed = new Set<PanelId>();
  const overlays = createOverlays({
    onBack: () => void exitRoom(),
    onClose: (id) => {
      dismissed.add(id);
      overlays.hide(id);
      overlays.setReopen(id, true);
      // room panel closed: give the whole screen back to the room
      if (mode === 'room' && currentRoom === id) gsap.to(viewShift, { v: 0, duration: reducedMotion ? 0 : 0.6, ease: 'power2.inOut' });
    },
    onReopen: (id) => {
      dismissed.delete(id);
      overlays.setReopen(null);
      overlays.show(id, true);
      if (mode === 'room' && currentRoom === id) gsap.to(viewShift, { v: 1, duration: reducedMotion ? 0 : 0.6, ease: 'power2.inOut' });
    },
  });

  /* ---------- camera state ---------- */
  const rig: CameraRig = { pos: new Vector3(), yaw: 0, pitch: 0 };
  const pathPos = new Vector3();
  const pathTarget = new Vector3();
  let smoothT = 0;
  const look = new Vector2();

  // Look-around response: gentle near the centre of the screen, stronger
  // towards the edges (so small mouse moves don't swing the view).
  const shape = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 1.35);
  // Outside, a smaller look range keeps the front of the building steady while
  // you hover things; it eases up to the full range once you're inside.
  let lookScale = 0.3;
  const setCamera = (pos: Vector3, yaw: number, pitch: number) => {
    camera.position.copy(pos);
    camera.rotation.set(pitch + shape(look.y) * LOOK_PITCH_MAX * lookScale, yaw - shape(look.x) * LOOK_YAW_MAX * lookScale, 0);
  };
  // Walking: you always face down the corridor (forward), whether you walk
  // forward or back. The heading eases toward the path direction with a
  // critically damped spring, so leaving a room settles without a jump.
  let prevT = 0;
  let camYaw = NaN;
  let camPitch = 0;
  let yawVel = 0;
  const TAU = Math.PI * 2;
  const wrapAngle = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);
  const walkHeading = { yaw: 0, pitch: 0 };
  const resetWalkHeading = (yaw: number, pitch: number) => {
    camYaw = yaw;
    camPitch = pitch;
    yawVel = 0;
  };
  const updateWalkHeading = (dt: number) => {
    prevT = smoothT;
    const goal = headingTo(pathPos, pathTarget);
    if (Number.isNaN(camYaw) || reducedMotion) {
      camYaw = goal.yaw;
      camPitch = goal.pitch;
      yawVel = 0;
    } else {
      const diff = wrapAngle(goal.yaw - camYaw);
      const omega = 4.5;
      yawVel += (omega * omega * diff - 2 * omega * yawVel) * dt;
      camYaw += yawVel * dt;
      if (Math.abs(diff) < 1e-4 && Math.abs(yawVel) < 1e-4) {
        camYaw += diff; // settle without leaving the current revolution
        yawVel = 0;
      }
      camPitch += (goal.pitch - camPitch) * (1 - Math.exp(-dt * 6));
    }
    walkHeading.yaw = camYaw;
    walkHeading.pitch = camPitch;
    return walkHeading;
  };

  // While a room panel is open, shift the projection so the room is framed
  // in the space the panel leaves free (left on desktop, top on mobile).
  const viewShift = { v: 0 };
  let lastShift = '';
  const applyViewShift = () => {
    const w = innerWidth;
    const h = innerHeight;
    const desktop = w > 700;
    const px = desktop ? (viewShift.v * Math.min(560, w * 0.45)) / 2 : 0;
    const py = desktop ? 0 : (viewShift.v * h * 0.62) / 2.4;
    const key = `${w}x${h}:${px.toFixed(1)}:${py.toFixed(1)}`;
    if (key === lastShift) return;
    lastShift = key;
    if (px === 0 && py === 0) camera.clearViewOffset();
    else camera.setViewOffset(w, h, px, py, w, h);
  };

  // ?debug exposes the camera for automated motion checks
  if (/[?&]debug\b/.test(location.search)) (window as unknown as { __camera: PerspectiveCamera }).__camera = camera;

  path.pose(0, pathPos, pathTarget);
  // start outside, looking at the front of the building
  const placeOutside = () => {
    const pose = outsidePose(camera.aspect);
    rig.pos.copy(pose.pos);
    const h0 = headingTo(pose.pos, pose.target);
    rig.yaw = h0.yaw;
    rig.pitch = h0.pitch;
  };
  placeOutside();
  setCamera(rig.pos, rig.yaw, rig.pitch);
  camera.updateMatrixWorld();

  // Warm up shaders + upload textures before the reveal so the first frames don't hitch.
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);

  /* ---------- picking ---------- */
  const raycaster = new Raycaster();
  let hovered: { info: Interactive; object: Object3D } | null = null;
  let keyboardDoor: Door | null = null;

  // Flat list of pickable meshes (non-recursive raycast is much cheaper).
  const meshesOf = (roots: Object3D[]) => {
    const out: Object3D[] = [];
    for (const r of roots) r.traverse((o) => (o as Mesh).isMesh && o.userData.interactive && out.push(o));
    return out;
  };
  const corridorPickables = meshesOf([...doors.map((d) => d.group), easel, ...corridor.interactives, ...avatars.map((a) => a.group)]).concat(props.pickables);

  const pickTargets = (): Object3D[] => {
    if (mode === 'outside') return entrance.pickables;
    if (mode === 'corridor') return corridorPickables;
    if (mode === 'room' && currentRoom) return rooms.get(currentRoom)!.interactives;
    return [];
  };

  const setHover = (next: { info: Interactive; object: Object3D; uv?: Vector2 } | null) => {
    if (hovered?.info === next?.info) return;
    const roomContent = mode === 'room' && currentRoom ? rooms.get(currentRoom)!.content : null;
    if (hovered) {
      roomContent?.hover?.(hovered.object, false);
      paint(hovered.info.paint, null, false, reducedMotion);
      entrance.hover(hovered.info, false);
      if (hovered.info.kind === 'door' && doorById.get(hovered.info.id as DoorId) !== keyboardDoor)
        glow(doorById.get(hovered.info.id as DoorId)!.glow, false);
    }
    hovered = next;
    // pointer only for things that do something when clicked
    canvas.style.cursor = next && next.info.kind !== 'card' && next.info.kind !== 'prop' ? 'pointer' : '';
    if (next && (next.info.kind === 'skill' || next.info.kind === 'poster')) canvas.style.cursor = 'pointer';
    if (next) {
      roomContent?.hover?.(next.object, true);
      paint(next.info.paint, next.uv ?? new Vector2(0.5, 0.5), true, reducedMotion);
      if (next.info.kind === 'door') glow(doorById.get(next.info.id as DoorId)!.glow, true);
      if (next.info.kind === 'avatar') avatarById.get(next.info.id)?.wave();
      entrance.hover(next.info, true);
    }
  };

  // Hover picking is mouse-only (except in rooms); clicks/taps always pick.
  const pick = (fromClick = false) => {
    if (!fromClick && input.state.pointerType !== 'mouse' && mode !== 'room') return null;
    const targets = pickTargets();
    if (!targets.length) return null;
    raycaster.setFromCamera(input.state.pointer, camera);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    return { info: hit.object.userData.interactive as Interactive, object: hit.object, uv: hit.uv?.clone() };
  };

  canvas.addEventListener('click', (e) => {
    input.state.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (dragged) return; // that was a drag along the clothesline, not a click
    const hit = pick(true);
    if (!hit) return;
    const { kind, id } = hit.info;
    if (mode === 'room' && currentRoom && rooms.get(currentRoom)!.content?.click?.(hit.object)) return;
    if (kind === 'poster') return overlays.openProject(id);
    if (kind === 'entrance') void enterBuilding();
    else if (kind === 'window') entrance.hover(hit.info, true);
    else if (kind === 'door' && mode === 'corridor') void goToRoom(id as DoorId);
    else if (kind === 'project') overlays.openProject(id);
    else if (kind === 'easel') {
      interacted = true;
      dismissed.delete('about');
      input.lenis.scrollTo(0, { duration: reducedMotion ? 0 : 1.2 });
    } else if (kind === 'avatar') {
      avatarById.get(id)?.wave();
      interacted = true;
      dismissed.delete(id === 'hello' ? 'about' : 'faq');
    } else if (kind === 'board') {
      dismissed.delete('faq');
      input.lenis.scrollTo('bottom', { duration: reducedMotion ? 0 : 1.6 });
    } else if (kind === 'letter') document.querySelector<HTMLAnchorElement>('#contact a[href^="mailto:"]')?.focus();
  });

  /* ---------- walking: corridor + rooms ---------- */
  const corridorLength = path.curve.getLength();
  /** Which way "forward down the corridor" is in a door's local x. */
  const forwardX = (id: DoorId) => (DOOR_LAYOUT[id].side < 0 ? 1 : -1);
  /** Where you stand before turning into a door, and where you step back out to. */
  const tBeforeDoor = (id: DoorId) => path.tForZ(DOOR_LAYOUT[id].z + 2.4);
  const tAfterDoor = (id: DoorId) => path.tForZ(DOOR_LAYOUT[id].z - 1.8);
  const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

  /** Speed-up for nav-link jumps (doors clicked in the scene keep the walking pace). */
  const FAST = 3;

  /** Walk along the corridor (by scrolling) to path parameter t. */
  function walkCorridorTo(t: number, fast = false): Promise<void> {
    const dist = Math.abs(t - input.state.progress) * corridorLength;
    if (dist < 0.05) return Promise.resolve();
    return new Promise((resolve) => {
      input.lenis.start();
      input.lenis.scrollTo(t * input.lenis.limit, {
        // brisk walking pace; sine easing = gentle start/stop, low peak speed
        duration: reducedMotion ? 0 : fast ? Math.min(1.2, 0.4 + dist / 24) : Math.min(5, 1.2 + dist / 5),
        easing: easeInOutSine,
        immediate: reducedMotion,
        lock: true,
        force: true,
        onComplete: () => resolve(),
      });
      if (reducedMotion) resolve();
    });
  }

  /** Jump the scroll position (no animation) — used after leaving a room. */
  function setCorridorT(t: number) {
    input.lenis.scrollTo(t * input.lenis.limit, { immediate: true, force: true });
    input.state.progress = t;
    smoothT = t;
  }

  /** Walk to a door, open it, step in. */
  /** Open the front door and walk in to the start of the corridor. */
  async function enterBuilding(fast = false) {
    if (mode !== 'outside' || busy) return;
    busy = true;
    mode = 'transition';
    setHover(null);
    if (enterCard) enterCard.hidden = true;
    const pace = fast ? FAST : 1;
    entrance.setDoorsOpen(true, reducedMotion, pace);
    path.pose(0, pathPos, pathTarget);
    // longer walk from further out: start a touch quicker so it doesn't drag
    await walkCamera(rig, [new Vector3(0, 1.66, Math.min(rig.pos.z - 1.5, 11.2)), new Vector3(0, 1.62, 8.1), pathPos.clone()], pathTarget.clone(), {
      reduced: reducedMotion,
      pace: pace * 1.4,
    });
    smoothT = 0;
    input.state.progress = 0;
    prevT = 0;
    resetWalkHeading(rig.yaw, rig.pitch);
    interacted = true;
    mode = 'corridor';
    busy = false;
    input.lenis.start();
    gsap.delayedCall(reducedMotion ? 0 : 0.6, () => entrance.setDoorsOpen(false, reducedMotion));
    decorateDoorOnce();
  }

  let decorated = false;
  const decorateDoorOnce = () => {
    if (decorated) return;
    decorated = true;
    const d = doorById.get('skills');
    if (d) void decorateSkillsDoor(d, assets).then(() => (stickersReady = true));
  };
  let stickersReady = false;

  async function goToRoom(id: DoorId, fast = false) {
    if (busy) return;
    if (mode === 'outside') await enterBuilding(fast);
    if (mode === 'room') {
      if (currentRoom === id) return;
      await exitRoom(fast);
    }
    const pace = fast ? FAST : 1;
    if (mode !== 'corridor') return;
    busy = true;
    const door = doorById.get(id)!;
    setHover(null);
    overlays.hideAll();
    overlays.setReopen(null);
    dismissed.delete(id);
    hint?.classList.add('is-hidden');
    const ready = rooms.get(id)!.load().then(() => warmUp(id));

    // 1. walk to the door (unless you're already next to it). Approach from the
    //    side you're on: you never get walked back past the door first.
    mode = 'walk';
    glow(door.glow, true);
    // the door straightens back into the wall while you walk up (no snap later)
    const flatten = gsap.to(door.state, { flat: 1, duration: reducedMotion ? 0 : 0.6 / pace, ease: 'power2.inOut' });
    const along = door.group.worldToLocal(camera.position.clone()).x; // + / − = which side of the door
    if (Math.abs(along) > 4.5) {
      const passed = camera.position.z < DOOR_LAYOUT[id].z;
      await walkCorridorTo(path.tForZ(DOOR_LAYOUT[id].z + (passed ? -2.4 : 2.4)), fast);
    }
    input.lenis.stop();
    await Promise.all([ready, flatten]);

    // 2. turn in from where you stand and step through as the door swings open
    mode = 'transition';
    rig.pos.copy(camera.position);
    rig.yaw = walkHeading.yaw;
    rig.pitch = walkHeading.pitch;
    const side = Math.sign(door.group.worldToLocal(camera.position.clone()).x) || -forwardX(id);
    let opened = false;
    await walkCamera(
      rig,
      [door.local(side * 0.35, 1.6, 1.35), door.local(0, 1.6, 0.05), door.local(0, 1.6, -0.9)],
      door.local(...(rooms.get(id)!.content?.lookAt ?? [0, 1.45, -7])),
      {
        reduced: reducedMotion,
        pace,
        onProgress: (u) => {
          if (!opened && u > 0.02) {
            opened = true;
            swingDoor(door.pivot, true, reducedMotion, 0, pace);
          }
          if (u > 0.6) glow(door.glow, false);
        },
      },
    );
    glow(door.glow, false);
    gsap.to(viewShift, { v: 1, duration: reducedMotion ? 0 : 0.8 / pace, ease: 'power2.inOut' });
    mode = 'room';
    currentRoom = id;
    busy = false;
    overlays.show(id, true);
    overlays.setBack(true);
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.dataset.door === id)));
  }

  /** Turn around, walk out, let the door close behind you, carry on down the corridor. */
  async function exitRoom(fast = false) {
    if (mode !== 'room' || !currentRoom || busy) return;
    busy = true;
    const id = currentRoom;
    const door = doorById.get(id)!;
    mode = 'transition';
    setHover(null);
    overlays.hide(id);
    overlays.setBack(false);
    overlays.setReopen(null);
    dismissed.delete(id);
    navLinks.forEach((a) => a.removeAttribute('aria-current'));
    gsap.to(viewShift, { v: 0, duration: reducedMotion ? 0 : 0.6, ease: 'power2.inOut' });

    const tOut = tAfterDoor(id);
    path.pose(tOut, pathPos, pathTarget);
    const fx = forwardX(id);
    let closed = false;
    await walkCamera(rig, [door.local(0, 1.6, 0.1), door.local(fx * 0.45, 1.6, 1.4), pathPos.clone()], pathTarget.clone(), {
      reduced: reducedMotion,
      pace: fast ? FAST : 1,
      onProgress: (u) => {
        if (!closed && u > 0.55) {
          closed = true;
          swingDoor(door.pivot, false, reducedMotion, 0, fast ? FAST : 1);
        }
      },
    });
    // Start Lenis *before* jumping: while stopped it sets overflow:clip on <html>,
    // which also blocks programmatic scrolling.
    input.lenis.start();
    setCorridorT(tOut);
    prevT = tOut;
    resetWalkHeading(rig.yaw, rig.pitch);
    currentRoom = null;
    mode = 'corridor';
    busy = false;
    input.recenter();
    gsap.to(door.state, { flat: 0, duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.5, ease: 'power2.inOut' });
    navLinks.find((a) => a.dataset.door === id)?.focus({ preventScroll: true });
  }

  /** Upload a room's textures/programs to the GPU before it's first seen. */
  async function warmUp(id: DoorId) {
    const group = doorById.get(id)!.group;
    const outdoor = rooms.get(id)!.content?.outdoor;
    if (outdoor) outdoor.visible = true; // compile it too (hidden objects are skipped)
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      const m = (o as Mesh).material as { uniforms?: Record<string, { value: unknown }>; map?: Texture } | undefined;
      for (const key of ['uMap', 'uSketch', 'uPainted']) {
        const map = m?.uniforms?.[key]?.value as Texture | undefined;
        if (map && map.isTexture) renderer.initTexture(map);
      }
      if (m?.map?.isTexture) renderer.initTexture(m.map);
    });
    await renderer.compileAsync(group, camera, scene);
    if (outdoor) outdoor.visible = isRoomShowing(id);
  }

  /* ---------- keyboard: Tab through doors, Enter opens ---------- */
  for (const a of navLinks) {
    const id = a.dataset.door as DoorId;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      void goToRoom(id, true); // nav links: fast
    });
    a.addEventListener('focus', () => {
      if (mode !== 'corridor') return;
      keyboardDoor = doorById.get(id)!;
      glow(keyboardDoor.glow, true);
      if (a.matches(':focus-visible'))
        input.lenis.scrollTo(tBeforeDoor(id) * input.lenis.limit, { duration: reducedMotion ? 0 : 1.2, easing: easeInOutCubic });
    });
    a.addEventListener('blur', () => {
      const d = doorById.get(id)!;
      if (keyboardDoor === d) keyboardDoor = null;
      if (hovered?.info.id !== id && mode === 'corridor') glow(d.glow, false);
    });
  }

  /** A room is "showing" while you're in it or its door is (partly) open. */
  function isRoomShowing(id: DoorId) {
    if (currentRoom === id) return true;
    return Math.abs(doorById.get(id)!.pivot.rotation.y) > 0.01;
  }

  /* ---------- sideways input inside a room (the rooftop clothesline) ---------- */
  const roomScroll = () => (mode === 'room' && currentRoom ? rooms.get(currentRoom)!.content?.scroll : undefined);
  window.addEventListener('wheel', (e) => {
    const fn = roomScroll();
    if (!fn || (e.target as HTMLElement)?.closest?.('.panel, dialog')) return;
    fn.call(null, (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 30 : 1));
  }, { passive: true });
  window.addEventListener('keydown', (e) => {
    const fn = roomScroll();
    if (!fn || (e.target as HTMLElement)?.closest?.('input, textarea, select, dialog')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      fn(e.key === 'ArrowRight' ? 140 : -140);
    }
  });
  // drag (mouse or touch) slides the line; a real drag swallows the click that follows
  let dragX: number | null = null;
  let dragged = false;
  let dragDist = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragged = false;
    dragDist = 0;
    dragX = roomScroll() ? e.clientX : null;
  });
  canvas.addEventListener('pointermove', (e) => {
    const fn = roomScroll();
    if (dragX === null || !fn || (e.pointerType === 'mouse' && !(e.buttons & 1))) return;
    const dx = e.clientX - dragX;
    dragX = e.clientX;
    dragDist += Math.abs(dx);
    if (dragDist > 8) dragged = true;
    fn(-dx * 2.2);
  });
  const endRoomDrag = () => {
    dragX = null;
    setTimeout(() => (dragged = false), 0);
  };
  canvas.addEventListener('pointerup', endRoomDrag);
  canvas.addEventListener('pointercancel', endRoomDrag);
  input.state.dragLook = () => !roomScroll();

  /* ---------- resize + visibility ---------- */
  window.addEventListener('resize', () => {
    applySize(camera);
    if ((mode === 'outside' || mode === 'intro') && !busy) placeOutside();
    lastShift = '';
  });

  /* ---------- frame loop ----------
   * One ticker for everything: GSAP updates its tweens first, then this
   * callback reads them, steps Lenis, moves the camera and renders. Running
   * tweens and rendering in separate rAF callbacks shows up as jitter.
   */
  let elapsed = 0;
  let lastRenderAt = 0;
  const lastCameraMatrix = new Matrix4();
  let lastProjX = NaN;
  let framesSinceRender = 0;

  function tick(time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    let avatarsChanged = false;
    elapsed += dt;
    input.lenis.raf(time * 1000);

    // look-around parallax (mouse / gyro), eased
    const lk = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
    look.x += (input.state.look.x - look.x) * lk;
    look.y += (input.state.look.y - look.y) * lk;
    if (Math.abs(input.state.look.x - look.x) < 1e-4) look.x = input.state.look.x;
    if (Math.abs(input.state.look.y - look.y) < 1e-4) look.y = input.state.look.y;
    const lookTarget = mode === 'outside' || mode === 'intro' ? 0.3 : 1;
    if (lookScale !== lookTarget) {
      lookScale += (lookTarget - lookScale) * (1 - Math.exp(-dt * 2));
      if (Math.abs(lookTarget - lookScale) < 1e-3) lookScale = lookTarget;
    }

    if (mode === 'corridor' || mode === 'walk') {
      // Lenis already smooths the scroll; this only filters uneven touch/scroll events.
      const target = input.state.progress;
      smoothT += (target - smoothT) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 16));
      if (Math.abs(target - smoothT) < 1e-6) smoothT = target;
      path.pose(smoothT, pathPos, pathTarget);
      const h = updateWalkHeading(dt);
      setCamera(pathPos, h.yaw, h.pitch);

      if (mode === 'corridor') {
        // About opens after the first real input (scroll/click/key). Showing it
        // unprompted would re-report the bio as a late LCP candidate.
        const inAbout = interacted && smoothT < 0.07;
        const inFaq = smoothT > 0.93;
        // leaving a zone forgets that its panel was closed
        if (!inAbout) dismissed.delete('about');
        if (!inFaq) dismissed.delete('faq');
        const showAbout = inAbout && !dismissed.has('about');
        const showFaq = inFaq && !dismissed.has('faq');
        overlays.setReopen(inAbout && !showAbout ? 'about' : inFaq && !showFaq ? 'faq' : null);
        if (showAbout !== overlays.isOpen('about')) (showAbout ? overlays.show('about') : overlays.hide('about'));
        if (showFaq !== overlays.isOpen('faq')) (showFaq ? overlays.show('faq') : overlays.hide('faq'));
        hint?.classList.toggle('is-hidden', smoothT > 0.03 || dismissed.size > 0);
      }

      for (const a of avatars) if (a.update(dt, camera)) avatarsChanged = true;

      // lazy-load + GPU-warm rooms whose door is getting close
      for (const d of doors) {
        const room = rooms.get(d.id)!;
        if (!room.loaded && !room.loading && Math.abs(camera.position.z - DOOR_LAYOUT[d.id].z) < ROOM_PRELOAD_DISTANCE)
          void room.load().then(() => warmUp(d.id));
      }
    } else {
      setCamera(rig.pos, rig.yaw, rig.pitch);
    }

    // doors turn toward you as you walk up to them
    if (mode !== 'outside' && mode !== 'intro') for (const d of doors) if (d.update(camera, elapsed)) avatarsChanged = true;

    // rooms: open-air backdrops only while you're in / looking through their door
    for (const room of rooms.values()) {
      const c = room.content;
      if (!c) continue;
      const showing = isRoomShowing(room.id);
      if (c.outdoor && c.outdoor.visible !== showing) {
        c.outdoor.visible = showing;
        avatarsChanged = true;
      }
      if (c.update && showing && c.update(dt, camera, true)) avatarsChanged = true;
    }
    if (stickersReady) {
      stickersReady = false;
      avatarsChanged = true;
    }

    // the outside scene animates while you're out there (and while walking in)
    if ((mode === 'outside' || mode === 'intro' || mode === 'transition') && camera.position.z > 4 && entrance.update(dt, camera)) avatarsChanged = true;

    if (input.state.pointerDirty && (mode === 'corridor' || mode === 'room' || mode === 'outside')) {
      input.state.pointerDirty = false;
      setHover(pick());
    }

    applyViewShift();
    const drawing = updateMaterials(camera, dt, elapsed);

    // Render on demand: skip frames when nothing on screen can change.
    camera.updateMatrixWorld();
    const moved = !camera.matrixWorld.equals(lastCameraMatrix) || camera.projectionMatrix.elements[8] !== lastProjX;
    const tweening = gsap.globalTimeline.getChildren(true, true, false).some((t) => t.isActive());
    const animating = drawing || moved || avatarsChanged || busy || hovered !== null || keyboardDoor !== null || tweening;
    if (animating || framesSinceRender > 120) {
      // door pivots + glow are the only things that move: refresh their matrices
      for (const d of doors) d.facade.updateMatrixWorld(true);
      if (mode !== 'room') props.animate(elapsed);
      renderer.render(scene, camera);
      const now = performance.now();
      if (framesSinceRender === 0 && lastRenderAt) sampleFrame(now - lastRenderAt, now);
      lastRenderAt = now;
      lastCameraMatrix.copy(camera.matrixWorld);
      lastProjX = camera.projectionMatrix.elements[8];
      framesSinceRender = 0;
    } else framesSinceRender++;
  }

  let running = false;
  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));

  let interacted = false;
  const markInteracted = () => (interacted = true);
  for (const ev of ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const)
    window.addEventListener(ev, markInteracted, { once: true, passive: true });

  /* ---------- keyboard walking: W/S or ↑/↓ ---------- */
  window.addEventListener('keydown', (e) => {
    if (mode !== 'corridor' || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [data-lenis-prevent], dialog')) return;
    const k = e.key.toLowerCase();
    const dir = k === 'w' || k === 'arrowup' ? -1 : k === 's' || k === 'arrowdown' ? 1 : 0;
    // ↑/W walks forward (down the corridor = scrolling down)
    if (!dir) return;
    e.preventDefault();
    const step = input.lenis.limit * 0.035 * (e.repeat ? 0.6 : 1);
    input.lenis.scrollTo(Math.min(input.lenis.limit, Math.max(0, input.lenis.targetScroll - dir * step)), { duration: reducedMotion ? 0 : 0.6, easing: easeInOutSine });
  });

  /* ---------- outside: ways in ---------- */
  const enterCard = document.getElementById('enter-card') as HTMLButtonElement | null;
  enterCard?.addEventListener('click', () => void enterBuilding());
  // scrolling / swiping / Enter also opens the door
  window.addEventListener('wheel', (e) => mode === 'outside' && e.deltaY > 0 && void enterBuilding(), { passive: true });
  let touchY = 0;
  window.addEventListener('touchstart', (e) => (touchY = e.touches[0]?.clientY ?? 0), { passive: true });
  window.addEventListener('touchmove', (e) => mode === 'outside' && touchY - (e.touches[0]?.clientY ?? touchY) > 40 && void enterBuilding(), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (mode !== 'outside' || !['ArrowDown', 'PageDown', ' '].includes(e.key)) return;
    if ((e.target as HTMLElement)?.closest?.('a, button, input, textarea, summary')) return;
    e.preventDefault();
    void enterBuilding();
  });

  /* ---------- go ---------- */
  if (progressBar) progressBar.style.width = '100%';
  document.getElementById('intro')?.classList.add('intro--done');
  root.classList.add('is-3d');
  applySize(camera);
  input.lenis.resize();
  setRunning(!document.hidden);
  input.setupGyro(document.getElementById('gyro-btn') as HTMLButtonElement | null);

  await tearIntro(reducedMotion);
  root.classList.remove('try-3d');
  mode = 'outside';
  if (enterCard) enterCard.hidden = false;
  hint?.classList.add('is-hidden');
}
