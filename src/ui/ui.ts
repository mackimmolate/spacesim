import type { GameState } from '../sim/types';
import type { Engine } from '../engine/Engine';

export interface UIActions {
  onTogglePause: () => void;
  onStepOnce: () => void;
  onCycleSpeed: () => void;
  onNewSeed: () => void;
  onResetCamera: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (payload: string) => void;
  onRegenerateVisuals: () => void;
}

export interface UIHandle {
  update: (state: GameState, engine: Engine) => void;
  setExportText: (value: string) => void;
  setStatusMessage: (message: string) => void;
}

export function createUI(container: HTMLElement, actions: UIActions): UIHandle {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const modeBanner = document.createElement('div');
  modeBanner.className = 'mode-banner';
  container.appendChild(modeBanner);

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
    { label: 'Step', onClick: actions.onStepOnce },
    { label: 'Speed', onClick: actions.onCycleSpeed },
    { label: 'New Seed', onClick: actions.onNewSeed },
    { label: 'Reset Camera', onClick: actions.onResetCamera },
    { label: 'Save', onClick: actions.onSave },
    { label: 'Load', onClick: actions.onLoad },
    { label: 'Reset', onClick: actions.onReset },
    { label: 'Export JSON', onClick: actions.onExport },
    { label: 'Regenerate Visuals', onClick: actions.onRegenerateVisuals }
  ];

  buttons.forEach((buttonConfig) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = buttonConfig.label;
    button.addEventListener('click', buttonConfig.onClick);
    buttonRow.appendChild(button);
  });

  const importArea = document.createElement('div');
  importArea.className = 'import-area';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Paste JSON here to import, or use Export to copy out.';

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.textContent = 'Import JSON';
  importButton.addEventListener('click', () => {
    actions.onImport(textarea.value);
  });

  importArea.appendChild(textarea);
  importArea.appendChild(importButton);

  const message = document.createElement('div');
  message.className = 'message';

  overlay.appendChild(status);
  overlay.appendChild(modeIndicator);
  overlay.appendChild(needsContainer);
  overlay.appendChild(controlsHint);
  overlay.appendChild(logContainer);
  overlay.appendChild(buttonRow);
  overlay.appendChild(importArea);
  overlay.appendChild(message);

  container.appendChild(overlay);

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
        <div><strong>Speed:</strong> ${engine.getSpeed()}x</div>
        <div><strong>Paused:</strong> ${engine.isPaused() ? 'Yes' : 'No'}</div>
        <div><strong>Camera:</strong> x=${state.camera.x.toFixed(1)} y=${state.camera.y.toFixed(
          1
        )} z=${state.camera.zoom.toFixed(2)}</div>
      `;
      modeIndicator.textContent = `Mode: ${state.mode}`;
      modeBanner.textContent = state.mode === 'Command' ? 'Command Mode — ESC to leave chair' : '';
      modeBanner.style.opacity = state.mode === 'Command' ? '1' : '0';
      controlsHint.textContent =
        state.mode === 'Command'
          ? 'Pan: WASD/Arrows | Zoom: +/- | Exit: ESC'
          : 'Move: WASD/Arrows | Interact: E | Chair: E';

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
    },
    setExportText: (value: string) => {
      textarea.value = value;
    },
    setStatusMessage: (value: string) => {
      message.textContent = value;
    }
  };
}
