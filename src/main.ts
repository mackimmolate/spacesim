import './style.css';
import { Engine } from './engine/Engine';
import { createInputController } from './input/input';
import { Renderer } from './render/Renderer';
import { createInitialState } from './sim/state';
import { advanceState } from './sim/tick';
import { deserializeSaveState, serializeSaveState } from './sim/save';
import { createUI } from './ui/ui';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app element');
}

const canvasWrapper = document.createElement('div');
canvasWrapper.className = 'canvas-wrapper';
app.appendChild(canvasWrapper);

const uiWrapper = document.createElement('div');
uiWrapper.className = 'ui-wrapper';
app.appendChild(uiWrapper);

const engine = new Engine(60);
const inputController = createInputController();
const renderer = new Renderer(canvasWrapper);

const storageKey = 'spacesim-save';

function generateSeed(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

let state = createInitialState(generateSeed());

function setState(nextState: typeof state): void {
  state = nextState;
  engine.setClock(state.tick, state.time);
}

function resetState(keepSeed = true): void {
  const seed = keepSeed ? state.seed : generateSeed();
  engine.resetClock();
  setState(createInitialState(seed));
}

const ui = createUI(uiWrapper, {
  onTogglePause: () => inputController.signalTogglePause(),
  onStepOnce: () => inputController.signalStepOnce(),
  onCycleSpeed: () => inputController.signalCycleSpeed(),
  onNewSeed: () => inputController.signalNewSeed(),
  onResetCamera: () => inputController.signalResetCamera(),
  onSave: () => {
    localStorage.setItem(storageKey, serializeSaveState(state));
    ui.setStatusMessage('Saved to localStorage.');
  },
  onLoad: () => {
    const payload = localStorage.getItem(storageKey);
    if (!payload) {
      ui.setStatusMessage('No save found in localStorage.');
      return;
    }
    try {
      engine.resetClock();
      setState(deserializeSaveState(payload));
      ui.setStatusMessage('Loaded from localStorage.');
    } catch (error) {
      ui.setStatusMessage(`Load failed: ${(error as Error).message}`);
    }
  },
  onReset: () => {
    resetState(true);
    ui.setStatusMessage('Reset to initial state.');
  },
  onExport: () => {
    ui.setExportText(serializeSaveState(state));
    ui.setStatusMessage('Exported current state to textarea.');
  },
  onImport: (payload: string) => {
    if (!payload.trim()) {
      ui.setStatusMessage('Paste JSON before importing.');
      return;
    }
    try {
      engine.resetClock();
      setState(deserializeSaveState(payload));
      ui.setStatusMessage('Imported state from JSON.');
    } catch (error) {
      ui.setStatusMessage(`Import failed: ${(error as Error).message}`);
    }
  },
  onRegenerateVisuals: () => inputController.signalRegenerateVisuals(),
  });

function handleControls(now: number): void {
  const snapshot = inputController.consume();

  if (snapshot.controls.togglePause) {
    engine.togglePause();
  }
  if (snapshot.controls.stepOnce) {
    engine.stepOnce();
  }
  if (snapshot.controls.cycleSpeed) {
    const nextSpeed = engine.getSpeed() === 1 ? 2 : engine.getSpeed() === 2 ? 4 : 1;
    engine.setSpeed(nextSpeed);
  }
  if (snapshot.controls.newSeed) {
    resetState(false);
    ui.setStatusMessage('Generated new seed.');
  }
  if (snapshot.controls.regenerateVisuals) {
    setState({ ...state, renderSeed: generateSeed() });
    ui.setStatusMessage('Regenerated visuals with a new render seed.');
  }

  engine.update(now, snapshot.sim, (dt, input) => {
    setState(advanceState(state, dt, input));
  });
}

function frame(now: number): void {
  handleControls(now);
  renderer.render(state);
  ui.update(state, engine);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  renderer.destroy();
});
