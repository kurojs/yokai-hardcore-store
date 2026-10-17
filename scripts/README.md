# `scripts/`

Build-time tooling. Plain Node ESM that runs outside the Angular build and produces the
repository's tracked data and asset inputs.

## Pipelines

Two CLIs, both thin wrappers around the pure, unit-tested modules in `scripts/lib/`.

| Command | npm script | Writes |
| --- | --- | --- |
| `node scripts/sync-assets.mjs` | `npm run assets:sync` | `public/**`, `data/catalog.source.json`, `data/category-copy.json`, `data/source-index.json` |
| `node scripts/build-catalog.mjs` | `npm run catalog:build` | `data/catalog.json` |
| `node scripts/build-catalog.mjs --check` | `npm run catalog:verify` | nothing; exits non-zero when `data/catalog.json` is stale |

`sync-assets.mjs` is the only script that touches the read-only source. `build-catalog.mjs`
reads repository files only, so the catalog can be regenerated without the source drive.

### Order and idempotence

Run `sync-assets` before `build-catalog`: `localImage` reflects the bytes actually copied
into `public/`. Both scripts compare before writing, so a re-run reports `unchanged` and
leaves no diff. Generated JSON is stable — explicit sort orders, no timestamps, no
host-dependent formatting — so byte-identical reruns are the expected result.

### Source discovery

`sync-assets.mjs` locates the source tree without any machine-specific path baked in:

1. `--source <path>`
2. the `YOKAI_SOURCE_ROOT` environment variable
3. scanning the drive roots for the source folder

It never writes to the source tree.

## `scripts/lib/`

Everything with logic lives here, with no I/O hidden in the middle:

- `file-ops.mjs` — deterministic read/write helpers (`writeIfChanged`, `toRepoRelative`, …).
- `slugs.mjs` — `foldAccents`, `collapseWhitespace`, `stripQuotes`, `slugify`, `comparisonKey`.
- `orthography.mjs` — the explicit, evidence-backed `ACCENT_FIXES` table and its residual-form audit.
- `txt-source.mjs` — `info.txt` / `categoria.txt` parsers.
- `drive.mjs` — read-only source-root discovery.
- `zip.mjs` — dependency-free ZIP reader (raw inflate + CRC-32 verification).
- `normalize.mjs` — pure `buildCatalog` / `auditCatalog`.
- `repo-assets.mjs` — reads the repository-resident generator inputs.

## Where the specs live

Specs for this tooling live in **`src/tooling/*.spec.ts`**, not next to the modules.

The Angular unit-test builder (`@angular/build:unit-test`) resolves its `include` globs
relative to `sourceRoot` (`src`), so a spec under `scripts/` is never collected. The specs
import the modules across the boundary (`../../scripts/lib/*.mjs`), which is why
`tsconfig.spec.json` sets `allowJs`, adds `"node"` to `types`, and lists `scripts/**/*.mjs`
in its `include` so the JSDoc types resolve.

`src/tooling/` is tooling test coverage only — it holds no application code and is excluded
from the app build (`tsconfig.app.json` excludes `src/**/*.spec.ts`).

## Rules

- Plain Node ESM invoked through an explicit `package.json` script entry.
- No script mutates source data in place; inputs are read-only and outputs are written to a
  tracked, deterministic destination.
- Output must be reproducible: stable ordering, stable IDs, no timestamps in generated data.
- Never reference a developer-specific absolute path; take paths as arguments or read them
  from a documented environment variable.
- Fail loudly. A missing input, an unmatchable product, or a price that disagrees between
  the JSON and the `.txt` copy aborts with a precise message rather than emitting a partial
  or silently-substituted catalog.
