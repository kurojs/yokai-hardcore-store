/**
 * Thin Angular host for the Blockbench pipeline.
 *
 * Everything interesting lives in `./bbmodel/`, and the WebGL plumbing is shared with the
 * item preview in `./preview-host.ts`: this component owns the canvas, the lifecycle and the
 * cleanup, and nothing else. It is loaded lazily from `/dev/model` so three.js stays out of
 * the initial application bundle.
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

import { createBbModelScene, type BbModelScene } from './bbmodel';
import { createPreviewHost, describeError, type PreviewHost } from './preview-host';

// Document-relative: `<base href>` carries the deployment prefix, so this resolves the same on
// `/dev/model` locally and under `/yokai-hardcore-store/` on GitHub Pages.
const DEFAULT_MODEL_URL = 'models/bosses/tlaloc.bbmodel';
const INITIAL_CLIP = 'idle';

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

  private host: PreviewHost | null = null;
  private modelScene: BbModelScene | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.start();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.mixer?.stopAllAction();
    this.modelScene?.dispose();
    this.host?.dispose();
    this.host = null;
  }

  playClip(name: string): void {
    const action = this.actions.get(name);
    if (action === undefined) return;
    for (const other of this.actions.values()) other.stop();
    action.reset().play();
    this.activeClip.set(name);
  }

  private async start(): Promise<void> {
    let host: PreviewHost;
    try {
      host = createPreviewHost(this.stage().nativeElement);
    } catch (cause) {
      // No WebGL is a normal outcome on some machines, and it is the one failure this
      // component can do nothing about: report it and leave the rest of the page intact.
      this.error.set(`WebGL is unavailable in this browser: ${describeError(cause)}`);
      return;
    }
    if (this.destroyed) {
      host.dispose();
      return;
    }

    this.host = host;
    // The mixer is created when the model arrives, so the loop reads it through `this`.
    host.setUpdate((delta) => this.mixer?.update(delta));

    await this.load(this.modelUrl());
  }

  private async load(url: string): Promise<void> {
    try {
      const host = this.host;
      if (host === null) return;

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
      host.add(built.root);
      host.frameCamera(built.stats.boundingBox);
      this.describe(built);
      this.bindClips(built);
    } catch (cause) {
      if (this.destroyed) return;
      this.error.set(`Could not render ${url}: ${describeError(cause)}`);
    }
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
