import type { GameState } from './types';

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashState(state: GameState): string {
  const parts = [
    state.seed,
    state.renderSeed,
    state.rngState.toString(16),
    state.tick.toString(),
    state.time.toFixed(6),
    state.ship.position.x.toFixed(6),
    state.ship.position.y.toFixed(6),
    state.ship.velocity.x.toFixed(6),
    state.ship.velocity.y.toFixed(6),
    state.camera.x.toFixed(3),
    state.camera.y.toFixed(3),
    state.camera.zoom.toFixed(3)
    state.ship.velocity.y.toFixed(6)
  ];
  return hashString(parts.join('|'));
}
