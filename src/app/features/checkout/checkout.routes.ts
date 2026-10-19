import type { Routes } from '@angular/router';

/**
 * The demo checkout slice's routing entry point.
 *
 * One route, `''`, mounted by the application at `/checkout`. The component itself decides
 * whether it can render — it redirects an empty cart to `/cart` once the catalog is ready —
 * because that decision needs the loaded cart, which a route guard cannot wait for without
 * duplicating the store's readiness rules.
 *
 * "Revisar y confirmar" rather than "checkout" in the page title: the page is a review, and the
 * title should not imply a purchase that will not happen.
 */
export const checkoutRoutes: Routes = [
  {
    path: '',
    title: 'Revisar y confirmar — Yokai Hardcore Store',
    loadComponent: () => import('./checkout-page').then((module) => module.CheckoutPage),
  },
];
