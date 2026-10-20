/**
 * The Angular host for the decorative landing scene.
 *
 * Nothing interesting happens here: the component owns a stage element, asks the renderer to
 * fill it after the landing content has rendered, and disposes it on destroy. Every policy
 * decision lives in `three/landing/` so it can be tested without a browser.
 *
 * It is only reachable through a dynamic `import()` in `home-page.ts`, fired after the first
 * render. That is what keeps three.js — and this component — out of the home page's own chunk
 * and out of the initial bundle entirely.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  viewChild,
} from '@angular/core';

import {
  createLandingScene,
  reportLandingSceneFailure,
  type LandingSceneHandle,
} from '../../three/landing/landing-renderer';
import { DEFAULT_ISLAND_SEED, createIsland } from '../../three/landing/voxels';

@Component({
  selector: 'app-landing-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #stage class="stage" aria-hidden="true"></div>`,
  styles: `
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }
    .stage {
      position: absolute;
      inset: 0;
    }
    .stage canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class LandingScene implements OnDestroy {
  private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private handle: LandingSceneHandle | null = null;
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      if (this.destroyed) return;
      this.start();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.handle?.dispose();
    this.handle = null;
  }

  private start(): void {
    try {
      this.handle = createLandingScene(
        this.stage().nativeElement,
        createIsland(DEFAULT_ISLAND_SEED),
      );
    } catch (cause) {
      // No WebGL is a normal outcome. The hero keeps its wash and copy, and the visitor sees
      // nothing but a quieter background.
      this.handle = null;
      reportLandingSceneFailure(cause);
    }
  }
}
