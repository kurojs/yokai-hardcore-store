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

> **CORRECTED in T3 — this claim is FALSE for this asset.** Measured over the file:
> `animators[uuid].keyframes` is an **array** in **157 of 157** animators, holding **789**
> keyframes; `channel` is a **string** (`"position"` 73, `"rotation"` 716, never
> `"scale"`), not a numeric index; every `data_points` array has length 1. The
> "23 channels / 0+1+2" reading came from a different set of facts (max keyframes per
> animator = 23, and the first animator's keyframe times = 0, 1.5, 3), not from channel
> indices. `parse.ts` still accepts a timestamp-keyed object form defensively, because a
> wrong shape guess here would silently freeze the model — but the real file never uses it.

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
| T3 | three.js core: `.bbmodel` parser → three.js scene (bone hierarchy, UV mapping, hitbox filtering, emissive layer) + unit tests | Delegated writer | Write rule | **done** (2026-10-18, `345f4df` `b9d22f5` `b31d087`) |
| T3b | Add the missing regression test for keyframe time ordering (43% of real channels depend on an untested `.sort()`); test-only change | Delegated writer | Write rule | **done** (2026-10-18, `974a1f3`) |
| T4 | Minecraft item model renderer (model JSON + texture → 3D preview), incl. vanilla item models | Delegated writer | Write rule | **done** (2026-10-18, `d910440`; vanilla item models deferred, see open items) |
| T5 | Catalog UI: shell/layout, home, category browse, search, filters, product cards | Delegated writer | Write rule | **done** (2026-10-19, `87e641d` `081d446` `330d4c4` `1800b73` `1a3a77e` `5a41c0b` `aa6ad8f`) |
| T6 | Product detail view, image-first (no 3D on SKUs) + cart core + shell count | Delegated writer | Write rule | **done** (2026-10-19, `bddadc5` `f264421` `8d1553e` `22fa58c` `fe41acc` `63462bb`) |
| T7 | Cart page, demo checkout and the header link | Delegated writer | Write rule | **done** (2026-10-19, `373002f` `bedf8fc` `dbe9180` `0004c22` `54ae53c`) |
| T8 | i18n ES/EN/JP + a11y + responsive polish | Delegated writer | Write rule | pending |
| T9 | Landing decorative 3D: animated Tlaloc plus **procedurally generated** voxel decoration (downloads rejected, see T9 section) | Delegated writer | Write rule | **done** (2026-10-19, `95f90b3` `065eb55` `a6799a0`) |
| T10 | Docs: README, ASSETS.md, LICENSES.md, architecture notes | Delegated writer | Write rule | pending |

Dependency order: T1 → T2 → (T3 ∥ T4) → T5 → T6 → T7 → T8 → T9 → T10.

---

## Acceptance criteria

- [x] `npm run build` succeeds with zero errors on a clean checkout. (green on the branch since
      T5; a truly clean clone is still unverified because nothing has been pushed)
- [x] `npm test` passes for all covered logic. (37 files, 525/525)
- [x] All 48 products render with correct accents and no duplicate/empty entries. (catalog grid
      renders 48 cards in jsdom; accents live in the validated data, not in the UI)
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

- **Delivery strategy**: `ask-on-risk`.
- **Chain strategy**: **`stacked-to-main`** — chosen by the user on 2026-10-17 after the
  authored-line count exceeded the ~400 budget. Each slice merges to `main` in order.
- **Honest note on why chained PRs are wanted here**: this is a single-developer portfolio
  repository with **no human reviewer**. The value of slicing is therefore *reviewable
  history and workflow discipline*, not protecting a reviewer from a wall of diff. Slice
  boundaries should be drawn so each PR reads as one coherent capability.
- **Forecast**: will substantially exceed 400 authored lines. Slices are chained.
- **Measured reality (2026-10-18, `git diff --shortstat $(git rev-list --max-parents=0 HEAD) HEAD`)**:
  130 files, **13,641 insertions / 71 deletions** in total; excluding `public/`, the generated
  `data/catalog.json` and the `data/catalog.source.json` provenance copy, **59 files,
  11,595 insertions / 71 deletions are authored**. By area: `src/app/three` 8,238,
  `scripts` 1,554, `src/tooling` 1,052, `data/catalog.json` 673 (generated), `public` 987.
  Every slice is therefore far over the 400-line heuristic, and PR 2 in particular is ~8.4k
  authored lines. **This is a known, accepted property of the plan, not an oversight** — see the
  honest note above. It is recorded here so the number is visible before any PR is opened, and
  because nothing has been pushed yet the commits can still be reorganised at that point if a
  smaller PR 2 is wanted.
- **Slice plan** (commits are grouped into these PRs in order):

  | PR | Contents | Tasks | Authored lines |
  |---|---|---|---|
  | 1 | Scaffold + asset pipeline + normalized catalog | T1, T2 | ~3.2k |
  | 2 | three.js core: bbmodel parser + item model renderer | T3, T3b, T4 | ~8.6k |
  | 3 | Catalog UI, product detail, cart + checkout | T5, T6, T7 | T5 built (7 work-unit commits + doc, see the T5 section); T6/T7 pending |
  | 4 | i18n, hero scene, docs | T8, T9, T10 | not yet built |

- **PR creation is NOT yet authorized.** No remote exists and nothing has been pushed.
  `branch-pr` and `chained-pr` are resolved by registry name when the user decides to push:
  - `C:\Users\kuuro\.claude\skills\chained-pr\SKILL.md`
  - `C:\Users\kuuro\.claude\skills\branch-pr\SKILL.md`

---

## Progress log

| Date | Task | Evidence | Check result |
|---|---|---|---|
| 2026-10-17 | Recon + audit | Parsed bbmodel (110 cubes, 10 anims), item models, both schematics; audited 27 repos vs README badges | read-only, no build |
| 2026-10-17 | T1 scaffold | Commit `eb9106d`, 30 files. Parent re-ran `npm run build`: exit 0, `main-TL6EBTF6.js` 216.88 kB raw / 59.61 kB transfer | build PASS, `npm test -- --watch=false` PASS (2/2) |
| 2026-10-17 | T2 pipeline | Commits `b283dd5` (strict TS, `src/assets` removed), `c23504a` (sync pipeline + 70 public files + 3 data inputs), `db9d2ec` (catalog generator + `data/catalog.json`). 3 recon corrections recorded above | `npm test -- --watch=false` PASS 124/124, `npm run build` PASS, `catalog:verify` PASS, determinism PASS |
| 2026-10-18 | T3 three.js core | Commits `345f4df` (parser/scene/clips), `b9d22f5` (6 spec files + fixtures), `b31d087` (viewer + `/dev/model`). Corrected the false keyframe-shape claim above; measured 337 mirrored faces, 485 numeric-string axes, 6 rotated faces | `npm test -- --watch=false` PASS 211/211 (124 pre-existing), `npm run build` PASS, `catalog:verify` PASS, headless end-to-end + mixer PASS |
| 2026-10-18 | Parent verification of T3 | Re-derived hitbox truth, 789 keyframes / 167 groups and motion variance from the raw JSON, no reuse of the writer's parser. All four writer claims matched exactly. Found the untested time sort (**72 of 167 channels, 43%, arrive out of order**) | read-only; recorded as T3b |
| 2026-10-18 | T3b + T4 | Commit `974a1f3` (T3b, test-only: 2 spec files) and `d910440` (T4: `itemmodel/` module, `item-model-viewer.ts`, shared `preview-host.ts`, `/dev/items`) | `npm test -- --watch=false` PASS **350/350** (19 files), `npm run build` PASS, parent re-ran both; `/dev/model` and `/dev/items` both serve 200 |
| 2026-10-18 | Parent verification of T4 | Independent Rodrigues-matrix implementation (not quaternions) reproduced all four bounds to the written precision; PNG decode + painted-texel sampling settled the UV-space question empirically | read-only; see T4 section |
| 2026-10-19 | T5 / 1 of 4 — pure core + catalog data access | Commits `87e641d` (price formatter, `foldForSearch`, UI text table), `081d446` (boundary validation), `330d4c4` (derived index + query predicates), `1800b73` (served-asset loader, `resource`-backed root `CatalogStore`, `data` asset entry in `angular.json`, spec-only fixtures behind a `tsconfig.app.json` exclude) | `npm test -- --watch=false` PASS 475/475 at `1800b73`, `npm run build` PASS, `dist/…/browser/data/catalog.json` present (68,481 bytes) |
| 2026-10-19 | T5 / 2 of 4 — presentation primitives | Commit `1a3a77e`: design tokens in `styles.scss`, `price` pipe, `ProductCard`, `CategoryCard`, `productCountLabel` | PASS 494/494, build PASS, no `anyComponentStyle` warning |
| 2026-10-19 | T5 / 3 of 4 — shell + landing page | Commit `5a41c0b`: shell in `app.*`, `features/home/` with `selectFeatured`, component input binding + scroll restoration, Spanish `index.html`, `**` fallback | PASS 509/509, build PASS |
| 2026-10-19 | T5 / 4 of 4 — catalog slice | Commit `aa6ad8f`: `features/catalog/` page, filter bar, routes, `/catalog/:slug` | PASS **525/525** (37 files), build PASS, `catalog:verify` PASS, dev-server route matrix PASS |
| 2026-10-19 | Parent verification of T5 | Re-derived independently from `data/catalog.json` and the built bundle, not from the writer's report. Confirmed: the catalog is **globally alphabetical and NOT grouped by category** (the writer's correction against my brief was right — a "featured" spread sliced from the top would have been wrong); `mascotas` = 1 product (`CUPÓN CANJEABLE PARA FAMILIAR`, $5); `priceUsd <= 2` = 25 products; **48/48** products carry accents or `¡`/`¿`; `bannerImage` is null for exactly 3 categories (`mascotas`, `armeria-de-heroe`, `resucitacion`), which is also 3 of the 4 single-product categories; all 10 `productCount` values match the real counts. Bundle has **0** matches for `cloudfront` / `dunb17ur4ymx4` / `G:\`. `searchTextFor` really routes name+description+category through `foldForSearch`; `ProductCard` has no `routerLink`/`href`. Re-ran the suite (525/525) and the build (exit 0) myself | read-only; the writer's 5-commit table understated its own range — there are 7 work-unit commits plus the doc commit |
| 2026-10-19 | T6 — cart core + product detail | Commits `bddadc5` (pure cart domain, signal store, persistence adapter), `f264421` (lossless description structure), `8d1553e` (quantity stepper + add-to-cart), `22fa58c` (product slice + related rule), `fe41acc` (grid/landing card links), `63462bb` (non-navigating shell count) | `npm test -- --watch=false` PASS **661/661** (46 files), `npm run build` PASS at 269.68 kB initial / 75.23 kB transfer with `product-page` lazy at 14.57 kB, `catalog:verify` PASS, no budget warning |
| 2026-10-19 | Parent verification of T6 | **Corrected my own brief**: it claimed descriptions carry line breaks and structural blocks separated by newlines. Measured: **0 of 48 descriptions contain CR or LF**. The structure is inline labels only (`Cantidad:` in 30 products, `Efectos Temporales:` in 17), and the writer was right to replace the line splitter with a lossless label heuristic. Also confirmed: `cofre-de-runas` genuinely has no colon label (504 chars, one block); the single-product `mascotas` slug is `cupon-canjeable-para-familiar`; `data/`, `public/`, `scripts/`, `src/tooling/`, `src/app/three/` untouched; **no `/cart` route**; **no `three/` import** in the cart or product code. The writer's self-reported "three accent-less strings in `catalog-page.ts`" does **not** exist — grep finds only the correctly accented `Cargando el catálogo…`, so that uncertainty was noise, not a defect. Re-ran the suite (661/661) and the build myself | read-only; the deleted temporary persistence spec was redundant — `cart-persistence.spec.ts` permanently covers 27 cases of the same matrix |
| 2026-10-19 | T7 — cart page, demo checkout, header link | Commits `373002f` (cart line views + one shared `OrderSummary`), `bedf8fc` (cart page), `dbe9180` (demo checkout), `0004c22` (header link), `54ae53c` (Prettier normalization) | `npm test -- --watch=false` PASS **714/714** (54 files), `npm run build` PASS at 272.48 kB initial / 76.14 kB transfer with `cart-page` 7.92 kB and `checkout-page` 11.70 kB lazy, `catalog:verify` PASS, no budget warning |
| 2026-10-19 | Parent verification of T7 | **Second brief correction, and a bigger one than T6.** The brief said every product image is `/products/<slug>/imagen.png`. Measured across the real catalog: **35 `.png`, 9 `.jpeg`, 3 `.jpg`, 1 `.gif`** — 13 of 48 products would have broken had any code composed the filename. Nothing does: every image comes from `imagePath`/`bannerImage` read out of the catalog, so only a stale comment in `product-page.ts` and a false claim in this document needed fixing (`53f2237` plus the T2 note above). Also verified: checkout has exactly **one** `<input>` and no card/CVV/expiry field anywhere (the only matches for those words are a spec asserting their absence and a comment), `data/`, `public/`, `scripts/`, `src/tooling/`, `src/app/three/` untouched, and re-ran the suite (714/714) and the build myself | read-only; port 4300 was already held by a foreign `ng serve` (PID 2132, not mine), so the writer correctly used 4301 instead of killing it |
| 2026-10-19 | T8 — i18n ES/EN/JA for UI chrome | Commits `0adf6b5` (typed three-language dictionary + `LanguageStore`), `41ac9de` (migrate every consumer, add the switcher). `core/ui-text.ts` deleted; `core/i18n/` replaces it with one strict 95-key `UiText` interface and `Record<Language, UiText>` | `npm test -- --watch=false` PASS **756/756** (57 files), `npm run build` PASS at 290.91 kB initial / 80.59 kB transfer, `catalog:verify` PASS |
| 2026-10-19 | Parent verification of T8 | Verified that the Japanese is authored Japanese, not translated Spanish: `です・ます` register, `点` counter, `パンくずリスト`, `価格の安い順`, full-width `｜` in document titles, no plural forms. Confirmed all 22 accent hits outside the dictionaries are **comments and Spanish-data heuristics** (`description.ts` label rules, `fold.ts` examples, `ui-text-model.ts` doc examples, `app.ts` endonym note), never UI copy. Old `core/ui-text.ts` is gone, so no consumer can bypass the dictionary. Re-ran the suite (756/756) and the build myself | read-only; Japanese copy still needs a native reviewer before release |
| 2026-10-19 | T9 — decorative landing scene | Commits `95f90b3` (seeded voxel island + motion policy), `065eb55` (render the diorama with the Tlaloc boss), `a6799a0` (mount after the hero renders) | `npm test -- --watch=false` PASS **792/792** (63 files), `npm run build` PASS at 291.33 kB initial / 80.69 kB transfer, `landing-scene` lazy 11.03 kB, three.js still a separate lazy 588.55 kB chunk, no budget warning |
| 2026-10-19 | Parent verification of T9 | Confirmed from `dist/index.html` that **three.js is not preloaded**: the only `modulepreload` is the 147 kB framework chunk, so the 588.55 kB three.js chunk really is reachable only from the landing scene and the two dev routes. Confirmed the hero carries real content (`h1`, lead, two actions, stats, all 10 category cards, featured grid) **outside** the `aria-hidden` scene panel, which reserves its space in CSS so the canvas cannot shift layout. Confirmed **zero new binaries under `public/`** — nothing was downloaded. Motion policy read and verified: `paused` if hidden or off-screen, `still` if reduced-motion, `animate` only when all three allow it, and reduced motion renders one still frame instead of deleting the art. Re-ran the suite (792/792) and the build myself | read-only; **no rendered frame has ever been seen** — jsdom has no WebGL, so framing, exposure, fog, scale and canopy/tail clearance are unverified judgement |

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

### T3 — three.js core (commits `345f4df`, `b9d22f5`, `b31d087`)

| Check | Command | Observed |
|---|---|---|
| Tests | `npm test -- --watch=false` | exit 0; **12 files, 211/211** — the 124 pre-existing tests still pass, 87 are new across 6 files |
| Build | `npm run build` | exit 0; initial 236.50 kB raw / 66.29 kB transfer; lazy `bbmodel-viewer` chunk 598.07 kB / 127.12 kB |
| Catalog gate untouched | `npm run catalog:verify` | exit 0; 48 products, 10 categories, 48 local images, 0 residual accent tokens |
| Headless end-to-end | esbuild bundle of `createBbModelScene` over the real asset, plain Node | 110 source cubes = 106 rendered + 4 hitbox + 0 hidden; 18 bones; 10 clips; 167 tracks; 789 keyframes; 2 textures, emissive index 1 |
| Hitbox truth | independent recursive walk of the raw JSON | 4 cubes under `ob_tlalochitbox`, `ob_tlalochitbox2`, `ob_tlalochitbox3`, `hitbox` — equals the parser's count |
| Animation actually moves | `AnimationMixer` + `idle` at t=1.5 s | root bone `[2.55, 45.15, 1]`, `moved: true` |
| Disposal | after `scene.dispose()` | root children 0; each texture disposed once (a double-dispose was found and fixed) |
| Dev route wiring | `ng serve --port 4300` + HTTP requests | `/dev/model` 200; `/models/bosses/tlaloc.bbmodel` 200 / 226,032 bytes; `/dev/models/...` returns the HTML fallback, which is why the URL must be root-absolute |

Facts re-derived from the file while writing the specs (the source comments cite them):

- **337 of 660 faces** are authored with `uv[0] > uv[2]` and must stay mirrored — not 6. The
  6 faces that carry a UV `rotation` (1 × 90°, 5 × 270°) are a different set.
- **485 of 789 keyframes** carry at least one numeric-string axis (`"0"`), not 340.
- Interpolation: `catmullrom` 554, `linear` 235, no `step`.
- `format_version` 4.0; resolution 128×128; textures `tlaloc.png` + `tlaloc_e.png`.

**Not verified here**: the WebGL presentation itself. jsdom has no WebGL context, so the
component's renderer path is covered only by a successful production build and by the HTTP
check above; visual confirmation needs a browser.

#### Parent independent verification (T3)

Re-derived from the raw `.bbmodel` in plain Node, with no reuse of the writer's parser, so the
numbers below are an independent measurement rather than a restatement:

| Check | Method | Observed | Matches writer? |
|---|---|---|---|
| Hitbox truth | recursive walk of the raw `outliner` | 4 collision bones (`ob_tlalochitbox` @ `/tlaloc/body_all`, `ob_tlalochitbox2` @ `/tlaloc/leg1`, `ob_tlalochitbox3` @ `/tlaloc/leg2`, `hitbox` @ root) holding **4 cubes**; 106 renderable; 4 + 106 = 110 = total elements | **yes, exactly** |
| Rendered bones | 22 outliner bones minus 4 hitbox subtrees | **18** | yes |
| Keyframe volume | sum of every animator's keyframes across all 10 clips | **789** keyframes, **167** bone+channel groups | **yes, exactly** (`789`, `167`) |
| Substring filter safety | list every bone name matching `/hitbox/i` | 4 of 22 match, and **no visible bone contains `hitbox`** — so `/hitbox/i` has no false positive on this asset | consistent with their documented rationale |
| Does it actually move? | per bone+channel, compare every keyframe value against the first | **145 of 167 groups (87%) vary** — it is not a statue. `idle` at t=0/1.5/3: `tlaloc`.position y `23→17→23`, `head`.rotation x `10→-15→10`, `hand1`.rotation z `35→62.5→35`, `leg1`.rotation z `20→22.5→20` | yes, and stronger evidence than their `AnimationMixer` probe |
| Their offset-semantics evidence | find position channels whose first key is `[0,0,0]` | exactly four: `death/staff`, `death_ground/staff`, `spawn/body_all`, `spawn/loincloth0` — **the four bones their comment names** | yes, the cited evidence is accurate |

#### Known gap found by this verification — the time sort is untested

The writer's own README documents the keyframe-shape and UV traps but **does not mention key
ordering at all**, and no spec covers it:

- **43% of real channels arrive out of order.** 72 of the 167 bone+channel groups store their
  keyframes with non-ascending `time` (e.g. `tlaloc_basic_spell/tlaloc.rotation` is stored as
  `[0.4, 0, 0.65, 1.3]`; `tlaloc_basic_spell/hand1.rotation` as `[0, 0.4, 0.65, 0.55, 1.3, 0.2, 0.95]`).
  70 of 157 animator keyframe arrays are stored out of order.
- `parse.ts` line 588 — `const times = [...frames.keys()].sort((a, b) => a - b)` — is what makes
  those 43% correct. three.js `Interpolant.search()` binary-searches `times` on the assumption
  that it is ascending, so an unsorted array yields wrong interpolation rather than an error.
- **The sort is covered by zero tests.** `parse.spec.ts:310` feeds `time: 0, time: 1` and
  `parse.spec.ts:338` feeds object keys `0, 2` — both already ascending. Deleting the `.sort()`
  today leaves all 211 tests green while silently corrupting 43% of the animation.

This is the highest-value follow-up on T3 and is recorded as `T3b` below rather than fixed
silently here, because a test must be added without touching the code it guards.

### T3b — the time-sort regression test (commit `974a1f3`)

Test-only; `parse.ts` was **not** touched, and the sort was already correct, so nothing failed.

| Check | Command | Observed |
|---|---|---|
| Tests | `npm test -- --watch=false` | exit 0; 19 files, **350/350** |

What was added, and why it is stronger than the fixture I asked for:

- `parse.spec.ts` gains a `describe('keyframe time ordering')` block whose comment records the
  measured rationale (43% of channels non-ascending; three.js `Interpolant.search()`
  binary-searches `times` and assumes ascending order). It sorts a deliberately scrambled array
  **and asserts the full `values` array**, so a "sort" that reorders the times without carrying
  their data points along still fails.
- `tlaloc-asset.spec.ts` gains a **real-asset staleness gate**: it asserts, against
  `tlaloc.bbmodel` itself, that the out-of-order counts are non-zero and that every emitted
  track is ascending. That is a better guard than synthetic fixtures alone — if the asset is
  ever re-exported so the sort stops being load-bearing, the gate says so.

### T4 — Minecraft item model renderer (commit `d910440`)

| Check | Command | Observed |
|---|---|---|
| Tests | `npm test -- --watch=false` | exit 0; **19 files, 350/350** (211 pre-existing all still green, 139 new) |
| Build | `npm run build` | exit 0; initial 238.17 kB raw / 65.02 kB transfer; lazy `item-model-viewer` 19.04 kB, `bbmodel-viewer` 14.48 kB, three.js chunk 584.35 kB |
| Dev routes | `Invoke-WebRequest` on the running dev server | `/dev/model` 200, `/dev/items` 200, `/models/items/tlaloc/tlaloc_hat.json` 200 (16,658 bytes) |
| Shared host refactor | `bbmodel-viewer.ts` −123 lines → `preview-host.ts` (203) | the 211 pre-existing bbmodel tests still pass and `/dev/model` still serves |

#### Parent independent verification of T4

**The rotation and bounds maths is confirmed by a second, independent implementation.** The
writer uses quaternions; I re-derived every number with **Rodrigues rotation matrices** — a
different formulation, so a shared bug would have to occur twice in two different algebras:

| Quantity | Writer's asserted value | My Rodrigues result | |
|---|---|---|---|
| hat, authored corners | 11.88 × 23.05 × 24.82 | `[11.8779, 23.0483, 24.8173]` | ✓ |
| hat, rotation applied | 19.82 × 23.05 × 23.77 | `[19.8175, 23.0483, 23.7669]` | ✓ |
| staff, authored corners | 23.32 × 35.9 × 10.5 | `[23.3217, 35.9026, 10.5]` | ✓ |
| staff, rotation applied | 12.06 × 41.35 × 10.5 | `[12.06, 41.3497, 10.5]` | ✓ |
| hat rotated `min.z` | `-1.2433061219327186` (their spec) | `-1.2433` | ✓ to 9 dp |
| staff rotated `min.y` | `-17.524737587392284` (their spec) | `-17.5247` | ✓ to 9 dp |

Element counts independently confirmed: **29** hat elements, **37** staff elements, every one of
them carrying a rotation, and **zero** elements using the multi-rotation array form — so the
writer's disclosure that the sequence ordering is a documented choice rather than a verified
vanilla behaviour is accurate, not hand-waving.

#### The UV space question, settled empirically

The hat's UVs reach **24** while `ITEM_UV_SPACE` is **16**, which looked like it might address
pixels past the edge of a 64-wide texture. The writer's assumption was checked against the
actual pixels rather than against documentation: I decoded both PNGs from scratch (inflate +
per-scanline un-filtering) and measured, for every face, what fraction of its UV rect lands on
painted texels under each hypothesis.

| Model | UV space 16 (implemented) | UV space = `texture_size` (64) |
|---|---|---|
| `tlaloc_staff` | **83.8%** of faces fully painted; 86.8% mean coverage | **0.0%** fully painted; 0.5% mean coverage |
| `tlaloc_hat` | **71.3%** fully painted; 74.0% mean coverage | 17.2% fully painted; 24.2% mean coverage |

**The implemented convention is correct and the alternative is not close.** Corroborating
independent check: the staff's texture has a painted bounding box of exactly 37×37 px, and
`9.25 / 16 × 64 = 37` — the UVs and the paint agree.

The two out-of-atlas faces are a **defect in the asset, not in the parser**. Exactly two faces,
both `down` on the hat, carry `uv [4.5, 22.5, 3.75, 24]` and `[3.75, 22.5, 4.5, 24]` — a
`v` of 22.5..24 is pixel 90..96 of a 64-tall texture. The parser detects this, reports it as a
non-fatal warning (`2 face(s) sample outside the 64x64 texture and will be clamped`), and
`tlaloc-items.spec.ts` pins both faces and their exact UV values. That is the right behaviour:
warn precisely and keep rendering.

### T5 — catalog UI: shell, landing page, browsing
(commits `1800b73`, `1a3a77e`, `5a41c0b`, `aa6ad8f`)

Four work units, each one leaving the application working end to end:

1. `1800b73` — catalog data access. `data` asset entry in `angular.json`, `catalog-loader.ts`
   (transport and validation failures kept distinct), `resource`-backed root `CatalogStore`,
   spec fixtures behind a `tsconfig.app.json` exclude.
2. `1a3a77e` — presentation primitives. Design tokens in `styles.scss` anchored to `#0b0d12`,
   the `price` pipe, `ProductCard`, `CategoryCard`, `productCountLabel`.
3. `5a41c0b` — shell and landing page. `app.*` (header, skip link, main, footer), the `home/`
   slice with `selectFeatured`, `withComponentInputBinding` + scroll restoration, Spanish
   `index.html`, `**` fallback.
4. `aa6ad8f` — the `catalog/` slice. Page, filter bar, routes, `/catalog/:slug`.

| Check | Command | Observed |
|---|---|---|
| Tests | `npm test -- --watch=false` | exit 0; **37 files, 525/525** — the 350 pre-existing tests are untouched and green, 175 are new |
| Build | `npm run build` | exit 0; initial **258.68 kB raw / 70.27 kB transfer**, `styles` 3.40 kB; lazy `catalog-page` 10.89 kB, `home-page` 8.62 kB, `three` chunk 584.36 kB |
| Budgets | build output | no `initial` and no `anyComponentStyle` warning (limits 500 kB / 1 MB and 4 kB / 8 kB) |
| Catalog asset in dist | `Get-Item dist/…/browser/data/catalog.json` | present, 68,481 bytes, served at `/data/catalog.json` |
| Catalog untouched | `git diff --stat 330d4c4 HEAD -- data public scripts src/tooling` | **empty** — no data, asset or tooling file changed by T5 |
| Catalog gate | `npm run catalog:verify` | exit 0; 48 products, 10 categories, 48 local images, 0 fallbacks, 0 residual accent tokens, 0 double-space defects |
| Dev server routes | `Invoke-WebRequest` on `localhost:4300` | `/` 200 html 640 B, `/catalog` 200, `/catalog/mascotas` 200, `/catalog/no-existe` 200, `/dev/model` 200, `/dev/items` 200, `/no-existe` 200 (SPA fallback) |
| Served catalog | `Invoke-WebRequest /data/catalog.json` | 200 `application/json`, 68,481 bytes |
| Product image | `Invoke-WebRequest /products/10-algodones-de-azucar/imagen.png` | 200 `image/png`, 25,802 bytes |
| Document shell | parse of the served HTML | `lang="es"`, `<title>Yokai Hardcore Store</title>`, `<app-root>` present |
| No CDN, no `G:\` | grep the built `dist/**/*.js` and `*.css` for `cloudfront` / `G:\` | **0 matches** |
| Placeholder contract | count `category-visual--v` in the built CSS | **6** classes, matching `CATEGORY_PLACEHOLDER_VARIANTS` |

Data facts the new specs pin, measured rather than assumed:

- 48 products / 10 categories; category order in the document is `alimento…`,
  `armeria-de-aventurero`, `armeria-de-heroe`, `artefactos-magicos`, `bosque-de-las-ninfas`,
  `cofres-ofertas`, `emboscada-a-jugadores`, `mascotas`, `resucitacion`, `yokai-coins`, but
  **products are ordered alphabetically by name**, not grouped by category.
- `selectFeatured(entries, 4)` therefore yields the first product of
  `alimento…` → `bosque-de-las-ninfas` → `artefactos-magicos` → `armeria-de-aventurero`.
- `mascotas` holds exactly one product, `CUPÓN CANJEABLE PARA FAMILIAR`, at $5.00.
- Price ceilings against the real catalog: `2` → **25 products**, `1` → 12, `3` → 34, `4` → 38,
  `5` → 46, `10` → 48.
- `price-asc` over all 48 runs `$1.00` … `$10.00`; `name-asc` with the `es` collator puts
  `3 Ramen` first because `numeric: true` orders the quantity prefix by value.

**Not verified here**: nobody has looked at the pages in a browser. The dev-server matrix proves
serving and the specs prove rendering into jsdom, but there is no WebGL and no layout engine in
either. No browser tool is connected in this session, so the visual pass is still open — the same
gap T3/T4 recorded.

## Resolved decisions

- **RESOLVED in T5 — the catalog is a served asset, not an imported module.**
  `angular.json` copies `data/catalog.json` to `/data/catalog.json`, and
  `core/catalog/catalog-loader.ts` fetches it with a plain `fetch` wrapped in
  `@angular/core`'s `resource()`. One source of truth with no generated second copy under
  `src/`, and the asynchronous shape Phase 2 needs when the same URL answers from the
  Spring Boot API. `httpResource` was rejected because it lives behind `provideHttpClient`,
  which would add a provider and a dependency the storefront does not otherwise use.
- **RESOLVED in T5 — the catalog is validated at the boundary, never cast.**
  `catalog-validation.ts` returns the app's own types and structurally drops `imageUrl` and
  `sourceFolder`; `Category.productCount` is checked against the products, then dropped.
  "Never point an `<img>` at the Tebex CDN" and "never render generator provenance" are
  therefore properties of the type rather than rules someone has to remember.
- **RESOLVED in T5 — search folds accents and never touches slugs.** `foldForSearch` is
  NFD, strip combining marks, lowercase. The catalog is itself inconsistent (`AZUCAR` in a
  name, `Azúcar` in a description) and a Spanish user on an English layout cannot type
  accents. The surface is product name, product description and category name; slugs are
  URL identity and would make two-letter queries hit arbitrary records. Multi-term is AND.
- **RESOLVED in T5 — the category is the URL; text, price and sort are signals.**
  `/catalog` and `/catalog/:slug` are two routes loading one component, so a category view
  is linkable and the param arrives as an input through `withComponentInputBinding`. The
  other controls stay in signals: putting them in the URL would mean a router navigation
  and a history entry per keystroke. The accepted cost is that opening another category
  recreates the component and clears them.
- **RESOLVED in T5 — header and footer live in `app.*`, not in `shared/`.**
  `shared/README.md` scopes that folder to pieces with more than one consumer and forbids
  routing inside it, and a `shell/` folder would be a fifth top-level folder the
  architectural contract does not define.
- **RESOLVED in T5 — cards are presentational articles; the slice supplies the link.**
  `ProductCard` and `CategoryCard` render `<article>` and inject nothing (no `RouterLink`,
  no store), which is what lets the landing page and the catalog grid share them. Category
  cards are wrapped in `<a routerLink>`. Product cards are not links yet: detail is T6.
- **RESOLVED in T5 — a `null` image is a state, not an error.** 3 of 10 categories have no
  banner, so `CategoryCard` renders `categoryMonogram` over one of six gradient classes
  chosen by an FNV-1a hash of the slug: stable across reloads, varied across cards, colours
  kept in `styles.scss` rather than in a sanitised style binding. A product with
  `imagePath: null` renders a neutral block, never a broken `<img>` and never the CDN.
- **RESOLVED in T5 — `tsconfig.app.json` excludes `src/**/testing/**`.** Spec-only
  fixtures read the committed catalog through `node:fs` while the app program sets
  `types: []`. They stay type-checked by `tsconfig.spec.json`, which includes the `node`
  types, and nothing under `testing/` is reachable from `main.ts`.
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
  `bannerImage` are like `/products/<id>/imagen.png` and `/categories/<id>/<banner file>`, so
  they work directly as an `<img src>` fallback. A repo-relative `public/...` path would 404 in
  the browser, which defeats the point of recording a fallback at all.
  **CORRECTED 2026-10-19:** the extension is *not* uniform. Measured across the 48 products:
  **35 `.png`, 9 `.jpeg`, 3 `.jpg`, 1 `.gif`**, and the 7 non-null banners are 6 `.jpg` + 1
  `.png`. `imagePath`/`bannerImage` must always be read from the catalog; composing a filename
  with a `.png` convention silently breaks 13 of 48 products.
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

**T9 is done: the store is feature-complete.** Browse, search, filter, product detail, cart, demo
checkout, three languages of chrome, and a decorative 3D landing. 792 tests, clean build, every
route deep-linkable, and three.js still out of the first paint. Three gaps are recorded rather than
hidden:

- **Nobody has looked at it.** jsdom has no layout engine and no WebGL; every visual claim in this
  document is structural. No browser tool is connected in this session (only `engram`, `context7`,
  `elevenlabs` and `opencode`), so framing, contrast, wrapping and the canvas itself are unverified.
  This is now the single largest open risk in the project, and only a real browser closes it.
- **The Japanese chrome has not been reviewed by a native speaker.** It is authored Japanese, not
  translated Spanish, but it is still model-written.
- **Catalog content is Spanish in all three languages.** A Japanese visitor reads Japanese chrome
  around Spanish product copy. Translating 48 descriptions is a content decision, not engineering.

What remains:

- **T8b (a11y + responsive polish)** — the deliberate audit that T8 deliberately did not do. It now
  has to cover the landing scene too, so running it after T9 was the right order.
- **T10 (docs)** — `README.md`, `ASSETS.md`, `LICENSES.md`, architecture notes. `LICENSES.md` got
  simpler and more honest in T9: the 3D content is the user's own Blockbench work plus textures
  generated arithmetically in code, so there are no third-party asset licences to track at all.
- **Delivery** — the branch is now ~20 commits and still unpushed, with no remote. The recorded slice
  plan predates T6–T9 and needs re-measuring before any PR is cut. Commit, push and PR remain the
  user's decisions.

**RESOLVED 2026-10-19 — `modelPath` stays `null`; 3D is world decoration, not an SKU attribute.**
The user's decision: the models are wanted only as **decoration on the landing**, animated, and
further Minecraft-style decorative assets may be **downloaded** to make the landing feel like the
game. "No quiero items, quiero cosas decorativas." Consequences:

- No product ever maps to a model. `ITEM_MODEL_ALIASES` stays empty and `modelPath` stays `null`.
  Product detail is image-first with the real store photography, permanently — not as an interim
  degradation.
- The four item models (`tlaloc_hat`, `tlaloc_staff`, `netherite_sword`, `paper`) and the animated
  `tlaloc.bbmodel` become landing scenery in **T9**, alongside downloaded voxel props.
- Downloading is authorized for decorative assets. Licensing and provenance must be recorded per
  asset (T10 `LICENSES.md`), and every downloaded asset is copied into the repo — nothing is
  fetched from a third party at runtime.
- The `.schem`/`.schematic` backdrop idea is dropped as unnecessary now that the scene is
  decoration-led rather than a reconstruction of the map.

### T6 — product detail, cart core and the shell count (6 work units)

Commits: `bddadc5` (pure cart domain + signal store + persistence adapter), `f264421` (lossless
description structure), `8d1553e` (quantity stepper + add-to-cart), `22fa58c` (product slice +
related rule), `fe41acc` (grid and landing card links), `63462bb` (non-navigating shell count).

**Cart is core, not a slice, and that is the load-bearing design decision.** The product page
(T6) and the cart page (T7) both need it, and `features/README.md` forbids slices depending on
each other. `core/README.md` already places state stores and persistence adapters there, so the
dependency graph stays acyclic. Only `{slug, quantity}` is persisted — never a price — so a stale
stored price cannot win; totals are computed from the live catalog at render time.

Persistence was verified as a degradation matrix, permanently, in `cart-persistence.spec.ts`
(27 cases): corrupt JSON, non-object document, missing/foreign version, `lines` not an array,
`null` standing in for a stored `NaN`, fractional quantity, absurd quantity, duplicate slugs,
unknown slug after a catalog change, storage that throws on read/write/remove, and absent
storage. Outcomes are `empty | ok | repaired | discarded | unavailable`; nothing throws.

**The brief was wrong and the writer was right.** This task's brief asserted that descriptions
carry newlines and separate structural blocks. Measured fact: **0 of 48 descriptions contain CR or
LF**. The real structure is inline labels — `Cantidad:` in 30 products, `Efectos Temporales:` in
17 — so a line splitter would have produced one giant paragraph. The shipped rule is a label
heuristic whose safety property is that joining the rendered blocks reproduces the source
exactly, which is asserted for all 48 real descriptions (295 blocks, 92 distinct labels, zero
lossy reconstructions). `cofre-de-runas` is the one description with no label at all and is pinned
as a single block.

Related products widen from same-category to one-per-other-category when the category is
single-product, which is 4 of the 10 categories; all four are covered by a loop. The heading
changes with the rule so a lone-product category never claims "Más de Mascotas".

The shell shows `Carrito vacío` / `Carrito: N artículos` in a `role="status"` `aria-live="polite"`
`<p>`. It is deliberately **not** a link: `/cart` does not exist until T7, and a dead link is worse
than none. A spec asserts `closest('a') === null`.

Verification, re-run by the parent: **661/661 tests in 46 files**, build exit 0 at **269.68 kB
raw / 75.23 kB transfer** with `product-page` lazy at 14.57 kB, `catalog:verify` exit 0. No file
under `data/`, `public/`, `scripts/`, `src/tooling/` or `src/app/three/` was touched, no `/cart`
route exists, and no new code imports `three/`.

**Still unverified**: anything depending on real layout. Every check is jsdom plus an HTTP fetch
that returns the same 640-byte SPA shell for a real slug, a real category and a bogus slug alike —
which proves routing survives deep links and proves nothing about how the page looks. Only a real
browser can close that.

### T7 — cart page, demo checkout and the header link (5 work units)

Commits: `373002f` (cart line views + one shared `OrderSummary`), `bedf8fc` (cart page),
`dbe9180` (demo checkout), `0004c22` (header link), `54ae53c` (Prettier normalization).

**The cart and the checkout cannot disagree, by construction.** Both bind the same
`CartStore.totals` signal and both render the same `shared/order-summary.ts`. A dedicated
`cart-checkout-agreement.spec.ts` mounts both pages over one seeded cart and compares the rendered
rows and values. Rebuilding the summary twice would have been the obvious way to get a
one-cent-after-a-refund bug in a store that has no refunds.

A line whose product has left the catalog produces **no row, no unit and no money** — it matches
`cartSubtotalUsd`, which already skips unknown slugs, so the header count, the line rows and the
total agree even after the catalog changes under a stored cart.

**The checkout is a demo and says so before you press anything**: one Minecraft username field
(Java rule, 3–16, `A-Z a-z 0-9 _`), a visible disclosure that no payment is processed and no order
is created, and no payment field of any kind — the spec asserts exactly one `<input>` exists and
that `tarjeta`/`cvv`/`caducidad` appear nowhere. Submitting generates a local reference
(`YOKAI-YYYYMMDD-XXXX`, pure and tested), clears the cart, and shows a confirmation that states it
lives only in this tab. A reload loses it and `/checkout` then redirects to `/cart`, which is
honest rather than a fake persisted order.

The header count became a link whose accessible name carries both the count and the destination,
plus a separate visually hidden polite status region so count changes still announce without the
link's name churning.

**Second brief correction.** The brief asserted every product image is
`/products/<slug>/imagen.png`. Measured: **35 `.png`, 9 `.jpeg`, 3 `.jpg`, 1 `.gif`** across the
48 products (banners: 6 `.jpg`, 1 `.png`). Any code composing that filename would have broken 13
products. Nothing does — every image is the `imagePath` read from the catalog — but a stale comment
in `product-page.ts` and a false claim in this document were corrected (`53f2237`).

Parent re-ran: **714/714 tests in 54 files**, build exit 0 at **272.48 kB raw / 76.14 kB
transfer**, `catalog:verify` exit 0, no budget warning. `data/`, `public/`, `scripts/`,
`src/tooling/` and `src/app/three/` untouched.

**Still unverified**: live-region behaviour with a real screen reader, focus movement in a real
browser, responsive wrapping of long ALL-CAPS names, and contrast. Browser tooling is still not
connected in this session.

### T8 — three-language UI chrome (2 work units)

Commits: `0adf6b5` (typed dictionary + `LanguageStore`), `41ac9de` (migrate every consumer, add the
switcher). `core/ui-text.ts` was **deleted**, not kept alongside: one dictionary with no bypass is
the only shape that survives contact with a growing UI.

**Why not URL-based language.** There is no SSR, so every URL already returns the same SPA shell;
`/es/`, `/en/`, `/ja/` would add no present-day SEO value while forcing argument-path rewrites
across 756 tests. Language lives in `LanguageStore`, persists under `yokai.language`, defaults to
`es`, and writes `document.documentElement.lang` — the last part is not cosmetic, it is what makes
screen readers and hyphenation behave. The resolution logic is a pure function behind one
injectable, so a future URL strategy can replace the source without touching consumers.

**The dictionary fails to compile before it fails in front of a customer.** One strict `UiText`
interface (95 keys), and `UI_TEXT: Record<Language, UiText>`. A missing key in Japanese is a build
error, not an `undefined` rendered into a page.

Pluralisation is modelled per language rather than shared: `es`/`en` singular only at exactly 1,
Japanese counts with `点` and has no plural form. Boundaries 0/1/2/5/11/99 are pinned in all three,
plus negative, fractional and `NaN` clamping.

**Catalog content is deliberately untranslated.** Product and category names and descriptions are
server data and are interpolated byte-for-byte in all three languages. The consequence is real and
worth stating plainly: a Japanese visitor reads Japanese chrome around Spanish product copy.
Translating 48 descriptions is a content-authoring decision, not an engineering one.

**The Japanese is authored Japanese, not literal translation**: `です・ます`, `点`, `パンくずリスト`,
`価格の安い順`, full-width `｜` in titles. It has **not** been reviewed by a native speaker and should
be before release.

### T9 — decorative landing scene (3 work units)

Commits: `95f90b3` (seeded voxel island + motion policy), `065eb55` (render the diorama with the
Tlaloc boss), `a6799a0` (mount after the hero renders).

**The download permission was deliberately not used.** The user authorised downloading decorative
assets and asked for a landing that feels like Minecraft. Ripped Minecraft models and textures are
Mojang IP and this is a commercial storefront, so the scene is **first-party plus procedural**
instead: the user's own animated `tlaloc.bbmodel` as the centrepiece, on a voxel island whose
blocks and 16×16 textures are **generated arithmetically in code** (FNV-1a seeded coordinate hash
over a palette declared in `palette.ts`). No image files, no CDN, no loader, no sampled pixels —
Minecraft-adjacent in visual language, not in assets. This is additive and reversible: if the user
later wants licensed CC0 props, the scene host can take them.

The scene is 635 blocks at the default seed: a 13-wide disc of grass over dirt over stone with a
sand rim and tapered underside, a 3×3 mossy-stone pad under Tlaloc with two lantern posts, three
oaks placed clear of the boss's tail, and four detached bobbing cubes.

**Bundle discipline was measured, not assumed.** `@defer` was tried first and rejected: it added
~7.95 kB to the initial chunk for its runtime, against **+0.42 kB** for an explicit dynamic import
from `afterNextRender`. Final state: initial **291.33 kB / 80.69 kB transfer**, `landing-scene` a
separate **11.03 kB** lazy chunk, and three.js still isolated in its **588.55 kB** lazy chunk.
`dist/index.html` preloads only the 147 kB framework chunk, which is the proof that three.js did
not leak into the first paint.

**Motion is a pure, exhaustively tested policy**: `paused` when the panel is off-screen or the tab
is hidden (no RAF at all — a GPU kept warm behind the cart page is a defect), `still` when the
visitor asked for reduced motion, `animate` only when all three inputs allow it. Reduced motion
renders **one still frame** of the composition rather than deleting the art.

Fallbacks are silent by design: WebGL absent, chunk 404, model 404, or a throw mid-frame each leave
the reserved gradient panel in place with a single `console.warn` and no visitor-facing error. The
panel is `aria-hidden="true"` because it carries no information — every claim in the hero is in the
copy beside it.

**Still unverified, and this is the whole risk of the task**: no frame has ever been seen. jsdom has
no WebGL, so camera framing (is the island cropped?), exposure, fog, lantern glow, Tlaloc scale and
yaw, and canopy/tail clearance are reasoned, not observed. Pause/resume wiring is inspected and its
policy tested, but a live RAF/IntersectionObserver/visibility cycle was never executed, and disposal
is proven at the three.js resource level, not against a real GL context.
