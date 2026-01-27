import * as PIXI from 'pixi.js';
import type { GameState } from '../sim/types';
import {
  CHUNK_SIZE,
  generateSpaceDescriptor,
  generateStarChunk,
  type PlanetDescriptor,
  type SpaceDescriptor,
  type StarLayerSpec
} from './gen/spaceGen';

interface StarLayerRuntime {
  spec: StarLayerSpec;
  container: PIXI.Container;
  chunks: Map<string, PIXI.Sprite>;
}

interface PlanetRuntime {
  sprite: PIXI.Sprite;
  descriptor: PlanetDescriptor;
import { hashSeedToUint32, nextRng } from '../sim/rng';
import type { GameState } from '../sim/types';

interface StarLayer {
  sprite: PIXI.TilingSprite;
  parallax: number;
  alpha: number;
}

export class Renderer {
  private readonly app: PIXI.Application;
  private readonly baseScale = 20;
  private readonly starLayers: StarLayerRuntime[] = [];
  private readonly planetContainer: PIXI.Container;
  private readonly planets: PlanetRuntime[] = [];
  private readonly ship: PIXI.Graphics;
  private currentSeed = '';
  private descriptor: SpaceDescriptor | null = null;

  constructor(container: HTMLElement) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    this.app = new PIXI.Application({
      resizeTo: container,
      backgroundColor: 0x050914,
      antialias: false
    });
    this.app.renderer.roundPixels = true;

    container.appendChild(this.app.view as HTMLCanvasElement);

    this.planetContainer = new PIXI.Container();
    this.planetContainer.zIndex = 2;

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
    this.app.stage.addChild(this.planetContainer, this.ship);
  }

  private rebuildSpace(seed: string): void {
    this.starLayers.forEach((layer) => layer.container.destroy({ children: true }));
    this.starLayers.length = 0;
    this.planetContainer.removeChildren().forEach((child) => child.destroy());
    this.planets.length = 0;

    this.descriptor = generateSpaceDescriptor(seed);

    this.descriptor.layers.forEach((spec) => {
      const container = new PIXI.Container();
      container.zIndex = 0;
      this.starLayers.push({ spec, container, chunks: new Map() });
      this.app.stage.addChild(container);
    });

    this.descriptor.planets.forEach((planet) => {
      const sprite = this.createPlanetSprite(planet);
      sprite.zIndex = 1;
      this.planetContainer.addChild(sprite);
      this.planets.push({ sprite, descriptor: planet });
    });

    this.currentSeed = seed;
  }

  private createPlanetSprite(planet: PlanetDescriptor): PIXI.Sprite {
    const texture = this.createPlanetTexture(planet);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  private createPlanetTexture(planet: PlanetDescriptor): PIXI.Texture {
    const container = new PIXI.Container();
    const base = new PIXI.Graphics();
    base.beginFill(planet.color);
    base.drawCircle(0, 0, planet.radius);
    base.endFill();

    const bands = new PIXI.Graphics();
    const bandHeight = planet.radius / (planet.bandColors.length + 1);
    planet.bandColors.forEach((color, index) => {
      bands.beginFill(color, 0.5);
      bands.drawRect(
        -planet.radius,
        -planet.radius + bandHeight * (index + 1),
        planet.radius * 2,
        bandHeight * 0.5
      );
      bands.endFill();
    });

    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawCircle(0, 0, planet.radius);
    mask.endFill();
    bands.mask = mask;

    const shadow = new PIXI.Graphics();
    shadow.beginFill(planet.shadowColor, 0.6);
    shadow.drawCircle(planet.radius * 0.25, planet.radius * 0.25, planet.radius * 0.95);
    shadow.endFill();
    shadow.mask = mask;

    const highlight = new PIXI.Graphics();
    highlight.beginFill(planet.highlightColor, 0.5);
    highlight.drawCircle(-planet.radius * 0.35, -planet.radius * 0.35, planet.radius * 0.4);
    highlight.endFill();
    highlight.mask = mask;

    container.addChild(base, bands, shadow, highlight, mask);

    if (planet.hasRings) {
      const ring = new PIXI.Graphics();
      ring.lineStyle(planet.radius * 0.1, planet.ringColor, 0.6);
      ring.drawEllipse(0, 0, planet.radius * 1.6, planet.radius * (0.55 + planet.ringTilt));
      container.addChildAt(ring, 0);
    }

    if (planet.moons.length > 0) {
      planet.moons.forEach((moon) => {
        const moonSprite = new PIXI.Graphics();
        moonSprite.beginFill(moon.color);
        moonSprite.drawCircle(0, 0, moon.radius * planet.radius);
        moonSprite.endFill();
        moonSprite.position.set(
          Math.cos(moon.angle) * moon.distance * planet.radius,
          Math.sin(moon.angle) * moon.distance * planet.radius
        );
        container.addChild(moonSprite);
      });
    }

    const atmosphere = new PIXI.Graphics();
    atmosphere.lineStyle(planet.radius * 0.08, planet.atmosphereColor, 0.35);
    atmosphere.drawCircle(0, 0, planet.radius * 1.02);
    container.addChild(atmosphere);

    const texture = this.app.renderer.generateTexture(container, {
      resolution: this.baseScale,
      scaleMode: PIXI.SCALE_MODES.NEAREST
    });
    container.destroy({ children: true });
    return texture;
  }

  private updateStarChunks(
    layer: StarLayerRuntime,
    cameraX: number,
    cameraY: number,
    viewWidth: number,
    viewHeight: number
  ): void {
    const halfWidth = viewWidth / 2;
    const halfHeight = viewHeight / 2;
    const minChunkX = Math.floor((cameraX - halfWidth) / CHUNK_SIZE) - 1;
    const maxChunkX = Math.floor((cameraX + halfWidth) / CHUNK_SIZE) + 1;
    const minChunkY = Math.floor((cameraY - halfHeight) / CHUNK_SIZE) - 1;
    const maxChunkY = Math.floor((cameraY + halfHeight) / CHUNK_SIZE) + 1;

    const needed = new Set<string>();

    for (let cy = minChunkY; cy <= maxChunkY; cy += 1) {
      for (let cx = minChunkX; cx <= maxChunkX; cx += 1) {
        const key = `${cx},${cy}`;
        needed.add(key);
        if (!layer.chunks.has(key)) {
          const sprite = this.createStarChunkSprite(layer.spec, cx, cy);
          sprite.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE);
          layer.container.addChild(sprite);
          layer.chunks.set(key, sprite);
        }
      }
    }

    Array.from(layer.chunks.entries()).forEach(([key, sprite]) => {
      if (!needed.has(key)) {
        layer.chunks.delete(key);
        sprite.destroy();
      }
    });
  }

  private createStarChunkSprite(layer: StarLayerSpec, chunkX: number, chunkY: number): PIXI.Sprite {
    if (!this.descriptor) {
      throw new Error('Missing space descriptor');
    }
    const stars = generateStarChunk(this.descriptor.seed, layer, chunkX, chunkY);
    const graphics = new PIXI.Graphics();

    stars.forEach((star) => {
      graphics.beginFill(layer.color, star.alpha);
      graphics.drawRect(star.x, star.y, star.radius, star.radius);
      graphics.endFill();
    });

    const texture = this.app.renderer.generateTexture(graphics, {
      resolution: this.baseScale,
      scaleMode: PIXI.SCALE_MODES.NEAREST
    });
    graphics.destroy();

    return new PIXI.Sprite(texture);
  }

  render(state: GameState): void {
    if (state.renderSeed !== this.currentSeed) {
      this.rebuildSpace(state.renderSeed);
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
    const scale = this.baseScale * state.camera.zoom;

    this.starLayers.forEach((layer) => {
      layer.container.scale.set(scale, scale);
      layer.container.position.set(width / 2 - state.camera.x * scale * layer.spec.parallax, height / 2 - state.camera.y * scale * layer.spec.parallax);
      this.updateStarChunks(
        layer,
        state.camera.x * layer.spec.parallax,
        state.camera.y * layer.spec.parallax,
        width / scale,
        height / scale
      );
    });

    this.planets.forEach(({ sprite, descriptor }) => {
      sprite.scale.set(state.camera.zoom, state.camera.zoom);
      sprite.position.set(
        width / 2 + (descriptor.position.x - state.camera.x * descriptor.parallax) * scale,
        height / 2 + (descriptor.position.y - state.camera.y * descriptor.parallax) * scale
      );
    });

    this.ship.scale.set(state.camera.zoom, state.camera.zoom);
    this.ship.position.set(
      width / 2 + (state.ship.position.x - state.camera.x) * scale,
      height / 2 + (state.ship.position.y - state.camera.y) * scale

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
