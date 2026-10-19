import type { Routes } from '@angular/router';

/** Shown in the browser tab for both the whole catalog and a single category. */
export const CATALOG_TITLE = 'Catálogo — Yokai Hardcore Store';

/**
 * The catalog slice's routing entry point.
 *
 * `''` and `':slug'` load the same component: the only difference between the two URLs is the
 * route parameter the component reads as an input. Keeping both here rather than making the
 * category a query parameter is what lets `/catalog/mascotas` be linked, bookmarked and shared.
 */
export const catalogRoutes: Routes = [
  {
    path: '',
    title: CATALOG_TITLE,
    loadComponent: () => import('./catalog-page').then((module) => module.CatalogPage),
  },
  {
    path: ':slug',
    title: CATALOG_TITLE,
    loadComponent: () => import('./catalog-page').then((module) => module.CatalogPage),
  },
];
