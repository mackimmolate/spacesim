/**
 * Contracts Panel Component
 * 
 * Displays available contracts, active contracts, and contract progress tracking
 */

import type { GameState } from '../../sim/types';
import type { Contract } from '../../sim/contracts/types';
import { UIComponent, formatNumber } from './UIComponent';

export interface ContractsPanelProps {
  className: string;
  onAcceptContract: (contractId: string) => void;
  onStartContractAction: (contractId: string) => void;
}

export class ContractsPanel extends UIComponent<ContractsPanelProps> {
  private header!: HTMLElement;
  private shipStats!: HTMLElement;
  private availableHeader!: HTMLElement;
  private availableList!: HTMLElement;
  private activeHeader!: HTMLElement;
  private activeList!: HTMLElement;
  private tracker!: HTMLElement;

  private lastAvailableKey = '';
  private lastActiveKey = '__init__';

  protected initialize(): void {
    this.header = this.createElement('div', 'contracts-header', 'Contracts');
    this.shipStats = this.createElement('div', 'ship-stats');
    this.availableHeader = this.createElement('div', 'contracts-subhead', 'Available Here');
    this.availableList = this.createElement('div', 'contracts-list');
    this.activeHeader = this.createElement('div', 'contracts-subhead', 'Active');
    this.activeList = this.createElement('div', 'contracts-list');
    this.tracker = this.createElement('div', 'contract-tracker');

    this.element.appendChild(this.header);
    this.element.appendChild(this.shipStats);
    this.element.appendChild(this.availableHeader);
    this.element.appendChild(this.availableList);
    this.element.appendChild(this.activeHeader);
    this.element.appendChild(this.activeList);
    this.element.appendChild(this.tracker);
  }

  protected render(): void {
    // Called by update() if needed
  }

  /**
   * Update the panel with current game state
   */
  public updateState(state: GameState): void {
    this.updateShipStats(state);
    this.updateAvailableContracts(state);
    this.updateActiveContracts(state);
    this.updateTracker(state);
  }

  private updateShipStats(state: GameState): void {
    const currentNode = state.sector.nodes.find((node) => node.id === state.sectorShip.nodeId);
    const transit = state.sectorShip.inTransit;
    
    const locationLabel = transit
      ? `In Transit -> ${state.sector.nodes.find((node) => node.id === transit.toId)?.name ?? transit.toId}`
      : `Docked: ${currentNode?.name ?? state.sectorShip.nodeId}`;

    this.shipStats.textContent =
      `${locationLabel} | ` +
      `Fuel ${formatNumber(state.shipStats.fuel)}/${state.shipStats.fuelMax} | ` +
      `Hull ${formatNumber(state.shipStats.hull)}/${state.shipStats.hullMax} | ` +
      `Tow ${state.shipStats.towCapacity} | ` +
      `Salvage ${state.shipStats.salvageRigLevel} | ` +
      `Scanners ${state.shipStats.scannerKits} | ` +
      `Survey ${state.shipStats.surveyData}`;
  }

  private updateAvailableContracts(state: GameState): void {
    const availableContracts = state.contracts.contracts.filter(
      (contract) =>
        contract.status === 'Available' && contract.fromNodeId === state.sectorShip.nodeId
    );

    const availableKey = [
      state.sectorShip.nodeId,
      availableContracts.map((contract) => contract.id).join('|'),
    ].join('|');

    if (availableKey === this.lastAvailableKey) {
      return;
    }

    this.availableList.innerHTML = '';

    if (availableContracts.length === 0) {
      const empty = this.createElement(
        'div',
        'contract-empty',
        'No contracts available here.'
      );
      this.availableList.appendChild(empty);
    } else {
      availableContracts.forEach((contract) => {
        const row = this.createAvailableContractRow(contract);
        this.availableList.appendChild(row);
      });
    }

    this.lastAvailableKey = availableKey;
  }

  private createAvailableContractRow(contract: Contract): HTMLElement {
    const row = this.createElement('div', 'contract-row');

    const label = this.createElement(
      'div',
      'contract-info',
      `${contract.type} - ${contract.rewardCredits} cr`
    );

    const accept = this.createButton('Accept', () =>
      this.props.onAcceptContract(contract.id)
    );

    row.appendChild(label);
    row.appendChild(accept);
    return row;
  }

  private updateActiveContracts(state: GameState): void {
    const activeContracts = state.contracts.contracts.filter(
      (contract) => contract.status === 'Accepted' || contract.status === 'InProgress'
    );

    const activeKey = activeContracts
      .map((contract) => `${contract.id}:${contract.status}`)
      .join('|');

    if (activeKey === this.lastActiveKey) {
      return;
    }

    this.activeList.innerHTML = '';

    if (activeContracts.length === 0) {
      const empty = this.createElement('div', 'contract-empty', 'No active contracts.');
      this.activeList.appendChild(empty);
    } else {
      activeContracts.forEach((contract) => {
        const row = this.createActiveContractRow(contract);
        this.activeList.appendChild(row);
      });
    }

    this.lastActiveKey = activeKey;
  }

  private createActiveContractRow(contract: Contract): HTMLElement {
    const row = this.createElement('div', 'contract-row');

    const label = this.createElement(
      'div',
      'contract-info',
      `${contract.type} (${contract.status})`
    );
    row.appendChild(label);

    if (contract.status === 'Accepted') {
      const actionLabel =
        contract.type === 'InstallScanner'
          ? 'Deploy'
          : contract.type === 'Salvage'
            ? 'Salvage'
            : 'Begin Tow';

      const action = this.createButton(actionLabel, () =>
        this.props.onStartContractAction(contract.id)
      );
      row.appendChild(action);
    }

    return row;
  }

  private updateTracker(state: GameState): void {
    const activeContracts = state.contracts.contracts.filter(
      (contract) => contract.status === 'Accepted' || contract.status === 'InProgress'
    );

    this.tracker.textContent = '';

    if (activeContracts.length === 0) {
      return;
    }

    const contract = activeContracts[0]!;
    const targetName = (nodeId: string): string =>
      state.sector.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;

    if (contract.type === 'Tug') {
      this.tracker.textContent =
        contract.status === 'Accepted'
          ? `Tow target: ${targetName(contract.payload.targetNodeId)}. Travel there to begin tow.`
          : `Towing to ${targetName(contract.toNodeId ?? contract.fromNodeId)}.`;
    } else if (contract.type === 'Salvage') {
      this.tracker.textContent =
        contract.status === 'Accepted'
          ? `Salvage site: ${targetName(contract.payload.targetNodeId)}.`
          : `Salvaging... ${state.contracts.activeOperation?.remainingTicks ?? 0} ticks left.`;
    } else {
      this.tracker.textContent = `Deploy scanner at ${targetName(contract.payload.targetNodeId)}.`;
    }
  }
}
