# `scripts/`

Build-time tooling. Node scripts that run outside the Angular build.

## Belongs here

- Data pipelines: catalog normalization and slug/accent generation from source exports.
- Asset pipelines: copying, verifying, hashing, and downsizing source assets into the repo.
- One-off maintenance utilities (asset audits, license inventory).

## Rules

- Plain Node ESM/CJS scripts invoked through an explicit `package.json` script entry.
- No script mutates source data in place; inputs are read-only and outputs are written to
  a tracked, deterministic destination.
- Output must be reproducible: stable ordering, stable IDs, no timestamps in generated
  data.
- Never reference a developer-specific absolute path; take paths as arguments or read them
  from a documented local config.
