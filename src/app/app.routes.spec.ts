/**
 * Route-table specs.
 *
 * These are cheap guards on decisions that are invisible in a build and easy to break later:
 * the landing route must match only `''` (otherwise it shadows every other route), the two
 * developer routes must survive every edit to the table, `/catalog/:slug` must reach the page as
 * an input, and an unknown URL must land somewhere useful rather than on a router error.
 *
 * The navigation tests use the real `appConfig.providers`, so they also prove that
 * `withComponentInputBinding` is wired the same way the application wires it.
 *
 * `/dev/model` and `/dev/items` are asserted structurally rather than mounted: mounting them
 * pulls three.js and a WebGL context into jsdom, which proves nothing this config check does not
 * already prove. Their live behaviour is checked against the dev server instead.
 */

import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';

import { appConfig } from './app.config';
import { routes } from './app.routes';
import { readCommittedCatalogDocument } from './core/catalog/testing/committed-catalog';
import { jsonResponse } from './core/catalog/testing/http';
import { CatalogPage } from './features/catalog/catalog-page';
import { HomePage } from './features/home/home-page';
import { productRoutes } from './features/product/product.routes';
import { ProductPage } from './features/product/product-page';

describe('routes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(readCommittedCatalogDocument())),
    );
    TestBed.configureTestingModule({ providers: appConfig.providers });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the slice routes, the developer routes and the fallback in that order', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '',
      'catalog',
      'product',
      'dev/model',
      'dev/items',
      '**',
    ]);
    expect(routes[0]?.pathMatch).toBe('full');
    // The product slice owns exactly `/product/:slug`; `/product` alone has nothing to show and
    // falls through to the landing page like any other unknown URL.
    expect(productRoutes.map((route) => route.path)).toEqual([':slug']);
  });

  it('renders the landing page at the root URL', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(HomePage);
  });

  it('renders the catalog page at /catalog', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/catalog');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(CatalogPage);
  });

  it('passes the category slug to the page as an input', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/catalog/mascotas');

    const page = harness.routeDebugElement?.componentInstance as CatalogPage;
    expect(page).toBeInstanceOf(CatalogPage);
    expect(page.slug()).toBe('mascotas');
  });

  it('passes the product slug to the detail page as an input', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/product/10-algodones-de-azucar');

    // Lazily loaded through `loadComponent`, so reaching this assertion also proves the route
    // can be resolved; the page's own states are specified in `product-page.spec.ts`.
    const page = harness.routeDebugElement?.componentInstance as ProductPage;
    expect(page).toBeInstanceOf(ProductPage);
    expect(page.slug()).toBe('10-algodones-de-azucar');
  });

  it('redirects an unknown URL to the landing page instead of failing', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/no-existe');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(HomePage);
  });
});
