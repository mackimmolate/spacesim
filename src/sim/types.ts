import type { GameMode } from './modes';
import type { Needs } from './needs';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  roomId: string;
  x: number;
  y: number;
  moveCooldown: number;
}

export interface InventoryState {
  rations: number;
}

export interface GameState {
  seed: string;
  renderSeed: string;
  rngState: number;
  tick: number;
  time: number;
  mode: GameMode;
  player: PlayerState;
  inventory: InventoryState;
  needs: Needs;
  log: string[];
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
  move: Vec2;
  interact: boolean;
  exitCommand: boolean;
}
