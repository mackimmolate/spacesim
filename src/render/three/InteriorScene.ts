import * as THREE from 'three';
import type { GameState } from '../../sim/types';
import { MAP_HEIGHT, MAP_WIDTH } from '../../sim/interior/map';
import { INTERIOR_OBJECTS } from '../../sim/interior/objects';

const TILE_SIZE = 1.6;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_DEPTH = MAP_HEIGHT * TILE_SIZE;
const HALF_WIDTH = WORLD_WIDTH / 2;
const HALF_DEPTH = WORLD_DEPTH / 2;

export class InteriorScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly root: THREE.Group;
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly wallGroup: THREE.Group;
  private readonly objectGroup: THREE.Group;
  private readonly commanderGroup: THREE.Group;
  private readonly player: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly accentMaterial: THREE.MeshStandardMaterial;
  private readonly metalMaterial: THREE.MeshStandardMaterial;
  private readonly darkMetalMaterial: THREE.MeshStandardMaterial;
  private readonly glassMaterial: THREE.MeshStandardMaterial;
  private readonly lightStripMaterial: THREE.MeshStandardMaterial;

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

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b7cff,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0x0c2a4a,
      emissiveIntensity: 0.4
    });
    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b4558,
      roughness: 0.55,
      metalness: 0.6
    });
    this.darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a212f,
      roughness: 0.65,
      metalness: 0.4
    });
    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x88c9ff,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
      emissive: 0x255a85,
      emissiveIntensity: 0.6
    });
    this.lightStripMaterial = new THREE.MeshStandardMaterial({
      color: 0x73cfff,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x2b6cff,
      emissiveIntensity: 1.2
    });

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
    this.buildCommanderSet();
    this.buildFallbackObjects();
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
    const chairObject = INTERIOR_OBJECTS.find((entry) => entry.type === 'command-chair');
    const chairPos = chairObject ? this.tileToWorld(chairObject.x, chairObject.y) : new THREE.Vector3();

    const chair = this.createCommanderChair();
    chair.position.set(chairPos.x, 0, chairPos.z);
    chair.rotation.y = Math.PI;
    this.commanderGroup.add(chair);

    const consoleMain = this.createMainConsole();
    consoleMain.position.set(chairPos.x, 0, chairPos.z - TILE_SIZE * 1.3);
    consoleMain.rotation.y = Math.PI;
    this.commanderGroup.add(consoleMain);

    const consoleSecondary = this.createSecondaryConsole();
    consoleSecondary.position.set(chairPos.x + TILE_SIZE * 1.6, 0, chairPos.z - TILE_SIZE * 0.6);
    consoleSecondary.rotation.y = Math.PI * 0.6;
    this.commanderGroup.add(consoleSecondary);

    const prop = this.createPropCanteen();
    prop.position.set(chairPos.x + TILE_SIZE * 1.2, 1.0, chairPos.z - TILE_SIZE * 1.1);
    this.commanderGroup.add(prop);
  }

  private createCommanderChair(): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.25, 16), this.darkMetalMaterial);
    base.position.y = 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 12), this.metalMaterial);
    stem.position.y = 0.52;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.9), this.metalMaterial);
    seat.position.y = 0.85;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.2), this.darkMetalMaterial);
    back.position.set(0, 1.45, -0.35);
    back.rotation.x = -0.1;
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), this.metalMaterial);
    headrest.position.set(0, 2.0, -0.38);
    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.9), this.darkMetalMaterial);
    armLeft.position.set(-0.65, 1.0, 0);
    const armRight = armLeft.clone();
    armRight.position.x = 0.65;
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), this.lightStripMaterial);
    glowStrip.position.set(0, 1.3, -0.6);

    group.add(base, stem, seat, back, headrest, armLeft, armRight, glowStrip);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return group;
  }

  private createMainConsole(): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 1.6), this.darkMetalMaterial);
    base.position.y = 0.3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 1.2), this.metalMaterial);
    panel.position.set(0, 0.85, -0.15);
    panel.rotation.x = -0.2;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 0.6), this.glassMaterial);
    screen.position.set(0, 1.1, -0.5);
    screen.rotation.x = -0.35;
    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.1), this.lightStripMaterial);
    lightStrip.position.set(0, 0.7, -0.75);
    group.add(base, panel, screen, lightStrip);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return group;
  }

  private createSecondaryConsole(): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.2), this.darkMetalMaterial);
    base.position.y = 0.25;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.8), this.metalMaterial);
    panel.position.set(0, 0.7, -0.1);
    panel.rotation.x = -0.25;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.4), this.glassMaterial);
    screen.position.set(0, 0.9, -0.35);
    screen.rotation.x = -0.4;
    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.08), this.lightStripMaterial);
    lightStrip.position.set(0, 0.55, -0.55);
    group.add(base, panel, screen, lightStrip);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return group;
  }

  private createPropCanteen(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), this.metalMaterial);
    body.position.y = 0.18;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), this.accentMaterial);
    cap.position.y = 0.4;
    group.add(body, cap);
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return group;
  }

  private tileToWorld(x: number, y: number): THREE.Vector3 {
    const worldX = -HALF_WIDTH + TILE_SIZE / 2 + x * TILE_SIZE;
    const worldZ = -HALF_DEPTH + TILE_SIZE / 2 + y * TILE_SIZE;
    return new THREE.Vector3(worldX, 0, worldZ);
  }
}
