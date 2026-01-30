import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GameState } from '../../sim/types';
import { MAP_HEIGHT, MAP_WIDTH } from '../../sim/interior/map';
import { INTERIOR_OBJECTS } from '../../sim/interior/objects';
import { createCanvasTexture, disposeObject3D } from './utils';

const TILE_SIZE = 1.6;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_DEPTH = MAP_HEIGHT * TILE_SIZE;
const HALF_WIDTH = WORLD_WIDTH / 2;
const HALF_DEPTH = WORLD_DEPTH / 2;

// --- Procedural Generation Helpers (The "Clean" Art Style) ---

function createSciFiFloorMap(): THREE.CanvasTexture {
  const size = 1024;
  const texture = createCanvasTexture(size, size, (ctx) => {
    // Base: Lighter tech grey for better visibility
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(0, 0, size, size);

    // Grid lines (subtle)
    ctx.strokeStyle = '#3a4455';
    ctx.lineWidth = 4;
    const tiles = 8;
    const step = size / tiles;

    // Main Hexagon Pattern (using simple lines for "tech" look)
    for(let y=0; y<=tiles; y++) {
      for(let x=0; x<=tiles; x++) {
        const px = x * step;
        const py = y * step;

        // Draw panel gaps
        ctx.strokeRect(px + 2, py + 2, step - 4, step - 4);

        // Tech details in corners
        ctx.fillStyle = '#3a4455';
        ctx.fillRect(px + step * 0.1, py + step * 0.1, step * 0.2, step * 0.05);
        ctx.fillRect(px + step * 0.1, py + step * 0.1, step * 0.05, step * 0.2);

        ctx.fillRect(px + step * 0.8, py + step * 0.8, step * 0.1, step * 0.1);
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(MAP_WIDTH / 4, MAP_HEIGHT / 4);
  texture.anisotropy = 4;
  return texture;
}

function createSciFiWallNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const texture = createCanvasTexture(size, size, (ctx) => {
    // Flat normal color
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    // Vertical Ribbing
    for(let x=0; x<size; x+=32) {
      // Simulate a groove
      // Left side of groove (angles away) -> Red < 128
      ctx.fillStyle = '#6080ff';
      ctx.fillRect(x, 0, 4, size);
      // Right side of groove (angles toward) -> Red > 128
      ctx.fillStyle = '#a080ff';
      ctx.fillRect(x+4, 0, 4, size);
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(MAP_WIDTH / 2, 1);
  return texture;
}

function createConsolePanelMap(variant: 'main' | 'aux'): THREE.CanvasTexture {
  const size = 1024;
  const texture = createCanvasTexture(size, size, (ctx) => {
    const base = variant === 'main' ? '#1b2430' : '#202836';
    const line = variant === 'main' ? '#2f3a4b' : '#313c4e';
    const accent = variant === 'main' ? '#2cc0ff' : '#ff9a3d';

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = line;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, size - 16, size - 16);

    const cols = variant === 'main' ? 5 : 4;
    const rows = variant === 'main' ? 4 : 3;
    const pad = 24;
    const cellW = (size - pad * 2) / cols;
    const cellH = (size - pad * 2) / rows;

    ctx.lineWidth = 3;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cx = pad + x * cellW;
        const cy = pad + y * cellH;
        const inset = 12;
        ctx.strokeRect(cx + inset, cy + inset, cellW - inset * 2, cellH - inset * 2);

        ctx.fillStyle = '#3a475a';
        ctx.fillRect(cx + inset, cy + inset, 18, 6);
        ctx.fillRect(cx + inset, cy + inset, 6, 18);
        ctx.fillRect(cx + cellW - inset - 18, cy + cellH - inset - 6, 18, 6);

        const clusterX = cx + inset + 10;
        const clusterY = cy + cellH - inset - 28;
        for (let i = 0; i < 4; i += 1) {
          ctx.fillStyle = '#2a3443';
          ctx.fillRect(clusterX + i * 22, clusterY, 14, 8);
          ctx.fillStyle = '#3c4b5f';
          ctx.fillRect(clusterX + i * 22, clusterY + 12, 14, 8);
        }
      }
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pad, size * 0.2);
    ctx.lineTo(size - pad, size * 0.2);
    ctx.moveTo(pad, size * 0.8);
    ctx.lineTo(size * 0.65, size * 0.8);
    ctx.stroke();

    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.35);
    ctx.lineTo(size * 0.35, size * 0.15);
    ctx.moveTo(size * 0.7, size * 0.9);
    ctx.lineTo(size * 0.9, size * 0.7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  texture.anisotropy = 4;
  return texture;
}

function createConsoleScreenMap(primary: string, accent: string): THREE.CanvasTexture {
  const size = 512;
  const texture = createCanvasTexture(size, size, (ctx) => {
    ctx.fillStyle = '#061018';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i += 1) {
      const pos = (i / 8) * size;
      ctx.beginPath();
      ctx.moveTo(pos, 24);
      ctx.lineTo(pos, size - 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24, pos);
      ctx.lineTo(size - 24, pos);
      ctx.stroke();
    }

    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 12) {
      const y = size * 0.55 + Math.sin((x / size) * Math.PI * 2) * size * 0.08;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 6; i += 1) {
      const barH = size * (0.15 + (i % 3) * 0.05);
      const barX = size * 0.1 + i * (size * 0.12);
      ctx.fillStyle = accent;
      ctx.fillRect(barX, size * 0.78 - barH, size * 0.06, barH);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(size * 0.08, size * 0.08, size * 0.25, size * 0.18);
    ctx.strokeRect(size * 0.68, size * 0.12, size * 0.22, size * 0.2);
  });
  texture.anisotropy = 8;
  return texture;
}

export class InteriorScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly root: THREE.Group;
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly wallGroup: THREE.Group;
  private readonly objectGroup: THREE.Group;
  private readonly commanderGroup: THREE.Group;
  private readonly player: THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshStandardMaterial>;
  // NEW: Camera headlight for guaranteed visibility
  private readonly headlight: THREE.DirectionalLight;

  // New Materials (Clean Sci-Fi)
  private readonly materials: {
    floor: THREE.MeshStandardMaterial;
    wall: THREE.MeshStandardMaterial;
    metalDark: THREE.MeshStandardMaterial;
    metalLight: THREE.MeshStandardMaterial;
    glass: THREE.MeshPhysicalMaterial; // Physical for better glass
    hologram: THREE.MeshBasicMaterial; // For unlit glowing parts
    emissiveBlue: THREE.MeshStandardMaterial;
    emissiveOrange: THREE.MeshStandardMaterial;
    consolePanelMain: THREE.MeshStandardMaterial;
    consolePanelAlt: THREE.MeshStandardMaterial;
    screenBlue: THREE.MeshStandardMaterial;
    screenAmber: THREE.MeshStandardMaterial;
  };

  private readonly textures: {
    floor: THREE.CanvasTexture;
    wallNormal: THREE.CanvasTexture;
    consolePanelMain: THREE.CanvasTexture;
    consolePanelAlt: THREE.CanvasTexture;
    screenBlue: THREE.CanvasTexture;
    screenAmber: THREE.CanvasTexture;
  };

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    // Fog helps hide the edges of the map and adds mood
    this.scene.fog = new THREE.Fog(0x05070a, 20, 60);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.camera.up.set(0, 0, -1);

    // Setup Headlight attached to camera
    this.headlight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.headlight.position.set(0, 0, 10); // Points along -Z (camera look dir)
    this.camera.add(this.headlight);
    this.scene.add(this.camera); // Add camera to scene so headlight updates

    this.root = new THREE.Group();
    this.wallGroup = new THREE.Group();
    this.objectGroup = new THREE.Group();
    this.commanderGroup = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.wallGroup, this.objectGroup, this.commanderGroup);

    // --- Asset Generation ---
    this.textures = {
      floor: createSciFiFloorMap(),
      wallNormal: createSciFiWallNormalMap(),
      consolePanelMain: createConsolePanelMap('main'),
      consolePanelAlt: createConsolePanelMap('aux'),
      screenBlue: createConsoleScreenMap('#2cc0ff', '#0b4d7a'),
      screenAmber: createConsoleScreenMap('#ffb347', '#8a4b1a')
    };
    this.textures.floor.colorSpace = THREE.SRGBColorSpace;

    // --- Material Definitions ---
    // NOTE: Lowered metalness and roughness to ensure visibility without Environment Map
    this.materials = {
      floor: new THREE.MeshStandardMaterial({
        map: this.textures.floor,
        roughness: 0.9, // Almost fully diffuse
        metalness: 0.05, // Barely metallic
        color: 0xdddddd // Much lighter base color (was 0xeeeeee)
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0x4a5058, // Lighter grey
        roughness: 0.6,
        metalness: 0.05,
        normalMap: this.textures.wallNormal,
        normalScale: new THREE.Vector2(0.5, 0.5)
      }),
      metalDark: new THREE.MeshStandardMaterial({
        color: 0x2a2f39,
        roughness: 0.5,
        metalness: 0.2
      }),
      metalLight: new THREE.MeshStandardMaterial({
        color: 0x9aabb0,
        roughness: 0.5,
        metalness: 0.2
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.5,
        transparent: true,
        opacity: 0.3
      }),
      hologram: new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      }),
      emissiveBlue: new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x00aaff,
        emissiveIntensity: 3.0 // Stronger bloom
      }),
      emissiveOrange: new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffaa00,
        emissiveIntensity: 3.0 // Stronger bloom
      }),
      consolePanelMain: new THREE.MeshStandardMaterial({
        map: this.textures.consolePanelMain,
        roughness: 0.6,
        metalness: 0.25,
        color: 0xffffff
      }),
      consolePanelAlt: new THREE.MeshStandardMaterial({
        map: this.textures.consolePanelAlt,
        roughness: 0.55,
        metalness: 0.2,
        color: 0xffffff
      }),
      screenBlue: new THREE.MeshStandardMaterial({
        map: this.textures.screenBlue,
        emissiveMap: this.textures.screenBlue,
        emissive: 0x2aa9ff,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.0
      }),
      screenAmber: new THREE.MeshStandardMaterial({
        map: this.textures.screenAmber,
        emissiveMap: this.textures.screenAmber,
        emissive: 0xffa244,
        emissiveIntensity: 2.0,
        roughness: 0.25,
        metalness: 0.0
      })
    };

    // --- Scene Geometry ---
    const floorGeometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH);
    this.floor = new THREE.Mesh(floorGeometry, this.materials.floor);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.root.add(this.floor);

    this.buildWalls();

    // Player (Placeholder for now, but cleaner material)
    this.player = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 1, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.2 })
    );
    this.player.castShadow = true;
    this.player.position.y = 0.75;
    this.objectGroup.add(this.player);

    this.setupLights();
    this.buildCommanderSet();
    this.buildFallbackObjects();
  }

  render(state: GameState, width: number, height: number): void {
    const aspect = width / height;
    // Widen FOV to see more of the room
    const viewSize = Math.max(WORLD_WIDTH, WORLD_DEPTH) * 0.85; // Increased from 0.65
    this.camera.left = (-viewSize * aspect) / 2;
    this.camera.right = (viewSize * aspect) / 2;
    this.camera.top = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.updateProjectionMatrix();

    // TOP-DOWN view
    const distance = 50;
    this.camera.position.set(0, distance, 0); // Directly overhead
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.z = 0; // Ensure consistent orientation

    const playerPos = this.tileToWorld(state.player.x, state.player.y);
    this.player.position.set(playerPos.x, 0.75, playerPos.z);
  }

  setEnvironmentMap(environment: THREE.Texture): void {
    this.scene.environment = environment;
    // this.scene.environmentIntensity = 0.4; // Requires Three.js r163+
  }

  dispose(): void {
    disposeObject3D(this.root);
    this.root.clear();
    Object.values(this.textures).forEach((texture) => texture.dispose());
  }

  private setupLights(): void {
    // FLOOD LIGHTS for maximum visibility
    const ambient = new THREE.AmbientLight(0x3a4453, 5.0); // Extreme ambient to ensure visibility
    this.scene.add(ambient);

    // Main "Sun" or overhead artificial light
    const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
    keyLight.position.set(10, 20, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048); // High res shadows
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    this.scene.add(keyLight);

    // Secondary fill light from opposite side
    const fillLightDir = new THREE.DirectionalLight(0xaaccff, 1.5);
    fillLightDir.position.set(-10, 20, -5);
    this.scene.add(fillLightDir);

    // Rim light (Blue) for sci-fi contrast
    const rimLight = new THREE.DirectionalLight(0x4488ff, 1.0);
    rimLight.position.set(-10, 10, -10);
    this.scene.add(rimLight);

    // Hemisphere light from below to light up shadows
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    this.scene.add(hemiLight);
  }

  private buildWalls(): void {
    this.wallGroup.clear();
    const height = 4.0;
    const thickness = 1.0;

    // Using RoundedBox for walls looks much better
    const makeWall = (w: number, d: number, x: number, z: number) => {
      const geo = new RoundedBoxGeometry(w, height, d, 4, 0.1);
      const mesh = new THREE.Mesh(geo, this.materials.wall);
      mesh.position.set(x, height / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const north = makeWall(WORLD_WIDTH + thickness * 2, thickness, 0, -HALF_DEPTH - thickness / 2);
    const south = makeWall(WORLD_WIDTH + thickness * 2, thickness, 0, HALF_DEPTH + thickness / 2);
    const east = makeWall(thickness, WORLD_DEPTH, HALF_WIDTH + thickness / 2, 0);
    const west = makeWall(thickness, WORLD_DEPTH, -HALF_WIDTH - thickness / 2, 0);

    this.wallGroup.add(north, south, east, west);
  }

  private buildFallbackObjects(): void {
    this.objectGroup.clear();
    this.objectGroup.add(this.player);

    INTERIOR_OBJECTS.forEach((object) => {
      if (object.type === 'command-chair') return;

      // Generic Crate/Box with rounded edges
      const geo = new RoundedBoxGeometry(1.0, 1.0, 1.0, 4, 0.05);
      const box = new THREE.Mesh(geo, this.materials.metalLight);

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

    // -- The Throne --
    const chair = new THREE.Group();
    chair.position.set(chairPos.x, 0, chairPos.z);
    chair.rotation.y = Math.PI;

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16), this.materials.metalDark);
    base.position.y = 0.15;
    chair.add(base);

    // Seat
    const seatGeo = new RoundedBoxGeometry(1.2, 0.3, 1.0, 4, 0.1);
    const seat = new THREE.Mesh(seatGeo, this.materials.metalLight);
    seat.position.y = 0.8;
    chair.add(seat);

    // High Back
    const backGeo = new RoundedBoxGeometry(1.0, 1.4, 0.2, 4, 0.05);
    const back = new THREE.Mesh(backGeo, this.materials.metalDark);
    back.position.set(0, 1.5, -0.4);
    back.rotation.x = -0.15;
    chair.add(back);

    // Glowing accents on the chair
    const accentL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.05), this.materials.emissiveBlue);
    accentL.position.set(-0.3, 1.5, -0.28);
    accentL.rotation.x = -0.15;
    const accentR = accentL.clone();
    accentR.position.x = 0.3;
    chair.add(accentL, accentR);

    this.commanderGroup.add(chair);

    // -- Command Console Cluster --
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(chairPos.x, 0, chairPos.z - TILE_SIZE * 1.7);
    consoleGroup.rotation.y = Math.PI;
    this.commanderGroup.add(consoleGroup);

    const deckWidth = 6.0;
    const deckDepth = 3.6;
    const deckBaseHeight = 0.35;
    const deckTopHeight = 0.08;
    const deckBase = new THREE.Mesh(
      new RoundedBoxGeometry(deckWidth, deckBaseHeight, deckDepth, 6, 0.15),
      this.materials.metalDark
    );
    deckBase.position.y = deckBaseHeight / 2;
    consoleGroup.add(deckBase);

    const deckTop = new THREE.Mesh(
      new RoundedBoxGeometry(deckWidth - 0.4, deckTopHeight, deckDepth - 0.4, 6, 0.12),
      this.materials.consolePanelMain
    );
    deckTop.position.y = deckBaseHeight + deckTopHeight / 2;
    consoleGroup.add(deckTop);

    const deckSurfaceY = deckBaseHeight + deckTopHeight + 0.01;

    const addPanel = (
      width: number,
      depth: number,
      x: number,
      z: number,
      material: THREE.Material,
      lift = 0
    ) => {
      const panel = new THREE.Mesh(
        new RoundedBoxGeometry(width, 0.05, depth, 3, 0.04),
        material
      );
      panel.position.set(x, deckSurfaceY + lift + 0.035, z);
      consoleGroup.add(panel);
      return panel;
    };

    const addScreen = (
      width: number,
      depth: number,
      x: number,
      z: number,
      material: THREE.Material,
      lift = 0
    ) => {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(x, deckSurfaceY + lift + 0.06, z);
      consoleGroup.add(screen);
      return screen;
    };

    const addButtonGrid = (
      cols: number,
      rows: number,
      startX: number,
      startZ: number,
      spacing: number,
      material: THREE.Material,
      lift = 0
    ) => {
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const button = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.03, 0.08),
            material
          );
          button.position.set(
            startX + col * spacing,
            deckSurfaceY + lift + 0.05,
            startZ + row * spacing
          );
          consoleGroup.add(button);
        }
      }
    };

    const addKnob = (x: number, z: number, material: THREE.Material, lift = 0) => {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16),
        this.materials.metalLight
      );
      base.position.set(x, deckSurfaceY + lift + 0.04, z);
      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16),
        material
      );
      knob.position.set(x, deckSurfaceY + lift + 0.09, z);
      consoleGroup.add(base, knob);
    };

    const addLightStrip = (
      width: number,
      x: number,
      z: number,
      material: THREE.Material,
      lift = 0
    ) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, 0.08), material);
      strip.position.set(x, deckSurfaceY + lift + 0.04, z);
      consoleGroup.add(strip);
    };

    const frontLip = new THREE.Mesh(
      new RoundedBoxGeometry(deckWidth - 0.6, 0.15, 0.35, 4, 0.08),
      this.materials.metalLight
    );
    frontLip.position.set(0, deckSurfaceY + 0.07, -deckDepth / 2 + 0.2);
    consoleGroup.add(frontLip);
    addLightStrip(deckWidth - 1.2, 0, -deckDepth / 2 + 0.02, this.materials.emissiveOrange);

    const coreHeight = 0.32;
    const coreBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, coreHeight, 1.6, 4, 0.1),
      this.materials.metalDark
    );
    coreBase.position.set(0, deckSurfaceY + coreHeight / 2, -0.6);
    consoleGroup.add(coreBase);
    addPanel(2.6, 1.4, 0, -0.6, this.materials.consolePanelMain, coreHeight + 0.02);
    addScreen(1.6, 0.9, 0, -0.55, this.materials.screenBlue, coreHeight + 0.05);
    addScreen(0.7, 0.5, -0.85, -0.2, this.materials.screenAmber, coreHeight + 0.05);
    addScreen(0.7, 0.5, 0.85, -0.2, this.materials.screenAmber, coreHeight + 0.05);

    const podHeight = 0.28;
    const leftPod = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, podHeight, 1.6, 4, 0.1),
      this.materials.metalDark
    );
    leftPod.position.set(-2.1, deckSurfaceY + podHeight / 2, -0.2);
    consoleGroup.add(leftPod);
    addPanel(1.7, 1.4, -2.1, -0.2, this.materials.consolePanelAlt, podHeight + 0.02);
    addScreen(0.7, 0.45, -2.1, 0.15, this.materials.screenAmber, podHeight + 0.05);
    addButtonGrid(4, 3, -2.6, -0.6, 0.14, this.materials.emissiveBlue, podHeight + 0.02);
    addKnob(-1.55, -0.75, this.materials.emissiveOrange, podHeight + 0.02);

    const rightPod = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, podHeight, 1.6, 4, 0.1),
      this.materials.metalDark
    );
    rightPod.position.set(2.1, deckSurfaceY + podHeight / 2, -0.2);
    consoleGroup.add(rightPod);
    addPanel(1.7, 1.4, 2.1, -0.2, this.materials.consolePanelAlt, podHeight + 0.02);
    addScreen(0.7, 0.45, 2.1, 0.15, this.materials.screenAmber, podHeight + 0.05);
    addButtonGrid(4, 3, 1.55, -0.6, 0.14, this.materials.emissiveBlue, podHeight + 0.02);
    addKnob(2.65, -0.75, this.materials.emissiveOrange, podHeight + 0.02);

    addPanel(4.8, 0.7, 0, 1.1, this.materials.consolePanelAlt);
    addLightStrip(3.4, 0, 1.35, this.materials.emissiveBlue);

    const holoRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 32), this.materials.hologram);
    holoRing.rotation.x = -Math.PI / 2;
    holoRing.position.set(0, deckSurfaceY + 0.2, 0.4);
    consoleGroup.add(holoRing);

    // Set shadows for everything in commander group
    this.commanderGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  private tileToWorld(x: number, y: number): THREE.Vector3 {
    const worldX = -HALF_WIDTH + TILE_SIZE / 2 + x * TILE_SIZE;
    const worldZ = -HALF_DEPTH + TILE_SIZE / 2 + y * TILE_SIZE;
    return new THREE.Vector3(worldX, 0, worldZ);
  }
}
