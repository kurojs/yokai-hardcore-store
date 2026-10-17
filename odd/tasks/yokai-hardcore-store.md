# Yokai Hardcore Store — Feature Document

**Feature ID**: `yokai-hardcore-store`
**Type**: New standalone project (frontend only, no backend)
**Route**: Substantial → ODD with delegated writers
**Created**: 2026-10-17
**Branch**: `feat/yokai-hardcore-store`
**Project root**: `C:\Users\kuuro\dev\yokai-hardcore-store`

---

## Objective

Build the complete storefront frontend for the **Yokai Hardcore** Minecraft server as a
professional, production-quality web store that replaces the current Tebex-hosted store,
and that doubles as a flagship portfolio project closing three unsupported GitHub README
badges (**Angular**, **React**, **Spring Boot**).

Phase 1 (this document) is **frontend only, no backend**. Phase 2 (Spring Boot API) is
explicitly out of scope here and tracked separately.

---

## Problem

1. The server's store currently lives on Tebex, with all 48 product images served from
   `dunb17ur4ymx4.cloudfront.net`. It is a generic store template with no identity.
2. `kurojs/kurojs` (profile README) advertises 12 technology badges. **Angular, React and
   Spring Boot have zero supporting repositories** — 3 of 12 claims are unbacked.
   Conversely, Vue (`NihonTalk`) and Svelte (`n1-japanese-novel-reader`) are real and
   unlisted.
3. The user's goal is employment in Japan within 2–3 years. Angular + Spring Boot is the
   dominant Japanese enterprise web stack, and the README already claims both.
4. No prior art exists for the 3D presentation of the server's own custom content, which
   is the server's strongest differentiator.

---

## Why

- **Real business value**: this replaces a live store, not a tutorial CRUD app.
- **Profile leverage**: one coherent project closes the Angular gap; a later Spring Boot
  API closes the third. Vue and Svelte then get added to the README instead of invented
  badges.
- **Differentiation**: the server owns first-party 3D content (an animated 110-cube boss
  model, custom 3D item models, large schematic builds). Rendering that content in the
  browser is something almost no candidate can show.

---

## Scope (Phase 1 — IN)

- Angular 22 + TypeScript, standalone components, signals, **zoneless** change detection.
- three.js for all 3D rendering.
- Catalog sourced from `todos_los_productos.json` (48 products, 10 categories), normalized
  into a clean `catalog.json` with stable `id` + `slug`.
- Category browsing, search, and price/category filtering.
- Product detail view with interactive 3D preview.
- Cart (localStorage persistence) and a demo checkout flow.
- i18n: **ES / EN / JP** (the user is trilingual; the portfolio already does this).
- 3D pipeline, all first-party assets (see Assets below).
- Responsive, accessible, dark-first visual identity for the Yokai brand.

## Scope (Phase 1 — OUT)

- Backend, database, auth, real payments, Tebex/Stripe integration.
- Admin/CMS. Catalog changes happen by regenerating `catalog.json`.
- User accounts, order history, inventory/stock tracking.
- Spring Boot API (Phase 2).

---

## Constraints

- **Never develop inside `G:\マイドライブ` (Google Drive).** Drive sync plus `node_modules`
  causes corruption and data loss. The Drive folder is read-only source material; assets
  are **copied** into the repo.
- **Do not reuse** the prior React + Vite demo at
  `C:\Users\kuuro\Documents\Codex\2026-10-16\ne`. This is a clean build (explicit user
  instruction).
- Minecraft's own assets are Mojang IP. Used only for item iconography, consistent with
  existing Tebex practice. Scenery/backdrops use first-party or CC0 assets only. All
  third-party assets are documented in `ASSETS.md` and `LICENSES.md`.
- Angular and three.js are pinned to verified-latest at time of writing: Angular CLI
  `22.2.3`, three `0.186.1`.

---

## Data facts (verified, not assumed)

- `todos_los_productos.json` — 48 products, 10 categories, 0 duplicate names, 0 empty
  descriptions.
- Schema: `nombre | precio | categoria | descripcion_categoria | descripcion | imagen_url`.
  No `id`, `slug`, `stock`, `tags` or i18n fields.
- Prices are USD 1–10. Distribution `{1:12, 2:13, 3:9, 4:4, 5:8, 10:2}` — low-ticket
  digital goods, so browsing speed and cart friction matter more than merchandising depth.
- All 48 `imagen_url` point to `dunb17ur4ymx4.cloudfront.net` (Tebex CDN).
- Image formats are mixed: png 35, jpeg 9, jpg 3, gif 1.
- Description length 491–1432 chars, avg 819 → needs truncation on cards, full text on
  detail view.
- Category counts: Alimento 13, Artefactos Mágicos 9, Bosque de las Ninfas 8, Armería de
  Aventurero 6, Emboscada 5, Cofres/Ofertas 3, and 4 single-product categories
  (RESUCITACIÓN, Yokai Coins, Mascotas, Armería De Héroe).

### Data defects that must be fixed during normalization

- JSON text is **accent-stripped** (`seleccion`, `disenadas`) while the sibling
  `categoria.txt` files carry correct accents. `.txt` is the copy source of truth.
- Category names drift between JSON and disk (`RESUCITACIÓN` vs folder `RESUCITACION`;
  `Cofres/Ofertas` vs `Cofres_Ofertas`).
- Product names contain double spaces (`Bolsa  de 10 Yokai`).
- Only 4 of 10 categories have a banner image.

---

## Assets (first-party, verified by parsing)

Source root: `G:\マイドライブ\YOKAI HARDCORE`

| Asset | Verified content | Use |
|---|---|---|
| `BOSSES/tlaloc.zip` → `tlaloc.bbmodel` | 110 cubes, 660 faces, Blockbench format 4.0, resolution 128×128, 2 textures (`tlaloc.png` base + `tlaloc_e.png` emissive), 10 animations | **Hero 3D model** |
| `tlaloc_sacrifice.bbmodel` | second Blockbench model | secondary scene |
| `tlaloc_hat.json` / `tlaloc_staff.json` | 3D item models, 64×64, full `display` block | 3D item previews |
| `tlaloc_staff_e.png` etc. | 64×64 emissive texture maps | emissive pass |
| `EdelWeiss.zip` → `IcePalace.schematic` | gzip → 8.5 MB NBT, legacy MCEdit | voxel backdrop |
| `tlaloc.zip` → `arenaTlalocBoss.schem` | gzip → 954 KB NBT, WorldEdit w/ palette | voxel backdrop |
| `TIENDA/*/info.txt`, `categoria.txt` | accented copy source | catalog text |
| `TIENDA/*/imagen.{png,jpeg,gif}` | raster fallbacks when CDN is unreachable | offline fallback |
| `MULTIMEDIA/imagenes/yokai_1.png` | 1.87 MB hero render | hero imagery |

### Critical parsing detail

`tlaloc.bbmodel` contains hitbox bones named `ob_tlalochitbox`, `ob_tlalochitbox2`,
`ob_tlalochitbox3`, plus a root `hitbox` bone. **These must be excluded from rendering.**
They are collision volumes, not geometry. Failing to filter them produces visible
artifact cubes.

Animation keyframe data is stored as an **object keyed by time**, not an array. Naive
`Object.values(...).length` counting returns 0 keyframes and silently produces a static
model.

---

## TDD and checks

- **Effective TDD: OFF.** Source: no existing project/session configuration; new project.
  Disclosed rather than assumed.
- **Test runner**: Angular CLI default (Vitest/Karma per Angular 22 default) — to be
  confirmed by the scaffolder against the actual generated project, then recorded here.
- Unit tests are still **required** where logic is non-trivial and regression-prone:
  catalog normalization (accents, slugs, dedupe), cart totals/discounts, price formatting,
  i18n key completeness, and bbmodel parsing math (UV mapping, hitbox filtering).
- Per-task functional check: `npm run build` must succeed; `npm test` must pass for
  touched logic.
- No visual-DOM snapshot testing for the 3D canvas (unstable); test the parser and the
  scene-graph builder as pure functions instead.

---

## Authorized scope

- Create and write to `C:\Users\kuuro\dev\yokai-hardcore-store` (new repo).
- **Read-only** access to `G:\マイドライブ\YOKAI HARDCORE` and to the extracted temp copies.
- Copying assets out of Drive into the repo is authorized.
- `gh` operations are authorized for reading the profile; creating/pushing the remote is a
  user decision, not automatic.

---

## Task list

| ID | Task | Route | Trigger | Status |
|---|---|---|---|---|
| T1 | Scaffold Angular 22 project, git init, tooling, strict TS, base folder structure | Delegated writer | Write rule (many files) | pending |
| T2 | Asset pipeline: copy assets out of Drive, generate normalized `catalog.json` (ids, slugs, accented copy, image fallbacks) + unit tests | Delegated writer | Write rule + preparation trigger | pending |
| T3 | three.js core: `.bbmodel` parser → three.js scene (bone hierarchy, UV mapping, hitbox filtering, emissive layer) + unit tests | Delegated writer | Write rule | pending |
| T4 | Minecraft item model renderer (model JSON + texture → 3D preview), incl. vanilla item models | Delegated writer | Write rule | pending |
| T5 | Catalog UI: shell/layout, home, category browse, search, filters, product cards | Delegated writer | Write rule | pending |
| T6 | Product detail view + 3D preview integration | Delegated writer | Write rule | pending |
| T7 | Cart + demo checkout + persistence | Delegated writer | Write rule | pending |
| T8 | i18n ES/EN/JP + a11y + responsive polish | Delegated writer | Write rule | pending |
| T9 | Hero scene: animated Tlaloc boss + optional voxel backdrop from schematic | Delegated writer | Write rule | pending |
| T10 | Docs: README, ASSETS.md, LICENSES.md, architecture notes | Delegated writer | Write rule | pending |

Dependency order: T1 → T2 → (T3 ∥ T4) → T5 → T6 → T7 → T8 → T9 → T10.

---

## Acceptance criteria

- [ ] `npm run build` succeeds with zero errors on a clean checkout.
- [ ] `npm test` passes for all covered logic.
- [ ] All 48 products render with correct accents and no duplicate/empty entries.
- [ ] Category browse, search and filters work across all 10 categories.
- [ ] Product detail shows a working interactive 3D preview where a model exists.
- [ ] The Tlaloc boss renders with visible bone hierarchy and at least `idle` animation
      playback, with **no hitbox cubes visible**.
- [ ] Cart persists across reloads and totals are arithmetically correct.
- [ ] ES/EN/JP switch without missing keys.
- [ ] No asset is loaded from `G:\` at runtime — everything is copied into the repo.
- [ ] `ASSETS.md` and `LICENSES.md` document every third-party asset.
- [ ] Repo is public-ready: README with screenshots, no secrets, no PII.

---

## Delivery

- **Delivery strategy**: `ask-on-risk` (default).
- **Chain strategy**: not yet chosen — will be asked if the forecast exceeds ~400 authored
  changed lines.
- **Forecast**: this feature will substantially exceed 400 authored lines. Expect chained
  PR slices, one per task group.
- **Slice plan** (draft, to be confirmed with the user before the first push):
  1. scaffold + asset pipeline + catalog
  2. three.js 3D core
  3. catalog UI + detail + cart
  4. i18n + hero scene + docs

---

## Progress log

| Date | Task | Evidence | Check result |
|---|---|---|---|
| 2026-10-17 | Recon + audit | Parsed bbmodel (110 cubes, 10 anims), item models, both schematics; audited 27 repos vs README badges | read-only, no build |

---

## Verification evidence

_(filled per task as work completes)_

---

## Next step

T1 — scaffold the Angular project. Must confirm Angular 22's actual default test runner
before recording the check command in this document.
