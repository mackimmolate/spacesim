import type { GameState } from '../types';
import { GameMode } from '../modes';
import { applyNeedDelta } from '../needs';
import { pushLog } from '../log';
import { getNearbyObject } from './objects';

const SLEEP_TIME_BONUS = 60 * 10;

export function handleInteriorInteraction(state: GameState): GameState {
  const target = getNearbyObject(state.player.x, state.player.y);
  if (!target) {
    return {
      ...state,
      log: pushLog(state.log, 'Nothing to interact with.')
    };
  }

  switch (target.type) {
    case 'command-chair': {
      if (state.mode === GameMode.Command) {
        return state;
      }
      return {
        ...state,
        mode: GameMode.Command,
        log: pushLog(state.log, 'Sat in the command chair. Switching to Command mode.')
      };
    }
    case 'bed': {
      return {
        ...state,
        time: state.time + SLEEP_TIME_BONUS,
        needs: applyNeedDelta(state.needs, { fatigue: -35, stress: -8, morale: 4 }),
        log: pushLog(state.log, 'Slept in the bunk (+10 minutes).')
      };
    }
    case 'galley': {
      if (state.inventory.rations <= 0) {
        return {
          ...state,
          log: pushLog(state.log, 'No rations left for a meal.')
        };
      }
      return {
        ...state,
        inventory: { ...state.inventory, rations: state.inventory.rations - 1 },
        needs: applyNeedDelta(state.needs, { hunger: -28, morale: 3 }),
        log: pushLog(state.log, 'Ate a ration at the galley.')
      };
    }
    case 'water': {
      return {
        ...state,
        needs: applyNeedDelta(state.needs, { thirst: -30, morale: 1 }),
        log: pushLog(state.log, 'Drank from the water dispenser.')
      };
    }
    default:
      return state;
  }
}
