# `features/`

Feature slices. One directory per vertical slice of the storefront.

## Planned slices

- `home/` — landing and hero experience.
- `catalog/` — category browsing, search, and filters.
- `product/` — product detail view.
- `cart/` — cart contents and state presentation.
- `checkout/` — demo checkout flow.

## Rules

- A slice owns its own routes, smart (container) components, and slice-scoped state.
- Slices may depend on `core/`, `shared/`, and `three/`; they must not depend on each
  other. Cross-slice reuse is promoted to `shared/` or `core/` instead.
- Lazy-loaded routing entry points live here, one per slice.
