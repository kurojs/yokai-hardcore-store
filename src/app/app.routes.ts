import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // `pathMatch: 'full'` matters here: the landing slice's only child is the empty path, so
    // without it this route would claim every URL before the developer routes below.
    pathMatch: 'full',
    loadChildren: () => import('./features/home/home.routes').then((module) => module.homeRoutes),
  },
  {
    path: 'catalog',
    // The slice owns both `/catalog` and `/catalog/:slug`; see `catalog.routes.ts`.
    loadChildren: () =>
      import('./features/catalog/catalog.routes').then((module) => module.catalogRoutes),
  },
  {
    path: 'dev/model',
    title: 'Model preview',
    // Lazy on purpose: three.js is only needed on this developer route, and loading it
    // eagerly would push the initial bundle past its budget.
    loadComponent: () => import('./three/bbmodel-viewer').then((module) => module.BbModelViewer),
  },
  {
    path: 'dev/items',
    title: 'Item model preview',
    // Lazy for the same reason: it shares `three/preview-host.ts` with the route above, and
    // both stay out of the initial bundle.
    loadComponent: () =>
      import('./three/item-model-viewer').then((module) => module.ItemModelViewer),
  },
  // An unknown URL is a typo or a stale bookmark, not an error page worth interrupting a
  // shopper with: send them to the landing page instead.
  { path: '**', redirectTo: '' },
];
