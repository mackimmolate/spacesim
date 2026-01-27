import { hashSeedToUint32, nextRng } from '../rng';
import type { Contract, ContractType } from './types';
import type { SectorState } from '../sector/types';
import type { Faction } from '../factions/types';

const CONTRACT_TYPES: ContractType[] = ['Tug', 'Salvage', 'InstallScanner'];

function nextInt(rngState: number, max: number): { value: number; nextState: number } {
  const roll = nextRng(rngState);
  return { value: Math.floor(roll.value * max), nextState: roll.nextState };
}

function pick<T>(rngState: number, list: T[]): { value: T; nextState: number } {
  const roll = nextInt(rngState, list.length);
  return { value: list[roll.value] as T, nextState: roll.nextState };
}

function pickNodeId(rngState: number, nodes: SectorState['nodes']): { value: string; nextState: number } {
  const pickNode = pick(rngState, nodes);
  return { value: pickNode.value.id, nextState: pickNode.nextState };
}

export function generateContractsForNode(
  seed: string,
  tick: number,
  nodeId: string,
  sector: SectorState,
  factions: Faction[]
): Contract[] {
  let rng = hashSeedToUint32(`${seed}|contracts|${nodeId}|${tick}`);
  const nodeFaction = sector.nodes.find((node) => node.id === nodeId)?.factionId;
  const defaultFaction =
    nodeFaction ? factions.find((faction) => faction.id === nodeFaction) : undefined;
  const countRoll = nextInt(rng, 3);
  rng = countRoll.nextState;
  const count = 2 + countRoll.value;
  const contracts: Contract[] = [];

  for (let i = 0; i < count; i += 1) {
    const typePick = pick(rng, CONTRACT_TYPES);
    rng = typePick.nextState;
    const factionChoice = defaultFaction ? null : pick(rng, factions);
    if (factionChoice) {
      rng = factionChoice.nextState;
    }
    const factionPick = defaultFaction ?? factionChoice!.value;
    const rep = factionPick.reputation;
    if (rep < -20) {
      continue;
    }

    const baseReward = 250 + Math.floor(nextRng(rng).value * 200);
    rng = nextRng(rng).nextState;
    const reward = Math.round(baseReward * (rep > 25 ? 1.2 : rep < 0 ? 0.9 : 1));
    const repDelta = rep < 0 ? 3 : 5;
    const createdTick = tick;
    const id = `${nodeId}-${createdTick}-${i}`;

    if (typePick.value === 'Tug') {
      const targetPick = pickNodeId(rng, sector.nodes.filter((node) => node.type === 'field'));
      rng = targetPick.nextState;
      contracts.push({
        id,
        type: 'Tug',
        issuerFactionId: factionPick.id,
        fromNodeId: nodeId,
        toNodeId: nodeId,
        deadlineTick: createdTick + 60 * 60 * 6,
        rewardCredits: reward + 150,
        reputationDelta: repDelta,
        status: 'Available',
        createdTick,
        payload: {
          requiredMass: 40 + Math.floor(nextRng(rng).value * 40),
          targetNodeId: targetPick.value
        }
      });
      rng = nextRng(rng).nextState;
    } else if (typePick.value === 'Salvage') {
      const targetPick = pickNodeId(rng, sector.nodes.filter((node) => node.type === 'field'));
      rng = targetPick.nextState;
      contracts.push({
        id,
        type: 'Salvage',
        issuerFactionId: factionPick.id,
        fromNodeId: nodeId,
        deadlineTick: createdTick + 60 * 60 * 10,
        rewardCredits: reward + 100,
        reputationDelta: repDelta,
        status: 'Available',
        createdTick,
        payload: {
          targetNodeId: targetPick.value,
          durationTicks: 60 * 45
        }
      });
    } else {
      const targetPick = pickNodeId(rng, sector.nodes.filter((node) => node.type === 'field'));
      rng = targetPick.nextState;
      contracts.push({
        id,
        type: 'InstallScanner',
        issuerFactionId: factionPick.id,
        fromNodeId: nodeId,
        toNodeId: targetPick.value,
        deadlineTick: createdTick + 60 * 60 * 12,
        rewardCredits: reward,
        reputationDelta: repDelta,
        status: 'Available',
        createdTick,
        payload: {
          targetNodeId: targetPick.value,
          dataYield: 2 + Math.floor(nextRng(rng).value * 3)
        }
      });
      rng = nextRng(rng).nextState;
    }
  }

  return contracts;
}
