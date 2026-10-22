/**
 * The Angular host for the decorative page background.
 *
 * Nothing interesting happens here: the component owns a stage element, asks the renderer to fill
 * it after the shell has rendered, and disposes it on destroy. Every policy decision lives in
 * `three/landing/` so it can be tested without a browser.
 *
 * It is mounted by the app shell, not by a route, and only through a dynamic `import()`. That is
 * the whole reason the world survives navigation: the shell is never destroyed while the visitor
 * moves between pages, so the model is fetched once per session, parsed once, and keeps turning
 * behind every route. Mounting it per page would restart the download on each navigation — which
 * is exactly the delay the previous arrangement showed on the landing page.
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
} from '../three/landing/landing-renderer';

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
      this.handle = createLandingScene(this.stage().nativeElement);
    } catch (cause) {
      // No WebGL is a normal outcome. The page keeps its backdrop and copy, and the visitor sees
      // nothing but a quieter background.
      this.handle = null;
      reportLandingSceneFailure(cause);
    }
  }
}
