import type { SimInput } from '../sim/types';

export type SpeedMultiplier = 1 | 2 | 4;

export class Engine {
  private readonly fixedDelta: number;
  private accumulator = 0;
  private lastTime = 0;
  private paused = false;
  private stepRequested = false;
  private speed: SpeedMultiplier = 1;
  private tickCount = 0;
  private simTime = 0;

  constructor(ticksPerSecond: number) {
    this.fixedDelta = 1 / ticksPerSecond;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getSimTime(): number {
    return this.simTime;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getSpeed(): SpeedMultiplier {
    return this.speed;
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.speed = speed;
  }

  setClock(tickCount: number, simTime: number): void {
    this.tickCount = tickCount;
    this.simTime = simTime;
  }

  resetClock(): void {
    this.accumulator = 0;
    this.lastTime = 0;
    this.tickCount = 0;
    this.simTime = 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  stepOnce(): void {
    this.stepRequested = true;
  }

  update(now: number, input: SimInput, onTick: (dt: number, input: SimInput) => void): void {
    if (this.lastTime === 0) {
      this.lastTime = now;
      return;
    }

    const deltaSeconds = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const scaledDelta = deltaSeconds * this.speed;

    if (!this.paused) {
      this.accumulator += scaledDelta;
    }

    if (this.stepRequested) {
      this.accumulator += this.fixedDelta;
      this.stepRequested = false;
    }

    while (this.accumulator >= this.fixedDelta) {
      onTick(this.fixedDelta, input);
      this.accumulator -= this.fixedDelta;
      this.tickCount += 1;
      this.simTime += this.fixedDelta;
    }
  }
}
