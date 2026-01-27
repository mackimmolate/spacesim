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

export class SectorRenderer {
  readonly container: PIXI.Container;
  private readonly routes: PIXI.Graphics;
  private readonly nodes: PIXI.Graphics;
  private readonly ship: PIXI.Graphics;
  private readonly destination: PIXI.Graphics;
  private lastNodeCount = 0;

  constructor() {
    this.container = new PIXI.Container();
    this.routes = new PIXI.Graphics();
    this.nodes = new PIXI.Graphics();
    this.ship = new PIXI.Graphics();
    this.destination = new PIXI.Graphics();
    this.container.addChild(this.routes, this.nodes, this.destination, this.ship);
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

  render(state: GameState, width: number, height: number): void {
    if (state.sector.nodes.length !== this.lastNodeCount) {
      this.drawRoutes(state.sector.edges, state.sector.nodes);
      this.drawNodes(state.sector.nodes);
      this.lastNodeCount = state.sector.nodes.length;
    }
    this.drawDestination(state);
    this.drawShip(state);

    this.container.position.set(width / 2, height / 2);
  }
}
