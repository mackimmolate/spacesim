export interface Vec2 {
  x: number;
  y: number;
}

export interface GameState {
  seed: string;
  rngState: number;
  tick: number;
  time: number;
  ship: {
    position: Vec2;
    velocity: Vec2;
  };
  camera: Vec2;
}

export interface SaveState {
  version: 1;
  state: GameState;
}

export interface SimInput {
  impulse: Vec2;
}
