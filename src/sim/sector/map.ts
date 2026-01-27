import { hashSeedToUint32, nextRng } from '../rng';
import type { SectorEdge, SectorNode, SectorState } from './types';

const NODE_COUNT = 12;
const MAP_RADIUS = 80;

const NODE_TYPES: Array<SectorNode['type']> = [
  'station',
  'outpost',
  'field',
  'station',
  'field',
  'outpost',
  'station',
  'field',
  'outpost',
  'station',
  'field',
  'station'
];

const NODE_NAMES = [
  'Anchor',
  'Caldera',
  'Delta Spur',
  'Evershade',
  'Fallow',
  'Grail',
  'Hearth',
  'Ion Ridge',
  'Kepler',
  'Lattice',
  'Morrow',
  'Nexus'
];

const FACTION_IDS = ['atlas', 'drift', 'vanta'];

function nextInt(rngState: number, max: number): { value: number; nextState: number } {
  const roll = nextRng(rngState);
  return { value: Math.floor(roll.value * max), nextState: roll.nextState };
}

export function generateSector(seed: string): SectorState {
  let rng = hashSeedToUint32(`${seed}|sector`);
  const nodes: SectorNode[] = [];

  for (let i = 0; i < NODE_COUNT; i += 1) {
    const angleRoll = nextRng(rng);
    rng = angleRoll.nextState;
    const radiusRoll = nextRng(rng);
    rng = radiusRoll.nextState;
    const angle = angleRoll.value * Math.PI * 2;
    const radius = MAP_RADIUS * (0.35 + radiusRoll.value * 0.65);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const factionId = NODE_TYPES[i % NODE_TYPES.length] === 'field' ? undefined : FACTION_IDS[i % FACTION_IDS.length];
    nodes.push({
      id: `node-${i}`,
      name: NODE_NAMES[i % NODE_NAMES.length],
      type: NODE_TYPES[i % NODE_TYPES.length],
      x,
      y,
      factionId
    });
  }

  const edges: SectorEdge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    edges.push({
      id: `edge-${from.id}-${to.id}`,
      fromId: from.id,
      toId: to.id,
      distance: distanceBetween(from, to)
    });
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const roll = nextInt(rng, nodes.length);
    rng = roll.nextState;
    const target = nodes[roll.value];
    if (target.id !== nodes[i].id) {
      const from = nodes[i];
      const to = target;
      const id = `edge-${from.id}-${to.id}`;
      if (!edges.find((edge) => edge.id === id || edge.id === `edge-${to.id}-${from.id}`)) {
        edges.push({
          id,
          fromId: from.id,
          toId: to.id,
          distance: distanceBetween(from, to)
        });
      }
    }
  }

  return { nodes, edges };
}

export function distanceBetween(a: SectorNode, b: SectorNode): number {
  return Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
}

export function getNode(state: SectorState, nodeId: string): SectorNode | undefined {
  return state.nodes.find((node) => node.id === nodeId);
}

export function getEdge(state: SectorState, fromId: string, toId: string): SectorEdge | undefined {
  return state.edges.find(
    (edge) =>
      (edge.fromId === fromId && edge.toId === toId) ||
      (edge.fromId === toId && edge.toId === fromId)
  );
}
