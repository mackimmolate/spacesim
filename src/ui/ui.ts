import type { GameState } from '../sim/types';
import type { Engine } from '../engine/Engine';

export interface UIActions {
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onNewSeed: () => void;
  onResetCamera: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
  onRegenerateVisuals: () => void;
  onGenerateCandidates: () => void;
  onHireCandidate: (candidateId: string) => void;
  onResolveEventChoice: (choiceId: 'A' | 'B') => void;
  onAcceptContract: (contractId: string) => void;
  onStartContractAction: (contractId: string) => void;
}

export interface UIHandle {
  update: (state: GameState, engine: Engine) => void;
  setStatusMessage: (message: string) => void;
  setSectorMapVisible: (visible: boolean) => void;
  getSectorMapRect: () => DOMRect | null;
}

export function createUI(container: HTMLElement, actions: UIActions): UIHandle {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const layout = document.createElement('div');
  layout.className = 'ui-layout';

  const leftColumn = document.createElement('div');
  leftColumn.className = 'ui-column ui-column-left';

  const rightColumn = document.createElement('div');
  rightColumn.className = 'ui-column ui-column-right';

  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);

  const modeBanner = document.createElement('div');
  modeBanner.className = 'mode-banner';
  container.appendChild(modeBanner);
  container.appendChild(layout);

  const crewPanel = document.createElement('div');
  crewPanel.className = 'crew-panel';

  const contractsPanel = document.createElement('div');
  contractsPanel.className = 'contracts-panel';

  const sectorPanel = document.createElement('div');
  sectorPanel.className = 'sector-panel';

  const modeIndicator = document.createElement('div');
  modeIndicator.className = 'mode-indicator';

  const needsContainer = document.createElement('div');
  needsContainer.className = 'needs';

  const controlsHint = document.createElement('div');
  controlsHint.className = 'controls-hint';

  const logContainer = document.createElement('div');
  logContainer.className = 'log';

  const status = document.createElement('div');
  status.className = 'status';

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const buttons: Array<{ label: string; onClick: () => void }> = [
    { label: 'Pause/Resume', onClick: actions.onTogglePause },
    { label: 'Speed', onClick: actions.onCycleSpeed },
    { label: 'New Seed', onClick: actions.onNewSeed },
    { label: 'Reset Camera', onClick: actions.onResetCamera },
    { label: 'Save', onClick: actions.onSave },
    { label: 'Load', onClick: actions.onLoad },
    { label: 'Reset', onClick: actions.onReset },
    { label: 'Regenerate Visuals', onClick: actions.onRegenerateVisuals }
  ];

  buttons.forEach((buttonConfig) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = buttonConfig.label;
    button.addEventListener('click', buttonConfig.onClick);
    buttonRow.appendChild(button);
  });

  const message = document.createElement('div');
  message.className = 'message';

  overlay.appendChild(status);
  overlay.appendChild(modeIndicator);
  overlay.appendChild(needsContainer);
  overlay.appendChild(controlsHint);
  overlay.appendChild(logContainer);
  overlay.appendChild(buttonRow);
  overlay.appendChild(message);

  const crewHeader = document.createElement('div');
  crewHeader.className = 'crew-header';
  crewHeader.textContent = 'Crew';

  const opsEfficiency = document.createElement('div');
  opsEfficiency.className = 'crew-ops';

  const rosterList = document.createElement('div');
  rosterList.className = 'crew-roster';

  const crewDetails = document.createElement('div');
  crewDetails.className = 'crew-details';

  const candidateHeader = document.createElement('div');
  candidateHeader.className = 'crew-subhead';
  candidateHeader.textContent = 'Candidates';

  const generateButton = document.createElement('button');
  generateButton.type = 'button';
  generateButton.textContent = 'Generate Candidates';
  generateButton.addEventListener('click', actions.onGenerateCandidates);

  const candidateList = document.createElement('div');
  candidateList.className = 'crew-candidates';

  const eventPanel = document.createElement('div');
  eventPanel.className = 'crew-event';

  crewPanel.appendChild(crewHeader);
  crewPanel.appendChild(opsEfficiency);
  crewPanel.appendChild(rosterList);
  crewPanel.appendChild(crewDetails);
  crewPanel.appendChild(candidateHeader);
  crewPanel.appendChild(generateButton);
  crewPanel.appendChild(candidateList);
  crewPanel.appendChild(eventPanel);

  const contractsHeader = document.createElement('div');
  contractsHeader.className = 'contracts-header';
  contractsHeader.textContent = 'Contracts';

  const shipStats = document.createElement('div');
  shipStats.className = 'ship-stats';

  const availableHeader = document.createElement('div');
  availableHeader.className = 'contracts-subhead';
  availableHeader.textContent = 'Available Here';

  const availableList = document.createElement('div');
  availableList.className = 'contracts-list';

  const activeHeader = document.createElement('div');
  activeHeader.className = 'contracts-subhead';
  activeHeader.textContent = 'Active';

  const activeList = document.createElement('div');
  activeList.className = 'contracts-list';

  const tracker = document.createElement('div');
  tracker.className = 'contract-tracker';

  contractsPanel.appendChild(contractsHeader);
  contractsPanel.appendChild(shipStats);
  contractsPanel.appendChild(availableHeader);
  contractsPanel.appendChild(availableList);
  contractsPanel.appendChild(activeHeader);
  contractsPanel.appendChild(activeList);
  contractsPanel.appendChild(tracker);

  const sectorHeader = document.createElement('div');
  sectorHeader.className = 'sector-header';
  sectorHeader.textContent = 'Sector Map (M)';

  const sectorViewport = document.createElement('div');
  sectorViewport.className = 'sector-viewport';

  const sectorHint = document.createElement('div');
  sectorHint.className = 'sector-hint';
  sectorHint.textContent = 'Click a node to travel.';

  sectorPanel.appendChild(sectorHeader);
  sectorPanel.appendChild(sectorViewport);
  sectorPanel.appendChild(sectorHint);

  leftColumn.appendChild(overlay);
  leftColumn.appendChild(sectorPanel);
  rightColumn.appendChild(crewPanel);
  rightColumn.appendChild(contractsPanel);

  let selectedCrewId: string | null = null;
  let selectedCandidateId: string | null = null;
  let lastCrewKey = '';
  let lastCandidateKey = '';
  let lastEventKey = '';
  let lastAvailableKey = '';
  let lastActiveKey = '__init__';

  function createNeedRow(label: string, min: number, max: number) {
    const row = document.createElement('div');
    row.className = 'need-row';

    const name = document.createElement('span');
    name.className = 'need-label';
    name.textContent = label;

    const bar = document.createElement('div');
    bar.className = 'need-bar';

    const fill = document.createElement('div');
    fill.className = 'need-fill';
    bar.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'need-value';

    row.appendChild(name);
    row.appendChild(bar);
    row.appendChild(value);

    needsContainer.appendChild(row);

    return { fill, value, min, max };
  }

  const needRows = {
    hunger: createNeedRow('Hunger', 0, 100),
    thirst: createNeedRow('Thirst', 0, 100),
    fatigue: createNeedRow('Fatigue', 0, 100),
    stress: createNeedRow('Stress', 0, 100),
    morale: createNeedRow('Morale', -50, 50)
  };

  function updateNeedRow(
    row: { fill: HTMLDivElement; value: HTMLSpanElement; min: number; max: number },
    rawValue: number
  ) {
    const clamped = Math.min(row.max, Math.max(row.min, rawValue));
    const percent = ((clamped - row.min) / (row.max - row.min)) * 100;
    row.fill.style.width = `${percent.toFixed(1)}%`;
    row.value.textContent = clamped.toFixed(0);
  }

  return {
    update: (state, engine) => {
      status.innerHTML = `
        <div><strong>Seed:</strong> ${state.seed}</div>
        <div><strong>Tick:</strong> ${state.tick}</div>
        <div><strong>Sim Time:</strong> ${state.time.toFixed(2)}s</div>
        <div><strong>Credits:</strong> ${state.company.credits.toFixed(0)}</div>
        <div><strong>Payroll Due:</strong> ${Math.max(
          0,
          (state.company.payrollDueTime - state.time) / 3600
        ).toFixed(2)}h</div>
        <div><strong>Speed:</strong> ${engine.getSpeed()}x</div>
        <div><strong>Paused:</strong> ${engine.isPaused() ? 'Yes' : 'No'}</div>
        <div><strong>Camera:</strong> x=${state.camera.x.toFixed(1)} y=${state.camera.y.toFixed(
          1
        )} z=${state.camera.zoom.toFixed(2)}</div>
      `;
      modeIndicator.textContent = `Mode: ${state.mode}`;
      modeBanner.textContent = state.mode === 'Command' ? 'Command Mode - ESC to leave chair' : '';
      modeBanner.style.opacity = state.mode === 'Command' ? '1' : '0';
      controlsHint.textContent =
        state.mode === 'Command'
          ? 'Pan: WASD/Arrows | Zoom: Wheel | Exit: ESC | Map: M'
          : 'Move: WASD/Arrows | Interact: E | Chair: E';

      const canTravel = state.mode === 'Command';
      sectorPanel.classList.toggle('is-inactive', !canTravel);
      sectorHint.textContent = canTravel ? 'Click a node to travel.' : 'Sit in the command chair to travel.';

      updateNeedRow(needRows.hunger, state.needs.hunger);
      updateNeedRow(needRows.thirst, state.needs.thirst);
      updateNeedRow(needRows.fatigue, state.needs.fatigue);
      updateNeedRow(needRows.stress, state.needs.stress);
      updateNeedRow(needRows.morale, state.needs.morale);

      logContainer.innerHTML = '';
      state.log
        .slice()
        .reverse()
        .forEach((entry) => {
          const line = document.createElement('div');
          line.textContent = entry;
          logContainer.appendChild(line);
        });

      opsEfficiency.textContent = `Ops Efficiency: x${state.company.opsEfficiency.toFixed(2)}`;

      const crewKey = state.company.crew
        .map((member) => `${member.id}:${member.role}:${member.payRate}`)
        .join('|');
      if (crewKey !== lastCrewKey) {
        rosterList.innerHTML = '';
        state.company.crew.forEach((member) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'crew-entry';
          button.dataset.crewId = member.id;
          button.textContent = `${member.name} (${member.role}) - ${member.payRate} cr/day`;
          button.addEventListener('click', () => {
            const isSelected = selectedCrewId === member.id;
            selectedCrewId = isSelected ? null : member.id;
            if (!isSelected) {
              selectedCandidateId = null;
              crewDetails.scrollTo({ top: 0 });
              crewDetails.textContent = '';
            }
          });
          rosterList.appendChild(button);
        });
        if (selectedCrewId && !state.company.crew.some((member) => member.id === selectedCrewId)) {
          selectedCrewId = null;
        }
        lastCrewKey = crewKey;
      }
      rosterList.querySelectorAll<HTMLButtonElement>('button.crew-entry').forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.crewId === selectedCrewId);
      });

      const candidateKey = state.company.candidates
        .map((candidate) => `${candidate.id}:${candidate.signOnBonus}`)
        .join('|');
      if (candidateKey !== lastCandidateKey) {
        candidateList.innerHTML = '';
        if (state.company.candidates.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'candidate-empty';
          empty.textContent = 'No candidates available. Generate a new slate.';
          candidateList.appendChild(empty);
        } else {
          state.company.candidates.forEach((candidate) => {
            const row = document.createElement('div');
            row.className = 'candidate-row';

            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'candidate-info';
            info.dataset.candidateId = candidate.id;
            info.textContent = `${candidate.name} (${candidate.role}) - bonus ${candidate.signOnBonus} cr`;
            info.addEventListener('click', () => {
              const isSelected = selectedCandidateId === candidate.id;
              selectedCandidateId = isSelected ? null : candidate.id;
              if (!isSelected) {
                selectedCrewId = null;
              }
            });

            const hire = document.createElement('button');
            hire.type = 'button';
            hire.className = 'candidate-hire';
            hire.textContent = 'Hire';
            hire.addEventListener('click', () => actions.onHireCandidate(candidate.id));

            row.appendChild(info);
            row.appendChild(hire);
            candidateList.appendChild(row);
          });
        }
        if (
          selectedCandidateId &&
          !state.company.candidates.some((candidate) => candidate.id === selectedCandidateId)
        ) {
          selectedCandidateId = null;
        }
        lastCandidateKey = candidateKey;
      }
      candidateList.querySelectorAll<HTMLButtonElement>('button.candidate-info').forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.candidateId === selectedCandidateId);
      });

      const selectedCrew = state.company.crew.find((member) => member.id === selectedCrewId);
      const selectedCandidate = state.company.candidates.find(
        (candidate) => candidate.id === selectedCandidateId
      );
      crewDetails.innerHTML = '';
      const detailTarget = selectedCrew ?? selectedCandidate;
      if (detailTarget) {
        const header = document.createElement('div');
        header.className = 'crew-detail-title';
        header.textContent = `${detailTarget.name} - ${detailTarget.role}`;

        const traits = document.createElement('div');
        traits.className = 'crew-detail-traits';
        traits.textContent = `Traits: ${detailTarget.traits.join(', ') || 'None'}`;

        const needs = document.createElement('div');
        needs.className = 'crew-detail-needs';
        needs.textContent = `Morale ${detailTarget.needs.morale.toFixed(0)} | Stress ${detailTarget.needs.stress.toFixed(
          0
        )} | Fatigue ${detailTarget.needs.fatigue.toFixed(0)} | Loyalty ${detailTarget.needs.loyalty.toFixed(0)}`;

        const summary = document.createElement('div');
        summary.className = 'crew-detail-summary';
        summary.textContent = detailTarget.background.summary;

        crewDetails.appendChild(header);
        crewDetails.appendChild(needs);
        crewDetails.appendChild(traits);
        crewDetails.appendChild(summary);
        if (detailTarget.background.contacts.length > 0) {
          const contact = detailTarget.background.contacts[0];
          const contactLine = document.createElement('div');
          contactLine.className = 'crew-detail-contact';
          contactLine.textContent = `Contact: ${contact.name} (${contact.relationship}) - ${contact.hook}`;
          crewDetails.appendChild(contactLine);
        }
      }

      const eventKey = state.company.pendingEvent
        ? `${state.company.pendingEvent.id}:${state.company.pendingEvent.choices
            .map((choice) => choice.id)
            .join(',')}`
        : '';
      if (eventKey !== lastEventKey) {
        eventPanel.innerHTML = '';
        if (state.company.pendingEvent) {
          const title = document.createElement('div');
          title.className = 'event-title';
          title.textContent = state.company.pendingEvent.title;
          const description = document.createElement('div');
          description.className = 'event-desc';
          description.textContent = state.company.pendingEvent.description;
          const choices = document.createElement('div');
          choices.className = 'event-choices';
          state.company.pendingEvent.choices.forEach((choice) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = choice.label;
            button.addEventListener('click', () => actions.onResolveEventChoice(choice.id));
            choices.appendChild(button);
          });
          eventPanel.appendChild(title);
          eventPanel.appendChild(description);
          eventPanel.appendChild(choices);
          eventPanel.classList.remove('event-enter');
          void eventPanel.offsetWidth;
          eventPanel.classList.add('event-enter');
        }
        lastEventKey = eventKey;
      }

      const currentNode = state.sector.nodes.find((node) => node.id === state.sectorShip.nodeId);
      const transit = state.sectorShip.inTransit;
      const locationLabel = transit
        ? `In Transit -> ${state.sector.nodes.find((node) => node.id === transit.toId)?.name ?? transit.toId}`
        : `Docked: ${currentNode?.name ?? state.sectorShip.nodeId}`;
      shipStats.textContent = `${locationLabel} | Fuel ${state.shipStats.fuel.toFixed(0)}/${
        state.shipStats.fuelMax
      } | Hull ${state.shipStats.hull.toFixed(0)}/${state.shipStats.hullMax} | Tow ${
        state.shipStats.towCapacity
      } | Salvage ${state.shipStats.salvageRigLevel} | Scanners ${
        state.shipStats.scannerKits
      } | Survey ${state.shipStats.surveyData}`;

      const availableContracts = state.contracts.contracts.filter(
        (contract) => contract.status === 'Available' && contract.fromNodeId === state.sectorShip.nodeId
      );
      const availableKey = [
        state.sectorShip.nodeId,
        availableContracts.map((contract) => contract.id).join('|')
      ].join('|');
      if (availableKey !== lastAvailableKey) {
        availableList.innerHTML = '';
        availableContracts.forEach((contract) => {
          const row = document.createElement('div');
          row.className = 'contract-row';
          const label = document.createElement('div');
          label.className = 'contract-info';
          label.textContent = `${contract.type} - ${contract.rewardCredits} cr`;
          const accept = document.createElement('button');
          accept.type = 'button';
          accept.textContent = 'Accept';
          accept.addEventListener('click', () => actions.onAcceptContract(contract.id));
          row.appendChild(label);
          row.appendChild(accept);
          availableList.appendChild(row);
        });
        if (availableContracts.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'contract-empty';
          empty.textContent = 'No contracts available here.';
          availableList.appendChild(empty);
        }
        lastAvailableKey = availableKey;
      }

      const activeContracts = state.contracts.contracts.filter(
        (contract) => contract.status === 'Accepted' || contract.status === 'InProgress'
      );
      const activeKey = activeContracts.map((contract) => `${contract.id}:${contract.status}`).join('|');
      if (activeKey !== lastActiveKey) {
        activeList.innerHTML = '';
        activeContracts.forEach((contract) => {
          const row = document.createElement('div');
          row.className = 'contract-row';
          const label = document.createElement('div');
          label.className = 'contract-info';
          label.textContent = `${contract.type} (${contract.status})`;
          row.appendChild(label);
          if (contract.status === 'Accepted') {
            const action = document.createElement('button');
            action.type = 'button';
            action.textContent =
              contract.type === 'InstallScanner'
                ? 'Deploy'
                : contract.type === 'Salvage'
                  ? 'Salvage'
                  : 'Begin Tow';
            action.addEventListener('click', () => actions.onStartContractAction(contract.id));
            row.appendChild(action);
          }
          activeList.appendChild(row);
        });
        if (activeContracts.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'contract-empty';
          empty.textContent = 'No active contracts.';
          activeList.appendChild(empty);
        }
        lastActiveKey = activeKey;
      }

      tracker.textContent = '';
      if (activeContracts.length > 0) {
        const contract = activeContracts[0];
        const targetName = (nodeId: string) =>
          state.sector.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
        if (contract.type === 'Tug') {
          tracker.textContent = contract.status === 'Accepted'
            ? `Tow target: ${targetName(contract.payload.targetNodeId)}. Travel there to begin tow.`
            : `Towing to ${targetName(contract.toNodeId ?? contract.fromNodeId)}.`;
        } else if (contract.type === 'Salvage') {
          tracker.textContent = contract.status === 'Accepted'
            ? `Salvage site: ${targetName(contract.payload.targetNodeId)}.`
            : `Salvaging... ${state.contracts.activeOperation?.remainingTicks ?? 0} ticks left.`;
        } else {
          tracker.textContent = `Deploy scanner at ${targetName(contract.payload.targetNodeId)}.`;
        }
      }
    },
    setStatusMessage: (value: string) => {
      message.textContent = value;
    },
    setSectorMapVisible: (visible: boolean) => {
      sectorPanel.style.display = visible ? 'grid' : 'none';
    },
    getSectorMapRect: () => {
      if (sectorPanel.style.display === 'none') {
        return null;
      }
      return sectorViewport.getBoundingClientRect();
    }
  };
}
