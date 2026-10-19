import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Route and query parameters bind straight to component inputs, so the catalog page takes
      // its `slug` as an input instead of injecting `ActivatedRoute` and subscribing by hand.
      withComponentInputBinding(),
      // Without this, opening a catalog page from a scrolled landing page drops the visitor
      // halfway down the grid, which reads like a rendering bug.
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
};
