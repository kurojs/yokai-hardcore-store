import type { Routes } from '@angular/router';

/**
 * The product slice's routing entry point.
 *
 * One route, `:slug`, mirroring `/catalog/:slug`. There is no static `title` here on purpose:
 * the title has to name the product, and the product comes from the catalog, which has not
 * loaded when a route title is resolved. `ProductPage` sets it through the `Title` service once
 * the slug has been resolved against the catalog, and sets a real not-found title when it has
 * not.
 *
 * No `/product` route without a slug: it would be a page with nothing to show. It falls through
 * to the application's `**` fallback, which sends the visitor to the landing page.
 */
export const productRoutes: Routes = [
  {
    path: ':slug',
    loadComponent: () => import('./product-page').then((module) => module.ProductPage),
  },
];
