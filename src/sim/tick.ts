import type { GameState, SimInput, Vec2 } from './types';
import { nextRng } from './rng';

const IMPULSE_SCALE = 0.4;
const DRIFT_ACCEL = 0.12;
const MAX_SPEED = 2.5;

function clampVec(vec: Vec2, max: number): Vec2 {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag <= max) {
    return vec;
  }
  const scale = max / mag;
  return { x: vec.x * scale, y: vec.y * scale };
}

export function advanceState(state: GameState, dt: number, input: SimInput): GameState {
  const noiseX = nextRng(state.rngState);
  const noiseY = nextRng(noiseX.nextState);
  const drift = {
    x: (noiseX.value - 0.5) * DRIFT_ACCEL,
    y: (noiseY.value - 0.5) * DRIFT_ACCEL
  };

  const velocity = clampVec(
    {
      x: state.ship.velocity.x + (drift.x + input.impulse.x * IMPULSE_SCALE) * dt,
      y: state.ship.velocity.y + (drift.y + input.impulse.y * IMPULSE_SCALE) * dt
    },
    MAX_SPEED
  );

  const position = {
    x: state.ship.position.x + velocity.x * dt,
    y: state.ship.position.y + velocity.y * dt
  };

  return {
    ...state,
    rngState: noiseY.nextState,
    tick: state.tick + 1,
    time: state.time + dt,
    ship: {
      position,
      velocity
    },
    camera: {
      x: position.x,
      y: position.y
    }
  };
}
