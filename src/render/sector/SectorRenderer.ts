import * as PIXI from 'pixi.js';
import type { GameState } from '../../sim/types';
import type { SectorEdge, SectorNode } from '../../sim/sector/types';

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

export class SectorRenderer {
  readonly container: PIXI.Container;
  private readonly frame: PIXI.Graphics;
  private readonly map: PIXI.Container;
  private readonly routes: PIXI.Graphics;
  private readonly nodes: PIXI.Graphics;
  private readonly highlights: PIXI.Graphics;
  private readonly ship: PIXI.Graphics;
  private readonly destination: PIXI.Graphics;
  private lastNodeCount = 0;
  private viewport: Viewport | null = null;
  private mapScale = 1;
  private hoveredNodeId: string | null = null;
  private selectedNodeId: string | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.frame = new PIXI.Graphics();
    this.map = new PIXI.Container();
    this.routes = new PIXI.Graphics();
    this.nodes = new PIXI.Graphics();
    this.highlights = new PIXI.Graphics();
    this.ship = new PIXI.Graphics();
    this.destination = new PIXI.Graphics();
    this.map.addChild(this.routes, this.nodes, this.highlights, this.destination, this.ship);
    this.container.addChild(this.frame, this.map);
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

  private drawRoutes(edges: SectorEdge[], nodes: SectorNode[]): void {
    this.routes.clear();
    this.routes.lineStyle(1, ROUTE_COLOR, 0.8);
    edges.forEach((edge) => {
      const from = nodes.find((node) => node.id === edge.fromId);
      const to = nodes.find((node) => node.id === edge.toId);
      if (!from || !to) {
        return;
      }
      this.routes.moveTo(from.x, from.y);
      this.routes.lineTo(to.x, to.y);
    });
  }

  private drawNodes(nodes: SectorNode[]): void {
    this.nodes.clear();
    nodes.forEach((node) => {
      const color =
        node.type === 'station' ? STATION_COLOR : node.type === 'outpost' ? OUTPOST_COLOR : FIELD_COLOR;
      this.nodes.beginFill(color);
      this.nodes.drawCircle(node.x, node.y, NODE_RADIUS);
      this.nodes.endFill();
    });
  }

  private drawShip(state: GameState): void {
    this.ship.clear();
    this.ship.beginFill(SHIP_COLOR);
    this.ship.drawCircle(0, 0, NODE_RADIUS + 2);
    this.ship.endFill();

    const transit = state.sectorShip.inTransit;
    if (transit) {
      const from = state.sector.nodes.find((node) => node.id === transit.fromId);
      const to = state.sector.nodes.find((node) => node.id === transit.toId);
      if (from && to) {
        const x = from.x + (to.x - from.x) * transit.progress01;
        const y = from.y + (to.y - from.y) * transit.progress01;
        this.ship.position.set(x, y);
      }
    } else {
      const node = state.sector.nodes.find((entry) => entry.id === state.sectorShip.nodeId);
      if (node) {
        this.ship.position.set(node.x, node.y);
      }
    }
  }

  private drawDestination(state: GameState): void {
    this.destination.clear();
    const transit = state.sectorShip.inTransit;
    if (!transit) {
      return;
    }
    const node = state.sector.nodes.find((entry) => entry.id === transit.toId);
    if (!node) {
      return;
    }
    this.destination.lineStyle(2, DEST_COLOR, 0.9);
    this.destination.drawCircle(node.x, node.y, NODE_RADIUS + 6);
  }

  private drawHighlights(state: GameState): void {
    this.highlights.clear();
    const selectedNode = state.sector.nodes.find((node) => node.id === this.selectedNodeId);
    if (selectedNode) {
      this.highlights.lineStyle(2, SELECT_COLOR, 0.9);
      this.highlights.drawCircle(selectedNode.x, selectedNode.y, NODE_RADIUS + 8);
    }
    if (this.hoveredNodeId && this.hoveredNodeId !== this.selectedNodeId) {
      const hovered = state.sector.nodes.find((node) => node.id === this.hoveredNodeId);
      if (hovered) {
        this.highlights.lineStyle(2, HOVER_COLOR, 0.85);
        this.highlights.drawCircle(hovered.x, hovered.y, NODE_RADIUS + 10);
      }
    }
  }

  private drawFrame(width: number, height: number): void {
    this.frame.clear();
    this.frame.beginFill(FRAME_BG, 0.78);
    this.frame.drawRoundedRect(-width / 2, -height / 2, width, height, 10);
    this.frame.endFill();
    this.frame.lineStyle(1, FRAME_BORDER, 0.6);
    this.frame.drawRoundedRect(-width / 2, -height / 2, width, height, 10);
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

  render(state: GameState): void {
    if (!this.viewport || this.viewport.width <= 0 || this.viewport.height <= 0) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;
    const { x, y, width, height } = this.viewport;
    this.container.position.set(x + width / 2, y + height / 2);
    this.drawFrame(width, height);

    const radius = this.computeRadius(state.sector.nodes);
    const size = Math.min(width, height) - FRAME_PADDING * 2;
    this.mapScale = size > 0 ? size / (radius * 2) : 1;
    this.map.scale.set(this.mapScale);

    if (state.sector.nodes.length !== this.lastNodeCount) {
      this.drawRoutes(state.sector.edges, state.sector.nodes);
      this.drawNodes(state.sector.nodes);
      this.lastNodeCount = state.sector.nodes.length;
    }
    this.drawDestination(state);
    this.drawShip(state);
    this.drawHighlights(state);
  }
}
