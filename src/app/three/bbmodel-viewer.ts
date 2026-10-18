/**
 * Thin Angular host for the Blockbench pipeline.
 *
 * Everything interesting lives in `./bbmodel/`: this component owns the canvas, the
 * lifecycle and the cleanup, and nothing else. It is loaded lazily from `/dev/model` so
 * three.js stays out of the initial application bundle.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  input,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { createBbModelScene, type BbModelScene } from './bbmodel';

// Root-absolute on purpose: the component is mounted at `/dev/model`, so a relative
// `models/...` would resolve against `/dev/` and 404.
const DEFAULT_MODEL_URL = '/models/bosses/tlaloc.bbmodel';
const INITIAL_CLIP = 'idle';

/** Turns an unknown thrown value into something worth showing. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Component({
  selector: 'app-bbmodel-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #stage class="stage" role="img" [attr.aria-label]="label()"></div>

    <aside class="hud">
      <p class="source">{{ modelUrl() }}</p>
      @if (summary(); as text) {
        <p class="stats">{{ text }}</p>
      }
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (clips().length > 0) {
        <div class="clips" role="group" aria-label="Animation clips">
          @for (name of clips(); track name) {
            <button type="button" [class.active]="name === activeClip()" (click)="playClip(name)">
              {{ name }}
            </button>
          }
        </div>
      }
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }
    .stage {
      position: fixed;
      inset: 0;
      background: #0b0d12;
    }
    .stage canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .hud {
      position: fixed;
      inset: 0 0 auto 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      padding: 0.75rem 1rem;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #cbd5e1;
      background: linear-gradient(#000000aa, #00000000);
      pointer-events: none;
    }
    .source,
    .stats,
    .error {
      margin: 0;
    }
    .source {
      opacity: 0.65;
    }
    .error {
      color: #fca5a5;
    }
    .clips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-left: auto;
      pointer-events: auto;
    }
    .clips button {
      font: inherit;
      color: inherit;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.375rem;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
    }
    .clips button:hover {
      border-color: #64748b;
    }
    .clips button.active {
      color: #0b0d12;
      background: #7dd3fc;
      border-color: #7dd3fc;
    }
  `,
})
export class BbModelViewer implements OnDestroy {
  /** URL of the `.bbmodel` document, resolved by the browser. */
  readonly modelUrl = input(DEFAULT_MODEL_URL);
  readonly label = input('Blockbench model preview');

  readonly error = signal<string | null>(null);
  readonly summary = signal<string | null>(null);
  readonly clips = signal<readonly string[]>([]);
  readonly activeClip = signal<string | null>(null);

  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private readonly threeScene = new THREE.Scene();
  private modelScene: BbModelScene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.start();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.setAnimationLoop(null);
    this.controls?.dispose();
    this.mixer?.stopAllAction();
    this.modelScene?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }

  playClip(name: string): void {
    const action = this.actions.get(name);
    if (action === undefined) return;
    for (const other of this.actions.values()) other.stop();
    action.reset().play();
    this.activeClip.set(name);
  }

  private async start(): Promise<void> {
    const host = this.stage().nativeElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (cause) {
      this.error.set(`WebGL is unavailable in this browser: ${messageOf(cause)}`);
      return;
    }
    if (this.destroyed) {
      renderer.dispose();
      return;
    }

    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.append(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera = camera;
    this.threeScene.background = new THREE.Color(0x0b0d12);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    this.controls = controls;

    // A Minecraft-style model needs flat, unlit-looking shading: no environment map, one
    // hemisphere fill and one directional key so faces stay distinguishable.
    this.threeScene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1, 2, 1.5);
    this.threeScene.add(key);

    this.resizeObserver = new ResizeObserver(() => this.resize(host));
    this.resizeObserver.observe(host);
    this.resize(host);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      this.mixer?.update(delta);
      this.controls?.update();
      renderer.render(this.threeScene, camera);
    });

    await this.load(this.modelUrl());
  }

  private resize(host: HTMLDivElement): void {
    const renderer = this.renderer;
    const camera = this.camera;
    if (renderer === null || camera === null) return;

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  private async load(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GET ${url} responded ${response.status} ${response.statusText}`);
      }
      const raw: unknown = await response.json();
      const built = createBbModelScene(raw, { loadTexture: new THREE.TextureLoader() });
      if (this.destroyed) {
        built.dispose();
        return;
      }

      this.modelScene = built;
      this.threeScene.add(built.root);
      this.frameCamera(built);
      this.describe(built);
      this.bindClips(built);
    } catch (cause) {
      if (this.destroyed) return;
      this.error.set(`Could not render ${url}: ${messageOf(cause)}`);
    }
  }

  private frameCamera(built: BbModelScene): void {
    const camera = this.camera;
    const controls = this.controls;
    if (camera === null || controls === null) return;

    const { min, max } = built.stats.boundingBox;
    const center = new THREE.Vector3(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    );
    const size = new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const radius = Math.max(size.length() / 2, 0.001);
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.2;

    camera.position.copy(center).add(new THREE.Vector3(0.75, 0.45, 0.75).multiplyScalar(distance));
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = distance * 20;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.minDistance = radius * 0.5;
    controls.maxDistance = distance * 4;
    controls.update();
  }

  private describe(built: BbModelScene): void {
    const stats = built.stats;
    this.summary.set(
      [
        `${stats.cubesRendered}/${stats.cubesInSource} cubes`,
        `${stats.bonesRendered} bones`,
        `${stats.cubesFilteredAsHitbox} hitboxes filtered`,
        `${stats.clips} clips`,
        `${stats.tracks} tracks`,
        `${stats.keyframes} keyframes`,
      ].join(' · '),
    );
  }

  private bindClips(built: BbModelScene): void {
    const mixer = new THREE.AnimationMixer(built.root);
    this.mixer = mixer;

    built.clips.forEach((clip, index) => {
      const descriptor = built.clipDescriptors[index];
      const action = mixer.clipAction(clip);
      if (descriptor.loop === 'loop') {
        action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    });

    this.clips.set(built.clips.map((clip) => clip.name));
    const initial =
      built.clipDescriptors.find((descriptor) => descriptor.name === INITIAL_CLIP) ??
      built.clipDescriptors[0];
    if (initial !== undefined) this.playClip(initial.name);
  }
}
