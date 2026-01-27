import type { GameState } from '../types';
import { getEdge, getNode } from './map';
import { pushLog } from '../log';

const BASE_SPEED = 12;

export function startTravel(state: GameState, destinationId: string): GameState {
  if (state.sectorShip.inTransit) {
    return state;
  }
  const edge = getEdge(state.sector, state.sectorShip.nodeId, destinationId);
  if (!edge) {
    return {
      ...state,
      log: pushLog(state.log, 'No route to destination.')
    };
  }
  if (state.shipStats.fuel <= 0) {
    return {
      ...state,
      log: pushLog(state.log, 'Not enough fuel to depart.')
    };
  }
  const towing = Boolean(state.sectorShip.towingContractId);
  const speed = towing ? BASE_SPEED * 0.6 : BASE_SPEED;
  const etaTicks = Math.max(1, Math.ceil(edge.distance / speed));
  const fuelBurn = towing ? 1.2 : 0.8;
  const requiredFuel = etaTicks * fuelBurn;
  if (state.shipStats.fuel < requiredFuel * 0.6) {
    return {
      ...state,
      log: pushLog(state.log, 'Fuel too low for that route.')
    };
  }
  return {
    ...state,
    sectorShip: {
      ...state.sectorShip,
      inTransit: {
        fromId: state.sectorShip.nodeId,
        toId: destinationId,
        progress01: 0,
        etaTicks,
        startTick: state.tick,
        distance: edge.distance
      }
    },
    log: pushLog(state.log, `Departing for ${getNode(state.sector, destinationId)?.name ?? destinationId}.`)
  };
}

export function advanceTravel(state: GameState): GameState {
  const transit = state.sectorShip.inTransit;
  if (!transit) {
    return state;
  }
  const fuelBurn = state.sectorShip.towingContractId ? 1.2 : 0.8;
  const fuelLeft = Math.max(0, state.shipStats.fuel - fuelBurn);
  const elapsed = state.tick - transit.startTick;
  const progress = fuelLeft > 0 ? Math.min(1, elapsed / transit.etaTicks) : transit.progress01;

  let nextState: GameState = {
    ...state,
    shipStats: {
      ...state.shipStats,
      fuel: fuelLeft
    },
    sectorShip: {
      ...state.sectorShip,
      inTransit: {
        ...transit,
        progress01: progress
      }
    }
  };

  if (fuelLeft <= 0 && state.shipStats.fuel > 0 && progress < 1) {
    nextState = {
      ...nextState,
      sectorShip: {
        ...nextState.sectorShip,
        inTransit: {
          ...transit,
          progress01: progress
        }
      },
      log: pushLog(nextState.log, 'Fuel depleted during transit.')
    };
  }

  if (progress >= 1) {
    nextState = {
      ...nextState,
      sectorShip: {
        ...nextState.sectorShip,
        nodeId: transit.toId
      }
    };
    delete nextState.sectorShip.inTransit;
    nextState = {
      ...nextState,
      log: pushLog(nextState.log, `Arrived at ${getNode(state.sector, transit.toId)?.name ?? transit.toId}.`)
    };
  }

  return nextState;
}
