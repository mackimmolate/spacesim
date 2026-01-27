import { hashSeedToUint32 } from './rng';
import type { GameState, SimInput, Vec2 } from './types';
import { GameMode } from './modes';
import { createInitialNeeds } from './needs';
import { generateCandidates } from './crew/generate';
import { generateSector } from './sector/map';
import { createInitialFactions } from './factions/factions';

export const DEFAULT_IMPULSE: Vec2 = { x: 0, y: 0 };

export function createInitialState(seed: string): GameState {
  const sector = generateSector(seed);
  const startNode = sector.nodes.find((node) => node.type === 'station') ?? sector.nodes[0]!;
  return {
    seed,
    renderSeed: seed,
    rngState: hashSeedToUint32(seed),
    tick: 0,
    time: 0,
    mode: GameMode.Avatar,
    player: {
      roomId: 'ship',
      x: 3,
      y: 3,
      moveCooldown: 0
    },
    inventory: {
      rations: 4
    },
    needs: createInitialNeeds(),
    log: ['Woke up aboard the ship.'],
    company: {
      credits: 1500,
      payrollDueTime: 60 * 60 * 24,
      maxCrew: 4,
      crew: [],
      candidates: generateCandidates(`${seed}|hire|0`, 4),
      hiringSeed: 0,
      opsEfficiency: 1,
      pendingEvent: null
    },
    sector,
    sectorShip: {
      nodeId: startNode.id
    },
    shipStats: {
      fuel: 120,
      fuelMax: 120,
      hull: 100,
      hullMax: 100,
      towCapacity: 80,
      salvageRigLevel: 1,
      scannerKits: 2,
      salvageParts: 0,
      surveyData: 0
    },
    factions: {
      factions: createInitialFactions()
    },
    contracts: {
      contracts: [],
      activeOperation: null,
      lastRefreshTick: -1
    },
    ship: {
      position: { x: 0, y: 0 },
      velocity: { x: 0.6, y: 0.2 }
    },
    camera: { x: 0, y: 0, zoom: 1 }
  };
}

export function createDefaultInput(): SimInput {
  return {
    impulse: { ...DEFAULT_IMPULSE },
    cameraPan: { x: 0, y: 0 },
    zoomIn: false,
    zoomOut: false,
    resetCamera: false,
    move: { x: 0, y: 0 },
    interact: false,
    exitCommand: false
  };
}
