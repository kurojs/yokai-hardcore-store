# `src/assets/`

Source-side home for runtime-served static assets: product and category imagery, texture
maps, fonts, and 3D source files that ship with the application.

## Current state

Angular 22 serves the `public/` directory by default (see the `assets` entry in
`angular.json`); this directory is not wired into the build yet. Wiring it — or moving
runtime assets under `public/` — is a later task's decision.

## Rules

- Everything served at runtime is copied into this repository. No asset is ever loaded
  from an external drive, network share, or local absolute path.
- Pin binary assets by content, not by CDN URL, so the store keeps working offline.
- Every third-party asset is recorded with its license in `ASSETS.md` / `LICENSES.md`.
