# `shared/`

Reusable presentational building blocks used by more than one feature slice.

## Belongs here

- Dumb/presentational components: inputs and outputs only, no injected singletons, no
  routing, no data fetching.
- Pipes (price formatting, text truncation) and attribute/structural directives.
- UI primitives that stay visually and behaviorally consistent across the storefront.

## Does not belong here

- Anything used by a single slice; keep it local to that slice until a second consumer
  appears.
- Business logic and state (see `core/`) or feature containers (see `features/`).

Components here follow the container/presentational split and stay standalone.
