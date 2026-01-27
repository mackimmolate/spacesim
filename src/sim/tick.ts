import type { GameState, SimInput, Vec2 } from './types';
import { nextRng } from './rng';
import { GameMode } from './modes';
import { tickNeeds } from './needs';
import { isWalkable } from './interior/map';
import { handleInteriorInteraction } from './interior/interactions';
import { pushLog } from './log';
import { computeOpsEfficiency, tickCrew } from './crew/crew';
import { pickEvent, queueEvent, shouldRollEvent } from './events/events';

const CAMERA_SPEED = 220;
const ZOOM_SPEED = 0.7;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const IMPULSE_SCALE = 0.4;
const DRIFT_ACCEL = 0.12;
const MAX_SPEED = 2.5;
export const MOVE_INTERVAL = 0.18;

function normalizeMoveInput(move: Vec2): Vec2 {
  const x = Math.sign(move.x);
  const y = Math.sign(move.y);
  if (x !== 0 && y !== 0) {
    return { x, y: 0 };
  }
  return { x, y };
}

function clampVec(vec: Vec2, max: number): Vec2 {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag <= max) {
    return vec;
  }
  const scale = max / mag;
  return { x: vec.x * scale, y: vec.y * scale };
}

export function advanceState(state: GameState, dt: number, input: SimInput): GameState {
  const efficiency = computeOpsEfficiency(state.company.crew);
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

  const cameraSpeed = state.mode === GameMode.Command ? CAMERA_SPEED * efficiency : CAMERA_SPEED;
  const camera = {
    x: state.camera.x + input.cameraPan.x * cameraSpeed * dt,
    y: state.camera.y + input.cameraPan.y * cameraSpeed * dt,
    zoom: state.camera.zoom
  };

  if (input.resetCamera) {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
  }

  if (input.zoomIn || input.zoomOut) {
    const direction = (input.zoomIn ? 1 : 0) - (input.zoomOut ? 1 : 0);
    camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom + direction * ZOOM_SPEED * dt));
  }

  let nextState: GameState = {
    ...state,
    rngState: noiseY.nextState,
    tick: state.tick + 1,
    time: state.time + dt,
    needs: tickNeeds(state.needs, dt, state.mode),
    company: {
      ...state.company,
      opsEfficiency: efficiency
    },
    ship: {
      position,
      velocity
    },
    camera
  };

  nextState = tickCrew(nextState, dt);

  if (nextState.time >= nextState.company.payrollDueTime) {
    const cycleDays = 1;
    const payroll = nextState.company.crew.reduce((sum, member) => sum + member.payRate * cycleDays, 0);
    if (payroll > 0 && nextState.company.credits >= payroll) {
      nextState = {
        ...nextState,
        company: {
          ...nextState.company,
          credits: nextState.company.credits - payroll,
          payrollDueTime: nextState.company.payrollDueTime + cycleDays * 60 * 60 * 24,
          crew: nextState.company.crew.map((crewMember) => ({
            ...crewMember,
            needs: {
              ...crewMember.needs,
              morale: Math.min(50, crewMember.needs.morale + 2),
              stress: Math.max(0, crewMember.needs.stress - 3)
            }
          }))
        },
        log: pushLog(nextState.log, `Payroll paid (${payroll} credits).`)
      };
    } else if (payroll > 0) {
      nextState = {
        ...nextState,
        company: {
          ...nextState.company,
          payrollDueTime: nextState.company.payrollDueTime + cycleDays * 60 * 60 * 24,
          crew: nextState.company.crew.map((crewMember) => ({
            ...crewMember,
            needs: {
              ...crewMember.needs,
              morale: Math.max(-50, crewMember.needs.morale - 6),
              stress: Math.min(100, crewMember.needs.stress + 6),
              loyalty: Math.max(0, crewMember.needs.loyalty - 4)
            }
          }))
        },
        log: pushLog(nextState.log, 'Payroll missed. Morale suffers.')
      };
    }
  }

  if (!nextState.company.pendingEvent && shouldRollEvent(nextState)) {
    const event = pickEvent(nextState);
    if (event) {
      nextState = queueEvent(nextState, event);
    }
  }

  const updatedEfficiency = computeOpsEfficiency(nextState.company.crew);
  if (updatedEfficiency !== nextState.company.opsEfficiency) {
    nextState = {
      ...nextState,
      company: { ...nextState.company, opsEfficiency: updatedEfficiency }
    };
  }

  if (state.mode === GameMode.Avatar) {
    const cooldown = Math.max(0, state.player.moveCooldown - dt);
    const moveInput = normalizeMoveInput(input.move);
    let player = { ...state.player, moveCooldown: cooldown };

    if ((moveInput.x !== 0 || moveInput.y !== 0) && cooldown <= 0) {
      const targetX = player.x + moveInput.x;
      const targetY = player.y + moveInput.y;
      if (isWalkable(targetX, targetY)) {
        player = {
          ...player,
          x: targetX,
          y: targetY,
          moveCooldown: MOVE_INTERVAL
        };
      } else {
        player = {
          ...player,
          moveCooldown: MOVE_INTERVAL * 0.5
        };
      }
    }

    nextState = {
      ...nextState,
      player
    };

    if (input.interact) {
      nextState = handleInteriorInteraction(nextState);
    }
  } else if (state.mode === GameMode.Command && input.exitCommand) {
    nextState = {
      ...nextState,
      mode: GameMode.Avatar,
      log: pushLog(nextState.log, 'Left the command chair. Returning to Avatar mode.')
    };
  }

  return nextState;
}
