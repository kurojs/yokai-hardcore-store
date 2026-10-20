import type { Routes } from '@angular/router';

/**
 * The catalog slice's routing entry point.
 *
 * `''` and `':slug'` load the same component: the only difference between the two URLs is the
 * route parameter the component reads as an input. Keeping both here rather than making the
 * category a query parameter is what lets `/catalog/mascotas` be linked, bookmarked and shared.
 *
 * There is no static route title: a title literal is resolved before the component exists and
 * would be frozen in one language. The page sets the localized title itself.
 */
export const catalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./catalog-page').then((module) => module.CatalogPage),
  },
  {
    path: ':slug',
    loadComponent: () => import('./catalog-page').then((module) => module.CatalogPage),
  },
];
