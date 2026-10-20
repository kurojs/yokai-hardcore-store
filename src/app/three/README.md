# `three/`

All three.js integration and 3D asset parsing, isolated from the Angular application.

`bbmodel/` turns a Blockbench `.bbmodel` document into a `THREE.Group` plus
`THREE.AnimationClip[]`, and `itemmodel/` turns a Minecraft item model (`item/*.json`) into a
`THREE.Group`. `bbmodel-viewer.ts` and `item-model-viewer.ts` are the Angular hosts;
`/dev/model` renders the Tlaloc boss with its idle clip playing, and `/dev/items` renders the
Tlaloc hat and staff plus the two parent-driven sprites.

`landing/` is the home page's procedural hero diorama: a seeded voxel island built in code and
procedurally drawn block textures. It is the only 3D on the storefront, it loads after the hero
has rendered, and it can disappear without taking any copy with it.

`preview-host.ts` owns the WebGL plumbing both routes need — renderer, canvas, lights, orbit
controls, resize, render loop, teardown, camera framing — so `three` is in one shared lazy
chunk and the "this browser has no WebGL" path exists once.

## Entry point

```ts
const scene = createBbModelScene(rawJson, { loadTexture: new THREE.TextureLoader() });
scene.root;              // add to your THREE.Scene
scene.clips;             // AnimationClip[], one per animation
scene.clipDescriptors;   // loop mode, duration, track/keyframe counts
scene.modelMap;          // Blockbench uuid -> node (bones and cubes)
scene.stats;             // cubes/bones/clips/keyframes, hitbox names, bounds, warnings
scene.dispose();         // geometries, materials and textures, each exactly once
```

| Module | Responsibility |
|---|---|
| `bbmodel/parse.ts` | Pure JSON → validated model. Drops hitbox subtrees and hidden cubes. |
| `bbmodel/geometry.ts` | Cube → `positions`/`uvs`/`indices`/`groups`. Pure typed arrays. |
| `bbmodel/scene.ts` | Hierarchy, materials, embedded textures, bounds, disposal. |
| `bbmodel/animation.ts` | Absolute three.js tracks from Blockbench's relative keyframes. |
| `bbmodel/textures.ts` | Base64/data-URI textures behind an injectable loader. |

The loader is injected because `THREE.TextureLoader` needs a DOM `Image`; everything else is
plain math, so the pipeline runs headlessly in jsdom.

Measured on `public/models/bosses/tlaloc.bbmodel`: 110 cubes (106 rendered, 4 hitboxes,
0 hidden), 18 bones, 660 faces, 128×128 atlas, 2 textures, 10 clips / 789 keyframes.

## Item models

A Minecraft item model is **not** a `.bbmodel`: different rotation form, different UV space,
textures behind a `#` indirection, and a flat-sprite state that `.bbmodel` has no equivalent
of. `itemmodel/` shares exactly one thing with `bbmodel/` — the six-face box emitter — and
bridges the UV unit difference explicitly.

```ts
const model = parseItemModel(rawJson);            // pure: JSON -> validated data
const scene = createItemModelScene(rawJson, {     // parse + build in one call
  resolveTexture: (path) => ({ url }),            // item/custom/... -> a loadable asset
  loadTexture: loader,                            // injected, so jsdom needs no image decode
});
scene.root;                 // add to your THREE.Scene
scene.stats;                // elements/faces/triangles, per-texture status, bounds, warnings
scene.setDisplayContext('gui');  // poses the model the way Minecraft does
scene.measureBounds();      // world-space bounds of the posed model
scene.dispose();            // idempotent; releases every geometry, material and texture once
```

| Module | Responsibility |
|---|---|
| `itemmodel/parse.ts` | Pure JSON → validated model. Fails loudly on unrenderable input; warns on the rest. |
| `itemmodel/geometry.ts` | Axis-angle → quaternion, UV 16-space → pixels, bounds. three.js-free. |
| `itemmodel/scene.ts` | Hierarchy, materials, emissive layer, `display` posing, disposal. |
| `itemmodel/textures.ts` | Texture path → sibling-PNG URL, and `THREE.Texture` construction. |
| `itemmodel/preview.ts` | The `/dev/items` view model: model list, context choices, HUD strings. |
| `preview-host.ts` | The shared WebGL host both viewer components drive. |

Measured on `public/models/items/tlaloc/`: `tlaloc_hat.json` 29 elements / 174 faces / 348
triangles, `tlaloc_staff.json` 37 / 222 / 444 with 12 rotated UVs and an emissive companion,
64×64 textures, all 8 `display` contexts on both, and `netherite_sword.json` +
`paper.json` as parent-driven sprites whose textures live in the game's jar.

## Landing scene

`landing/` is split the way the rest of this folder is: pure description below the renderer,
three.js only where it is unavoidable.

| Module | Responsibility |
|---|---|
| `palette.ts` | The eight block kinds and their colour ramps. Three.js-free. |
| `random.ts` | `mulberry32` plus coordinate hashes. Three.js-free. |
| `voxels.ts` | Seeded island generator: terrain disc, pad, trees, floating blocks, bounds, counts. Three.js-free and total. |
| `pixels.ts` | 16×16 RGBA tiles generated from the palette. Three.js-free. |
| `motion.ts` | The gating policy: `animate` / `still` / `paused`. Three.js-free. |
| `textures.ts` | `DataTexture` + lit material per block kind. |
| `island-scene.ts` | Instanced terrain, lantern-post and floating-block filtering, de-duplicated disposal. |
| `landing-renderer.ts` | Transparent renderer, token-driven lights, camera, loop, observers, teardown. |

The rules that make it safe on a commercial storefront:

- **The scene is never in the initial bundle.** `features/home/home-page.ts` starts a dynamic
  `import()` from `afterNextRender`; the home page keeps its copy and links before three.js is
  requested. `@defer` was measured and rejected: its runtime added ~8 kB to the initial shared
  chunk, while the scene chunk is lazy either way. The dynamic import costs ~0.4 kB.
- **No image files.** Every block texture is arithmetic over the palette. There is no CDN, no
  loader, and no copied Minecraft texture.
- **No work off-screen.** `IntersectionObserver` and `visibilitychange` feed `motion.ts`;
  `requestAnimationFrame` only exists while the policy says `animate`. Reduced motion renders
  exactly one still frame at the canonical camera position.
- **WebGL absence is not an error page.** `createLandingScene` throws once if the browser
  cannot create a context; the component catches it, logs one line and leaves the hero's own
  wash and copy untouched. A frame failure hides the canvas instead of showing a broken scene.
- **Disposal is one path.** `disposeObjectTree` de-duplicates geometries, materials, textures
  and `InstancedMesh` instance buffers, because the unit box and the materials are shared.
- **Full-bleed, not a panel.** The canvas clears to alpha zero and the scene has no background
  or fog of its own; the hero's CSS mask fades it into the page. Lighting colours are read from
  the CSS tokens, so the diorama stays in the storefront palette.

## Traps that cost real time

- **Hitboxes are identified by BONE name, not cube name.** Every collision cube is called
  `cube`; only `ob_tlalochitbox`, `ob_tlalochitbox2`, `ob_tlalochitbox3` and `hitbox` carry
  the marker. Filtering removes the whole subtree, not just the cube.
- **`animators[uuid].keyframes` is an ARRAY**, and `channel` is a string (`"position"` 73,
  `"rotation"` 716, never `"scale"`). The "object keyed by time" claim is false here: all 157
  animators are arrays. The object form is still accepted defensively — a wrong guess is silent.
- **Channel semantics are relative.** `position` and `rotation` (degrees) are offsets on the
  rest transform; `scale` is an absolute multiplier. three.js tracks bake the rest transform in.
- **The root name can steal the root bone's tracks.** `PropertyBinding.findNode` returns the
  root when its name matches, and this file names both the model and its root bone `tlaloc`.
  The root is named last and uniquified (`tlaloc_2`); bone names stay faithful.
- **UVs**: `v = 1 - y / height` (Minecraft measures from the top). 337 of 660 faces are
  authored with `uv[0] > uv[2]` and stay mirrored; 6 faces carry a 90/270° rotation that
  permutes the four slots. Euler order is `ZYX`, and cube rotation pivots around `origin`.
- **Interpolation is numeric** in r186 (`InterpolateDiscrete|Linear|Smooth` = 2300-2302).
  Quaternion tracks have no smooth factory, so they keep linear slerp.
- **Disposal de-duplicates.** Materials and textures are shared between meshes, and disposing
  them per mesh double-frees; `disposeScene(root, extraTextures)` owns one set.

### Item models

- **`rotation` is axis-angle, not Euler, and may be an object or an array.** Every one of the
  66 elements in the two real 3D models uses the object form
  (`{angle, axis, origin}`, one of y/z/x, one of -45/-22.5/0/22.5/45). The array form is
  accepted and composed left to right as `R1 * R2 * ...`; no file here exercises it, so that
  ordering is a documented choice. `origin` is required — defaulting it to the model corner
  would produce a plausible-looking wrong pose.
- **UVs are in a 16-unit space, not atlas pixels.** `uv / 16 * texture_size` is where the
  pixel is, and `uv / 16` is the normalised coordinate *whatever* the size is. That is why
  `itemUvToPixels` runs before `buildCubeGeometryData` (which takes atlas pixels): skipping
  the conversion renders a 4× magnified corner of a 64×64 texture and looks plausible.
- **`#0` is an indirection.** A face says `"#0"`, `textures["0"]` says the path, and only the
  last path segment names the file. A bare path is rejected: guessing would render an
  untextured face instead of reporting a broken model.
- **`particle` is in `textures` but is not a face texture.** Referencing it from a face fails
  with a message that says so; `itemModelTexturePaths` excludes it from probing.
- **A model with a `parent` and no `elements` is a sprite, not a broken file.** Its geometry
  belongs to the vanilla parent (`item/generated`, `item/handheld`), which lives in the game's
  jar. The scene builds the approximate `item/generated` quad instead of failing, and reports
  the parent so a HUD can name what is missing.
- **A missing texture is a state, never an error.** `netherite_sword.json` and `paper.json`
  resolve to `netherite_sword.png` / `paper.png` beside the model; neither exists. Those faces
  get a flat fuchsia marker material (`MISSING_TEXTURE_COLOR`), `stats.textures[n].status`
  reads `unavailable`, and `warnings` names the path. Nothing throws.
- **`display` rotation is an `XYZ` Euler, unlike bbmodel's `ZYX`.** Composed as
  `translate * rotate * scale` on the root group, in model units. Getting the order wrong
  silently mis-poses every preview: `gui` on the hat is `[158.17, -36.65, 156.02]`.
- **The hat has a real UV defect.** Two `down` faces (elements 1 and 2) sample v 22.5–24, i.e.
  pixel 90–96 of a 64-tall texture. The parser warns and clamps rather than failing, and the
  spec asserts the count so a re-export is noticed.
- **Sprites and zero-size stages.** The host falls back to the window when the stage measures
  0×0, and a sprite has no `display` block at all: the switcher hides itself rather than
  offering eight identities.

## Rules

- Parsing and scene building stay pure: no Angular imports, no DOM access inside `bbmodel/`.
- Angular touches this layer only through the viewer component, which owns canvas and cleanup.
- Fail loudly with a `bbmodel:` prefix on malformed input; never repair it into an empty
  scene. Non-fatal surprises go to `stats.warnings`.
- Item models follow the same rules with an `itemmodel:` prefix, and `itemmodel/` is
  three.js-free below `scene.ts`: `geometry.ts` returns plain arrays and quaternions so the
  coordinate maths is testable without a WebGL context.
- A texture the caller cannot locate is never an error. It is a reported state
  (`stats.textures`, `warnings`) plus a marker material, so a store page can render a model
  whose art has not been shipped yet.
