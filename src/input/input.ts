import type { SimInput } from '../sim/types';

export interface ControlInput {
  togglePause: boolean;
  stepOnce: boolean;
  cycleSpeed: boolean;
  newSeed: boolean;
  resetCamera: boolean;
  regenerateVisuals: boolean;
  toggleSectorMap: boolean;
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
  regenerateVisuals: false,
  toggleSectorMap: false
};

export function createInputController(): {
  consume: () => InputSnapshot;
  signalTogglePause: () => void;
  signalStepOnce: () => void;
  signalCycleSpeed: () => void;
  signalNewSeed: () => void;
  signalResetCamera: () => void;
  signalRegenerateVisuals: () => void;
  signalToggleSectorMap: () => void;
} {
  let pendingControls: ControlInput = { ...EMPTY_CONTROLS };
  const simInput: SimInput = {
    impulse: { x: 0, y: 0 },
    cameraPan: { x: 0, y: 0 },
    zoomIn: false,
    zoomOut: false,
    resetCamera: false,
    move: { x: 0, y: 0 },
    interact: false,
    exitCommand: false
  };
  const pressedKeys = new Set<string>();
  let pendingInteract = false;
  let pendingExitCommand = false;
  let wheelSteps = 0;
  const maxWheelSteps = 12;

  function mergeFlag(flag: keyof ControlInput): void {
    pendingControls = { ...pendingControls, [flag]: true };
  }

  function consume(): InputSnapshot {
    const panX = Number(pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) -
      Number(pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA'));
    const panY = Number(pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) -
      Number(pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW'));

    simInput.cameraPan = { x: panX, y: panY };
    simInput.move = { x: panX, y: panY };
    let wheelZoomIn = false;
    let wheelZoomOut = false;
    if (wheelSteps !== 0) {
      wheelZoomIn = wheelSteps > 0;
      wheelZoomOut = wheelSteps < 0;
      wheelSteps += wheelSteps > 0 ? -1 : 1;
    }

    simInput.zoomIn = pressedKeys.has('Equal') || pressedKeys.has('NumpadAdd') || wheelZoomIn;
    simInput.zoomOut = pressedKeys.has('Minus') || pressedKeys.has('NumpadSubtract') || wheelZoomOut;
    simInput.resetCamera = pendingControls.resetCamera;
    simInput.interact = pendingInteract;
    simInput.exitCommand = pendingExitCommand;

    const snapshot: InputSnapshot = {
      controls: pendingControls,
      sim: {
        impulse: { ...simInput.impulse },
        cameraPan: { ...simInput.cameraPan },
        zoomIn: simInput.zoomIn,
        zoomOut: simInput.zoomOut,
        resetCamera: simInput.resetCamera,
        move: { ...simInput.move },
        interact: simInput.interact,
        exitCommand: simInput.exitCommand
      }
    };
    pendingControls = { ...EMPTY_CONTROLS };
    pendingInteract = false;
    pendingExitCommand = false;
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
      case 'KeyM':
        mergeFlag('toggleSectorMap');
        break;
      case 'KeyE':
        if (!event.repeat) {
          pendingInteract = true;
        }
        break;
      case 'Escape':
        if (!event.repeat) {
          pendingExitCommand = true;
        }
        break;
      default:
        break;
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    pressedKeys.delete(event.code);
  }

  function isScrollTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const container = target.closest('.overlay, .crew-panel, .contracts-panel');
    if (!container) {
      return false;
    }
    return container.scrollHeight > container.clientHeight;
  }

  function onWheel(event: WheelEvent): void {
    if (isScrollTarget(event.target)) {
      return;
    }
    if (event.deltaY === 0) {
      return;
    }
    const direction = event.deltaY > 0 ? -1 : 1;
    wheelSteps = Math.max(-maxWheelSteps, Math.min(maxWheelSteps, wheelSteps + direction));
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('wheel', onWheel, { passive: false });

  return {
    consume,
    signalTogglePause: () => mergeFlag('togglePause'),
    signalStepOnce: () => mergeFlag('stepOnce'),
    signalCycleSpeed: () => mergeFlag('cycleSpeed'),
    signalNewSeed: () => mergeFlag('newSeed'),
    signalResetCamera: () => mergeFlag('resetCamera'),
    signalRegenerateVisuals: () => mergeFlag('regenerateVisuals'),
    signalToggleSectorMap: () => mergeFlag('toggleSectorMap')
  };
}
