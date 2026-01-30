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

// --- Procedural Generation Helpers (Industrial Grit Art Style) ---

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

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
}

function hash1(x: number): number {
  return fract(Math.sin(x * 12.9898) * 43758.5453);
}

function createConsolePanelMap(variant: 'main' | 'aux'): THREE.CanvasTexture {
  const size = 1024;
  const texture = createCanvasTexture(size, size, (ctx) => {
    const base = variant === 'main' ? '#20262c' : '#252c34';
    const panel = variant === 'main' ? '#2a323b' : '#2f3944';
    const line = variant === 'main' ? '#151a20' : '#181e24';
    const accent = variant === 'main' ? '#2cc0ff' : '#ff9a3d';
    const hazard = variant === 'main' ? '#d0b24a' : '#c28b2e';

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    const cell = 128;
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const rnd = hash2(x, y);
        const inset = 6 + Math.floor(rnd * 12);
        const shade = Math.floor(50 + rnd * 45);
        ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 12})`;
        ctx.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
        ctx.strokeStyle = line;
        ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);

        ctx.fillStyle = panel;
        ctx.fillRect(x + inset + 10, y + inset + 10, 26, 8);
        ctx.fillRect(x + cell - inset - 32, y + inset + 12, 22, 6);
        ctx.fillRect(x + inset + 12, y + cell - inset - 18, 30, 6);

        if (rnd > 0.84) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
          ctx.clip();
          ctx.strokeStyle = hazard;
          ctx.lineWidth = 6;
          for (let t = -cell; t < cell * 2; t += 20) {
            ctx.beginPath();
            ctx.moveTo(x + t, y);
            ctx.lineTo(x + t + cell, y + cell);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.fillStyle = '#11151a';
        const bolt = 4;
        ctx.beginPath();
        ctx.arc(x + inset + bolt, y + inset + bolt, bolt, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + cell - inset - bolt, y + inset + bolt, bolt, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + inset + bolt, y + cell - inset - bolt, bolt, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + cell - inset - bolt, y + cell - inset - bolt, bolt, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(size * 0.08, size * 0.25);
    ctx.lineTo(size * 0.92, size * 0.25);
    ctx.moveTo(size * 0.08, size * 0.78);
    ctx.lineTo(size * 0.62, size * 0.78);
    ctx.stroke();

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#cfd4da';
    ctx.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const r1 = hash1(i * 1.31);
      const r2 = hash1(i * 2.17);
      const r3 = hash1(i * 3.77);
      const x = r1 * size;
      const y = r2 * size;
      const len = 10 + r3 * 40;
      const angle = r2 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#101419';
    for (let i = 0; i < 180; i++) {
      const r1 = hash1(i * 4.11);
      const r2 = hash1(i * 5.31);
      const w = 6 + r2 * 26;
      const h = 2 + r1 * 10;
      ctx.fillRect(r1 * size, r2 * size, w, h);
    }
    ctx.globalAlpha = 1;
  });
  texture.anisotropy = 4;
  return texture;
}

function createConsolePanelNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const texture = createCanvasTexture(size, size, (ctx) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    const cell = 64;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        ctx.fillStyle = '#7070ff';
        ctx.fillRect(x, y, 2, cell);
        ctx.fillRect(x, y, cell, 2);
        ctx.fillStyle = '#9090ff';
        ctx.fillRect(x + 2, y, 2, cell);
        ctx.fillRect(x, y + 2, cell, 2);

        ctx.fillStyle = '#9090ff';
        ctx.beginPath();
        ctx.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createConsoleScreenMap(primary: string, accent: string): THREE.CanvasTexture {
  const size = 512;
  const texture = createCanvasTexture(size, size, (ctx) => {
    ctx.fillStyle = '#040a10';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i += 1) {
      const pos = (i / 10) * size;
      ctx.beginPath();
      ctx.moveTo(pos, 16);
      ctx.lineTo(pos, size - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, pos);
      ctx.lineTo(size - 16, pos);
      ctx.stroke();
    }

    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 10) {
      const y = size * 0.52 + Math.sin((x / size) * Math.PI * 2.4) * size * 0.09;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 7; i += 1) {
      const barH = size * (0.12 + (i % 3) * 0.06);
      const barX = size * 0.08 + i * (size * 0.11);
      ctx.fillStyle = accent;
      ctx.fillRect(barX, size * 0.8 - barH, size * 0.06, barH);
      ctx.fillStyle = primary;
      ctx.fillRect(barX + 10, size * 0.8 - barH - 10, size * 0.03, barH * 0.5);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(size * 0.08, size * 0.08, size * 0.28, size * 0.2);
    ctx.strokeRect(size * 0.62, size * 0.12, size * 0.3, size * 0.22);

    ctx.fillStyle = primary;
    for (let i = 0; i < 10; i += 1) {
      const r1 = hash1(i * 2.91);
      const r2 = hash1(i * 5.11);
      ctx.fillRect(size * (0.12 + r1 * 0.7), size * (0.38 + r2 * 0.18), 10 + r1 * 30, 3);
    }
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

  // New Materials (Industrial Sci-Fi)
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
    consolePanelNormal: THREE.CanvasTexture;
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
      consolePanelNormal: createConsolePanelNormalMap(),
      screenBlue: createConsoleScreenMap('#2cc0ff', '#0b4d7a'),
      screenAmber: createConsoleScreenMap('#ffb347', '#8a4b1a')
    };
    this.textures.floor.colorSpace = THREE.SRGBColorSpace;
    this.textures.consolePanelMain.colorSpace = THREE.SRGBColorSpace;
    this.textures.consolePanelAlt.colorSpace = THREE.SRGBColorSpace;
    this.textures.screenBlue.colorSpace = THREE.SRGBColorSpace;
    this.textures.screenAmber.colorSpace = THREE.SRGBColorSpace;
    this.textures.consolePanelMain.magFilter = THREE.LinearFilter;
    this.textures.consolePanelMain.minFilter = THREE.LinearMipmapLinearFilter;
    this.textures.consolePanelMain.generateMipmaps = true;
    this.textures.consolePanelAlt.magFilter = THREE.LinearFilter;
    this.textures.consolePanelAlt.minFilter = THREE.LinearMipmapLinearFilter;
    this.textures.consolePanelAlt.generateMipmaps = true;
    this.textures.screenBlue.magFilter = THREE.LinearFilter;
    this.textures.screenBlue.minFilter = THREE.LinearMipmapLinearFilter;
    this.textures.screenBlue.generateMipmaps = true;
    this.textures.screenAmber.magFilter = THREE.LinearFilter;
    this.textures.screenAmber.minFilter = THREE.LinearMipmapLinearFilter;
    this.textures.screenAmber.generateMipmaps = true;

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
        normalMap: this.textures.consolePanelNormal,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.6,
        metalness: 0.25,
        color: 0xffffff
      }),
      consolePanelAlt: new THREE.MeshStandardMaterial({
        map: this.textures.consolePanelAlt,
        normalMap: this.textures.consolePanelNormal,
        normalScale: new THREE.Vector2(0.45, 0.45),
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

    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8);
    const knobGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12);
    const buttonGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10);
    const lightGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10);

    const addBolt = (target: THREE.Object3D, x: number, y: number, z: number) => {
      const bolt = new THREE.Mesh(boltGeo, this.materials.metalDark);
      bolt.position.set(x, y, z);
      target.add(bolt);
    };

    const addButton = (
      target: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      material: THREE.Material
    ) => {
      const button = new THREE.Mesh(buttonGeo, material);
      button.position.set(x, y, z);
      target.add(button);
    };

    const addKnob = (
      target: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      material: THREE.Material
    ) => {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12),
        this.materials.metalLight
      );
      base.position.set(x, y, z);
      const knob = new THREE.Mesh(knobGeo, material);
      knob.position.set(x, y + 0.05, z);
      target.add(base, knob);
    };

    // -- The Throne --
    const chair = new THREE.Group();
    chair.position.set(chairPos.x, 0, chairPos.z);
    chair.rotation.y = Math.PI;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.9, 0.25, 24),
      this.materials.metalDark
    );
    pedestal.position.y = 0.12;
    chair.add(pedestal);

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.08, 12, 30),
      this.materials.metalLight
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.22;
    chair.add(baseRing);

    const seatBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.35, 0.24, 1.1, 6, 0.1),
      this.materials.metalDark
    );
    seatBase.position.y = 0.55;
    chair.add(seatBase);

    const seatPad = new THREE.Mesh(
      new RoundedBoxGeometry(1.15, 0.12, 0.9, 4, 0.08),
      this.materials.consolePanelAlt
    );
    seatPad.position.y = 0.67;
    chair.add(seatPad);

    const armL = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 0.3, 0.9, 4, 0.06),
      this.materials.metalLight
    );
    armL.position.set(-0.65, 0.7, 0);
    const armR = armL.clone();
    armR.position.x = 0.65;
    chair.add(armL, armR);

    const backFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.1, 1.5, 0.2, 4, 0.05),
      this.materials.metalDark
    );
    backFrame.position.set(0, 1.35, -0.45);
    backFrame.rotation.x = -0.12;
    chair.add(backFrame);

    const headRest = new THREE.Mesh(
      new RoundedBoxGeometry(0.6, 0.3, 0.2, 4, 0.04),
      this.materials.consolePanelAlt
    );
    headRest.position.set(0, 2.0, -0.52);
    headRest.rotation.x = -0.12;
    chair.add(headRest);

    const accentL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.06), this.materials.emissiveBlue);
    accentL.position.set(-0.35, 1.45, -0.32);
    accentL.rotation.x = -0.12;
    const accentR = accentL.clone();
    accentR.position.x = 0.35;
    chair.add(accentL, accentR);

    addBolt(chair, -0.45, 0.72, 0.42);
    addBolt(chair, 0.45, 0.72, 0.42);
    addBolt(chair, -0.45, 0.72, -0.35);
    addBolt(chair, 0.45, 0.72, -0.35);

    this.commanderGroup.add(chair);

    // -- Command Console Cluster --
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(chairPos.x, 0, chairPos.z - TILE_SIZE * 1.6);
    consoleGroup.rotation.y = Math.PI;
    this.commanderGroup.add(consoleGroup);

    const baseWidth = 7.4;
    const baseDepth = 4.8;
    const baseHeight = 0.7;
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(baseWidth, baseHeight, baseDepth, 8, 0.14),
      this.materials.metalDark
    );
    base.position.y = baseHeight / 2;
    consoleGroup.add(base);

    const deckHeight = 0.18;
    const deck = new THREE.Mesh(
      new RoundedBoxGeometry(baseWidth - 0.6, deckHeight, baseDepth - 0.6, 8, 0.12),
      this.materials.consolePanelMain
    );
    deck.position.y = baseHeight + deckHeight / 2;
    consoleGroup.add(deck);

    const deckSurfaceY = baseHeight + deckHeight + 0.02;

    const addPanel = (
      width: number,
      depth: number,
      x: number,
      z: number,
      material: THREE.Material,
      lift = 0
    ) => {
      const panel = new THREE.Mesh(
        new RoundedBoxGeometry(width, 0.06, depth, 2, 0.03),
        material
      );
      panel.position.set(x, deckSurfaceY + lift + 0.03, z);
      consoleGroup.add(panel);
      return panel;
    };

    const addScreenTop = (
      width: number,
      depth: number,
      x: number,
      z: number,
      material: THREE.Material,
      lift = 0
    ) => {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(x, deckSurfaceY + lift + 0.08, z);
      consoleGroup.add(screen);
      return screen;
    };

    const rimHeight = 0.12;
    const rimThickness = 0.22;
    const rimZ = baseDepth / 2 - rimThickness / 2;
    const rimX = baseWidth / 2 - rimThickness / 2;
    const rimFront = new THREE.Mesh(
      new RoundedBoxGeometry(baseWidth - 0.4, rimHeight, rimThickness, 4, 0.06),
      this.materials.metalLight
    );
    rimFront.position.set(0, baseHeight + rimHeight / 2 + 0.02, -rimZ);
    const rimBack = rimFront.clone();
    rimBack.position.z = rimZ;
    const rimLeft = new THREE.Mesh(
      new RoundedBoxGeometry(rimThickness, rimHeight, baseDepth - 0.4, 4, 0.06),
      this.materials.metalLight
    );
    rimLeft.position.set(-rimX, baseHeight + rimHeight / 2 + 0.02, 0);
    const rimRight = rimLeft.clone();
    rimRight.position.x = rimX;
    consoleGroup.add(rimFront, rimBack, rimLeft, rimRight);

    const trenchL = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.12, baseDepth - 1.2, 4, 0.06),
      this.materials.consolePanelAlt
    );
    trenchL.position.set(-2.6, deckSurfaceY + 0.06, 0);
    const trenchR = trenchL.clone();
    trenchR.position.x = 2.6;
    consoleGroup.add(trenchL, trenchR);

    const frontZ = -baseDepth / 2 + 0.65;
    addPanel(5.6, 0.75, 0, frontZ, this.materials.consolePanelAlt);
    for (let i = 0; i < 16; i += 1) {
      const x = -2.8 + i * 0.38;
      addButton(consoleGroup, x, deckSurfaceY + 0.06, frontZ + 0.05, this.materials.emissiveOrange);
    }

    const coreHeight = 0.7;
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, coreHeight, 28),
      this.materials.metalDark
    );
    core.position.set(0, deckSurfaceY + coreHeight / 2, -0.2);
    consoleGroup.add(core);

    addPanel(2.8, 1.7, 0, -0.2, this.materials.consolePanelMain, coreHeight * 0.55);
    addScreenTop(1.7, 0.95, 0, -0.2, this.materials.screenBlue, coreHeight * 0.75);

    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 1.65;
      const light = new THREE.Mesh(
        lightGeo,
        i % 2 === 0 ? this.materials.emissiveBlue : this.materials.emissiveOrange
      );
      light.position.set(
        Math.cos(angle) * radius,
        deckSurfaceY + 0.05,
        Math.sin(angle) * radius - 0.2
      );
      consoleGroup.add(light);
    }

    const podHeight = 0.3;
    const leftPod = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, podHeight, 1.9, 4, 0.1),
      this.materials.metalDark
    );
    leftPod.position.set(-2.4, deckSurfaceY + podHeight / 2, -0.1);
    consoleGroup.add(leftPod);
    addPanel(1.9, 1.6, -2.4, -0.1, this.materials.consolePanelAlt, podHeight + 0.02);
    addScreenTop(0.8, 0.5, -2.4, 0.3, this.materials.screenAmber, podHeight + 0.05);
    addKnob(consoleGroup, -1.65, deckSurfaceY + 0.06, -0.9, this.materials.emissiveOrange);

    const rightPod = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, podHeight, 1.9, 4, 0.1),
      this.materials.metalDark
    );
    rightPod.position.set(2.4, deckSurfaceY + podHeight / 2, -0.1);
    consoleGroup.add(rightPod);
    addPanel(1.9, 1.6, 2.4, -0.1, this.materials.consolePanelAlt, podHeight + 0.02);
    addScreenTop(0.8, 0.5, 2.4, 0.3, this.materials.screenAmber, podHeight + 0.05);
    addKnob(consoleGroup, 1.65, deckSurfaceY + 0.06, -0.9, this.materials.emissiveOrange);

    for (let i = 0; i < 4; i += 1) {
      const x = -2.8 + i * 0.9;
      addKnob(consoleGroup, x, deckSurfaceY + 0.06, 0.95, this.materials.emissiveBlue);
    }

    for (let x = -2.8; x <= 2.8; x += 1.2) {
      for (let z = -1.4; z <= 1.4; z += 0.8) {
        const radius = Math.hypot(x, z + 0.2);
        if (radius < 1.5) {
          continue;
        }
        const material =
          (Math.round((x + 3) / 1.2) + Math.round((z + 2) / 0.8)) % 2 === 0
            ? this.materials.consolePanelMain
            : this.materials.consolePanelAlt;
        addPanel(0.95, 0.6, x, z, material);
      }
    }

    const towerPositions = [
      { x: -1.6, z: 1.35, mat: this.materials.screenBlue },
      { x: 0, z: 1.5, mat: this.materials.screenAmber },
      { x: 1.6, z: 1.35, mat: this.materials.screenBlue }
    ];
    towerPositions.forEach((entry) => {
      const tower = new THREE.Mesh(
        new RoundedBoxGeometry(1.1, 0.7, 0.7, 4, 0.08),
        this.materials.metalDark
      );
      tower.position.set(entry.x, deckSurfaceY + 0.35, entry.z);
      consoleGroup.add(tower);
      addScreenTop(0.9, 0.5, entry.x, entry.z, entry.mat, 0.65);
    });

    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, baseDepth - 1.4, 10),
      this.materials.metalDark
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-3.25, deckSurfaceY + 0.18, 0);
    const pipeR = pipe.clone();
    pipeR.position.x = 3.25;
    consoleGroup.add(pipe, pipeR);

    for (let i = 0; i < 20; i += 1) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 3.5;
      const light = new THREE.Mesh(lightGeo, this.materials.emissiveBlue);
      light.position.set(
        Math.cos(angle) * radius,
        0.06,
        Math.sin(angle) * radius - 0.2
      );
      consoleGroup.add(light);
    }

    const holoRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 32), this.materials.hologram);
    holoRing.rotation.x = -Math.PI / 2;
    holoRing.position.set(0, deckSurfaceY + 0.35, 0.45);
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
