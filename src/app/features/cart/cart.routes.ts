import type { Routes } from '@angular/router';

/**
 * The cart slice's routing entry point.
 *
 * One route, `''`, mounted by the application at `/cart`. It is lazy like every other slice, so
 * the cart page and the order summary it imports stay out of the initial bundle.
 *
 * The title is static because the page needs no catalog to name itself: "Tu carrito" is the
 * heading whatever the cart holds.
 */
export const cartRoutes: Routes = [
  {
    path: '',
    title: 'Carrito — Yokai Hardcore Store',
    loadComponent: () => import('./cart-page').then((module) => module.CartPage),
  },
];
