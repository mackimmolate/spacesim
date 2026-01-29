import * as THREE from 'three';
import type { GameState } from '../../sim/types';
import { MAP_HEIGHT, MAP_WIDTH } from '../../sim/interior/map';
import { INTERIOR_OBJECTS } from '../../sim/interior/objects';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE_SIZE = 1.6;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_DEPTH = MAP_HEIGHT * TILE_SIZE;
const HALF_WIDTH = WORLD_WIDTH / 2;
const HALF_DEPTH = WORLD_DEPTH / 2;

const ASSETS = {
  chair: 'assets/vendor/sketchfab/chair/sci-fi_chairs_demo.glb',
  consoleMain: 'assets/vendor/sketchfab/console-main/sci-fi_computer_desk_console.glb',
  consoleSecondary: 'assets/vendor/sketchfab/console-secondary/sci-fi_computer_console.glb',
  prop: 'assets/vendor/sketchfab/prop/sci-fi_military_canteen.glb'
};


export class InteriorScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly root: THREE.Group;
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly wallGroup: THREE.Group;
  private readonly objectGroup: THREE.Group;
  private readonly commanderGroup: THREE.Group;
  private readonly player: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly loader: GLTFLoader;
  private readonly assets: Partial<Record<keyof typeof ASSETS, THREE.Object3D>> = {};
  private readonly debugTargets: THREE.Object3D[] = [];
  private debugEnabled = false;
  private debugIndex = 0;
  private debugBox: THREE.BoxHelper | null = null;
  private debugAxes: THREE.AxesHelper | null = null;
  private readonly onKeyDown = (event: KeyboardEvent) => this.handleDebugKey(event);
  private readonly onKeyUp = (event: KeyboardEvent) => this.handleDebugKeyUp(event);
  private debugShift = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x04060c, 18, 48);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camera.up.set(0, 0, -1);

    this.root = new THREE.Group();
    this.wallGroup = new THREE.Group();
    this.objectGroup = new THREE.Group();
    this.commanderGroup = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.wallGroup, this.objectGroup, this.commanderGroup);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.85,
      metalness: 0.35
    });
    const floorGeometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH);
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.root.add(this.floor);

    this.buildWalls();

    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd36b,
      roughness: 0.6,
      metalness: 0.1
    });
    this.player = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), playerMaterial);
    this.player.castShadow = true;
    this.player.position.y = 0.6;
    this.objectGroup.add(this.player);

    this.setupLights();

    this.loader = new GLTFLoader();
    this.loadAssets();
    this.buildCommanderSet();
    this.buildFallbackObjects();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  render(state: GameState, width: number, height: number): void {
    const aspect = width / height;
    const viewSize = Math.max(WORLD_WIDTH, WORLD_DEPTH) * 0.65;
    this.camera.left = (-viewSize * aspect) / 2;
    this.camera.right = (viewSize * aspect) / 2;
    this.camera.top = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.updateProjectionMatrix();

    const distance = Math.max(WORLD_WIDTH, WORLD_DEPTH) * 0.9;
    this.camera.position.set(0, distance, 0);
    this.camera.lookAt(0, 0, 0);

    const playerPos = this.tileToWorld(state.player.x, state.player.y);
    this.player.position.set(playerPos.x, 0.6, playerPos.z);
  }

  setEnvironmentMap(environment: THREE.Texture): void {
    this.scene.environment = environment;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.clear();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.player.geometry.dispose();
    this.player.material.dispose();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x1a2233, 0.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x9cc4ff, 0.65);
    keyLight.position.set(8, 12, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x2b6cff, 0.25);
    rimLight.position.set(-10, 8, -6);
    this.scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xffc98a, 0.8, 18, 2);
    warmLight.position.set(0, 3, -2);
    this.scene.add(warmLight);

    const consoleGlow = new THREE.PointLight(0x66d0ff, 0.6, 10, 2);
    consoleGlow.position.set(0, 1.4, -3.6);
    this.scene.add(consoleGlow);
  }

  private buildWalls(): void {
    this.wallGroup.clear();
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b2434,
      roughness: 0.75,
      metalness: 0.15
    });
    const thickness = 0.5;
    const height = 3.2;
    const north = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH + thickness * 2, height, thickness), wallMaterial);
    north.position.set(0, height / 2, -HALF_DEPTH - thickness / 2);
    const south = north.clone();
    south.position.set(0, height / 2, HALF_DEPTH + thickness / 2);
    const east = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, WORLD_DEPTH), wallMaterial);
    east.position.set(HALF_WIDTH + thickness / 2, height / 2, 0);
    const west = east.clone();
    west.position.set(-HALF_WIDTH - thickness / 2, height / 2, 0);
    [north, south, east, west].forEach((wall) => {
      wall.receiveShadow = true;
      this.wallGroup.add(wall);
    });
  }

  private buildFallbackObjects(): void {
    this.objectGroup.clear();
    this.objectGroup.add(this.player);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0x334058,
      roughness: 0.7,
      metalness: 0.2
    });
    INTERIOR_OBJECTS.forEach((object) => {
      if (object.type === 'command-chair') {
        return;
      }
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), fallbackMaterial);
      const pos = this.tileToWorld(object.x, object.y);
      box.position.set(pos.x, 0.5, pos.z);
      box.castShadow = true;
      box.receiveShadow = true;
      this.objectGroup.add(box);
    });
  }

  private buildCommanderSet(): void {
    this.commanderGroup.clear();
    this.debugTargets.length = 0;
    const chair = this.assets.chair ? this.assets.chair.clone(true) : this.createPlaceholder(0x4064a8);
    const consoleMain = this.assets.consoleMain
      ? this.assets.consoleMain.clone(true)
      : this.createPlaceholder(0x244a6e);
    const consoleSecondary = this.assets.consoleSecondary
      ? this.assets.consoleSecondary.clone(true)
      : this.createPlaceholder(0x1b334d);
    const prop = this.assets.prop ? this.assets.prop.clone(true) : this.createPlaceholder(0x4a5a68);

    this.normalizeAsset(chair, { x: 1.4, z: 1.4, y: 1.8 });
    this.normalizeAsset(consoleMain, { x: 4.2, z: 1.8, y: 1.6 });
    this.normalizeAsset(consoleSecondary, { x: 2.8, z: 1.4, y: 1.4 });
    this.normalizeAsset(prop, { x: 0.6, z: 0.6, y: 0.6 });

    const chairObject = INTERIOR_OBJECTS.find((entry) => entry.type === 'command-chair');
    const chairPos = chairObject ? this.tileToWorld(chairObject.x, chairObject.y) : new THREE.Vector3();
    chair.position.set(chairPos.x, 0, chairPos.z);
    chair.rotation.y = Math.PI;

    consoleMain.position.set(chairPos.x, 0, chairPos.z - TILE_SIZE * 1.3);
    consoleMain.rotation.y = Math.PI;

    consoleSecondary.position.set(chairPos.x + TILE_SIZE * 1.6, 0, chairPos.z - TILE_SIZE * 0.6);
    consoleSecondary.rotation.y = Math.PI * 0.6;

    prop.position.set(chairPos.x + TILE_SIZE * 1.2, 1.0, chairPos.z - TILE_SIZE * 1.1);

    [chair, consoleMain, consoleSecondary, prop].forEach((object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.commanderGroup.add(object);
      this.debugTargets.push(object);
    });

    this.refreshDebugHelpers();
  }

  private createPlaceholder(color: number): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private loadAssets(): void {
    this.loadAsset('chair', ASSETS.chair);
    this.loadAsset('consoleMain', ASSETS.consoleMain);
    this.loadAsset('consoleSecondary', ASSETS.consoleSecondary);
    this.loadAsset('prop', ASSETS.prop);
  }

  private loadAsset(name: keyof typeof ASSETS, url: string): void {
    this.loader.load(this.resolveAssetUrl(url), (gltf: GLTF) => {
      const primary = this.extractPrimaryObject(gltf.scene);
      this.assets[name] = primary;
      this.buildCommanderSet();
    });
  }

  private resolveAssetUrl(path: string): string {
    const baseUrl = (import.meta as ImportMeta).env?.BASE_URL ?? '/';
    const resolvedBase = baseUrl.startsWith('http')
      ? baseUrl
      : new URL(baseUrl, window.location.origin).toString();
    return new URL(path, resolvedBase).toString();
  }

  private extractPrimaryObject(root: THREE.Object3D): THREE.Object3D {
    if (root.children.length <= 1) {
      return root;
    }
    let best: THREE.Object3D = root.children[0];
    let bestVolume = 0;
    root.children.forEach((child) => {
      const box = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      box.getSize(size);
      const volume = size.x * size.y * size.z;
      if (volume > bestVolume) {
        bestVolume = volume;
        best = child;
      }
    });
    return best.clone(true);
  }

  private normalizeAsset(
    object: THREE.Object3D,
    target: { x: number; z: number; y: number }
  ): void {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x === 0 || size.y === 0 || size.z === 0) {
      return;
    }
    const scale = Math.min(target.x / size.x, target.y / size.y, target.z / size.z);
    object.scale.setScalar(scale);
    const scaledBox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    const minY = scaledBox.min.y;
    object.position.sub(center);
    object.position.y -= minY;
  }

  private tileToWorld(x: number, y: number): THREE.Vector3 {
    const worldX = -HALF_WIDTH + TILE_SIZE / 2 + x * TILE_SIZE;
    const worldZ = -HALF_DEPTH + TILE_SIZE / 2 + y * TILE_SIZE;
    return new THREE.Vector3(worldX, 0, worldZ);
  }

  private handleDebugKey(event: KeyboardEvent): void {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.debugShift = true;
      return;
    }

    if (event.code === 'KeyT') {
      this.debugEnabled = !this.debugEnabled;
      this.refreshDebugHelpers();
      return;
    }

    if (!this.debugEnabled || this.debugTargets.length === 0) {
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();
      this.debugIndex = (this.debugIndex + 1) % this.debugTargets.length;
      this.refreshDebugHelpers();
      return;
    }

    const target = this.debugTargets[this.debugIndex];
    const moveStep = this.debugShift ? 0.2 : 0.05;
    const rotStep = this.debugShift ? 0.1 : 0.03;
    const scaleStep = this.debugShift ? 0.05 : 0.02;

    switch (event.code) {
      case 'ArrowUp':
        target.position.z -= moveStep;
        break;
      case 'ArrowDown':
        target.position.z += moveStep;
        break;
      case 'ArrowLeft':
        target.position.x -= moveStep;
        break;
      case 'ArrowRight':
        target.position.x += moveStep;
        break;
      case 'PageUp':
        target.position.y += moveStep;
        break;
      case 'PageDown':
        target.position.y -= moveStep;
        break;
      case 'KeyQ':
        target.rotation.y += rotStep;
        break;
      case 'KeyE':
        target.rotation.y -= rotStep;
        break;
      case 'BracketLeft':
        target.scale.multiplyScalar(1 - scaleStep);
        break;
      case 'BracketRight':
        target.scale.multiplyScalar(1 + scaleStep);
        break;
      case 'KeyP':
        this.printDebugTransforms();
        break;
      default:
        return;
    }

    this.refreshDebugHelpers();
  }

  private handleDebugKeyUp(event: KeyboardEvent): void {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.debugShift = false;
    }
  }

  private refreshDebugHelpers(): void {
    if (this.debugBox) {
      this.debugBox.removeFromParent();
      this.debugBox.geometry?.dispose?.();
      this.debugBox = null;
    }
    if (this.debugAxes) {
      this.debugAxes.removeFromParent();
      this.debugAxes = null;
    }

    if (!this.debugEnabled || this.debugTargets.length === 0) {
      return;
    }

    const target = this.debugTargets[this.debugIndex];
    this.debugBox = new THREE.BoxHelper(target, 0x66e0ff);
    this.debugAxes = new THREE.AxesHelper(1.2);
    this.debugAxes.position.copy(target.position);
    this.scene.add(this.debugBox);
    this.scene.add(this.debugAxes);
  }

  private printDebugTransforms(): void {
    const output = this.debugTargets.map((target, index) => {
      return {
        index,
        position: {
          x: Number(target.position.x.toFixed(3)),
          y: Number(target.position.y.toFixed(3)),
          z: Number(target.position.z.toFixed(3))
        },
        rotationY: Number(target.rotation.y.toFixed(3)),
        scale: Number(target.scale.x.toFixed(3))
      };
    });
    // eslint-disable-next-line no-console
    console.log('[Commander placement]', JSON.stringify(output, null, 2));
  }
}
