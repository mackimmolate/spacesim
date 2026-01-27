import { hashSeedToUint32 } from './rng';
import type { GameState, SimInput, Vec2 } from './types';

export const DEFAULT_IMPULSE: Vec2 = { x: 0, y: 0 };

export function createInitialState(seed: string): GameState {
  return {
    seed,
    renderSeed: seed,
    rngState: hashSeedToUint32(seed),
    tick: 0,
    time: 0,
    ship: {
      position: { x: 0, y: 0 },
      velocity: { x: 20, y: 8 }
    },
    camera: { x: 0, y: 0, zoom: 1 }
  };
}

export function createDefaultInput(): SimInput {
  return {
    impulse: { ...DEFAULT_IMPULSE },
    cameraPan: { x: 0, y: 0 },
    zoomIn: false,
    zoomOut: false,
    resetCamera: false
  };
}
