import type { GameState } from '../types';
import type { Contract, ContractStatus } from './types';
import { pushLog } from '../log';
import { updateFactionReputation } from '../factions/factions';
import { generateContractsForNode } from './generate';

const TICKS_PER_DAY = 60 * 60 * 24;

function updateContractStatus(contract: Contract, status: ContractStatus): Contract {
  return {
    ...contract,
    status
  };
}

export function refreshContracts(state: GameState): GameState {
  const day = Math.floor(state.tick / TICKS_PER_DAY);
  if (state.contracts.lastRefreshTick === day) {
    return state;
  }
  const stationNodes = state.sector.nodes.filter((node) => node.type === 'station');
  const refreshed: Contract[] = [];
  stationNodes.forEach((node) => {
    refreshed.push(
      ...generateContractsForNode(`${state.seed}|day|${day}`, state.tick, node.id, state.sector, state.factions.factions)
    );
  });
  const active = state.contracts.contracts.filter((contract) => contract.status !== 'Available');
  return {
    ...state,
    contracts: {
      ...state.contracts,
      contracts: [...active, ...refreshed],
      lastRefreshTick: day
    },
    log: pushLog(state.log, 'Contract board updated.')
  };
}

export function acceptContract(state: GameState, contractId: string): GameState {
  const contract = state.contracts.contracts.find((entry) => entry.id === contractId);
  if (!contract || contract.status !== 'Available') {
    return state;
  }
  if (state.sectorShip.nodeId !== contract.fromNodeId) {
    return {
      ...state,
      log: pushLog(state.log, 'Must be docked to accept that contract.')
    };
  }
  const updated = state.contracts.contracts.map((entry) =>
    entry.id === contractId ? updateContractStatus(entry, 'Accepted') : entry
  );
  return {
    ...state,
    contracts: { ...state.contracts, contracts: updated },
    log: pushLog(state.log, `Accepted contract: ${contract.type}.`)
  };
}

export function markContractCompleted(state: GameState, contractId: string, success: boolean): GameState {
  const contract = state.contracts.contracts.find((entry) => entry.id === contractId);
  if (!contract) {
    return state;
  }
  const towingCleared =
    contract.type === 'Tug' && state.sectorShip.towingContractId === contractId
      ? { ...state.sectorShip, towingContractId: undefined }
      : state.sectorShip;
  const status = success ? 'Completed' : 'Failed';
  const credits = success ? state.company.credits + contract.rewardCredits : state.company.credits;
  const repDelta = success ? contract.reputationDelta : -Math.max(2, Math.floor(contract.reputationDelta / 2));
  const updatedContracts = state.contracts.contracts.map((entry) =>
    entry.id === contractId ? updateContractStatus(entry, status) : entry
  );
  return {
    ...state,
    sectorShip: towingCleared,
    company: { ...state.company, credits },
    factions: {
      ...state.factions,
      factions: updateFactionReputation(state.factions.factions, contract.issuerFactionId, repDelta)
    },
    contracts: {
      ...state.contracts,
      contracts: updatedContracts,
      activeOperation: null
    },
    log: pushLog(
      state.log,
      success ? `Contract completed: ${contract.type}.` : `Contract failed: ${contract.type}.`
    )
  };
}

export function startContractOperation(state: GameState, contractId: string): GameState {
  const contract = state.contracts.contracts.find((entry) => entry.id === contractId);
  if (!contract || contract.status !== 'Accepted') {
    return state;
  }
  if (contract.type === 'Tug') {
    if (state.sectorShip.towingContractId) {
      return state;
    }
    if (state.sectorShip.nodeId !== contract.payload.targetNodeId) {
      return {
        ...state,
        log: pushLog(state.log, 'You must be at the disabled ship to begin towing.')
      };
    }
    if (state.sectorShip.inTransit) {
      return {
        ...state,
        log: pushLog(state.log, 'Cannot begin towing while in transit.')
      };
    }
    if (state.shipStats.towCapacity < contract.payload.requiredMass) {
      return {
        ...state,
        log: pushLog(state.log, 'Tow capacity insufficient.')
      };
    }
    if (state.shipStats.hull < state.shipStats.hullMax * 0.3) {
      return {
        ...state,
        log: pushLog(state.log, 'Hull integrity too low to tow safely.')
      };
    }
    return {
      ...state,
      sectorShip: { ...state.sectorShip, towingContractId: contract.id },
      contracts: {
        ...state.contracts,
        contracts: state.contracts.contracts.map((entry) =>
          entry.id === contractId ? updateContractStatus(entry, 'InProgress') : entry
        )
      },
      log: pushLog(state.log, 'Tow lines connected.')
    };
  }
  if (contract.type === 'Salvage') {
    if (state.contracts.activeOperation) {
      return state;
    }
    if (state.sectorShip.inTransit) {
      return {
        ...state,
        log: pushLog(state.log, 'Cannot salvage while in transit.')
      };
    }
    if (state.sectorShip.nodeId !== contract.payload.targetNodeId) {
      return {
        ...state,
        log: pushLog(state.log, 'You must be at the wreck site to salvage.')
      };
    }
    if (state.shipStats.salvageRigLevel < 1) {
      return {
        ...state,
        log: pushLog(state.log, 'Salvage rig required.')
      };
    }
    return {
      ...state,
      contracts: {
        ...state.contracts,
        contracts: state.contracts.contracts.map((entry) =>
          entry.id === contractId ? updateContractStatus(entry, 'InProgress') : entry
        ),
        activeOperation: {
          contractId,
          type: contract.type,
          remainingTicks: contract.payload.durationTicks,
          startedTick: state.tick
        }
      },
      log: pushLog(state.log, 'Salvage operation started.')
    };
  }
  if (contract.type === 'InstallScanner') {
    if (state.sectorShip.inTransit) {
      return {
        ...state,
        log: pushLog(state.log, 'Cannot deploy while in transit.')
      };
    }
    if (state.sectorShip.nodeId !== contract.payload.targetNodeId) {
      return {
        ...state,
        log: pushLog(state.log, 'You must be at the target field to deploy.')
      };
    }
    if (state.shipStats.scannerKits < 1) {
      return {
        ...state,
        log: pushLog(state.log, 'Scanner kit required.')
      };
    }
    const updated = markContractCompleted(state, contract.id, true);
    return {
      ...updated,
      shipStats: {
        ...updated.shipStats,
        scannerKits: updated.shipStats.scannerKits - 1,
        surveyData: updated.shipStats.surveyData + contract.payload.dataYield
      },
      log: pushLog(updated.log, 'Scanner deployed.')
    };
  }
  return state;
}
