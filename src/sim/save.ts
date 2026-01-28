import type { GameState, SaveState } from './types';

export function serializeSaveState(state: GameState): string {
  const payload: SaveState = {
    version: 1,
    state
  };
  return JSON.stringify(payload, null, 2);
}

export function deserializeSaveState(raw: string): GameState {
  const parsed = JSON.parse(raw) as SaveState;
  if (!parsed || parsed.version !== 1 || !parsed.state) {
    throw new Error('Invalid save data.');
  }
  return parsed.state;
}
