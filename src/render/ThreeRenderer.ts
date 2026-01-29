import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { GameState } from '../sim/types';
import { GameMode } from '../sim/modes';
import { SpaceScene } from './three/SpaceScene';
import { InteriorScene } from './three/InteriorScene';
import { SectorOverlay } from './three/SectorOverlay';

const COMMAND_BG = 0x050914;
const AVATAR_BG = 0x0b0f1a;

export class ThreeRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly baseScale = 20;
  private readonly spaceScene: SpaceScene;
  private readonly interiorScene: InteriorScene;
  private readonly sectorOverlay: SectorOverlay;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private interiorEnvMap: THREE.Texture | null = null;
  private currentSeed = '';
  private lastMode: GameMode | null = null;
  private sectorClickHandler: ((nodeId: string) => void) | null = null;
  private lastState: GameState | null = null;
  private readonly onPointerDown = (event: PointerEvent) => this.handleSectorClick(event);
  private readonly onPointerMove = (event: PointerEvent) => this.handleSectorHover(event);
  private readonly onPointerLeave = () => this.clearSectorHover();
  private sectorViewport: DOMRect | null = null;
  private sectorMapVisible = true;
  private hoveredSectorNodeId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.useLegacyLights = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(COMMAND_BG, 1);
    this.renderer.autoClear = false;
    this.handleResize();
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.imageRendering = 'pixelated';

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);

    this.spaceScene = new SpaceScene(this.baseScale);
    this.interiorScene = new InteriorScene();
    this.sectorOverlay = new SectorOverlay();

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.loadInteriorEnvironment();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  render(state: GameState): void {
    this.lastState = state;
    this.renderer.domElement.style.imageRendering =
      state.mode === GameMode.Avatar ? 'auto' : 'pixelated';
    if (state.renderSeed !== this.currentSeed) {
      this.spaceScene.rebuild(state.renderSeed);
      this.currentSeed = state.renderSeed;
    }

    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    if (state.mode !== this.lastMode) {
      this.renderer.setClearColor(state.mode === GameMode.Command ? COMMAND_BG : AVATAR_BG, 1);
      this.lastMode = state.mode;
    }

    this.renderer.clear();

    if (state.mode === GameMode.Command) {
      this.spaceScene.update(state, width, height);
      this.renderer.render(this.spaceScene.scene, this.spaceScene.camera);

      const viewport = this.getSectorViewport();
      this.sectorOverlay.setViewport(viewport);
      this.sectorOverlay.setSelectedNode(state.sectorShip.inTransit?.toId ?? state.sectorShip.nodeId);
      this.sectorOverlay.render(state, width, height);
      if (viewport) {
        this.renderer.clearDepth();
        this.renderer.render(this.sectorOverlay.scene, this.sectorOverlay.camera);
      }
    } else {
      this.interiorScene.render(state, width, height);
      this.renderer.render(this.interiorScene.scene, this.interiorScene.camera);
    }
  }

  setSectorViewport(rect: DOMRect | null): void {
    this.sectorViewport = rect;
  }

  setSectorMapVisible(visible: boolean): void {
    this.sectorMapVisible = visible;
    if (!visible) {
      this.clearSectorHover();
    }
  }

  setSectorClickHandler(handler: ((nodeId: string) => void) | null): void {
    this.sectorClickHandler = handler;
  }

  destroy(): void {
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.resizeObserver.disconnect();
    this.spaceScene.dispose();
    this.interiorScene.dispose();
    this.sectorOverlay.dispose();
    if (this.interiorEnvMap) {
      this.interiorEnvMap.dispose();
    }
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private loadInteriorEnvironment(): void {
    const loader = new RGBELoader();
    loader.load('/assets/vendor/polyhaven/studio_small_03_1k.hdr', (texture: THREE.DataTexture) => {
      const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
      texture.dispose();
      if (this.interiorEnvMap) {
        this.interiorEnvMap.dispose();
      }
      this.interiorEnvMap = envMap;
      this.interiorScene.setEnvironmentMap(envMap);
    });
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, true);
  }

  private getSectorViewport(): { x: number; y: number; width: number; height: number } | null {
    if (!this.sectorMapVisible || !this.sectorViewport || !this.lastState) {
      return null;
    }
    if (this.lastState.mode !== GameMode.Command) {
      return null;
    }
    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      return null;
    }
    const scaleX = this.renderer.domElement.width / canvasRect.width;
    const scaleY = this.renderer.domElement.height / canvasRect.height;
    const x = (this.sectorViewport.left - canvasRect.left) * scaleX;
    const y = (this.sectorViewport.top - canvasRect.top) * scaleY;
    const width = this.sectorViewport.width * scaleX;
    const height = this.sectorViewport.height * scaleY;
    return { x, y, width, height };
  }

  private handleSectorClick(event: PointerEvent): void {
    if (!this.lastState || this.lastState.mode !== GameMode.Command) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const viewport = this.getSectorViewport();
    const point = this.eventToRendererPoint(event);
    if (!viewport || !point) {
      return;
    }
    const node = this.sectorOverlay.pickNodeAtScreen(this.lastState.sector.nodes, point.x, point.y);
    if (!node || !this.sectorClickHandler) {
      return;
    }
    this.sectorClickHandler(node.id);
  }

  private handleSectorHover(event: PointerEvent): void {
    if (!this.lastState || this.lastState.mode !== GameMode.Command) {
      this.clearSectorHover();
      return;
    }
    const viewport = this.getSectorViewport();
    const point = this.eventToRendererPoint(event);
    if (!viewport || !point) {
      this.clearSectorHover();
      return;
    }
    const node = this.sectorOverlay.pickNodeAtScreen(this.lastState.sector.nodes, point.x, point.y);
    const nextId = node?.id ?? null;
    this.renderer.domElement.style.cursor = nextId ? 'pointer' : '';
    if (nextId !== this.hoveredSectorNodeId) {
      this.hoveredSectorNodeId = nextId;
      this.sectorOverlay.setHoverNode(nextId);
    }
  }

  private clearSectorHover(): void {
    if (this.hoveredSectorNodeId) {
      this.hoveredSectorNodeId = null;
      this.sectorOverlay.setHoverNode(null);
    }
    this.renderer.domElement.style.cursor = '';
  }

  private eventToRendererPoint(event: PointerEvent): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const scaleX = this.renderer.domElement.width / rect.width;
    const scaleY = this.renderer.domElement.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }
}
