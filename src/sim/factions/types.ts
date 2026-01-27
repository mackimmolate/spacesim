export interface Faction {
  id: string;
  name: string;
  reputation: number;
}

export interface FactionState {
  factions: Faction[];
}
