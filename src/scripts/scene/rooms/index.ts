import type { Camera, Group, Object3D } from 'three';
import type { DoorId } from '../../../data/profile';
import type { Assets } from '../assets';
import type { Door } from '../doors';
import { trackSketches } from '../materials';

export interface RoomBuildContext {
  assets: Assets;
  door: Door;
}

export interface RoomContent {
  group: Group;
  interactives: Object3D[];
  /** Open-air backdrop (sky, skyline): main.ts only shows it while you're in or looking into the room. */
  outdoor?: Object3D;
  /** Where the camera looks when you step in (door-local). Default (0, 1.45, -7). */
  lookAt?: [number, number, number];
  /** Per-frame animation; `active` = you're in the room (or walking in). Return true if anything moved. */
  update?(dt: number, camera: Camera, active: boolean): boolean;
  hover?(object: Object3D, on: boolean): void;
  /** Click on one of the room's interactives. Return true if the room handled it. */
  click?(object: Object3D): boolean;
  /** An inspectable object (Interactive.inspect) was taken off the wall (on) or is going back (off). */
  inspect?(root: Object3D, on: boolean, instant?: boolean): void;
  /** Sideways input while you're in the room (wheel, drag, ← →), in px-like units. */
  scroll?(delta: number): void;
  /** Which way the room scrolls: 'x' (default, sideways) or 'y' (up/down, e.g. the sky flight). */
  scrollAxis?: 'x' | 'y';
}

type Builder = (ctx: RoomBuildContext) => Promise<RoomContent>;

// Each room's code is its own chunk, fetched together with its assets.
const builders: Record<DoorId, () => Promise<{ build: Builder }>> = {
  projects: () => import('./projects'),
  skills: () => import('./skills'),
  experience: () => import('./experience'),
  education: () => import('./education'),
  contact: () => import('./contact'),
};

export interface Room {
  id: DoorId;
  loaded: boolean;
  loading: boolean;
  interactives: Object3D[];
  content: RoomContent | null;
  load(): Promise<void>;
}

export function createRoom(door: Door, ctx: Omit<RoomBuildContext, 'door'>): Room {
  let pending: Promise<void> | null = null;
  const room: Room = {
    id: door.id,
    loaded: false,
    loading: false,
    interactives: [],
    content: null,
    load() {
      room.loading = true;
      pending ??= builders[door.id]()
        .then((m) => m.build({ ...ctx, door }))
        .then((content) => {
          const { group, interactives } = content;
          room.content = content;
          door.group.add(group);
          group.updateMatrixWorld(true);
          trackSketches(group, 0.15);
          room.interactives = interactives;
          room.loaded = true;
          room.loading = false;
        });
      return pending;
    },
  };
  return room;
}
