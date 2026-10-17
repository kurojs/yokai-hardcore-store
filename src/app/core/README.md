# `core/`

Singleton services, application-wide configuration, and pure domain logic.

## Belongs here

- Injectable singletons provided once at the application root (state stores, catalogs,
  persistence adapters such as the localStorage cart store).
- Injection tokens, environment/config access, and cross-cutting concerns.
- Pure domain functions and models with no Angular or DOM dependency: pricing, totals,
  formatting, slug/normalization helpers.

## Does not belong here

- Presentational or visual components (see `shared/`).
- Feature-specific UI and routing entry points (see `features/`).
- three.js rendering or asset parsing (see `three/`).

Prefer pure functions over stateful services so this layer stays testable without TestBed.
