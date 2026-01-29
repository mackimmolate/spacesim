import * as THREE from 'three';
import type { GameState } from '../../sim/types';
import { MAP_HEIGHT, MAP_WIDTH } from '../../sim/interior/map';
import { INTERIOR_OBJECTS } from '../../sim/interior/objects';
import { createCanvasTexture } from './utils';

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
  private readonly metalMap: THREE.CanvasTexture;
  private readonly grimeMap: THREE.CanvasTexture;
  private readonly panelGlowMap: THREE.CanvasTexture;
  private readonly decalMap: THREE.CanvasTexture;
  private readonly normalMap: THREE.CanvasTexture;
  private readonly floorMaterial: THREE.MeshStandardMaterial;
  private readonly textureLoader: THREE.TextureLoader;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b111d);
    this.scene.fog = new THREE.Fog(0x0b111d, 24, 80);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camera.up.set(0, 0, -1);

    this.root = new THREE.Group();
    this.wallGroup = new THREE.Group();
    this.objectGroup = new THREE.Group();
    this.commanderGroup = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.wallGroup, this.objectGroup, this.commanderGroup);

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a8dff,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x10385f,
      emissiveIntensity: 0.8
    });
    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a566d,
      roughness: 0.5,
      metalness: 0.6
    });
    this.darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x222a3b,
      roughness: 0.6,
      metalness: 0.45
    });
    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fd6ff,
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      opacity: 0.62,
      emissive: 0x2f6f9f,
      emissiveIntensity: 1.1
    });
    this.lightStripMaterial = new THREE.MeshStandardMaterial({
      color: 0x85d8ff,
      roughness: 0.18,
      metalness: 0.08,
      emissive: 0x3b7dff,
      emissiveIntensity: 2.0
    });

    this.metalMap = this.createMetalMap();
    this.grimeMap = this.createGrimeMap();
    this.panelGlowMap = this.createPanelGlowMap();
    this.decalMap = this.createDecalMap();
    this.normalMap = this.createNormalMap();
    this.applyMaterialTextures();

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x141b2a,
      roughness: 0.8,
      metalness: 0.35
    });
    const floorGeometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
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
    this.textureLoader = new THREE.TextureLoader();
    this.loadFloorTexture();
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
    this.floorMaterial.dispose();
    this.player.geometry.dispose();
    this.player.material.dispose();
    this.metalMap.dispose();
    this.grimeMap.dispose();
    this.panelGlowMap.dispose();
    this.decalMap.dispose();
    this.normalMap.dispose();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x2a374f, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x7fb2ff, 0x0a0f1a, 0.35);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0x9cc4ff, 0.9);
    keyLight.position.set(6, 14, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3a7dff, 0.35);
    rimLight.position.set(-8, 10, -6);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x4e7cff, 0.45, 20, 2);
    fillLight.position.set(-4, 5.5, 2);
    this.scene.add(fillLight);

    const warmLight = new THREE.PointLight(0xffc98a, 1.1, 24, 2);
    warmLight.position.set(0, 3.5, -2);
    this.scene.add(warmLight);

    const consoleGlow = new THREE.PointLight(0x7bd7ff, 1.0, 12, 2);
    consoleGlow.position.set(0, 1.4, -3.4);
    this.scene.add(consoleGlow);
  }

  private loadFloorTexture(): void {
    const baseUrl = (import.meta as ImportMeta).env?.BASE_URL ?? '/';
    const resolvedBase = baseUrl.startsWith('http')
      ? baseUrl
      : new URL(baseUrl, window.location.origin).toString();
    const textureUrl = new URL(
      'assets/vendor/pixellab-Top-down-sci-fi-command-center-1769701263922.png',
      resolvedBase
    ).toString();

    this.textureLoader.load(textureUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      this.floorMaterial.map = texture;
      this.floorMaterial.roughness = 0.75;
      this.floorMaterial.metalness = 0.2;
      this.floorMaterial.needsUpdate = true;
    });
  }

  private buildWalls(): void {
    this.wallGroup.clear();
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x27344a,
      roughness: 0.7,
      metalness: 0.18
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

  private applyMaterialTextures(): void {
    this.metalMaterial.map = this.metalMap;
    this.metalMaterial.roughnessMap = this.grimeMap;
    this.metalMaterial.normalMap = this.normalMap;
    this.metalMaterial.normalScale = new THREE.Vector2(0.6, 0.6);
    this.metalMaterial.needsUpdate = true;

    this.darkMetalMaterial.map = this.metalMap;
    this.darkMetalMaterial.roughnessMap = this.grimeMap;
    this.darkMetalMaterial.normalMap = this.normalMap;
    this.darkMetalMaterial.normalScale = new THREE.Vector2(0.8, 0.8);
    this.darkMetalMaterial.needsUpdate = true;

    this.accentMaterial.map = this.decalMap;
    this.accentMaterial.roughnessMap = this.grimeMap;
    this.accentMaterial.normalMap = this.normalMap;
    this.accentMaterial.normalScale = new THREE.Vector2(0.4, 0.4);
    this.accentMaterial.needsUpdate = true;

    this.glassMaterial.map = this.panelGlowMap;
    this.glassMaterial.emissiveMap = this.panelGlowMap;
    this.glassMaterial.roughnessMap = this.grimeMap;
    this.glassMaterial.normalMap = this.normalMap;
    this.glassMaterial.normalScale = new THREE.Vector2(0.2, 0.2);
    this.glassMaterial.needsUpdate = true;

    this.lightStripMaterial.map = this.panelGlowMap;
    this.lightStripMaterial.emissiveMap = this.panelGlowMap;
    this.lightStripMaterial.needsUpdate = true;
  }

  private createMetalMap(): THREE.CanvasTexture {
    const size = 512;
    const texture = createCanvasTexture(size, size, (ctx) => {
      ctx.fillStyle = '#1b2333';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 900; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = 0.1 + Math.random() * 0.15;
        ctx.fillStyle = `rgba(120, 140, 170, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(90, 110, 140, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 22; i += 1) {
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y + Math.random() * 6 - 3);
        ctx.stroke();
      }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    return texture;
  }

  private createGrimeMap(): THREE.CanvasTexture {
    const size = 512;
    const texture = createCanvasTexture(size, size, (ctx) => {
      ctx.fillStyle = '#7f7f7f';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 1200; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const shade = 80 + Math.random() * 80;
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.fillStyle = 'rgba(40, 40, 40, 0.35)';
      for (let i = 0; i < 14; i += 1) {
        const w = 30 + Math.random() * 60;
        const h = 20 + Math.random() * 40;
        const x = Math.random() * (size - w);
        const y = Math.random() * (size - h);
        ctx.fillRect(x, y, w, h);
      }
    });
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    return texture;
  }

  private createPanelGlowMap(): THREE.CanvasTexture {
    const size = 256;
    const texture = createCanvasTexture(size, size, (ctx) => {
      ctx.fillStyle = '#0b1d2f';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(130, 210, 255, 0.35)';
      ctx.lineWidth = 2;
      for (let y = 8; y < size; y += 18) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(size - 10, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(120, 200, 255, 0.55)';
      for (let i = 0; i < 12; i += 1) {
        const x = 12 + Math.random() * (size - 24);
        const y = 10 + Math.random() * (size - 20);
        ctx.fillRect(x, y, 6, 3);
      }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
  }

  private createDecalMap(): THREE.CanvasTexture {
    const size = 256;
    const texture = createCanvasTexture(size, size, (ctx) => {
      ctx.fillStyle = '#1b2333';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, size - 40, size - 40);
      ctx.strokeStyle = 'rgba(246, 198, 116, 0.5)';
      ctx.beginPath();
      ctx.moveTo(32, size - 40);
      ctx.lineTo(size - 32, size - 40);
      ctx.stroke();
      ctx.fillStyle = 'rgba(246, 198, 116, 0.7)';
      ctx.fillRect(32, size - 52, 50, 6);
      ctx.fillRect(size - 82, size - 52, 50, 6);
      ctx.fillStyle = 'rgba(120, 200, 255, 0.6)';
      for (let i = 0; i < 6; i += 1) {
        const x = 40 + i * 24;
        ctx.fillRect(x, 36, 10, 4);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(50, 90, size - 100, 40);
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
  }

  private createNormalMap(): THREE.CanvasTexture {
    const size = 256;
    const texture = createCanvasTexture(size, size, (ctx) => {
      ctx.fillStyle = 'rgb(128, 128, 255)';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 900; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const nx = 120 + Math.random() * 16;
        const ny = 120 + Math.random() * 16;
        ctx.fillStyle = `rgb(${nx}, ${ny}, 255)`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(120, 120, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i += 1) {
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y + Math.random() * 4 - 2);
        ctx.stroke();
      }
    });
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    return texture;
  }
}
