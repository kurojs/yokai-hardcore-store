/**
 * Thin Angular host for the Minecraft item model pipeline.
 *
 * Everything interesting lives in `./itemmodel/`, and the WebGL plumbing is shared with the
 * boss preview in `./preview-host.ts`. This component owns three things the module layer
 * cannot: which file is loaded, what the HUD says about it, and the lifetime of the mounted
 * scene — including the disposal of the scene it replaces. It is loaded lazily from
 * `/dev/items` so three.js stays out of the initial application bundle.
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

import {
  createFetchTextureProbe,
  createItemModelScene,
  itemModelTexturePaths,
  parseItemModel,
  resolveItemTextures,
  type ItemDisplayContext,
  type ItemScene,
} from './itemmodel';
import {
  describeItemParent,
  describeItemScene,
  describeTextureStatus,
  displayChoicesFor,
  initialDisplayContext,
  ITEM_PREVIEW_MODELS,
  type ItemPreviewModel,
} from './itemmodel/preview';
import { createPreviewHost, describeError, type PreviewHost } from './preview-host';

@Component({
  selector: 'app-item-model-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #stage class="stage" role="img" [attr.aria-label]="label()"></div>

    <aside class="hud">
      <div class="switcher" role="group" aria-label="Item models">
        @for (model of models; track model.id) {
          <button
            type="button"
            [class.active]="model.id === activeModelId()"
            (click)="showModel(model.id)"
          >
            {{ model.label }}
          </button>
        }
      </div>

      @if (displayChoices().length > 0) {
        <div class="switcher" role="group" aria-label="Display context">
          <span class="key">display</span>
          @for (context of displayChoices(); track context) {
            <button
              type="button"
              [class.active]="context === activeDisplay()"
              (click)="showDisplay(context)"
            >
              {{ context }}
            </button>
          }
          <button type="button" [class.active]="activeDisplay() === null" (click)="showDisplay(null)">
            identity
          </button>
        </div>
      }

      @if (summary(); as text) {
        <p class="stats">{{ text }}</p>
      }
      @if (parent(); as text) {
        <p class="parent">{{ text }}</p>
      }
      @for (line of textureLines(); track line) {
        <p class="texture">{{ line }}</p>
      }
      @for (line of warningLines(); track line) {
        <p class="warning">{{ line }}</p>
      }
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
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
      flex-direction: column;
      gap: 0.375rem;
      max-height: 100%;
      padding: 0.75rem 1rem;
      overflow: hidden;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #cbd5e1;
      background: linear-gradient(#0b0d12f2, #0b0d1200);
      pointer-events: none;
    }
    .switcher {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
      pointer-events: auto;
    }
    .key {
      opacity: 0.55;
    }
    .switcher button {
      font: inherit;
      color: inherit;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.375rem;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
    }
    .switcher button:hover {
      border-color: #64748b;
    }
    .switcher button.active {
      color: #0b0d12;
      background: #7dd3fc;
      border-color: #7dd3fc;
    }
    .stats,
    .parent,
    .texture,
    .warning,
    .error {
      margin: 0;
    }
    .parent {
      opacity: 0.65;
    }
    .texture {
      opacity: 0.85;
    }
    .warning {
      color: #fcd34d;
    }
    .error {
      color: #fca5a5;
    }
  `,
})
export class ItemModelViewer implements OnDestroy {
  /** The documents this route can preview. */
  readonly models = ITEM_PREVIEW_MODELS;
  readonly label = input('Minecraft item model preview');

  readonly activeModelId = signal(ITEM_PREVIEW_MODELS[0].id);
  readonly error = signal<string | null>(null);
  readonly summary = signal<string | null>(null);
  readonly parent = signal<string | null>(null);
  readonly textureLines = signal<readonly string[]>([]);
  readonly warningLines = signal<readonly string[]>([]);
  readonly displayChoices = signal<readonly ItemDisplayContext[]>([]);
  readonly activeDisplay = signal<ItemDisplayContext | null>(null);

  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private host: PreviewHost | null = null;
  private itemScene: ItemScene | null = null;
  private destroyed = false;
  /** Guards against a slow load overwriting a newer selection. */
  private loadToken = 0;

  constructor() {
    afterNextRender(() => {
      void this.start();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    // The scene first: it borrows the host's scene graph, so unmounting it after the host
    // would leave the root dangling in a disposed renderer.
    this.teardownScene();
    this.host?.dispose();
    this.host = null;
  }

  /** Switches to another document, disposing the one that is mounted. */
  showModel(id: string): void {
    if (id === this.activeModelId()) return;
    const model = this.models.find((entry) => entry.id === id);
    if (model === undefined) return;
    this.activeModelId.set(model.id);
    void this.load(model);
  }

  /** Poses the mounted model the way Minecraft does in that context. */
  showDisplay(context: ItemDisplayContext | null): void {
    this.activeDisplay.set(context);
    this.itemScene?.setDisplayContext(context);
  }

  private async start(): Promise<void> {
    let host: PreviewHost;
    try {
      host = createPreviewHost(this.stage().nativeElement);
    } catch (cause) {
      // A machine without WebGL cannot preview anything, and this component cannot fix it:
      // say so and leave the rest of the page alone.
      this.error.set(`WebGL is unavailable in this browser: ${describeError(cause)}`);
      return;
    }
    if (this.destroyed) {
      host.dispose();
      return;
    }

    this.host = host;
    const first = this.models[0];
    if (first !== undefined) await this.load(first);
  }

  private async load(model: ItemPreviewModel): Promise<void> {
    const host = this.host;
    if (host === null) return;

    const token = (this.loadToken += 1);
    this.error.set(null);
    this.teardownScene();

    try {
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`GET ${model.url} responded ${response.status} ${response.statusText}`);
      }
      const raw: unknown = await response.json();
      const parsed = parseItemModel(raw);

      // Which textures exist is observed, not assumed: a model that delegates to a vanilla
      // parent resolves to a URL that simply does not respond, and that is a state the scene
      // reports rather than an error.
      const bindings = await resolveItemTextures(
        model.url,
        itemModelTexturePaths(parsed),
        createFetchTextureProbe(),
      );
      if (this.destroyed || token !== this.loadToken) return;

      const scene = createItemModelScene(raw, {
        resolveTexture: (texturePath) => bindings.get(texturePath) ?? { url: null },
      });
      if (this.destroyed || token !== this.loadToken) {
        scene.dispose();
        return;
      }

      this.itemScene = scene;
      host.add(scene.root);
      // Each model is framed from its own bounds: the hat is ~24 units across and a sprite
      // quad is 16, so one shared camera distance would either crop or shrink it.
      host.frameCamera(scene.stats.modelBounds);

      const choices = displayChoicesFor(scene.model);
      const initial = initialDisplayContext(choices);
      scene.setDisplayContext(initial);

      this.displayChoices.set(choices);
      this.activeDisplay.set(initial);
      this.summary.set(describeItemScene(scene.stats));
      this.parent.set(describeItemParent(scene.model));
      this.textureLines.set(scene.stats.textures.map(describeTextureStatus));
      this.warningLines.set(scene.stats.warnings);
    } catch (cause) {
      if (this.destroyed || token !== this.loadToken) return;
      this.displayChoices.set([]);
      this.activeDisplay.set(null);
      this.summary.set(null);
      this.parent.set(null);
      this.textureLines.set([]);
      this.warningLines.set([]);
      this.error.set(`Could not render ${model.url}: ${describeError(cause)}`);
    }
  }

  /** Unmounts and disposes the current scene, if there is one. */
  private teardownScene(): void {
    const scene = this.itemScene;
    if (scene === null) return;
    this.itemScene = null;
    this.host?.remove(scene.root);
    scene.dispose();
  }
}
