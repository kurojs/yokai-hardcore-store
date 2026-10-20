import type { Routes } from '@angular/router';

/**
 * The landing page.
 *
 * It is lazy like every other slice — `features/README.md` makes each slice its own routing
 * entry point — which also means the shell is the only thing in the initial bundle and the
 * landing page arrives as its own chunk.
 */
export const homeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home-page').then((module) => module.HomePage),
  },
];
