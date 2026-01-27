import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { advanceState } from './tick';
import { hashState } from './hash';
import { deserializeSaveState, serializeSaveState } from './save';

const FIXED_DT = 1 / 60;
const EMPTY_INPUT = {
  impulse: { x: 0, y: 0 },
  cameraPan: { x: 0, y: 0 },
  zoomIn: false,
  zoomOut: false,
  resetCamera: false
};

function runTicks(seed: string, ticks: number) {
  let state = createInitialState(seed);
  for (let i = 0; i < ticks; i += 1) {
    state = advanceState(state, FIXED_DT, EMPTY_INPUT);
  }
  return state;
}

describe('simulation determinism', () => {
  it('produces the same hash for the same seed and inputs', () => {
    const stateA = runTicks('deadbeef', 200);
    const stateB = runTicks('deadbeef', 200);

    expect(hashState(stateA)).toEqual(hashState(stateB));
  });
});

describe('save/load round-trip', () => {
  it('retains key fields after serialize/deserialize', () => {
    const state = runTicks('cafebabe', 42);
    const serialized = serializeSaveState(state);
    const rehydrated = deserializeSaveState(serialized);

    expect(rehydrated.seed).toBe(state.seed);
    expect(rehydrated.tick).toBe(state.tick);
    expect(rehydrated.time).toBeCloseTo(state.time, 6);
    expect(rehydrated.ship.position.x).toBeCloseTo(state.ship.position.x, 6);
    expect(rehydrated.ship.position.y).toBeCloseTo(state.ship.position.y, 6);
  });
});
