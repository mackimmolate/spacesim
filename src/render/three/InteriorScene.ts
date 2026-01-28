import * as THREE from 'three';
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

export class InteriorScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly root: THREE.Group;
  private readonly tileGroup: THREE.Group;
  private readonly objectGroup: THREE.Group;
  private readonly player: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly tileGeometry: THREE.PlaneGeometry;
  private readonly objectGeometry: THREE.PlaneGeometry;
  private readonly playerGeometry: THREE.PlaneGeometry;
  private readonly floorMaterial: THREE.MeshBasicMaterial;
  private readonly wallMaterial: THREE.MeshBasicMaterial;
  private readonly objectMaterials: Record<InteriorObjectType, THREE.MeshBasicMaterial>;
  private readonly playerMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100);
    this.camera.position.z = 10;
    this.root = new THREE.Group();
    this.tileGroup = new THREE.Group();
    this.objectGroup = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.tileGroup, this.objectGroup);

    this.tileGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    this.objectGeometry = new THREE.PlaneGeometry(TILE_SIZE - 6, TILE_SIZE - 6);
    this.playerGeometry = new THREE.PlaneGeometry(TILE_SIZE - 8, TILE_SIZE - 8);

    this.floorMaterial = new THREE.MeshBasicMaterial({ color: TILE_COLORS.floor });
    this.wallMaterial = new THREE.MeshBasicMaterial({ color: TILE_COLORS.wall });
    this.floorMaterial.depthTest = false;
    this.floorMaterial.depthWrite = false;
    this.wallMaterial.depthTest = false;
    this.wallMaterial.depthWrite = false;

    this.objectMaterials = {
      'command-chair': new THREE.MeshBasicMaterial({ color: OBJECT_COLORS['command-chair'] }),
      bed: new THREE.MeshBasicMaterial({ color: OBJECT_COLORS.bed }),
      galley: new THREE.MeshBasicMaterial({ color: OBJECT_COLORS.galley }),
      water: new THREE.MeshBasicMaterial({ color: OBJECT_COLORS.water })
    };
    Object.values(this.objectMaterials).forEach((material) => {
      material.depthTest = false;
      material.depthWrite = false;
    });

    this.playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffd36b });
    this.playerMaterial.depthTest = false;
    this.playerMaterial.depthWrite = false;

    this.player = new THREE.Mesh(this.playerGeometry, this.playerMaterial);
    this.player.renderOrder = 2;
    this.root.add(this.player);

    this.buildTiles();
    this.buildObjects();
  }

  render(state: GameState, width: number, height: number): void {
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = 0;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();

    const scale = Math.max(
      1,
      Math.floor(Math.min(width / (MAP_WIDTH * TILE_SIZE), height / (MAP_HEIGHT * TILE_SIZE)))
    );
    const mapWidth = MAP_WIDTH * TILE_SIZE * scale;
    const mapHeight = MAP_HEIGHT * TILE_SIZE * scale;
    this.root.scale.set(scale, scale, 1);
    this.root.position.set(
      Math.floor((width - mapWidth) / 2),
      Math.floor((height - mapHeight) / 2),
      0
    );

    const playerSize = TILE_SIZE - 8;
    this.player.position.set(
      state.player.x * TILE_SIZE + 4 + playerSize / 2,
      state.player.y * TILE_SIZE + 4 + playerSize / 2,
      0
    );
  }

  dispose(): void {
    this.root.clear();
    this.tileGeometry.dispose();
    this.objectGeometry.dispose();
    this.playerGeometry.dispose();
    this.floorMaterial.dispose();
    this.wallMaterial.dispose();
    Object.values(this.objectMaterials).forEach((material) => material.dispose());
    this.playerMaterial.dispose();
  }

  private buildTiles(): void {
    this.tileGroup.clear();
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const tile = getInteriorTile(x, y);
        const material = tile === '#' ? this.wallMaterial : this.floorMaterial;
        const mesh = new THREE.Mesh(this.tileGeometry, material);
        mesh.position.set(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 0);
        mesh.renderOrder = 0;
        this.tileGroup.add(mesh);
      }
    }
  }

  private buildObjects(): void {
    this.objectGroup.clear();
    const objectSize = TILE_SIZE - 6;
    INTERIOR_OBJECTS.forEach((object) => {
      const mesh = new THREE.Mesh(this.objectGeometry, this.objectMaterials[object.type]);
      mesh.position.set(
        object.x * TILE_SIZE + 3 + objectSize / 2,
        object.y * TILE_SIZE + 3 + objectSize / 2,
        0
      );
      mesh.renderOrder = 1;
      this.objectGroup.add(mesh);
    });
  }
}
