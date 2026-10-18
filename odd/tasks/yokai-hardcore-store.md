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
  | 3 | Catalog UI, product detail, cart + checkout | T5, T6, T7 | not yet built |
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

**T4 is done and verified; T3b closed the gap that verification found.** The remaining
unverified surface is a single item, recorded honestly and not hidden:

- **Nobody has seen the 3D previews rendered.** jsdom has no WebGL, so every check so far is
  structural: the parser produces the right numbers, the mixer moves the bones, the bundle
  builds, the routes serve. Visual confirmation needs a real browser. A dev server serves
  `http://localhost:4300/dev/model` (animated Tlaloc) and `http://localhost:4300/dev/items`
  (the four item models with a `display`-context switcher). Attempted a browser check through
  BrowserOS neo's MCP tools; **they are not connected in this session** (only `engram`,
  `context7`, `elevenlabs` and `opencode` are), so the visual step is still open. No silent
  fallback to another browser surface was taken.

Next up is T5 (catalog UI). T5–T7 are unblocked:

- **T4** — Minecraft item model renderer (model JSON + texture → 3D preview).
- **T5** — catalog UI. T6 consumes both: the product detail view renders `tlaloc.bbmodel`
  through `createBbModelScene`, which is now a stable contract.

The viewer component at `src/app/three/bbmodel-viewer.ts` is deliberately generic: a
`modelUrl` input plus clip buttons, so T6 can reuse it instead of writing a second renderer.
Its `/dev/model` route is the visual harness for T4 and T9.

**Open product decision carried from T2**: `modelPath` is `null` for all 48 products.
The 4 item models in the repo (`tlaloc_hat`, `tlaloc_staff`, `netherite_sword`, `paper`) are
boss-encounter assets with no catalog counterpart, and `ITEM_MODEL_ALIASES` ships empty by
design rather than guessing a mapping from name similarity. Deciding which models should
map to which products (if any) is a product decision, not an engineering one. Until it is
answered, product detail pages must degrade gracefully to the 2D image.
