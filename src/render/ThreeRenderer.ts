import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
  private readonly composer: EffectComposer;
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
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false }); // Disable MSAA for post-processing
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
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

    // Setup Post-Processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.interiorScene.scene, this.interiorScene.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    // Lower threshold so more things glow (helps visibility)
    bloomPass.threshold = 0.6;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.5;
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

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

    if (state.mode === GameMode.Command) {
      this.renderer.clear();
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
      // Use Composer for Bloom
      this.interiorScene.render(state, width, height);

      const renderPass = this.composer.passes[0] as RenderPass;
      renderPass.camera = this.interiorScene.camera;
      renderPass.scene = this.interiorScene.scene;
      renderPass.clearColor = new THREE.Color(AVATAR_BG);
      renderPass.clearAlpha = 1;

      this.composer.render();
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
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
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
