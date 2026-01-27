import './style.css';
import { Engine } from './engine/Engine';
import { createInputController } from './input/input';
import { Renderer } from './render/Renderer';
import { createInitialState } from './sim/state';
import { advanceState } from './sim/tick';
import { deserializeSaveState, serializeSaveState } from './sim/save';
import { createUI } from './ui/ui';
import { GameMode } from './sim/modes';
import { hireCandidate, regenerateCandidates } from './sim/crew/hiring';
import { resolveEvent } from './sim/events/events';
import { startTravel } from './sim/sector/travel';
import { acceptContract, startContractOperation } from './sim/contracts/contracts';

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
let sectorMapVisible = true;

function setState(nextState: typeof state): void {
  state = nextState;
  engine.setClock(state.tick, state.time);
}

function resetState(keepSeed = true): void {
  const seed = keepSeed ? state.seed : generateSeed();
  engine.resetClock();
  setState(createInitialState(seed));
}

function setDestination(nodeId: string): void {
  if (state.mode !== GameMode.Command) {
    return;
  }
  setState(startTravel(state, nodeId));
}

const ui = createUI(uiWrapper, {
  onTogglePause: () => inputController.signalTogglePause(),
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
  onRegenerateVisuals: () => inputController.signalRegenerateVisuals(),
  onGenerateCandidates: () => {
    setState(regenerateCandidates(state));
  },
  onHireCandidate: (candidateId: string) => {
    setState(hireCandidate(state, candidateId));
  },
  onResolveEventChoice: (choiceId: 'A' | 'B') => {
    setState(resolveEvent(state, choiceId));
  },
  onAcceptContract: (contractId: string) => {
    setState(acceptContract(state, contractId));
  },
  onStartContractAction: (contractId: string) => {
    setState(startContractOperation(state, contractId));
  }
});

renderer.setSectorClickHandler((nodeId) => {
  setDestination(nodeId);
});
ui.setSectorMapVisible(sectorMapVisible);
renderer.setSectorMapVisible(sectorMapVisible);

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
  if (snapshot.controls.toggleSectorMap) {
    sectorMapVisible = !sectorMapVisible;
    ui.setSectorMapVisible(sectorMapVisible);
    renderer.setSectorMapVisible(sectorMapVisible);
  }

  const baseInput = { ...snapshot.sim };
  if (state.mode === GameMode.Avatar) {
    baseInput.cameraPan = { x: 0, y: 0 };
    baseInput.zoomIn = false;
    baseInput.zoomOut = false;
    baseInput.resetCamera = false;
  } else {
    baseInput.move = { x: 0, y: 0 };
  }

  let pendingInteract = baseInput.interact;
  let pendingExit = baseInput.exitCommand;

  engine.update(now, baseInput, (dt) => {
    const tickInput = {
      ...baseInput,
      interact: pendingInteract,
      exitCommand: pendingExit
    };
    pendingInteract = false;
    pendingExit = false;
    setState(advanceState(state, dt, tickInput));
  });
}

function frame(now: number): void {
  handleControls(now);
  ui.update(state, engine);
  renderer.setSectorViewport(ui.getSectorMapRect());
  renderer.render(state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  renderer.destroy();
});
