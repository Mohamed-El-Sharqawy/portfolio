/** World layout + palette shared by every scene module. Units are metres. */
import type { DoorId } from '../../data/profile';

export const COLORS = {
  paper: 0xfafafa,
  ink: 0x2b2b2b,
  terracotta: 0xc8553d,
  ochre: 0xe0a458,
  sage: 0x8aa17b,
} as const;

export const CORRIDOR = { width: 5, height: 3.4, start: 8, end: -48 } as const;
export const DOOR = { width: 1.4, height: 2.4 } as const;
export const ROOM = { width: 7, depth: 7, height: 3.4 } as const;

/** Door positions along the corridor (side -1 = left wall, +1 = right wall). */
export const DOOR_LAYOUT: Record<DoorId, { z: number; side: -1 | 1 }> = {
  projects: { z: -8, side: -1 },
  skills: { z: -12, side: 1 },
  experience: { z: -21, side: 1 },
  education: { z: -26, side: -1 },
  contact: { z: -35, side: 1 },
};

export const EYE_HEIGHT = 1.6;
/** Look-around range from mouse / touch-drag / gyro, in radians. */
export const LOOK_YAW_MAX = (40 * Math.PI) / 180; // left / right
export const LOOK_PITCH_MAX = (12 * Math.PI) / 180; // up / down
/** Rooms start loading when the camera gets this close (along z) to their door. */
export const ROOM_PRELOAD_DISTANCE = 14;
