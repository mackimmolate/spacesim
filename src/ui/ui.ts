/**
 * Main UI Manager
 * 
 * Orchestrates all UI components and provides a clean interface for the main application
 */

import type { GameState } from '../sim/types';
import type { Engine } from '../engine/Engine';
import { CrewPanel } from './components/CrewPanel';
import { ContractsPanel } from './components/ContractsPanel';
import { formatNumber, formatTime } from './components/UIComponent';

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

/**
 * Creates and manages the UI
 */
export function createUI(container: HTMLElement, actions: UIActions): UIHandle {
  // Create main layout
  const layout = document.createElement('div');
  layout.className = 'ui-layout';

  const leftColumn = document.createElement('div');
  leftColumn.className = 'ui-column ui-column-left';

  const rightColumn = document.createElement('div');
  rightColumn.className = 'ui-column ui-column-right';

  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);

  // Mode banner
  const modeBanner = document.createElement('div');
  modeBanner.className = 'mode-banner';
  container.appendChild(modeBanner);
  container.appendChild(layout);

  // Create components
  const crewPanel = new CrewPanel('div', {
    className: 'crew-panel',
    onGenerateCandidates: actions.onGenerateCandidates,
    onHireCandidate: actions.onHireCandidate,
    onResolveEvent: actions.onResolveEventChoice,
  });

  const contractsPanel = new ContractsPanel('div', {
    className: 'contracts-panel',
    onAcceptContract: actions.onAcceptContract,
    onStartContractAction: actions.onStartContractAction,
  });

  // Mount components
  crewPanel.mount(rightColumn);
  contractsPanel.mount(rightColumn);

  // Create left column overlay
  const overlay = createOverlay(actions);
  leftColumn.appendChild(overlay.element);

  // Create sector panel
  const sectorPanel = createSectorPanel();
  leftColumn.appendChild(sectorPanel.element);

  return {
    update: (state: GameState, engine: Engine) => {
      updateModeBanner(modeBanner, state);
      overlay.update(state, engine);
      crewPanel.updateState(state);
      contractsPanel.updateState(state);
    },
    setStatusMessage: (message: string) => {
      overlay.setMessage(message);
    },
    setSectorMapVisible: (visible: boolean) => {
      sectorPanel.element.style.display = visible ? 'grid' : 'none';
    },
    getSectorMapRect: () => {
      if (sectorPanel.element.style.display === 'none') {
        return null;
      }
      return sectorPanel.viewport.getBoundingClientRect();
    },
  };
}

/**
 * Updates the mode banner
 */
function updateModeBanner(banner: HTMLElement, state: GameState): void {
  banner.textContent =
    state.mode === 'Command' ? 'Command Mode - ESC to leave chair' : '';
  banner.style.opacity = state.mode === 'Command' ? '1' : '0';
}

/**
 * Creates the main overlay with status, needs, controls, and log
 */
function createOverlay(actions: UIActions) {
  const element = document.createElement('div');
  element.className = 'overlay';

  const status = document.createElement('div');
  status.className = 'status';

  const modeIndicator = document.createElement('div');
  modeIndicator.className = 'mode-indicator';

  const needsContainer = document.createElement('div');
  needsContainer.className = 'needs';

  const controlsHint = document.createElement('div');
  controlsHint.className = 'controls-hint';

  const logContainer = document.createElement('div');
  logContainer.className = 'log';

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const message = document.createElement('div');
  message.className = 'message';

  // Create buttons
  const buttons = [
    { label: 'Pause/Resume', onClick: actions.onTogglePause },
    { label: 'Speed', onClick: actions.onCycleSpeed },
    { label: 'New Seed', onClick: actions.onNewSeed },
    { label: 'Reset Camera', onClick: actions.onResetCamera },
    { label: 'Save', onClick: actions.onSave },
    { label: 'Load', onClick: actions.onLoad },
    { label: 'Reset', onClick: actions.onReset },
    { label: 'Regenerate Visuals', onClick: actions.onRegenerateVisuals },
  ];

  buttons.forEach((config) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = config.label;
    button.addEventListener('click', config.onClick);
    buttonRow.appendChild(button);
  });

  element.appendChild(status);
  element.appendChild(modeIndicator);
  element.appendChild(needsContainer);
  element.appendChild(controlsHint);
  element.appendChild(logContainer);
  element.appendChild(buttonRow);
  element.appendChild(message);

  // Create need rows
  interface NeedRow {
    fill: HTMLElement;
    value: HTMLElement;
    min: number;
    max: number;
  }

  const needRows: Record<string, NeedRow> = {};

  function createNeedRow(label: string, min: number, max: number): NeedRow {
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

  needRows['hunger'] = createNeedRow('Hunger', 0, 100);
  needRows['thirst'] = createNeedRow('Thirst', 0, 100);
  needRows['fatigue'] = createNeedRow('Fatigue', 0, 100);
  needRows['stress'] = createNeedRow('Stress', 0, 100);
  needRows['morale'] = createNeedRow('Morale', -50, 50);

  function updateNeedRow(row: NeedRow, rawValue: number): void {
    const clamped = Math.min(row.max, Math.max(row.min, rawValue));
    const percent = ((clamped - row.min) / (row.max - row.min)) * 100;
    row.fill.style.width = `${percent.toFixed(1)}%`;
    row.value.textContent = formatNumber(clamped);
  }

  return {
    element,
    update: (state: GameState, engine: Engine) => {
      // Update status
      status.innerHTML = `
        <div><strong>Seed:</strong> ${state.seed}</div>
        <div><strong>Tick:</strong> ${state.tick}</div>
        <div><strong>Sim Time:</strong> ${formatTime(state.time)}</div>
        <div><strong>Credits:</strong> ${formatNumber(state.company.credits)}</div>
        <div><strong>Payroll Due:</strong> ${formatTime(Math.max(0, state.company.payrollDueTime - state.time))}</div>
        <div><strong>Speed:</strong> ${engine.getSpeed()}x</div>
        <div><strong>Paused:</strong> ${engine.isPaused() ? 'Yes' : 'No'}</div>
        <div><strong>Camera:</strong> x=${formatNumber(state.camera.x, 1)} y=${formatNumber(state.camera.y, 1)} z=${formatNumber(state.camera.zoom, 2)}</div>
      `;

      // Update mode
      modeIndicator.textContent = `Mode: ${state.mode}`;

      // Update controls hint
      controlsHint.textContent =
        state.mode === 'Command'
          ? 'Pan: WASD/Arrows | Zoom: Wheel | Exit: ESC | Map: M'
          : 'Move: WASD/Arrows | Interact: E | Chair: E';

      // Update needs
      updateNeedRow(needRows['hunger']!, state.needs.hunger);
      updateNeedRow(needRows['thirst']!, state.needs.thirst);
      updateNeedRow(needRows['fatigue']!, state.needs.fatigue);
      updateNeedRow(needRows['stress']!, state.needs.stress);
      updateNeedRow(needRows['morale']!, state.needs.morale);

      // Update log
      logContainer.innerHTML = '';
      state.log
        .slice()
        .reverse()
        .forEach((entry) => {
          const line = document.createElement('div');
          line.textContent = entry;
          logContainer.appendChild(line);
        });
    },
    setMessage: (msg: string) => {
      message.textContent = msg;
    },
  };
}

/**
 * Creates the sector panel
 */
function createSectorPanel() {
  const element = document.createElement('div');
  element.className = 'sector-panel';

  const header = document.createElement('div');
  header.className = 'sector-header';
  header.textContent = 'Sector Map (M)';

  const viewport = document.createElement('div');
  viewport.className = 'sector-viewport';

  const hint = document.createElement('div');
  hint.className = 'sector-hint';
  hint.textContent = 'Click a node to travel.';

  element.appendChild(header);
  element.appendChild(viewport);
  element.appendChild(hint);

  return {
    element,
    viewport,
  };
}
