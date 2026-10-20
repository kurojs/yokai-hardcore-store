import type { Routes } from '@angular/router';

/**
 * The cart slice's routing entry point.
 *
 * One route, `''`, mounted by the application at `/cart`. It is lazy like every other slice, so
 * the cart page and the order summary it imports stay out of the initial bundle.
 *
 * There is no static route title: a route title is a literal resolved before the component
 * exists, and it would be frozen in one language. The page sets the localized title itself.
 */
export const cartRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./cart-page').then((module) => module.CartPage),
  },
];
