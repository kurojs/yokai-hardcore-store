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

### Data defects — CORRECTED by T2 recon

The claims originally recorded here were measured against the source during T2 recon.
**Three of the four were false, and the fourth was only partly right.** They are kept below
with their corrections rather than deleted, because the same misreading would otherwise be
repeated by a later task.

> Note on how the false claims arose: the original recon printed the source JSON through the
> Windows PowerShell console with a broken output encoding, which silently dropped accented
> glyphs. The file was never accent-stripped — the *terminal* was. Never trust PowerShell's
> rendering of non-ASCII output; read source files with a UTF-8-aware reader.

- **FALSE — "JSON is accent-stripped; `.txt` is the copy source of truth."** All 48
  `info.txt` descriptions are **byte-identical** to the JSON `descripcion`, and the JSON
  already carries accents in 48/48 `descripcion` and 48/48 `descripcion_categoria`.
  `disenadas` and `Legion` occur **0** times (actual: `diseñadas` ×4, `Legión` ×16).
  `.txt` cannot repair the copy because it holds the same bytes. It *is* still the source
  for the structured header (name / price) and a cross-check that fails loudly on a price
  disagreement.
- **FALSE — "category names drift between JSON and disk."** The folder **is**
  `RESUCITACIÓN` (U+00D3) and **does** carry the accent in `Artefactos Mágicos`. The only
  real drift is the separator: JSON `Cofres/Ofertas` vs folder `Cofres_Ofertas`.
- **FALSE — "only 4 of 10 categories have a banner."** Measured: **7 of 10**.
- **Additional finding — every product does have an image.** (This was never an original
  claim; recorded because it was checked.) All 48 product folders carry an `imagen.<ext>`,
  so 0 products fall back to the JSON copy.
- **TRUE — product names contain double spaces** (4 products).
- **TRUE, not previously recorded** — 1 JSON name carries literal quotes
  (`Cupón de Invocación "Todo Está Pegajoso"`) that the folder name does not.
- **TRUE, not previously recorded** — 7 words are written without a mandatory accent, and
  only ever inside product/category **names**.

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
| `TIENDA/*/info.txt`, `categoria.txt` | copy source for the structured header (name / price); descriptions are byte-identical to the JSON | catalog header + price cross-check |
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
- **Test runner (confirmed, not assumed)**: **Vitest 5.0.5** through the
  `@angular/build:unit-test` builder, jsdom environment. Script: `npm test` (that is,
  `ng test`). Non-watch invocation is `npm test -- --watch=false`; `ng test` has **no**
  `--run` flag (that is raw Vitest syntax), and `--watch` only defaults to true in a TTY.
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
| T1 | Scaffold Angular 22 project, git init, tooling, strict TS, base folder structure | Delegated writer | Write rule (many files) | **done** (2026-10-17, `eb9106d`) |
| T2 | Asset pipeline: copy assets out of Drive, generate normalized `catalog.json` (ids, slugs, accented copy, image fallbacks) + unit tests | Delegated writer | Write rule + preparation trigger | **done** (2026-10-17, `b283dd5` `c23504a` `db9d2ec`) |
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
| 2026-10-17 | T1 scaffold | Commit `eb9106d`, 30 files. Parent re-ran `npm run build`: exit 0, `main-TL6EBTF6.js` 216.88 kB raw / 59.61 kB transfer | build PASS, `npm test -- --watch=false` PASS (2/2) |
| 2026-10-17 | T2 pipeline | Commits `b283dd5` (strict TS, `src/assets` removed), `c23504a` (sync pipeline + 70 public files + 3 data inputs), `db9d2ec` (catalog generator + `data/catalog.json`). 3 recon corrections recorded above | `npm test -- --watch=false` PASS 124/124, `npm run build` PASS, `catalog:verify` PASS, determinism PASS |

---

## Verification evidence

### T1 — scaffold (commit `eb9106d`)

Independently reproduced by the parent, not taken from the writer's report:

| Check | Command | Observed |
|---|---|---|
| Build | `npm run build` | exit 0; `main-TL6EBTF6.js` 216.88 kB raw / 59.61 kB transfer |
| Tests | `npm test -- --watch=false` | exit 0; 2 tests passed (generated `app.spec.ts`) |
| Branch | `git branch --show-current` | `feat/yokai-hardcore-store` |
| Own repo | `git rev-parse --show-toplevel` | `C:/Users/kuuro/dev/yokai-hardcore-store` (not the home repo) |
| Clean tree | `git status --short` | empty |
| No remote | `git remote -v` | empty |
| Zoneless | grep `zone.js` in `package.json` | 0 matches; no `polyfills` entry in `angular.json` |

Risk assessment (`gentle-ai review assess --base-ref <empty-tree> --committed-only`):
`medium`, reason `executable_change`, 30 paths / 8287 lines. RDD is **off** (decided by
global), so no review lifecycle was started and the tier was used for verification depth
only. Writer self-verified plus a parent spot check re-running the reported build.

### T2 — asset pipeline + catalog (commits `b283dd5`, `c23504a`, `db9d2ec`)

| Check | Command | Observed |
|---|---|---|
| Asset copy | `node scripts/sync-assets.mjs` | exit 0; 72 files / 10.92 MB; 10 categories, 48 products, 7 banners, 0 products without a local image, 0 copy fallbacks |
| Idempotent re-run | `node scripts/sync-assets.mjs` | exit 0; `copied 0, unchanged 72` — clean `git status`, no diff |
| Catalog build | `node scripts/build-catalog.mjs` | exit 0; 48 products / 10 categories; 48 local images; 0 fallbacks; 0 residual accent tokens; 0 double-space defects |
| Determinism | build twice, compare `Get-FileHash` | identical SHA-256 `6DC51E6E54BE2630FE1700E6806747ED5E7942E757FAFFD6262A511D91778D08` |
| Staleness gate | `npm run catalog:verify` | exit 0; **negative control** (catalog mutated to `schemaVersion: 99`) exits **1**, so the gate is not a no-op |
| Tests | `npm test -- --watch=false` | exit 0; 6 files, **124/124** tests passed |
| Build | `npm run build` | exit 0; `main-TL6EBTF6.js` 216.88 kB raw / 59.61 kB transfer |
| Contract assertions | Node assertion script over `data/catalog.json` | exit 0; **26/26** — 48 products, 10 categories, non-empty id/slug/name, unique slugs and ids, no double spaces, 0 accent-stripped tokens, 22 accented glyphs present |
| Asset integrity | `git hash-object` vs `git rev-parse HEAD:<path>` for all 73 tracked `public/` + `data/` files | **0 mismatches** — `core.autocrlf=true` did not touch the binary or JSON bytes |
| Serving paths | resolve every `localImage` / `bannerImage` under `dist/` | **0 missing** — the catalog's root-relative paths are directly usable as `<img src>` fallbacks |

RDD is **off** (decided by global), so no review lifecycle was started. Writer
self-verified; the parent owns the independent check.

#### Parent independent verification (performed, not inherited from the writer)

The parent re-ran the checks and additionally re-derived the accent question from the raw
source, because the writer's report contradicted the feature doc on a data premise:

| Check | Command | Observed |
|---|---|---|
| Tests | `npm test -- --watch=false` | exit 0; **6 files, 124/124 passed** (reproduced independently) |
| Commits | `git log --oneline -5` | `db9d2ec`, `c23504a`, `b283dd5`, `eb9106d` all present |
| Staleness gate | `npm run catalog:verify` | exit 0; 48 products, 10 categories, 48 local images, 0 fallbacks, 0 residual accent tokens, 0 double-space defects |
| **Data premise re-derivation** | `descripcion_categoria` vs `categoria.txt`, all 10 | **identical in 10/10** — the original "JSON is accent-stripped" claim is **confirmed false** |
| **Data premise re-derivation** | `descripcion` vs `info.txt` | **identical in 47/47 matched** — confirms the writer |
| Category accents | generated `categories[].description` | `accentInGenerated=true` for **10/10** |
| `expedicion` suspicion | substring match on generated catalog | **false positive** — the 4 hits are `expediciones`, which correctly carries **no** accent in the plural. There is no defect. |
| Name accents | all 48 names + 10 category names | `Cupón Legión De Saqueadores`, `Cáliz de Ponce de León`, `Testículos De Calamar`, `Piedra De Fénix`, `Corazón De Hydra`, `Hongo Ojón`, `Amuleto del Clérigo`, `Células De Kaiyin` — **0 unaccented occurrences remaining** |
| Over-correction guard | accent-free words in the catalog | none corrupted. Proper nouns deliberately preserved: `Ricky Ricon` was **not** "corrected" to *Rincón*, and `Flow del END` was left verbatim |

**Conclusion**: the writer's recon correction was right on all three points it disputed, and
its refusal to build a speculative accent-repair layer over the `.txt` files was correct
engineering judgment — the `.txt` files hold the same bytes, so that layer would have had
nothing to fix. Only the feature doc's own accounting was wrong, and has been corrected.

**One content change to be aware of**: the generated name drops the literal quotes from the
JSON original `Cupón de Invocación "Todo Está Pegajoso"` → `Cupón de Invocación Todo Está
Pegajoso`. Reviewed and accepted: quotes are not useful in a product display name, and the
slug is unaffected.

**Test placement constraint**: the `@angular/build:unit-test` builder resolves its
`include` globs relative to `sourceRoot` (`src`), so tooling specs cannot live next to the
modules. They live in `src/tooling/*.spec.ts` and import across the boundary into
`scripts/lib/*.mjs`. `tsconfig.spec.json` sets `allowJs`, adds the `node` ambient types,
and includes `scripts/**/*.mjs` so the JSDoc types resolve.

**Vite gotcha found here**: `new URL('../../', import.meta.url)` is statically rewritten by
the Vite/Vitest transform into an asset URL (`http://localhost:3000/@fs/...`), which
`fileURLToPath` rejects with *"The URL must be of scheme file"*. The specs derive the repo
root via `path.dirname(fileURLToPath(import.meta.url))` instead. `scripts/*.mjs` run under
plain Node, where the `new URL(...)` form is correct and was kept.

---

## Resolved decisions

- **RESOLVED in T2 — runtime assets live in `public/`, not `src/assets/`.** Angular 22
  serves runtime assets from the generated `assets` glob, which already reads `public/`.
  The scaffold created `src/assets/` but never wired it into `angular.json`, so it was dead
  weight and has been **deleted** in `b283dd5`. All 70 runtime files live under `public/`,
  and `npm run build` copies every one of them into `dist/` (verified). There is exactly one
  asset location.
- **RESOLVED in T2 — TypeScript strictness is declared, not inherited.** `b283dd5` adds
  explicit `strict: true` and `strictTemplates: true` to `tsconfig.json`. T1's probe had
  confirmed these were already the effective defaults, and both `tsc` and `ng build` stayed
  green with the keys added and no source change.
- **Catalog paths are served root-relative, not repo-relative.** `localImage` /
  `bannerImage` are `/products/<id>/imagen.png` and `/categories/<id>/banner`, so they work
  directly as an `<img src>` fallback. A repo-relative `public/...` path would 404 in the
  browser, which defeats the point of recording a fallback at all.
- **`data/source-index.json` is committed.** `sync-assets` generates it and `build-catalog`
  reads it, so committing it keeps the catalog reproducible from a clean checkout without
  the source drive.
- **LF is pinned for `data/` and `scripts/` via `.gitattributes`.** `core.autocrlf=true`
  (the Git-for-Windows default) would otherwise check the generated catalog out as CRLF on a
  fresh clone, breaking `catalog:verify` and the byte-for-byte reproducibility spec.
- **`ng new` and a non-empty directory**: the scaffolder generated into a temp dir with
  `--skip-install --skip-git` and moved the contents in, then ran `git init` in the target.
  This was required because the target sits inside the existing `C:\Users\kuuro` repository.
- **Zoneless needed no manual wiring** in Angular 22.2.3: `--zoneless=true` is accepted and
  `app.config.ts` contains neither `provideZoneChangeDetection` nor
  `provideZonelessChangeDetection`.

---

## Next step

T3 and T4 are now unblocked and independent of each other:

- **T3** — three.js core: `.bbmodel` parser → three.js scene (bone hierarchy, UV mapping,
  hitbox filtering, emissive layer) + unit tests.
- **T4** — Minecraft item model renderer (model JSON + texture → 3D preview).

**Open product decision carried from T2**: `modelPath` is `null` for all 48 products.
The 4 item models in the repo (`tlaloc_hat`, `tlaloc_staff`, `netherite_sword`, `paper`) are
boss-encounter assets with no catalog counterpart, and `ITEM_MODEL_ALIASES` ships empty by
design rather than guessing a mapping from name similarity. Deciding which models should
map to which products (if any) is a product decision, not an engineering one. Until it is
answered, product detail pages must degrade gracefully to the 2D image.
