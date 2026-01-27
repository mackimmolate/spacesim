export interface Vec2 {
  x: number;
  y: number;
}

export interface GameState {
  seed: string;
  renderSeed: string;
  rngState: number;
  tick: number;
  time: number;
  ship: {
    position: Vec2;
    velocity: Vec2;
  };
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface SaveState {
  version: 1;
  state: GameState;
}

export interface SimInput {
  impulse: Vec2;
  cameraPan: Vec2;
  zoomIn: boolean;
  zoomOut: boolean;
  resetCamera: boolean;
}
