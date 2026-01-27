import type { SimInput } from '../sim/types';

export interface ControlInput {
  togglePause: boolean;
  stepOnce: boolean;
  cycleSpeed: boolean;
  newSeed: boolean;
  resetCamera: boolean;
  regenerateVisuals: boolean;
}

export interface InputSnapshot {
  controls: ControlInput;
  sim: SimInput;
}

const EMPTY_CONTROLS: ControlInput = {
  togglePause: false,
  stepOnce: false,
  cycleSpeed: false,
  newSeed: false,
  resetCamera: false,
  regenerateVisuals: false
};

export function createInputController(): {
  consume: () => InputSnapshot;
  signalTogglePause: () => void;
  signalStepOnce: () => void;
  signalCycleSpeed: () => void;
  signalNewSeed: () => void;
  signalResetCamera: () => void;
  signalRegenerateVisuals: () => void;
} {
  let pendingControls: ControlInput = { ...EMPTY_CONTROLS };
  const simInput: SimInput = {
    impulse: { x: 0, y: 0 },
    cameraPan: { x: 0, y: 0 },
    zoomIn: false,
    zoomOut: false,
    resetCamera: false
  };
  const pressedKeys = new Set<string>();

  function mergeFlag(flag: keyof ControlInput): void {
    pendingControls = { ...pendingControls, [flag]: true };
  }

  function consume(): InputSnapshot {
    const panX = Number(pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) -
      Number(pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA'));
    const panY = Number(pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) -
      Number(pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW'));

    simInput.cameraPan = { x: panX, y: panY };
    simInput.zoomIn = pressedKeys.has('Equal') || pressedKeys.has('NumpadAdd');
    simInput.zoomOut = pressedKeys.has('Minus') || pressedKeys.has('NumpadSubtract');
    simInput.resetCamera = pendingControls.resetCamera;

    const snapshot = {
      controls: pendingControls,
      sim: {
        impulse: { ...simInput.impulse },
        cameraPan: { ...simInput.cameraPan },
        zoomIn: simInput.zoomIn,
        zoomOut: simInput.zoomOut,
        resetCamera: simInput.resetCamera
      }
    };
    pendingControls = { ...EMPTY_CONTROLS };
    return snapshot;
  }

  function onKeyDown(event: KeyboardEvent): void {
    pressedKeys.add(event.code);
    switch (event.code) {
      case 'Space':
      case 'KeyP':
        mergeFlag('togglePause');
        break;
      case 'Period':
      case 'KeyO':
        mergeFlag('stepOnce');
        break;
      case 'KeyC':
        mergeFlag('cycleSpeed');
        break;
      case 'KeyN':
        mergeFlag('newSeed');
        break;
      case 'KeyR':
        mergeFlag('resetCamera');
        break;
      default:
        break;
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    pressedKeys.delete(event.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    consume,
    signalTogglePause: () => mergeFlag('togglePause'),
    signalStepOnce: () => mergeFlag('stepOnce'),
    signalCycleSpeed: () => mergeFlag('cycleSpeed'),
    signalNewSeed: () => mergeFlag('newSeed'),
    signalResetCamera: () => mergeFlag('resetCamera'),
    signalRegenerateVisuals: () => mergeFlag('regenerateVisuals')
  };
}
