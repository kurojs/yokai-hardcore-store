import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dev/model',
    title: 'Model preview',
    // Lazy on purpose: three.js is only needed on this developer route, and loading it
    // eagerly would push the initial bundle past its budget.
    loadComponent: () => import('./three/bbmodel-viewer').then((module) => module.BbModelViewer),
  },
];
