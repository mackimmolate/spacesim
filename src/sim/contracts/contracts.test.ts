import { describe, expect, it } from 'vitest';
import { generateSector } from '../sector/map';
import { generateContractsForNode } from './generate';
import { createInitialState } from '../state';
import { startTravel } from '../sector/travel';
import { advanceState } from '../tick';
import { hashSeedToUint32, nextRng } from '../rng';
import { computeOpsEfficiency } from '../crew/crew';

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

describe('sector generation determinism', () => {
  it('produces a stable hash for the same seed', () => {
    const sectorA = generateSector('sector-seed');
    const sectorB = generateSector('sector-seed');
    expect(JSON.stringify(sectorA)).toEqual(JSON.stringify(sectorB));
  });
});

describe('contract generation determinism', () => {
  it('produces the same contracts for a node at tick T', () => {
    const sector = generateSector('contract-seed');
    const node = sector.nodes.find((entry) => entry.type === 'station')!;
    const factions = [
      { id: 'atlas', name: 'Atlas', reputation: 0 },
      { id: 'drift', name: 'Drift', reputation: 5 },
      { id: 'vanta', name: 'Vanta', reputation: -5 }
    ];
    const listA = generateContractsForNode('contract-seed', 1200, node.id, sector, factions);
    const listB = generateContractsForNode('contract-seed', 1200, node.id, sector, factions);
    expect(JSON.stringify(listA)).toEqual(JSON.stringify(listB));
  });
});

describe('travel progression', () => {
  it('consumes fuel and arrives in expected eta ticks', () => {
    let state = createInitialState('travel-seed');
    const edge = state.sector.edges.find((entry) => entry.fromId === state.sectorShip.nodeId || entry.toId === state.sectorShip.nodeId)!;
    const destination = state.sector.nodes.find((node) =>
      node.id === (edge.fromId === state.sectorShip.nodeId ? edge.toId : edge.fromId)
    )!;
    state = startTravel(state, destination.id);
    const transit = state.sectorShip.inTransit!;
    const startFuel = state.shipStats.fuel;
    for (let i = 0; i < transit.etaTicks; i += 1) {
      state = advanceState(state, FIXED_DT, EMPTY_INPUT);
    }
    expect(state.sectorShip.nodeId).toBe(destination.id);
    expect(state.sectorShip.inTransit).toBeUndefined();
    expect(state.shipStats.fuel).toBeLessThan(startFuel);
  });
});

describe('tow risk determinism', () => {
  it('matches the expected tow line failure outcome for a tick', () => {
    let state = createInitialState('tow-seed');
    const contract = {
      id: 'tug-test',
      type: 'Tug' as const,
      issuerFactionId: 'atlas',
      fromNodeId: state.sectorShip.nodeId,
      toNodeId: state.sectorShip.nodeId,
      rewardCredits: 300,
      reputationDelta: 5,
      status: 'InProgress' as const,
      createdTick: state.tick,
      payload: {
        requiredMass: 10,
        targetNodeId: state.sectorShip.nodeId
      }
    };
    state = {
      ...state,
      contracts: {
        ...state.contracts,
        contracts: [...state.contracts.contracts, contract]
      },
      sectorShip: {
        ...state.sectorShip,
        towingContractId: contract.id,
        inTransit: {
          fromId: state.sectorShip.nodeId,
          toId: state.sector.nodes.find((node) => node.id !== state.sectorShip.nodeId)!.id,
          progress01: 0.1,
          etaTicks: 10,
          startTick: state.tick,
          distance: 120
        }
      }
    };

    const efficiency = computeOpsEfficiency(state.company.crew);
    const hullFactor = 1 - state.shipStats.hull / state.shipStats.hullMax;
    const riskThreshold = 0.015 + (1 - efficiency) * 0.03 + hullFactor * 0.04;
    const riskSeed = hashSeedToUint32(`${state.seed}|tow|${contract.id}|${state.tick + 1}`);
    const riskRoll = nextRng(riskSeed).value;
    const expectFailure = riskRoll < riskThreshold;

    state = advanceState(state, FIXED_DT, EMPTY_INPUT);
    const failed = !state.sectorShip.towingContractId;
    expect(failed).toBe(expectFailure);
  });
});
