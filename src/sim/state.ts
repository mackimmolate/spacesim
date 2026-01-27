import { hashSeedToUint32 } from './rng';
import type { GameState, SimInput, Vec2 } from './types';
import { GameMode } from './modes';
import { createInitialNeeds } from './needs';

export const DEFAULT_IMPULSE: Vec2 = { x: 0, y: 0 };

export function createInitialState(seed: string): GameState {
  return {
    seed,
    renderSeed: seed,
    rngState: hashSeedToUint32(seed),
    tick: 0,
    time: 0,
    mode: GameMode.Avatar,
    player: {
      roomId: 'ship',
      x: 3,
      y: 3,
      moveCooldown: 0
    },
    inventory: {
      rations: 4
    },
    needs: createInitialNeeds(),
    log: ['Woke up aboard the ship.'],
    ship: {
      position: { x: 0, y: 0 },
      velocity: { x: 0.6, y: 0.2 }
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
    resetCamera: false,
    move: { x: 0, y: 0 },
    interact: false,
    exitCommand: false
  };
}
