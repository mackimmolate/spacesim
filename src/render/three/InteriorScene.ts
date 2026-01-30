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
  };

  private readonly textures: {
    floor: THREE.CanvasTexture;
    wallNormal: THREE.CanvasTexture;
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
      wallNormal: createSciFiWallNormalMap()
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

    // -- Main Console --
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(chairPos.x, 0, chairPos.z - TILE_SIZE * 1.5);
    consoleGroup.rotation.y = Math.PI;

    // Desk body
    const deskGeo = new RoundedBoxGeometry(4.0, 0.8, 1.5, 4, 0.1);
    const desk = new THREE.Mesh(deskGeo, this.materials.metalDark);
    desk.position.y = 0.4;
    consoleGroup.add(desk);

    // Angled Top Surface
    const topGeo = new RoundedBoxGeometry(3.8, 0.1, 1.2, 2, 0.02);
    const top = new THREE.Mesh(topGeo, this.materials.metalLight);
    top.position.set(0, 0.85, 0);
    top.rotation.x = -0.1;
    consoleGroup.add(top);

    // Holographic Screen (Large)
    const holoGeo = new THREE.PlaneGeometry(3.0, 1.5);
    const holo = new THREE.Mesh(holoGeo, this.materials.hologram);
    holo.position.set(0, 1.8, -0.2);
    holo.rotation.x = -0.1;
    consoleGroup.add(holo);

    // Keyboard / Button panel (Glowing)
    const keysGeo = new THREE.BoxGeometry(2.0, 0.05, 0.4);
    const keys = new THREE.Mesh(keysGeo, this.materials.emissiveBlue);
    keys.position.set(0, 0.9, 0.2);
    keys.rotation.x = -0.1;
    consoleGroup.add(keys);

    this.commanderGroup.add(consoleGroup);

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
