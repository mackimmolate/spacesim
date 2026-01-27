import * as PIXI from 'pixi.js';
import type { GameState } from '../sim/types';
import { GameMode } from '../sim/modes';
import {
  CHUNK_SIZE,
  generateSpaceDescriptor,
  generateStarChunk,
  type PlanetDescriptor,
  type SpaceDescriptor,
  type StarLayerSpec
} from './gen/spaceGen';
import { InteriorRenderer } from './avatar/InteriorRenderer';
import { SectorRenderer } from './sector/SectorRenderer';

interface StarLayerRuntime {
  spec: StarLayerSpec;
  container: PIXI.Container;
  chunks: Map<string, PIXI.Sprite>;
}

interface PlanetRuntime {
  sprite: PIXI.Sprite;
  descriptor: PlanetDescriptor;
}

export class Renderer {
  private readonly app: PIXI.Application;
  private readonly baseScale = 20;
  private readonly starLayers: StarLayerRuntime[] = [];
  private readonly planetContainer: PIXI.Container;
  private readonly planets: PlanetRuntime[] = [];
  private readonly ship: PIXI.Graphics;
  private readonly interior: InteriorRenderer;
  private readonly sector: SectorRenderer;
  private currentSeed = '';
  private descriptor: SpaceDescriptor | null = null;
  private lastMode: GameMode | null = null;
  private sectorClickHandler: ((nodeId: string) => void) | null = null;
  private lastState: GameState | null = null;
  private readonly onPointerDown = (event: PointerEvent) => this.handleSectorClick(event);
  private readonly onPointerMove = (event: PointerEvent) => this.handleSectorHover(event);
  private readonly onPointerLeave = () => this.clearSectorHover();
  private sectorViewport: DOMRect | null = null;
  private sectorMapVisible = true;
  private hoveredSectorNodeId: string | null = null;

  constructor(container: HTMLElement) {
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    this.app = new PIXI.Application({
      resizeTo: container,
      background: 0x050914,
      antialias: false
    });

    container.appendChild(this.app.view as HTMLCanvasElement);
    (this.app.view as HTMLCanvasElement).addEventListener('pointerdown', this.onPointerDown);
    (this.app.view as HTMLCanvasElement).addEventListener('pointermove', this.onPointerMove);
    (this.app.view as HTMLCanvasElement).addEventListener('pointerleave', this.onPointerLeave);

    this.planetContainer = new PIXI.Container();
    this.planetContainer.zIndex = 2;

    this.ship = new PIXI.Graphics();
    this.ship.beginFill(0xffcc66);
    this.ship.drawPolygon([0, -10, 6, 8, 0, 4, -6, 8]);
    this.ship.endFill();
    this.ship.zIndex = 3;

    this.app.stage.sortableChildren = true;
    this.app.stage.addChild(this.planetContainer, this.ship);

    this.interior = new InteriorRenderer(this.app);
    this.interior.container.zIndex = 5;
    this.app.stage.addChild(this.interior.container);

    this.sector = new SectorRenderer();
    this.sector.container.zIndex = 4;
    this.app.stage.addChild(this.sector.container);
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
    this.lastState = state;
    if (state.renderSeed !== this.currentSeed) {
      this.rebuildSpace(state.renderSeed);
    }

    const width = this.app.renderer.width;
    const height = this.app.renderer.height;
    const scale = this.baseScale * state.camera.zoom;

    if (state.mode !== this.lastMode) {
      const isCommand = state.mode === GameMode.Command;
      this.starLayers.forEach((layer) => {
        layer.container.visible = isCommand;
      });
      this.planetContainer.visible = isCommand;
      this.ship.visible = isCommand;
      this.interior.container.visible = !isCommand;
      this.sector.container.visible = isCommand;
      this.app.renderer.background.color = isCommand ? 0x050914 : 0x0b0f1a;
      this.lastMode = state.mode;
    }

    if (state.mode === GameMode.Command) {
      this.starLayers.forEach((layer) => {
        layer.container.scale.set(scale, scale);
        layer.container.position.set(
          width / 2 - state.camera.x * scale * layer.spec.parallax,
          height / 2 - state.camera.y * scale * layer.spec.parallax
        );
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
      );
      this.sector.setViewport(this.getSectorViewport());
      this.sector.setSelectedNode(state.sectorShip.inTransit?.toId ?? state.sectorShip.nodeId);
      this.sector.render(state);
    } else {
      this.interior.render(state, width, height);
    }
  }

  setSectorViewport(rect: DOMRect | null): void {
    this.sectorViewport = rect;
  }

  setSectorMapVisible(visible: boolean): void {
    this.sectorMapVisible = visible;
    if (!visible) {
      this.clearSectorHover();
    }
  }

  setSectorClickHandler(handler: ((nodeId: string) => void) | null): void {
    this.sectorClickHandler = handler;
  }

  private getSectorViewport(): { x: number; y: number; width: number; height: number } | null {
    if (!this.sectorMapVisible || !this.sectorViewport || !this.lastState) {
      return null;
    }
    if (this.lastState.mode !== GameMode.Command) {
      return null;
    }
    const canvasRect = (this.app.view as HTMLCanvasElement).getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      return null;
    }
    const scaleX = this.app.renderer.width / canvasRect.width;
    const scaleY = this.app.renderer.height / canvasRect.height;
    const x = (this.sectorViewport.left - canvasRect.left) * scaleX;
    const y = (this.sectorViewport.top - canvasRect.top) * scaleY;
    const width = this.sectorViewport.width * scaleX;
    const height = this.sectorViewport.height * scaleY;
    return { x, y, width, height };
  }

  private handleSectorClick(event: PointerEvent): void {
    if (!this.lastState || this.lastState.mode !== GameMode.Command) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const viewport = this.getSectorViewport();
    const point = this.eventToRendererPoint(event);
    if (!viewport || !point) {
      return;
    }
    const node = this.sector.pickNodeAtScreen(this.lastState.sector.nodes, point.x, point.y);
    if (!node || !this.sectorClickHandler) {
      return;
    }
    this.sectorClickHandler(node.id);
  }

  private handleSectorHover(event: PointerEvent): void {
    if (!this.lastState || this.lastState.mode !== GameMode.Command) {
      this.clearSectorHover();
      return;
    }
    const viewport = this.getSectorViewport();
    const point = this.eventToRendererPoint(event);
    if (!viewport || !point) {
      this.clearSectorHover();
      return;
    }
    const node = this.sector.pickNodeAtScreen(this.lastState.sector.nodes, point.x, point.y);
    const nextId = node?.id ?? null;
    (this.app.view as HTMLCanvasElement).style.cursor = nextId ? 'pointer' : '';
    if (nextId !== this.hoveredSectorNodeId) {
      this.hoveredSectorNodeId = nextId;
      this.sector.setHoverNode(nextId);
    }
  }

  private clearSectorHover(): void {
    if (this.hoveredSectorNodeId) {
      this.hoveredSectorNodeId = null;
      this.sector.setHoverNode(null);
    }
    (this.app.view as HTMLCanvasElement).style.cursor = '';
  }

  private eventToRendererPoint(event: PointerEvent): { x: number; y: number } | null {
    const rect = (this.app.view as HTMLCanvasElement).getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const scaleX = this.app.renderer.width / rect.width;
    const scaleY = this.app.renderer.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  destroy(): void {
    (this.app.view as HTMLCanvasElement).removeEventListener('pointerdown', this.onPointerDown);
    (this.app.view as HTMLCanvasElement).removeEventListener('pointermove', this.onPointerMove);
    (this.app.view as HTMLCanvasElement).removeEventListener('pointerleave', this.onPointerLeave);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
