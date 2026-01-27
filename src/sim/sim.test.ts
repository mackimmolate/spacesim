import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { advanceState, MOVE_INTERVAL } from './tick';
import { hashState } from './hash';
import { deserializeSaveState, serializeSaveState } from './save';
import { GameMode } from './modes';
import { INTERIOR_OBJECTS } from './interior/objects';

const FIXED_DT = 1 / 60;
const EMPTY_INPUT = {
  impulse: { x: 0, y: 0 },
  cameraPan: { x: 0, y: 0 },
  zoomIn: false,
  zoomOut: false,
  resetCamera: false,
  move: { x: 0, y: 0 },
  interact: false,
  exitCommand: false
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

describe('mode switching', () => {
  it('switches to Command mode on chair interaction at a deterministic tick', () => {
    const chair = INTERIOR_OBJECTS.find((object) => object.type === 'command-chair');
    if (!chair) {
      throw new Error('Missing command chair');
    }

    let state = createInitialState('feedface');
    let totalTicks = 0;

    function tickUntilMove(dx: number, dy: number) {
      const input = { ...EMPTY_INPUT, move: { x: dx, y: dy } };
      const startX = state.player.x;
      const startY = state.player.y;
      while (state.player.x === startX && state.player.y === startY) {
        state = advanceState(state, FIXED_DT, input);
        totalTicks += 1;
      }
    }

    const dx = chair.x - state.player.x;
    const dy = chair.y - state.player.y;
    for (let i = 0; i < Math.abs(dx); i += 1) {
      tickUntilMove(Math.sign(dx), 0);
    }
    for (let i = 0; i < Math.abs(dy); i += 1) {
      tickUntilMove(0, Math.sign(dy));
    }

    state = advanceState(state, FIXED_DT, { ...EMPTY_INPUT, interact: true });
    totalTicks += 1;

    const expectedTicks = 1 + (Math.abs(dx) + Math.abs(dy) - 1) * Math.ceil(MOVE_INTERVAL / FIXED_DT) + 1;
    expect(state.mode).toBe(GameMode.Command);
    expect(totalTicks).toBe(expectedTicks);
    expect(state.tick).toBe(expectedTicks);
  });
});

describe('needs ticking', () => {
  it('updates needs deterministically and stays within bounds', () => {
    let state = createInitialState('c0ffee');
    const initial = { ...state.needs };

    state = runTicks('c0ffee', 300);

    expect(state.needs.hunger).toBeGreaterThan(initial.hunger);
    expect(state.needs.thirst).toBeGreaterThan(initial.thirst);
    expect(state.needs.fatigue).toBeGreaterThan(initial.fatigue);
    expect(state.needs.stress).toBeGreaterThan(initial.stress);
    expect(state.needs.morale).toBeLessThanOrEqual(initial.morale);

    expect(state.needs.hunger).toBeLessThanOrEqual(100);
    expect(state.needs.thirst).toBeLessThanOrEqual(100);
    expect(state.needs.fatigue).toBeLessThanOrEqual(100);
    expect(state.needs.stress).toBeLessThanOrEqual(100);
    expect(state.needs.morale).toBeLessThanOrEqual(50);
    expect(state.needs.morale).toBeGreaterThanOrEqual(-50);
  });
});
