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
    { label: 'Save', onClick: actions.onSave },
    { label: 'Load', onClick: actions.onLoad },
    { label: 'Reset', onClick: actions.onReset },
    { label: 'Export JSON', onClick: actions.onExport }
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
  overlay.appendChild(buttonRow);
  overlay.appendChild(importArea);
  overlay.appendChild(message);

  container.appendChild(overlay);

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
    },
    setExportText: (value: string) => {
      textarea.value = value;
    },
    setStatusMessage: (value: string) => {
      message.textContent = value;
    }
  };
}
