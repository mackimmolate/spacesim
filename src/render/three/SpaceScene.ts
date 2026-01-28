import * as THREE from 'three';
import type { GameState } from '../../sim/types';
import {
  CHUNK_SIZE,
  generateSpaceDescriptor,
  generateStarChunk,
  type PlanetDescriptor,
  type SpaceDescriptor,
  type StarLayerSpec
} from '../gen/spaceGen';
import { colorToHex, colorToRgba, createCanvasTexture, disposeObject3D } from './utils';

interface StarLayerRuntime {
  spec: StarLayerSpec;
  group: THREE.Group;
  chunks: Map<string, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>;
  order: number;
}

interface PlanetRuntime {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  descriptor: PlanetDescriptor;
}

export class SpaceScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly baseScale: number;
  private readonly starLayers: StarLayerRuntime[] = [];
  private readonly planetGroup: THREE.Group;
  private readonly planets: PlanetRuntime[] = [];
  private readonly ship: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
  private descriptor: SpaceDescriptor | null = null;

  constructor(baseScale: number) {
    this.baseScale = baseScale;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.camera.position.z = 10;
    this.planetGroup = new THREE.Group();
    this.scene.add(this.planetGroup);
    this.ship = this.createShipMesh();
    this.scene.add(this.ship);
  }

  rebuild(seed: string): void {
    this.starLayers.forEach((layer) => {
      layer.group.removeFromParent();
      layer.chunks.forEach((chunk) => disposeObject3D(chunk));
    });
    this.starLayers.length = 0;

    this.planets.forEach((planet) => disposeObject3D(planet.mesh));
    this.planets.length = 0;
    this.planetGroup.clear();

    this.descriptor = generateSpaceDescriptor(seed);

    this.descriptor.layers.forEach((spec, index) => {
      const group = new THREE.Group();
      this.scene.add(group);
      this.starLayers.push({
        spec,
        group,
        chunks: new Map(),
        order: index
      });
      group.renderOrder = index;
    });

    this.descriptor.planets.forEach((planet, index) => {
      const mesh = this.createPlanetMesh(planet);
      mesh.renderOrder = 10 + index;
      this.planetGroup.add(mesh);
      this.planets.push({ mesh, descriptor: planet });
    });
  }

  update(state: GameState, width: number, height: number): void {
    if (!this.descriptor) {
      return;
    }

    const scale = this.baseScale * state.camera.zoom;
    const viewWidth = width / scale;
    const viewHeight = height / scale;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = -viewHeight / 2;
    this.camera.bottom = viewHeight / 2;
    this.camera.position.set(state.camera.x, state.camera.y, 10);
    this.camera.updateProjectionMatrix();

    this.starLayers.forEach((layer) => {
      layer.group.position.set(
        state.camera.x * (1 - layer.spec.parallax),
        state.camera.y * (1 - layer.spec.parallax),
        0
      );
      this.updateStarChunks(
        layer,
        state.camera.x * layer.spec.parallax,
        state.camera.y * layer.spec.parallax,
        viewWidth,
        viewHeight
      );
    });

    this.planets.forEach(({ mesh, descriptor }) => {
      mesh.position.set(
        descriptor.position.x + state.camera.x * (1 - descriptor.parallax),
        descriptor.position.y + state.camera.y * (1 - descriptor.parallax),
        0
      );
    });

    this.ship.position.set(state.ship.position.x, state.ship.position.y, 0);
  }

  dispose(): void {
    this.starLayers.forEach((layer) => {
      layer.chunks.forEach((chunk) => disposeObject3D(chunk));
    });
    this.planets.forEach((planet) => disposeObject3D(planet.mesh));
    disposeObject3D(this.ship);
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
          const mesh = this.createStarChunkMesh(layer.spec, layer.order, cx, cy);
          layer.group.add(mesh);
          layer.chunks.set(key, mesh);
        }
      }
    }

    Array.from(layer.chunks.entries()).forEach(([key, mesh]) => {
      if (!needed.has(key)) {
        layer.chunks.delete(key);
        mesh.removeFromParent();
        disposeObject3D(mesh);
      }
    });
  }

  private createStarChunkMesh(
    layer: StarLayerSpec,
    order: number,
    chunkX: number,
    chunkY: number
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    if (!this.descriptor) {
      throw new Error('Missing space descriptor');
    }
    const stars = generateStarChunk(this.descriptor.seed, layer, chunkX, chunkY);
    const size = CHUNK_SIZE * this.baseScale;
    const texture = createCanvasTexture(size, size, (ctx) => {
      stars.forEach((star) => {
        ctx.fillStyle = colorToRgba(layer.color, star.alpha);
        ctx.fillRect(
          star.x * this.baseScale,
          star.y * this.baseScale,
          star.radius * this.baseScale,
          star.radius * this.baseScale
        );
      });
    });

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    material.side = THREE.DoubleSide;
    material.depthTest = false;
    material.depthWrite = false;

    const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, chunkY * CHUNK_SIZE + CHUNK_SIZE / 2, 0);
    mesh.renderOrder = order;
    return mesh;
  }

  private createPlanetMesh(
    planet: PlanetDescriptor
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const texture = this.createPlanetTexture(planet);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    material.side = THREE.DoubleSide;
    material.depthTest = false;
    material.depthWrite = false;

    const geometry = new THREE.PlaneGeometry(planet.radius * 2, planet.radius * 2);
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createPlanetTexture(planet: PlanetDescriptor): THREE.CanvasTexture {
    const size = Math.ceil(planet.radius * 2 * this.baseScale);
    const texture = createCanvasTexture(size, size, (ctx) => {
      const center = size / 2;
      const scaledRadius = planet.radius * this.baseScale;

      if (planet.hasRings) {
        ctx.strokeStyle = colorToRgba(planet.ringColor, 0.6);
        ctx.lineWidth = planet.radius * 0.1 * this.baseScale;
        ctx.beginPath();
        ctx.ellipse(
          center,
          center,
          planet.radius * 1.6 * this.baseScale,
          planet.radius * (0.55 + planet.ringTilt) * this.baseScale,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      ctx.fillStyle = colorToHex(planet.color);
      ctx.beginPath();
      ctx.arc(center, center, scaledRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, scaledRadius, 0, Math.PI * 2);
      ctx.clip();

      const bandHeight = (planet.radius / (planet.bandColors.length + 1)) * this.baseScale;
      planet.bandColors.forEach((color, index) => {
        ctx.fillStyle = colorToRgba(color, 0.5);
        ctx.fillRect(
          center - scaledRadius,
          center - scaledRadius + bandHeight * (index + 1),
          scaledRadius * 2,
          bandHeight * 0.5
        );
      });

      ctx.fillStyle = colorToRgba(planet.shadowColor, 0.6);
      ctx.beginPath();
      ctx.arc(
        center + planet.radius * 0.25 * this.baseScale,
        center + planet.radius * 0.25 * this.baseScale,
        planet.radius * 0.95 * this.baseScale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = colorToRgba(planet.highlightColor, 0.5);
      ctx.beginPath();
      ctx.arc(
        center - planet.radius * 0.35 * this.baseScale,
        center - planet.radius * 0.35 * this.baseScale,
        planet.radius * 0.4 * this.baseScale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      planet.moons.forEach((moon) => {
        ctx.fillStyle = colorToHex(moon.color);
        ctx.beginPath();
        ctx.arc(
          center + Math.cos(moon.angle) * moon.distance * planet.radius * this.baseScale,
          center + Math.sin(moon.angle) * moon.distance * planet.radius * this.baseScale,
          moon.radius * planet.radius * this.baseScale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      ctx.strokeStyle = colorToRgba(planet.atmosphereColor, 0.35);
      ctx.lineWidth = planet.radius * 0.08 * this.baseScale;
      ctx.beginPath();
      ctx.arc(center, center, planet.radius * 1.02 * this.baseScale, 0, Math.PI * 2);
      ctx.stroke();
    });

    return texture;
  }

  private createShipMesh(): THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial> {
    const sizeScale = 1 / this.baseScale;
    const shape = new THREE.Shape();
    shape.moveTo(0 * sizeScale, -10 * sizeScale);
    shape.lineTo(6 * sizeScale, 8 * sizeScale);
    shape.lineTo(0 * sizeScale, 4 * sizeScale);
    shape.lineTo(-6 * sizeScale, 8 * sizeScale);
    shape.lineTo(0 * sizeScale, -10 * sizeScale);
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
    material.side = THREE.DoubleSide;
    material.depthTest = false;
    material.depthWrite = false;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 20;
    return mesh;
  }
}
