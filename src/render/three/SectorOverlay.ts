import * as THREE from 'three';
import type { GameState } from '../../sim/types';
import type { SectorEdge, SectorNode } from '../../sim/sector/types';
import { createRoundedRectShape, disposeObject3D } from './utils';

const NODE_RADIUS = 4;
const ROUTE_COLOR = 0x2f3a55;
const STATION_COLOR = 0x6fb0ff;
const OUTPOST_COLOR = 0x9bd57f;
const FIELD_COLOR = 0xc0a36b;
const SHIP_COLOR = 0xffd36b;
const DEST_COLOR = 0xff7a7a;
const FRAME_BG = 0x0b1222;
const FRAME_BORDER = 0x6f8ccf;
const HOVER_COLOR = 0xffd36b;
const SELECT_COLOR = 0x8fe3ff;
const PICK_RADIUS = NODE_RADIUS + 6;
const FRAME_PADDING = 12;

type Viewport = { x: number; y: number; width: number; height: number };

export class SectorOverlay {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly root: THREE.Group;
  private readonly frameGroup: THREE.Group;
  private readonly mapGroup: THREE.Group;
  private readonly routesGroup: THREE.Group;
  private readonly nodesGroup: THREE.Group;
  private readonly ship: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly destination: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly selectedRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly hoverRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly nodeGeometry: THREE.CircleGeometry;
  private readonly routeGeometry: THREE.PlaneGeometry;
  private readonly nodeMaterials: Record<'station' | 'outpost' | 'field', THREE.MeshBasicMaterial>;
  private readonly routeMaterial: THREE.MeshBasicMaterial;
  private readonly shipMaterial: THREE.MeshBasicMaterial;
  private readonly destMaterial: THREE.MeshBasicMaterial;
  private readonly selectMaterial: THREE.MeshBasicMaterial;
  private readonly hoverMaterial: THREE.MeshBasicMaterial;
  private viewport: Viewport | null = null;
  private mapScale = 1;
  private hoveredNodeId: string | null = null;
  private selectedNodeId: string | null = null;
  private lastNodeCount = 0;
  private lastEdgeCount = 0;
  private lastFrameSize: { width: number; height: number } | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100);
    this.camera.position.z = 10;

    this.root = new THREE.Group();
    this.frameGroup = new THREE.Group();
    this.mapGroup = new THREE.Group();
    this.routesGroup = new THREE.Group();
    this.nodesGroup = new THREE.Group();

    this.mapGroup.add(this.routesGroup, this.nodesGroup);
    this.root.add(this.frameGroup, this.mapGroup);
    this.scene.add(this.root);

    this.nodeGeometry = new THREE.CircleGeometry(NODE_RADIUS, 16);
    this.routeGeometry = new THREE.PlaneGeometry(1, 1);

    this.nodeMaterials = {
      station: new THREE.MeshBasicMaterial({ color: STATION_COLOR }),
      outpost: new THREE.MeshBasicMaterial({ color: OUTPOST_COLOR }),
      field: new THREE.MeshBasicMaterial({ color: FIELD_COLOR })
    };
    Object.values(this.nodeMaterials).forEach((material) => {
      material.depthTest = false;
      material.depthWrite = false;
    });

    this.routeMaterial = new THREE.MeshBasicMaterial({ color: ROUTE_COLOR, transparent: true, opacity: 0.8 });
    this.routeMaterial.depthTest = false;
    this.routeMaterial.depthWrite = false;

    this.shipMaterial = new THREE.MeshBasicMaterial({ color: SHIP_COLOR });
    this.shipMaterial.depthTest = false;
    this.shipMaterial.depthWrite = false;

    this.destMaterial = new THREE.MeshBasicMaterial({ color: DEST_COLOR, transparent: true, opacity: 0.9 });
    this.destMaterial.depthTest = false;
    this.destMaterial.depthWrite = false;

    this.selectMaterial = new THREE.MeshBasicMaterial({ color: SELECT_COLOR, transparent: true, opacity: 0.9 });
    this.selectMaterial.depthTest = false;
    this.selectMaterial.depthWrite = false;

    this.hoverMaterial = new THREE.MeshBasicMaterial({ color: HOVER_COLOR, transparent: true, opacity: 0.85 });
    this.hoverMaterial.depthTest = false;
    this.hoverMaterial.depthWrite = false;

    this.ship = new THREE.Mesh(new THREE.CircleGeometry(NODE_RADIUS + 2, 16), this.shipMaterial);
    this.ship.renderOrder = 6;
    this.mapGroup.add(this.ship);

    this.destination = new THREE.Mesh(this.createRingGeometry(NODE_RADIUS + 6), this.destMaterial);
    this.destination.renderOrder = 5;
    this.mapGroup.add(this.destination);

    this.selectedRing = new THREE.Mesh(this.createRingGeometry(NODE_RADIUS + 8), this.selectMaterial);
    this.selectedRing.renderOrder = 4;
    this.mapGroup.add(this.selectedRing);

    this.hoverRing = new THREE.Mesh(this.createRingGeometry(NODE_RADIUS + 10), this.hoverMaterial);
    this.hoverRing.renderOrder = 4;
    this.mapGroup.add(this.hoverRing);
  }

  setViewport(viewport: Viewport | null): void {
    this.viewport = viewport;
  }

  setHoverNode(nodeId: string | null): void {
    this.hoveredNodeId = nodeId;
  }

  setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
  }

  pickNodeAtScreen(nodes: SectorNode[], x: number, y: number): SectorNode | null {
    if (!this.viewport) {
      return null;
    }
    if (
      x < this.viewport.x ||
      y < this.viewport.y ||
      x > this.viewport.x + this.viewport.width ||
      y > this.viewport.y + this.viewport.height
    ) {
      return null;
    }
    const centerX = this.viewport.x + this.viewport.width / 2;
    const centerY = this.viewport.y + this.viewport.height / 2;
    const localX = (x - centerX) / this.mapScale;
    const localY = (y - centerY) / this.mapScale;
    return this.pickNode(nodes, localX, localY);
  }

  render(state: GameState, width: number, height: number): void {
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = 0;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();

    if (!this.viewport || this.viewport.width <= 0 || this.viewport.height <= 0) {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;

    const { x, y, width: frameWidth, height: frameHeight } = this.viewport;
    this.root.position.set(x + frameWidth / 2, y + frameHeight / 2, 0);

    if (!this.lastFrameSize || this.lastFrameSize.width !== frameWidth || this.lastFrameSize.height !== frameHeight) {
      this.rebuildFrame(frameWidth, frameHeight);
      this.lastFrameSize = { width: frameWidth, height: frameHeight };
    }

    const radius = this.computeRadius(state.sector.nodes);
    const size = Math.min(frameWidth, frameHeight) - FRAME_PADDING * 2;
    this.mapScale = size > 0 ? size / (radius * 2) : 1;
    this.mapGroup.scale.set(this.mapScale, this.mapScale, 1);

    if (state.sector.nodes.length !== this.lastNodeCount || state.sector.edges.length !== this.lastEdgeCount) {
      this.rebuildRoutes(state.sector.edges, state.sector.nodes);
      this.rebuildNodes(state.sector.nodes);
      this.lastNodeCount = state.sector.nodes.length;
      this.lastEdgeCount = state.sector.edges.length;
    }

    this.drawDestination(state);
    this.drawShip(state);
    this.drawHighlights(state);
  }

  dispose(): void {
    disposeObject3D(this.scene);
  }

  private rebuildFrame(width: number, height: number): void {
    disposeObject3D(this.frameGroup);
    this.frameGroup.clear();
    const shape = createRoundedRectShape(width, height, 10);
    const geometry = new THREE.ShapeGeometry(shape);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: FRAME_BG, transparent: true, opacity: 0.78 });
    fillMaterial.depthTest = false;
    fillMaterial.depthWrite = false;
    const fillMesh = new THREE.Mesh(geometry, fillMaterial);
    fillMesh.renderOrder = 0;

    const points = shape.getPoints();
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const borderMaterial = new THREE.LineBasicMaterial({ color: FRAME_BORDER, transparent: true, opacity: 0.6 });
    borderMaterial.depthTest = false;
    borderMaterial.depthWrite = false;
    const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial);
    borderLine.renderOrder = 1;

    this.frameGroup.add(fillMesh, borderLine);
  }

  private rebuildRoutes(edges: SectorEdge[], nodes: SectorNode[]): void {
    this.routesGroup.clear();
    edges.forEach((edge) => {
      const from = nodes.find((node) => node.id === edge.fromId);
      const to = nodes.find((node) => node.id === edge.toId);
      if (!from || !to) {
        return;
      }
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      const mesh = new THREE.Mesh(this.routeGeometry, this.routeMaterial);
      mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
      mesh.scale.set(length, 1, 1);
      mesh.rotation.z = Math.atan2(dy, dx);
      mesh.renderOrder = 2;
      this.routesGroup.add(mesh);
    });
  }

  private rebuildNodes(nodes: SectorNode[]): void {
    this.nodesGroup.clear();
    nodes.forEach((node) => {
      const type = node.type === 'station' ? 'station' : node.type === 'outpost' ? 'outpost' : 'field';
      const mesh = new THREE.Mesh(this.nodeGeometry, this.nodeMaterials[type]);
      mesh.position.set(node.x, node.y, 0);
      mesh.renderOrder = 3;
      this.nodesGroup.add(mesh);
    });
  }

  private drawShip(state: GameState): void {
    const transit = state.sectorShip.inTransit;
    if (transit) {
      const from = state.sector.nodes.find((node) => node.id === transit.fromId);
      const to = state.sector.nodes.find((node) => node.id === transit.toId);
      if (from && to) {
        const x = from.x + (to.x - from.x) * transit.progress01;
        const y = from.y + (to.y - from.y) * transit.progress01;
        this.ship.position.set(x, y, 0);
      }
    } else {
      const node = state.sector.nodes.find((entry) => entry.id === state.sectorShip.nodeId);
      if (node) {
        this.ship.position.set(node.x, node.y, 0);
      }
    }
  }

  private drawDestination(state: GameState): void {
    const transit = state.sectorShip.inTransit;
    if (!transit) {
      this.destination.visible = false;
      return;
    }
    const node = state.sector.nodes.find((entry) => entry.id === transit.toId);
    if (!node) {
      this.destination.visible = false;
      return;
    }
    this.destination.visible = true;
    this.destination.position.set(node.x, node.y, 0);
  }

  private drawHighlights(state: GameState): void {
    const selectedNode = state.sector.nodes.find((node) => node.id === this.selectedNodeId);
    if (selectedNode) {
      this.selectedRing.visible = true;
      this.selectedRing.position.set(selectedNode.x, selectedNode.y, 0);
    } else {
      this.selectedRing.visible = false;
    }
    if (this.hoveredNodeId && this.hoveredNodeId !== this.selectedNodeId) {
      const hovered = state.sector.nodes.find((node) => node.id === this.hoveredNodeId);
      if (hovered) {
        this.hoverRing.visible = true;
        this.hoverRing.position.set(hovered.x, hovered.y, 0);
      } else {
        this.hoverRing.visible = false;
      }
    } else {
      this.hoverRing.visible = false;
    }
  }

  private computeRadius(nodes: SectorNode[]): number {
    let maxRadius = 1;
    nodes.forEach((node) => {
      const radius = Math.hypot(node.x, node.y);
      if (radius > maxRadius) {
        maxRadius = radius;
      }
    });
    return maxRadius;
  }

  private pickNode(nodes: SectorNode[], x: number, y: number): SectorNode | null {
    let best: SectorNode | null = null;
    let bestDist = Infinity;
    const radiusSq = PICK_RADIUS * PICK_RADIUS;
    nodes.forEach((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = dx * dx + dy * dy;
      if (dist <= radiusSq && dist < bestDist) {
        best = node;
        bestDist = dist;
      }
    });
    return best;
  }

  private createRingGeometry(radius: number): THREE.RingGeometry {
    return new THREE.RingGeometry(radius - 1, radius + 1, 32);
  }
}
