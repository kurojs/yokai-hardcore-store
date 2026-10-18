# `three/`

All three.js integration and 3D asset parsing, isolated from the Angular application.

`bbmodel/` turns a Blockbench `.bbmodel` document into a `THREE.Group` plus
`THREE.AnimationClip[]`. `bbmodel-viewer.ts` is the Angular host; `/dev/model` renders the
Tlaloc boss with its idle clip playing.

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

## Rules

- Parsing and scene building stay pure: no Angular imports, no DOM access inside `bbmodel/`.
- Angular touches this layer only through the viewer component, which owns canvas and cleanup.
- Fail loudly with a `bbmodel:` prefix on malformed input; never repair it into an empty
  scene. Non-fatal surprises go to `stats.warnings`.
