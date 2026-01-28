import type { GameState } from '../sim/types';
import type { SectorNode } from '../sim/sector/types';
import type { Contract, ActiveOperation } from '../sim/contracts/types';
import type { Engine } from '../engine/Engine';
import { GameMode } from '../sim/modes';

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
  onFireCrew: (crewId: string) => void;
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

  const eventsPanel = document.createElement('div');
  eventsPanel.className = 'crew-panel events-panel';

  const quickPanel = document.createElement('div');
  quickPanel.className = 'quick-panel';

  const sectorPanel = document.createElement('div');
  sectorPanel.className = 'sector-panel';

  const modeIndicator = document.createElement('div');
  modeIndicator.className = 'mode-indicator';

  const statusStrip = document.createElement('div');
  statusStrip.className = 'status-strip';

  const cameraHint = document.createElement('div');
  cameraHint.className = 'camera-hint';

  const needsContainer = document.createElement('div');
  needsContainer.className = 'needs';

  const controlsHint = document.createElement('div');
  controlsHint.className = 'controls-hint';

  const logHeader = document.createElement('div');
  logHeader.className = 'log-header';

  const logTitle = document.createElement('div');
  logTitle.className = 'log-title';
  logTitle.textContent = 'Recent Events';

  const logToggle = document.createElement('button');
  logToggle.type = 'button';
  logToggle.className = 'log-toggle';
  logToggle.textContent = 'View Log';

  logHeader.appendChild(logTitle);
  logHeader.appendChild(logToggle);

  const logContainer = document.createElement('div');
  logContainer.className = 'log-toasts';

  const logPanel = document.createElement('div');
  logPanel.className = 'log-panel';

  const logList = document.createElement('div');
  logList.className = 'log-list';
  logPanel.appendChild(logList);

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
  message.style.display = 'none';

  function createSection(title: string, open = true) {
    const section = document.createElement('div');
    section.className = 'panel-section';
    if (!open) {
      section.classList.add('is-collapsed');
    }

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'section-toggle';
    header.textContent = title;
    header.addEventListener('click', () => {
      section.classList.toggle('is-collapsed');
    });

    const body = document.createElement('div');
    body.className = 'section-body';

    section.appendChild(header);
    section.appendChild(body);
    return { section, header, body };
  }

  function createScreen(title: string, hotkey: string) {
    const overlay = document.createElement('div');
    overlay.className = 'screen-overlay';

    const card = document.createElement('div');
    card.className = 'screen-card';

    const header = document.createElement('div');
    header.className = 'screen-header';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'screen-title';
    titleBlock.textContent = title;

    const keyHint = document.createElement('div');
    keyHint.className = 'screen-key';
    keyHint.textContent = hotkey;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'screen-close';
    close.textContent = 'Close';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'screen-header-left';
    headerLeft.appendChild(titleBlock);
    headerLeft.appendChild(keyHint);

    header.appendChild(headerLeft);
    header.appendChild(close);

    const body = document.createElement('div');
    body.className = 'screen-body';

    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);

    return { overlay, body, close };
  }

  overlay.appendChild(statusStrip);
  overlay.appendChild(modeIndicator);
  overlay.appendChild(cameraHint);
  overlay.appendChild(needsContainer);
  overlay.appendChild(controlsHint);
  overlay.appendChild(logHeader);
  overlay.appendChild(logContainer);
  overlay.appendChild(logPanel);
  overlay.appendChild(buttonRow);
  overlay.appendChild(message);

  const eventPanel = document.createElement('div');
  eventPanel.className = 'crew-event';
  const eventsHeader = document.createElement('div');
  eventsHeader.className = 'panel-title';
  eventsHeader.textContent = 'Events';

  eventsPanel.appendChild(eventsHeader);
  eventsPanel.appendChild(eventPanel);

  const quickHeader = document.createElement('div');
  quickHeader.className = 'panel-title';
  quickHeader.textContent = 'Screens';

  const personnelButton = document.createElement('button');
  personnelButton.type = 'button';
  personnelButton.className = 'screen-launch';
  personnelButton.textContent = 'Personnel (P)';

  const contractsButton = document.createElement('button');
  contractsButton.type = 'button';
  contractsButton.className = 'screen-launch';
  contractsButton.textContent = 'Contracts (C)';

  quickPanel.appendChild(quickHeader);
  quickPanel.appendChild(personnelButton);
  quickPanel.appendChild(contractsButton);

  const sectorHeader = document.createElement('div');
  sectorHeader.className = 'sector-header';
  sectorHeader.textContent = 'Sector Map (M)';

  const sectorViewport = document.createElement('div');
  sectorViewport.className = 'sector-viewport';

  const sectorHint = document.createElement('div');
  sectorHint.className = 'sector-hint';
  sectorHint.textContent = 'Click a node to travel.';

  const sectorTooltip = document.createElement('div');
  sectorTooltip.className = 'sector-tooltip';
  sectorTooltip.style.display = 'none';

  sectorPanel.appendChild(sectorHeader);
  sectorPanel.appendChild(sectorViewport);
  sectorPanel.appendChild(sectorHint);
  sectorPanel.appendChild(sectorTooltip);

  leftColumn.appendChild(overlay);
  leftColumn.appendChild(sectorPanel);
  rightColumn.appendChild(eventsPanel);
  rightColumn.appendChild(quickPanel);

  const screenRoot = document.createElement('div');
  screenRoot.className = 'screen-root';
  container.appendChild(screenRoot);

  const opsEfficiency = document.createElement('div');
  opsEfficiency.className = 'crew-ops';

  const rosterList = document.createElement('div');
  rosterList.className = 'crew-roster';

  const generateButton = document.createElement('button');
  generateButton.type = 'button';
  generateButton.textContent = 'Generate Candidates';
  generateButton.addEventListener('click', actions.onGenerateCandidates);

  const candidateList = document.createElement('div');
  candidateList.className = 'crew-candidates';

  const shipStats = document.createElement('div');
  shipStats.className = 'ship-stats';

  const availableList = document.createElement('div');
  availableList.className = 'contracts-list';

  const activeList = document.createElement('div');
  activeList.className = 'contracts-list';

  const tracker = document.createElement('div');
  tracker.className = 'contract-tracker';

  const personnelScreen = createScreen('Personnel', 'P');
  const rosterSection = createSection('Roster');
  rosterSection.body.appendChild(opsEfficiency);
  rosterSection.body.appendChild(rosterList);
  const candidatesSection = createSection('Candidates', false);
  candidatesSection.body.appendChild(generateButton);
  candidatesSection.body.appendChild(candidateList);
  personnelScreen.body.appendChild(rosterSection.section);
  personnelScreen.body.appendChild(candidatesSection.section);
  screenRoot.appendChild(personnelScreen.overlay);

  const contractsScreen = createScreen('Contracts', 'C');
  const availableSection = createSection('Available Here');
  availableSection.body.appendChild(availableList);
  const activeSection = createSection('Active');
  activeSection.body.appendChild(activeList);
  const trackerSection = createSection('Current Operation');
  trackerSection.body.appendChild(tracker);
  contractsScreen.body.appendChild(shipStats);
  contractsScreen.body.appendChild(availableSection.section);
  contractsScreen.body.appendChild(activeSection.section);
  contractsScreen.body.appendChild(trackerSection.section);
  screenRoot.appendChild(contractsScreen.overlay);

  let personnelOpen = false;
  let contractsOpen = false;

  function closePersonnelScreen() {
    personnelOpen = false;
    setScreenOpen(personnelScreen, false);
  }

  function closeContractsScreen() {
    contractsOpen = false;
    setScreenOpen(contractsScreen, false);
  }

  personnelScreen.close.addEventListener('click', closePersonnelScreen);
  personnelScreen.overlay.addEventListener('click', (event) => {
    if (event.target === personnelScreen.overlay) {
      closePersonnelScreen();
    }
  });

  contractsScreen.close.addEventListener('click', closeContractsScreen);
  contractsScreen.overlay.addEventListener('click', (event) => {
    if (event.target === contractsScreen.overlay) {
      closeContractsScreen();
    }
  });

  function setScreenOpen(screen: { overlay: HTMLDivElement }, open: boolean) {
    screen.overlay.classList.toggle('is-open', open);
  }

  function togglePersonnelScreen() {
    personnelOpen = !personnelOpen;
    if (personnelOpen) {
      contractsOpen = false;
      setScreenOpen(contractsScreen, false);
    }
    setScreenOpen(personnelScreen, personnelOpen);
  }

  function toggleContractsScreen() {
    contractsOpen = !contractsOpen;
    if (contractsOpen) {
      personnelOpen = false;
      setScreenOpen(personnelScreen, false);
    }
    setScreenOpen(contractsScreen, contractsOpen);
  }

  personnelButton.addEventListener('click', togglePersonnelScreen);
  contractsButton.addEventListener('click', toggleContractsScreen);

  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  window.addEventListener(
    'keydown',
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.code === 'KeyP') {
        togglePersonnelScreen();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (event.code === 'KeyC') {
        toggleContractsScreen();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (event.code === 'Escape' && (personnelOpen || contractsOpen)) {
        closePersonnelScreen();
        closeContractsScreen();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true }
  );

  function clearPendingFire(): void {
    pendingFireId = null;
    if (pendingFireTimeout) {
      window.clearTimeout(pendingFireTimeout);
      pendingFireTimeout = null;
    }
  }

  function armPendingFire(crewId: string): void {
    pendingFireId = crewId;
    if (pendingFireTimeout) {
      window.clearTimeout(pendingFireTimeout);
    }
    pendingFireTimeout = window.setTimeout(() => {
      pendingFireId = null;
      pendingFireTimeout = null;
    }, 3200);
  }

  let selectedCrewId: string | null = null;
  let selectedCandidateId: string | null = null;
  let selectedContractId: string | null = null;
  let pendingFireId: string | null = null;
  let pendingFireTimeout: number | null = null;
  let lastCrewKey = '';
  let lastCandidateKey = '';
  let lastEventKey = '';
  let lastAvailableKey = '';
  let lastActiveKey = '__init__';
  let toastTimeout: number | null = null;
  let lastLogLength = 0;
  let logPanelOpen = false;
  let sectorMapVisible = true;
  let currentMode: GameMode | null = null;
  let lastState: GameState | null = null;
  let hoveredSectorId: string | null = null;

  logToggle.addEventListener('click', () => {
    logPanelOpen = !logPanelOpen;
    logPanel.classList.toggle('is-open', logPanelOpen);
    logToggle.textContent = logPanelOpen ? 'Hide Log' : 'View Log';
  });

  const NODE_RADIUS = 4;
  const PICK_RADIUS = NODE_RADIUS + 6;
  const FRAME_PADDING = 12;

  function computeMapScale(nodes: SectorNode[], width: number, height: number) {
    let maxRadius = 1;
    nodes.forEach((node) => {
      const radius = Math.hypot(node.x, node.y);
      if (radius > maxRadius) {
        maxRadius = radius;
      }
    });
    const size = Math.min(width, height) - FRAME_PADDING * 2;
    return size > 0 ? size / (maxRadius * 2) : 1;
  }

  function pickNode(nodes: SectorNode[], x: number, y: number): SectorNode | null {
    let best: SectorNode | null = null;
    let bestDist = Infinity;
    const radiusSq = PICK_RADIUS * PICK_RADIUS;
    nodes.forEach((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = dx * dx + dy * dy;
      if (dist <= radiusSq && dist < bestDist) {
        best = node;
        bestDist = dist;
      }
    });
    return best;
  }

  function updateSectorTooltip(event: PointerEvent | null) {
    if (!event || !lastState || currentMode !== GameMode.Command || !sectorMapVisible) {
      sectorTooltip.style.display = 'none';
      hoveredSectorId = null;
      return;
    }
    const rect = sectorViewport.getBoundingClientRect();
    const panelRect = sectorPanel.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      sectorTooltip.style.display = 'none';
      hoveredSectorId = null;
      return;
    }
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
      sectorTooltip.style.display = 'none';
      hoveredSectorId = null;
      return;
    }
    const mapScale = computeMapScale(lastState.sector.nodes, rect.width, rect.height);
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (localX - centerX) / mapScale;
    const worldY = (localY - centerY) / mapScale;
    const node = pickNode(lastState.sector.nodes, worldX, worldY);
    if (!node) {
      sectorTooltip.style.display = 'none';
      hoveredSectorId = null;
      return;
    }
    if (hoveredSectorId !== node.id) {
      hoveredSectorId = node.id;
      sectorTooltip.textContent = node.name ?? node.id;
    }
    const offset = 12;
    const left = Math.min(rect.width - 10, Math.max(10, localX + offset));
    const top = Math.min(rect.height - 10, Math.max(10, localY - offset));
    const panelLeft = rect.left - panelRect.left + left;
    const panelTop = rect.top - panelRect.top + top;
    sectorTooltip.style.left = `${panelLeft}px`;
    sectorTooltip.style.top = `${panelTop}px`;
    sectorTooltip.style.display = 'block';
  }

  window.addEventListener('pointermove', (event) => updateSectorTooltip(event));

  function setControlsHint(tokens: string[]) {
    controlsHint.innerHTML = '';
    tokens.forEach((token) => {
      const chip = document.createElement('span');
      chip.className = 'control-chip';
      chip.textContent = token;
      controlsHint.appendChild(chip);
    });
  }

  function setStatusStrip(items: Array<{ label: string; value: string; tone?: string }>) {
    statusStrip.innerHTML = '';
    items.forEach((item) => {
      const entry = document.createElement('div');
      entry.className = `status-item${item.tone ? ` is-${item.tone}` : ''}`;
      entry.innerHTML = `<strong>${item.label}</strong> ${item.value}`;
      statusStrip.appendChild(entry);
    });
  }

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
      lastState = state;
      currentMode = state.mode;
      modeIndicator.textContent = state.mode === 'Command' ? 'Command Mode' : 'Avatar Mode';
      modeBanner.textContent =
        state.mode === 'Command'
          ? 'Command Mode - ESC to leave chair'
          : 'Avatar Mode - Press E at the chair';
      modeBanner.style.opacity = '1';
      setControlsHint(
        state.mode === 'Command'
          ? [
              'WASD/Arrows: Pan',
              'Wheel: Zoom',
              'R: Reset View',
              'ESC: Exit',
              'M: Map',
              'P: Personnel',
              'C: Contracts'
            ]
          : ['WASD/Arrows: Move', 'E: Interact', 'E: Chair', 'M: Map', 'P: Personnel', 'C: Contracts']
      );

      const canTravel = state.mode === 'Command';
      sectorPanel.classList.toggle('is-inactive', !canTravel);
      sectorHint.textContent = canTravel ? 'Click a node to travel.' : 'Sit in the command chair to travel.';
      sectorPanel.style.display = sectorMapVisible && canTravel ? 'grid' : 'none';

      const cameraOffset =
        Math.abs(state.camera.x) > 0.5 ||
        Math.abs(state.camera.y) > 0.5 ||
        Math.abs(state.camera.zoom - 1) > 0.01;
      cameraHint.textContent =
        state.mode === GameMode.Command && cameraOffset ? 'View offset - press R to reset' : '';
      cameraHint.style.display = cameraHint.textContent ? 'block' : 'none';

      updateNeedRow(needRows.hunger, state.needs.hunger);
      updateNeedRow(needRows.thirst, state.needs.thirst);
      updateNeedRow(needRows.fatigue, state.needs.fatigue);
      updateNeedRow(needRows.stress, state.needs.stress);
      updateNeedRow(needRows.morale, state.needs.morale);

      if (state.log.length < lastLogLength) {
        lastLogLength = 0;
      }
      if (state.log.length > lastLogLength) {
        state.log.slice(lastLogLength).forEach((entry) => {
          const line = document.createElement('div');
          line.className = 'log-toast';
          line.textContent = entry;
          logContainer.appendChild(line);
          window.setTimeout(() => {
            line.classList.add('is-expiring');
            window.setTimeout(() => {
              line.remove();
            }, 600);
          }, 5200);
        });
        lastLogLength = state.log.length;
      }
      if (logPanelOpen) {
        logList.innerHTML = '';
        state.log
          .slice(-10)
          .reverse()
          .forEach((entry) => {
            const row = document.createElement('div');
            row.textContent = entry;
            logList.appendChild(row);
          });
      }

      opsEfficiency.textContent = `Ops Efficiency: x${state.company.opsEfficiency.toFixed(2)}`;

      const crewKey = state.company.crew
        .map((member) => `${member.id}:${member.role}:${member.payRate}`)
        .join('|');
      if (crewKey !== lastCrewKey) {
        rosterList.innerHTML = '';
        state.company.crew.forEach((member) => {
          const row = document.createElement('div');
          row.className = 'crew-row';

          const rowMain = document.createElement('div');
          rowMain.className = 'crew-row-main';

          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'crew-entry';
          button.dataset.crewId = member.id;
          button.textContent = `${member.name} (${member.role}) - ${member.payRate} cr/day`;
          button.addEventListener('click', () => {
            clearPendingFire();
            const isSelected = selectedCrewId === member.id;
            selectedCrewId = isSelected ? null : member.id;
            if (!isSelected) {
              selectedCandidateId = null;
            }
          });

          const fire = document.createElement('button');
          fire.type = 'button';
          fire.className = 'crew-fire';
          fire.textContent = 'Fire';
          fire.addEventListener('click', (event) => {
            event.stopPropagation();
            if (pendingFireId === member.id) {
              clearPendingFire();
              actions.onFireCrew(member.id);
              return;
            }
            selectedCrewId = member.id;
            selectedCandidateId = null;
            armPendingFire(member.id);
          });

          const details = document.createElement('div');
          details.className = 'crew-inline-details';

          rowMain.appendChild(button);
          rowMain.appendChild(fire);
          row.appendChild(rowMain);
          row.appendChild(details);
          rosterList.appendChild(row);
        });
        if (selectedCrewId && !state.company.crew.some((member) => member.id === selectedCrewId)) {
          selectedCrewId = null;
        }
        if (pendingFireId && !state.company.crew.some((member) => member.id === pendingFireId)) {
          clearPendingFire();
        }
        lastCrewKey = crewKey;
      }
      const crewById = new Map(state.company.crew.map((member) => [member.id, member]));
      rosterList.querySelectorAll<HTMLButtonElement>('button.crew-entry').forEach((button) => {
        const crewId = button.dataset.crewId ?? '';
        const row = button.closest<HTMLDivElement>('.crew-row');
        const details = row?.querySelector<HTMLDivElement>('.crew-inline-details');
        const isSelected = crewId === selectedCrewId;
        button.classList.toggle('is-selected', isSelected);
        row?.classList.toggle('is-selected', isSelected);
        const fireButton = row?.querySelector<HTMLButtonElement>('.crew-fire');
        if (fireButton) {
          const isPending = crewId === pendingFireId;
          fireButton.textContent = isPending ? 'Confirm' : 'Fire';
          fireButton.classList.toggle('is-confirm', isPending);
        }
        if (!details) {
          return;
        }
        if (isSelected) {
          const member = crewById.get(crewId);
          if (member) {
            details.innerHTML = `
              <div class="crew-detail-title">${member.name} - ${member.role}</div>
              <div class="crew-detail-needs">Morale ${member.needs.morale.toFixed(
                0
              )} | Stress ${member.needs.stress.toFixed(0)} | Fatigue ${member.needs.fatigue.toFixed(
                0
              )} | Loyalty ${member.needs.loyalty.toFixed(0)}</div>
              <div class="crew-detail-traits">Traits: ${member.traits.join(', ') || 'None'}</div>
              <div class="crew-detail-summary">${member.background.summary}</div>
              ${
                member.background.contacts.length > 0
                  ? `<div class="crew-detail-contact">Contact: ${member.background.contacts[0].name} (${member.background.contacts[0].relationship}) - ${member.background.contacts[0].hook}</div>`
                  : ''
              }
            `;
            details.style.display = 'grid';
          } else {
            details.textContent = '';
            details.style.display = 'none';
          }
        } else {
          details.textContent = '';
          details.style.display = 'none';
        }
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

            const mainRow = document.createElement('div');
            mainRow.className = 'candidate-main';

            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'candidate-info';
            info.dataset.candidateId = candidate.id;
            info.textContent = `${candidate.name} (${candidate.role}) - bonus ${candidate.signOnBonus} cr`;
            info.addEventListener('click', () => {
              clearPendingFire();
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

            const details = document.createElement('div');
            details.className = 'candidate-details';

            mainRow.appendChild(info);
            mainRow.appendChild(hire);
            row.appendChild(mainRow);
            row.appendChild(details);
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
      const candidateById = new Map(state.company.candidates.map((candidate) => [candidate.id, candidate]));
      candidateList.querySelectorAll<HTMLButtonElement>('button.candidate-info').forEach((button) => {
        const candidateId = button.dataset.candidateId ?? '';
        const row = button.closest<HTMLDivElement>('.candidate-row');
        const details = row?.querySelector<HTMLDivElement>('.candidate-details');
        const isSelected = candidateId === selectedCandidateId;
        button.classList.toggle('is-selected', isSelected);
        if (!details) {
          return;
        }
        if (isSelected) {
          const candidate = candidateById.get(candidateId);
          if (candidate) {
            details.innerHTML = `
              <div class="crew-detail-title">${candidate.name} - ${candidate.role}</div>
              <div class="crew-detail-needs">Morale ${candidate.needs.morale.toFixed(
                0
              )} | Stress ${candidate.needs.stress.toFixed(0)} | Fatigue ${candidate.needs.fatigue.toFixed(
                0
              )} | Loyalty ${candidate.needs.loyalty.toFixed(0)}</div>
              <div class="crew-detail-traits">Traits: ${candidate.traits.join(', ') || 'None'}</div>
              <div class="crew-detail-summary">${candidate.background.summary}</div>
              ${
                candidate.background.contacts.length > 0
                  ? `<div class="crew-detail-contact">Contact: ${candidate.background.contacts[0].name} (${candidate.background.contacts[0].relationship}) - ${candidate.background.contacts[0].hook}</div>`
                  : ''
              }
            `;
            details.style.display = 'grid';
          } else {
            details.textContent = '';
            details.style.display = 'none';
          }
        } else {
          details.textContent = '';
          details.style.display = 'none';
        }
      });

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

      setStatusStrip([
        { label: 'Speed', value: `${engine.getSpeed()}x` },
        { label: 'State', value: engine.isPaused() ? 'Paused' : 'Running', tone: engine.isPaused() ? 'paused' : undefined },
        { label: 'Zoom', value: state.camera.zoom.toFixed(2) },
        { label: 'Credits', value: `${state.company.credits.toFixed(0)}` },
        {
          label: 'Location',
          value: transit
            ? `Transit -> ${state.sector.nodes.find((node) => node.id === transit.toId)?.name ?? transit.toId}`
            : currentNode?.name ?? state.sectorShip.nodeId
        }
      ]);

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
          const label = document.createElement('button');
          label.type = 'button';
          label.className = 'contract-entry';
          label.dataset.contractId = contract.id;
          label.textContent = `${contract.type} - ${contract.rewardCredits} cr`;
          label.addEventListener('click', () => {
            const isSelected = selectedContractId === contract.id;
            selectedContractId = isSelected ? null : contract.id;
          });
          const accept = document.createElement('button');
          accept.type = 'button';
          accept.textContent = 'Accept';
          accept.addEventListener('click', (event) => {
            event.stopPropagation();
            actions.onAcceptContract(contract.id);
          });
          const details = document.createElement('div');
          details.className = 'contract-details';
          row.appendChild(label);
          row.appendChild(accept);
          row.appendChild(details);
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
          const label = document.createElement('button');
          label.type = 'button';
          label.className = 'contract-entry';
          label.dataset.contractId = contract.id;
          label.textContent = `${contract.type} (${contract.status})`;
          label.addEventListener('click', () => {
            const isSelected = selectedContractId === contract.id;
            selectedContractId = isSelected ? null : contract.id;
          });
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
            action.addEventListener('click', (event) => {
              event.stopPropagation();
              actions.onStartContractAction(contract.id);
            });
            row.appendChild(action);
          }
          const details = document.createElement('div');
          details.className = 'contract-details';
          row.appendChild(details);
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

      const allContracts = [...availableContracts, ...activeContracts];
      if (selectedContractId && !allContracts.some((contract) => contract.id === selectedContractId)) {
        selectedContractId = null;
      }
      const contractById = new Map(allContracts.map((contract) => [contract.id, contract]));
      const nodeName = (nodeId: string | undefined) =>
        nodeId ? state.sector.nodes.find((node) => node.id === nodeId)?.name ?? nodeId : 'Unknown';
      const renderContractDetails = (contract: Contract, activeOperation: ActiveOperation | null): string => {
        const lines: string[] = [];
        const rep = contract.reputationDelta;
        const repSign = rep > 0 ? '+' : '';
        lines.push(`<div class="contract-detail-row">Status: ${contract.status}</div>`);
        lines.push(`<div class="contract-detail-row">Reward: ${contract.rewardCredits} cr</div>`);
        lines.push(`<div class="contract-detail-row">Rep: ${repSign}${rep}</div>`);
        lines.push(`<div class="contract-detail-row">From: ${nodeName(contract.fromNodeId)}</div>`);
        if (contract.toNodeId) {
          lines.push(`<div class="contract-detail-row">To: ${nodeName(contract.toNodeId)}</div>`);
        }
        lines.push(
          `<div class="contract-detail-row">Target: ${nodeName(contract.payload.targetNodeId)}</div>`
        );
        if (typeof contract.deadlineTick === 'number') {
          lines.push(`<div class="contract-detail-row">Deadline: ${contract.deadlineTick}</div>`);
        }
        switch (contract.type) {
          case 'Tug':
            lines.push(
              `<div class="contract-detail-row">Required mass: ${contract.payload.requiredMass}</div>`
            );
            break;
          case 'Salvage':
            lines.push(
              `<div class="contract-detail-row">Duration: ${contract.payload.durationTicks} ticks</div>`
            );
            break;
          case 'InstallScanner':
            lines.push(
              `<div class="contract-detail-row">Data yield: ${contract.payload.dataYield}</div>`
            );
            break;
          default:
            break;
        }
        if (activeOperation && activeOperation.contractId === contract.id) {
          lines.push(
            `<div class="contract-detail-row">Remaining: ${activeOperation.remainingTicks} ticks</div>`
          );
        }
        return lines.join('');
      };

      const syncContractSelection = (container: HTMLDivElement) => {
        container.querySelectorAll<HTMLButtonElement>('button.contract-entry').forEach((button) => {
          const contractId = button.dataset.contractId ?? '';
          const row = button.closest<HTMLDivElement>('.contract-row');
          const details = row?.querySelector<HTMLDivElement>('.contract-details');
          const isSelected = contractId !== '' && contractId === selectedContractId;
          button.classList.toggle('is-selected', isSelected);
          row?.classList.toggle('is-selected', isSelected);
          if (!details) {
            return;
          }
          if (isSelected) {
            const contract = contractById.get(contractId);
            if (contract) {
              details.innerHTML = renderContractDetails(contract, state.contracts.activeOperation);
              details.style.display = 'grid';
            } else {
              details.textContent = '';
              details.style.display = 'none';
            }
          } else {
            details.textContent = '';
            details.style.display = 'none';
          }
        });
      };

      syncContractSelection(availableList);
      syncContractSelection(activeList);

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
      if (!value) {
        message.classList.remove('is-visible');
        message.style.display = 'none';
        return;
      }
      message.style.display = 'block';
      message.classList.add('is-visible');
      if (toastTimeout) {
        window.clearTimeout(toastTimeout);
      }
      toastTimeout = window.setTimeout(() => {
        message.classList.remove('is-visible');
        window.setTimeout(() => {
          if (!message.classList.contains('is-visible')) {
            message.style.display = 'none';
          }
        }, 250);
        toastTimeout = null;
      }, 3200);
    },
    setSectorMapVisible: (visible: boolean) => {
      sectorMapVisible = visible;
      if (currentMode === GameMode.Command && sectorMapVisible) {
        sectorPanel.style.display = 'grid';
      } else {
        sectorPanel.style.display = 'none';
      }
    },
    getSectorMapRect: () => {
      if (!sectorMapVisible || currentMode !== GameMode.Command || sectorPanel.style.display === 'none') {
        return null;
      }
      return sectorViewport.getBoundingClientRect();
    }
  };
}
