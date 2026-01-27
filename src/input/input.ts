import type { SimInput } from '../sim/types';

export interface ControlInput {
  togglePause: boolean;
  stepOnce: boolean;
  cycleSpeed: boolean;
  newSeed: boolean;
}

export interface InputSnapshot {
  controls: ControlInput;
  sim: SimInput;
}

const EMPTY_CONTROLS: ControlInput = {
  togglePause: false,
  stepOnce: false,
  cycleSpeed: false,
  newSeed: false
};

export function createInputController(): {
  consume: () => InputSnapshot;
  signalTogglePause: () => void;
  signalStepOnce: () => void;
  signalCycleSpeed: () => void;
  signalNewSeed: () => void;
} {
  let pendingControls: ControlInput = { ...EMPTY_CONTROLS };
  const simInput: SimInput = { impulse: { x: 0, y: 0 } };

  function mergeFlag(flag: keyof ControlInput): void {
    pendingControls = { ...pendingControls, [flag]: true };
  }

  function consume(): InputSnapshot {
    const snapshot = {
      controls: pendingControls,
      sim: { impulse: { ...simInput.impulse } }
    };
    pendingControls = { ...EMPTY_CONTROLS };
    return snapshot;
  }

  function onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
      case 'KeyP':
        mergeFlag('togglePause');
        break;
      case 'Period':
      case 'KeyO':
        mergeFlag('stepOnce');
        break;
      case 'KeyS':
        mergeFlag('cycleSpeed');
        break;
      case 'KeyN':
        mergeFlag('newSeed');
        break;
      default:
        break;
    }
  }

  window.addEventListener('keydown', onKeyDown);

  return {
    consume,
    signalTogglePause: () => mergeFlag('togglePause'),
    signalStepOnce: () => mergeFlag('stepOnce'),
    signalCycleSpeed: () => mergeFlag('cycleSpeed'),
    signalNewSeed: () => mergeFlag('newSeed')
  };
}
