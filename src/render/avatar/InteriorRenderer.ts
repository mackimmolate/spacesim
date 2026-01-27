import * as PIXI from 'pixi.js';
import type { GameState } from '../../sim/types';
import { MAP_HEIGHT, MAP_WIDTH, getInteriorTile } from '../../sim/interior/map';
import { INTERIOR_OBJECTS, type InteriorObjectType } from '../../sim/interior/objects';

const TILE_SIZE = 16;

const TILE_COLORS = {
  floor: 0x121826,
  wall: 0x2a3244
};

const OBJECT_COLORS: Record<InteriorObjectType, number> = {
  'command-chair': 0x7aa5ff,
  bed: 0x7bc7b2,
  galley: 0xd9a441,
  water: 0x5ca4ff
};

export class InteriorRenderer {
  readonly container: PIXI.Container;
  private readonly tileContainer: PIXI.Container;
  private readonly objectContainer: PIXI.Container;
  private readonly player: PIXI.Graphics;
  private readonly floorTexture: PIXI.Texture;
  private readonly wallTexture: PIXI.Texture;
  private readonly objectTextures: Record<InteriorObjectType, PIXI.Texture>;

  constructor(app: PIXI.Application) {
    this.container = new PIXI.Container();
    this.tileContainer = new PIXI.Container();
    this.objectContainer = new PIXI.Container();

    this.floorTexture = this.createTileTexture(app, TILE_COLORS.floor);
    this.wallTexture = this.createTileTexture(app, TILE_COLORS.wall);

    this.objectTextures = {
      'command-chair': this.createObjectTexture(app, OBJECT_COLORS['command-chair']),
      bed: this.createObjectTexture(app, OBJECT_COLORS.bed),
      galley: this.createObjectTexture(app, OBJECT_COLORS.galley),
      water: this.createObjectTexture(app, OBJECT_COLORS.water)
    };

    this.container.addChild(this.tileContainer, this.objectContainer);

    this.player = new PIXI.Graphics();
    this.player.beginFill(0xffd36b);
    this.player.drawRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    this.player.endFill();
    this.container.addChild(this.player);

    this.buildTiles();
    this.buildObjects();
  }

  private createTileTexture(app: PIXI.Application, color: number): PIXI.Texture {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);
    graphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.endFill();
    const texture = app.renderer.generateTexture(graphics, {
      resolution: 1,
      scaleMode: PIXI.SCALE_MODES.NEAREST
    });
    graphics.destroy();
    return texture;
  }

  private createObjectTexture(app: PIXI.Application, color: number): PIXI.Texture {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);
    graphics.drawRect(3, 3, TILE_SIZE - 6, TILE_SIZE - 6);
    graphics.endFill();
    const texture = app.renderer.generateTexture(graphics, {
      resolution: 1,
      scaleMode: PIXI.SCALE_MODES.NEAREST
    });
    graphics.destroy();
    return texture;
  }

  private buildTiles(): void {
    this.tileContainer.removeChildren().forEach((child) => child.destroy());
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const tile = getInteriorTile(x, y);
        const sprite = new PIXI.Sprite(tile === '#' ? this.wallTexture : this.floorTexture);
        sprite.position.set(x * TILE_SIZE, y * TILE_SIZE);
        this.tileContainer.addChild(sprite);
      }
    }
  }

  private buildObjects(): void {
    this.objectContainer.removeChildren().forEach((child) => child.destroy());
    INTERIOR_OBJECTS.forEach((object) => {
      const sprite = new PIXI.Sprite(this.objectTextures[object.type]);
      sprite.position.set(object.x * TILE_SIZE, object.y * TILE_SIZE);
      this.objectContainer.addChild(sprite);
    });
  }

  render(state: GameState, width: number, height: number): void {
    const scale = Math.max(
      1,
      Math.floor(Math.min(width / (MAP_WIDTH * TILE_SIZE), height / (MAP_HEIGHT * TILE_SIZE)))
    );
    const mapWidth = MAP_WIDTH * TILE_SIZE * scale;
    const mapHeight = MAP_HEIGHT * TILE_SIZE * scale;
    this.container.scale.set(scale, scale);
    this.container.position.set(
      Math.floor((width - mapWidth) / 2),
      Math.floor((height - mapHeight) / 2)
    );

    this.player.position.set(state.player.x * TILE_SIZE, state.player.y * TILE_SIZE);
  }
}
