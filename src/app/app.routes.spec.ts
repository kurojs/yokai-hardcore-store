/**
 * Route-table specs.
 *
 * These are cheap guards on decisions that are invisible in a build and easy to break later:
 * the landing route must match only `''` (otherwise it shadows the developer routes), the two
 * developer routes must survive every edit to the table, and an unknown URL must land somewhere
 * useful rather than on a router error.
 *
 * `/dev/model` and `/dev/items` are asserted structurally rather than mounted: mounting them
 * pulls three.js and a WebGL context into jsdom, which proves nothing this config check does not
 * already prove. Their live behaviour is checked against the dev server instead.
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { HomePage } from './features/home/home-page';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';

describe('routes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the landing route, the developer routes and the fallback in that order', () => {
    expect(routes.map((route) => route.path)).toEqual(['', 'dev/model', 'dev/items', '**']);
    expect(routes[0]?.pathMatch).toBe('full');
  });

  it('renders the landing page at the root URL', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(HomePage);
  });

  it('redirects an unknown URL to the landing page instead of failing', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/no-existe');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(HomePage);
  });
});
