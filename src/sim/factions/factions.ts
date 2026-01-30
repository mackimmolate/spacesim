import type { Faction } from './types';

export function createInitialFactions(): Faction[] {
  return [
    { id: 'atlas', name: 'Atlas Consortium', reputation: 0 },
    { id: 'drift', name: 'Drift Cooperative', reputation: 5 },
    { id: 'vanta', name: 'Vanta Syndicate', reputation: -5 }
  ];
}

export function updateFactionReputation(factions: Faction[], id: string, delta: number): Faction[] {
  return factions.map((faction) =>
    faction.id === id
      ? { ...faction, reputation: Math.max(-100, Math.min(100, faction.reputation + delta)) }
      : faction
  );
}
