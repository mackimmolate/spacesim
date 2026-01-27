import { hashSeedToUint32 } from './rng';
import type { GameState, SimInput, Vec2 } from './types';

export const DEFAULT_IMPULSE: Vec2 = { x: 0, y: 0 };

export function createInitialState(seed: string): GameState {
  return {
    seed,
    rngState: hashSeedToUint32(seed),
    tick: 0,
    time: 0,
    ship: {
      position: { x: 0, y: 0 },
      velocity: { x: 0.6, y: 0.2 }
    },
    camera: { x: 0, y: 0 }
  };
}

export function createDefaultInput(): SimInput {
  return {
    impulse: { ...DEFAULT_IMPULSE }
  };
}
