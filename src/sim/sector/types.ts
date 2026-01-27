export type NodeType = 'station' | 'outpost' | 'field';

export interface SectorNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  factionId?: string;
}

export interface SectorEdge {
  id: string;
  fromId: string;
  toId: string;
  distance: number;
}

export interface ShipTransit {
  fromId: string;
  toId: string;
  progress01: number;
  etaTicks: number;
  startTick: number;
  distance: number;
}

export interface ShipStats {
  fuel: number;
  fuelMax: number;
  hull: number;
  hullMax: number;
  towCapacity: number;
  salvageRigLevel: number;
  scannerKits: number;
  salvageParts: number;
  surveyData: number;
}

export interface ShipState {
  nodeId: string;
  inTransit?: ShipTransit;
  towingContractId?: string;
}

export interface SectorState {
  nodes: SectorNode[];
  edges: SectorEdge[];
}
