# `three/`

All three.js integration and 3D asset parsing, isolated from the Angular application.

## Belongs here

- Parsers that turn source assets into plain data: Blockbench `.bbmodel`, Minecraft item
  model JSON, NBT schematics.
- Scene-graph builders and renderer setup/wiring for three.js.
- Math helpers: UV mapping, cube geometry, transforms, camera and light rigs.

## Rules

- Parsing and scene-graph building are pure functions where possible: no Angular imports,
  no DOM access, no global state, so they can be unit tested directly.
- Angular touches this layer only through thin wrappers that own the canvas element,
  lifecycle, and cleanup (dispose geometries, materials, and textures on destroy).
- Filter non-geometry bones (hitboxes/collision volumes) so they never enter the scene.
