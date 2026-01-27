import * as PIXI from 'pixi.js';
import { hashSeedToUint32, nextRng } from '../sim/rng';
import type { GameState } from '../sim/types';

interface StarLayer {
  sprite: PIXI.TilingSprite;
  parallax: number;
  alpha: number;
}

export class Renderer {
  private readonly app: PIXI.Application;
  private readonly layers: StarLayer[] = [];
  private readonly ship: PIXI.Graphics;
  private currentSeed = '';

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application({
      resizeTo: container,
      backgroundColor: 0x050914,
      antialias: true
    });

    container.appendChild(this.app.view as HTMLCanvasElement);

    this.ship = new PIXI.Graphics();
    this.ship.beginFill(0xffcc66);
    this.ship.drawPolygon([0, -10, 6, 8, 0, 4, -6, 8]);
    this.ship.endFill();
    this.ship.zIndex = 10;

    this.app.stage.sortableChildren = true;
    this.app.stage.addChild(this.ship);
  }

  private createStarTexture(seed: string, density: number, color: number): PIXI.Texture {
    const size = 512;
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);

    let rngState = hashSeedToUint32(seed);
    for (let i = 0; i < density; i += 1) {
      const nextX = nextRng(rngState);
      const nextY = nextRng(nextX.nextState);
      rngState = nextY.nextState;
      const x = Math.floor(nextX.value * size);
      const y = Math.floor(nextY.value * size);
      const radius = 1 + Math.floor(nextX.value * 2);
      graphics.drawCircle(x, y, radius);
    }

    graphics.endFill();
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  private rebuildStarfield(seed: string): void {
    this.layers.forEach((layer) => layer.sprite.destroy(true));
    this.layers.length = 0;

    const configs = [
      { parallax: 0.2, density: 120, color: 0x394b8f, alpha: 0.5 },
      { parallax: 0.4, density: 90, color: 0x6d8bdc, alpha: 0.65 },
      { parallax: 0.7, density: 60, color: 0xaad1ff, alpha: 0.8 }
    ];

    configs.forEach((config, index) => {
      const texture = this.createStarTexture(`${seed}-${index}`, config.density, config.color);
      const sprite = new PIXI.TilingSprite(texture, this.app.renderer.width, this.app.renderer.height);
      sprite.alpha = config.alpha;
      sprite.zIndex = index;
      this.app.stage.addChild(sprite);
      this.layers.push({
        sprite,
        parallax: config.parallax,
        alpha: config.alpha
      });
    });

    this.currentSeed = seed;
  }

  render(state: GameState): void {
    if (state.seed !== this.currentSeed) {
      this.rebuildStarfield(state.seed);
    }

    const width = this.app.renderer.width;
    const height = this.app.renderer.height;

    this.layers.forEach((layer) => {
      layer.sprite.width = width;
      layer.sprite.height = height;
      layer.sprite.tilePosition.x = -state.camera.x * layer.parallax;
      layer.sprite.tilePosition.y = -state.camera.y * layer.parallax;
    });

    const centerX = width / 2;
    const centerY = height / 2;
    this.ship.position.set(
      centerX + (state.ship.position.x - state.camera.x) * 20,
      centerY + (state.ship.position.y - state.camera.y) * 20
    );
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
