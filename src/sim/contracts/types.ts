export type ContractStatus = 'Available' | 'Accepted' | 'InProgress' | 'Completed' | 'Failed';

export type ContractType = 'Tug' | 'Salvage' | 'InstallScanner';

export interface ContractBase {
  id: string;
  type: ContractType;
  issuerFactionId: string;
  fromNodeId: string;
  toNodeId?: string;
  deadlineTick?: number;
  rewardCredits: number;
  reputationDelta: number;
  status: ContractStatus;
  createdTick: number;
}

export interface TugPayload {
  requiredMass: number;
  targetNodeId: string;
}

export interface SalvagePayload {
  targetNodeId: string;
  durationTicks: number;
}

export interface InstallScannerPayload {
  targetNodeId: string;
  dataYield: number;
}

export type Contract =
  | (ContractBase & { type: 'Tug'; payload: TugPayload })
  | (ContractBase & { type: 'Salvage'; payload: SalvagePayload })
  | (ContractBase & { type: 'InstallScanner'; payload: InstallScannerPayload });

export interface ActiveOperation {
  contractId: string;
  type: ContractType;
  remainingTicks: number;
  startedTick: number;
}

export interface ContractsState {
  contracts: Contract[];
  activeOperation: ActiveOperation | null;
  lastRefreshTick: number;
}
