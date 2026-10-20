import type { Routes } from '@angular/router';

/**
 * The demo checkout slice's routing entry point.
 *
 * One route, `''`, mounted by the application at `/checkout`. The component itself decides
 * whether it can render — it redirects an empty cart to `/cart` once the catalog is ready —
 * because that decision needs the loaded cart, which a route guard cannot wait for without
 * duplicating the store's readiness rules.
 *
 * There is no static route title: it would be a literal frozen in one language. The page names
 * itself in the active language.
 */
export const checkoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./checkout-page').then((module) => module.CheckoutPage),
  },
];
