/**
 * Specs for the item geometry layer.
 *
 * This is where the format differences become numbers: an axis-angle rotation becomes a
 * quaternion, a UV in the 16-unit space becomes a pixel against `texture_size`, and a
 * parent-driven sprite becomes a quad. The numbers asserted here were derived by hand from
 * the rotation and UV definitions, not read back out of the implementation.
 */

import {
  axisAngleToQuaternion,
  buildItemElementGeometry,
  buildItemSpriteElement,
  itemElementPivot,
  itemElementQuaternion,
  itemUvToPixels,
  measureItemBounds,
  measureItemElementBounds,
  multiplyQuaternions,
  rotateVec3,
} from './geometry';
import { parseItemModel } from './parse';
import type { ItemElement, ItemFace, ItemRotation, Quat, Vec3 } from './types';
import { itemElement, itemFace, itemModel, itemRotation } from './testing/fixtures';

/** The element an id-targeted face belongs to, built straight from the parser. */
function faceOf(raw: Record<string, unknown>): { element: ItemElement; face: ItemFace } {
  const model = parseItemModel(
    itemModel({
      elements: [itemElement({ faces: { north: raw } })],
      texture_size: [16, 16],
    }),
  );
  return { element: model.elements[0], face: model.elements[0].faces[0] };
}

/** The default fixture element, which carries all six faces. */
function fullElement(): ItemElement {
  return parseItemModel(itemModel({ texture_size: [16, 16] })).elements[0];
}

/** Runs a geometry build and returns the thrown message. */
function messageOfThrown(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected the call to throw, but it returned normally');
}

/** Material indices for a single texture, which is all this layer needs. */
const SINGLE_TEXTURE = new Map<string, number>([['item/custom/tlaloc/tlaloc_probe', 0]]);

describe('itemUvToPixels', () => {
  it('scales a 16-unit UV onto a 64x64 texture', () => {
    expect(itemUvToPixels([2.75, 2.75, 5.5, 5.5], { width: 64, height: 64 })).toEqual([
      11, 11, 22, 22,
    ]);
  });

  it('is the identity on a 16x16 texture', () => {
    expect(itemUvToPixels([0, 1.5, 16, 15], { width: 16, height: 16 })).toEqual([0, 1.5, 16, 15]);
  });

  it('scales each axis by its own texture dimension', () => {
    expect(itemUvToPixels([8, 8, 16, 16], { width: 64, height: 32 })).toEqual([32, 16, 64, 32]);
  });
});

describe('axisAngleToQuaternion', () => {
  it('builds the expected quaternion for each axis', () => {
    expect(axisAngleToQuaternion({ axis: 'x', angle: 90, origin: [0, 0, 0] })[0]).toBeCloseTo(
      Math.SQRT1_2,
      12,
    );
    expect(axisAngleToQuaternion({ axis: 'x', angle: 90, origin: [0, 0, 0] })[3]).toBeCloseTo(
      Math.SQRT1_2,
      12,
    );
    expect(axisAngleToQuaternion({ axis: 'x', angle: 90, origin: [0, 0, 0] })[1]).toBe(0);
    expect(axisAngleToQuaternion({ axis: 'y', angle: 180, origin: [0, 0, 0] })[1]).toBeCloseTo(1, 12);
    expect(axisAngleToQuaternion({ axis: 'z', angle: -90, origin: [0, 0, 0] })[2]).toBeCloseTo(
      -Math.SQRT1_2,
      12,
    );
    expect(axisAngleToQuaternion({ axis: 'z', angle: -90, origin: [0, 0, 0] })[3]).toBeCloseTo(
      Math.SQRT1_2,
      12,
    );
  });

  it('is the identity at zero degrees and for a full turn', () => {
    expect(axisAngleToQuaternion({ axis: 'y', angle: 0, origin: [0, 0, 0] })).toEqual([0, 0, 0, 1]);
    const full = axisAngleToQuaternion({ axis: 'x', angle: 360, origin: [0, 0, 0] });
    expect(full[0]).toBeCloseTo(0, 12);
    expect(full[3]).toBeCloseTo(-1, 12);
  });

  it('rotates a vector the way a right-handed rotation must', () => {
    const aboutY = (angle: number): Quat => axisAngleToQuaternion({ axis: 'y', angle, origin: [0, 0, 0] });

    // +90 about +y sends +z to +x.
    const x = rotateVec3([0, 0, 1], aboutY(90));
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(0, 12);
    expect(x[2]).toBeCloseTo(0, 12);

    // +90 about +x sends +y to +z.
    const z = rotateVec3([0, 1, 0], axisAngleToQuaternion({ axis: 'x', angle: 90, origin: [0, 0, 0] }));
    expect(z[0]).toBeCloseTo(0, 12);
    expect(z[1]).toBeCloseTo(0, 12);
    expect(z[2]).toBeCloseTo(1, 12);

    // And -90 undoes it.
    const back = rotateVec3(x as Vec3, aboutY(-90));
    expect(back[2]).toBeCloseTo(1, 12);
  });

  it('leaves a vector on the rotation axis alone', () => {
    const rotated = rotateVec3([0, 5, 0], axisAngleToQuaternion({ axis: 'y', angle: 22.5, origin: [0, 0, 0] }));
    expect(rotated[0]).toBeCloseTo(0, 12);
    expect(rotated[1]).toBeCloseTo(5, 12);
    expect(rotated[2]).toBeCloseTo(0, 12);
  });
});

describe('itemElementQuaternion', () => {
  const y45: ItemRotation = { axis: 'y', angle: 45, origin: [0, 0, 0] };
  const z22: ItemRotation = { axis: 'z', angle: 22.5, origin: [0, 0, 0] };

  it('is the identity when the element declares no rotation', () => {
    const { element } = faceOf(itemFace());
    expect(itemElementQuaternion(element)).toEqual([0, 0, 0, 1]);
  });

  it('is the single rotation when there is one', () => {
    const element: ItemElement = { index: 0, from: [0, 0, 0], to: [1, 1, 1], rotations: [y45], faces: [] };
    expect(itemElementQuaternion(element)).toEqual(axisAngleToQuaternion(y45));
  });

  it('composes an array in file order, left to right', () => {
    const element: ItemElement = {
      index: 0,
      from: [0, 0, 0],
      to: [1, 1, 1],
      rotations: [y45, z22],
      faces: [],
    };

    expect(itemElementQuaternion(element)).toEqual(
      multiplyQuaternions(axisAngleToQuaternion(y45), axisAngleToQuaternion(z22)),
    );
    // Order is not commutative, so this is a real choice rather than a coincidence.
    expect(itemElementQuaternion(element)).not.toEqual(
      multiplyQuaternions(axisAngleToQuaternion(z22), axisAngleToQuaternion(y45)),
    );
  });

  it('pivots on the first declared origin', () => {
    const element: ItemElement = {
      index: 0,
      from: [0, 0, 0],
      to: [1, 1, 1],
      rotations: [{ ...y45, origin: [7, 3.9, 4.95866] }, { ...z22, origin: [1, 1, 1] }],
      faces: [],
    };
    expect(itemElementPivot(element)).toEqual([7, 3.9, 4.95866]);
    expect(itemElementPivot({ ...element, rotations: [] })).toEqual([0, 0, 0]);
  });
});

describe('buildItemElementGeometry', () => {
  it('keeps the six faces as one group when they share a texture', () => {
    const data = buildItemElementGeometry(fullElement(), { width: 16, height: 16 }, SINGLE_TEXTURE);

    expect([...data.indices]).toHaveLength(36);
    expect([...data.positions]).toHaveLength(24 * 3);
    expect(data.groups).toEqual([{ textureIndex: 0, start: 0, count: 36 }]);
  });

  it('gives every face its own four vertices', () => {
    const data = buildItemElementGeometry(fullElement(), { width: 16, height: 16 }, SINGLE_TEXTURE);

    // No vertex is shared between faces, which is what makes per-face normals exact.
    const first = [...data.positions.slice(0, 12)];
    const second = [...data.positions.slice(12, 24)];
    expect(first.some((value, index) => value !== second[index])).toBe(true);
  });

  it('gives the whole element one material index per distinct texture path', () => {
    const model = parseItemModel(
      itemModel({
        textures: { 0: 'item/custom/tlaloc/tlaloc_hat', 1: 'item/custom/tlaloc/tlaloc_staff' },
        elements: [
          itemElement({
            faces: { up: itemFace({ texture: '#0' }), down: itemFace({ texture: '#1' }) },
          }),
        ],
      }),
    );
    const element = model.elements[0];
    const data = buildItemElementGeometry(
      element,
      model.textureSize,
      new Map([
        ['item/custom/tlaloc/tlaloc_hat', 0],
        ['item/custom/tlaloc/tlaloc_staff', 1],
      ]),
    );

    expect(data.groups).toEqual([
      { textureIndex: 0, start: 0, count: 6 },
      { textureIndex: 1, start: 6, count: 6 },
    ]);
  });

  it('throws when a face texture has no material index', () => {
    const { element } = faceOf(itemFace());
    expect(messageOfThrown(() => buildItemElementGeometry(element, { width: 16, height: 16 }, new Map()))).toContain(
      'references texture "item/custom/tlaloc/tlaloc_probe", which has no material index',
    );
  });

  it('puts each face on the side its direction names', () => {
    const model = parseItemModel(
      itemModel({
        elements: [itemElement({ from: [0, 0, 0], to: [16, 16, 16], rotation: undefined })],
        texture_size: [16, 16],
      }),
    );
    const data = buildItemElementGeometry(model.elements[0], model.textureSize, SINGLE_TEXTURE);

    // Face order is the direction order, and one face owns four consecutive vertices.
    const constantAxis = ['east', 'west', 'up', 'down', 'south', 'north'].map((direction, face) => {
      const slice = [...data.positions.slice(face * 12, face * 12 + 12)];
      const axes = [0, 1, 2].filter((axis) =>
        slice.every((value, index) => index % 3 !== axis || value === slice[axis]),
      );
      const value = slice[axes[0] ?? 0];
      return `${direction}:${axes.join('')}=${value}`;
    });

    expect(constantAxis).toEqual(['east:0=16', 'west:0=0', 'up:1=16', 'down:1=0', 'south:2=16', 'north:2=0']);
  });

  it('maps the authored UV onto the atlas against texture_size', () => {
    // The genuine bridge between the two formats: `buildCubeGeometryData` takes atlas pixels,
    // so the same authored UV has to be converted against `texture_size`. Normalised UV is
    // `uv / 16` whatever the size is — which is exactly why the conversion has to be done
    // against the declared size instead of being assumed.
    const model = parseItemModel(
      itemModel({ elements: [itemElement({ faces: { north: itemFace({ uv: [2.75, 0, 5.5, 3.25] }) } })] }),
    );
    const element = model.elements[0];

    const at64 = buildItemElementGeometry(element, { width: 64, height: 64 }, SINGLE_TEXTURE);
    const at16 = buildItemElementGeometry(element, { width: 16, height: 16 }, SINGLE_TEXTURE);

    const pixels64 = itemUvToPixels([2.75, 0, 5.5, 3.25], { width: 64, height: 64 });
    const pixels16 = itemUvToPixels([2.75, 0, 5.5, 3.25], { width: 16, height: 16 });
    expect(pixels64).toEqual([11, 0, 22, 13]);
    expect(pixels16).toEqual([2.75, 0, 5.5, 3.25]);
    // The conversion is visible in the pixels, and only in the pixels.
    expect(pixels64[0]).not.toBe(2.75);

    expect(at16.uvs[0]).toBeCloseTo(pixels16[0] / 16, 6);
    expect(at64.uvs[0]).toBeCloseTo(pixels64[0] / 64, 6);
    for (let slot = 0; slot < at16.uvs.length; slot += 1) {
      expect(at16.uvs[slot]).toBeCloseTo(at64.uvs[slot], 6);
    }

    // V is flipped because Minecraft measures it from the top of the texture.
    expect(at16.uvs[1]).toBeCloseTo(1, 6);
    expect(at16.uvs[5]).toBeCloseTo(1 - 3.25 / 16, 6);
  });

  it('rotates a face 90 degrees by moving the UV slots one step', () => {
    const { element: flat } = faceOf(itemFace({ uv: [1, 2, 8, 12] }));
    const { element: turned } = faceOf(itemFace({ uv: [1, 2, 8, 12], rotation: 90 }));

    const slots = (element: ItemElement): number[] =>
      [...buildItemElementGeometry(element, { width: 16, height: 16 }, SINGLE_TEXTURE).uvs];

    const before = slots(flat);
    const [a, b, c, d] = [0, 1, 2, 3].map((slot) => before.slice(slot * 2, slot * 2 + 2));
    // `rotateUvSlots` maps [a, b, c, d] to [c, a, d, b] per 90 degrees.
    expect(slots(turned)).toEqual([...c, ...a, ...d, ...b]);
  });

  it('opens a zero-thickness element the way Blockbench does', () => {
    const model = parseItemModel(
      itemModel({ elements: [itemElement({ from: [0, 0, 8], to: [16, 16, 8], rotation: undefined })] }),
    );
    const data = buildItemElementGeometry(model.elements[0], model.textureSize, SINGLE_TEXTURE);
    const zs = [...data.positions].filter((_, index) => index % 3 === 2);

    expect(Math.min(...zs)).toBeCloseTo(8, 6);
    expect(Math.max(...zs)).toBeCloseTo(8.001, 6);
  });

  it('positions the vertices relative to the rotation pivot', () => {
    const model = parseItemModel(
      itemModel({
        elements: [
          itemElement({
            from: [0, 0, 0],
            to: [16, 16, 16],
            rotation: itemRotation({ angle: 0, axis: 'y', origin: [8, 8, 8] }),
          }),
        ],
      }),
    );
    const data = buildItemElementGeometry(model.elements[0], model.textureSize, SINGLE_TEXTURE);
    const xs = [...data.positions].filter((_, index) => index % 3 === 0);

    expect(Math.min(...xs)).toBeCloseTo(-8, 6);
    expect(Math.max(...xs)).toBeCloseTo(8, 6);
  });
});

describe('measureItemElementBounds', () => {
  it('is from/to when the element declares no rotation', () => {
    const { element } = faceOf(itemFace());
    const bounds = measureItemElementBounds({
      ...element,
      from: [1, 2, 3],
      to: [5, 6, 7],
      rotations: [],
    });
    expect(bounds).toEqual({ min: [1, 2, 3], max: [5, 6, 7] });
  });

  it('grows to the rotated box, not the authored corners', () => {
    // Local x spans 0..16, y -8..0, z 0..4 around the pivot (0, 8, 0). A +90 rotation about
    // y sends (x, z) to (z, -x), so the box lands at x 0..4, y 0..8, z -16..0.
    const bounds = measureItemElementBounds({
      index: 0,
      from: [0, 0, 0],
      to: [16, 8, 4],
      rotations: [{ angle: 90, axis: 'y', origin: [0, 8, 0] }],
      faces: [],
    });

    expect(bounds.min[0]).toBeCloseTo(0, 6);
    expect(bounds.min[1]).toBeCloseTo(0, 6);
    expect(bounds.min[2]).toBeCloseTo(-16, 6);
    expect(bounds.max[0]).toBeCloseTo(4, 6);
    expect(bounds.max[1]).toBeCloseTo(8, 6);
    expect(bounds.max[2]).toBeCloseTo(0, 6);
  });

  it('handles the 22.5-degree half-steps the real assets use', () => {
    // -22.5 about z on a 4x4x0 box at the origin: x' = x cos + y sin, y' = -x sin + y cos
    // with cos = 0.92388, sin = 0.38268. The maximum x is 4 cos + 4 sin = 5.226252.
    const bounds = measureItemElementBounds({
      index: 0,
      from: [0, 0, 0],
      to: [4, 4, 0],
      rotations: [{ angle: -22.5, axis: 'z', origin: [0, 0, 0] }],
      faces: [],
    });

    expect(bounds.min[0]).toBeCloseTo(0, 9);
    expect(bounds.min[1]).toBeCloseTo(-1.530733729460359, 9);
    expect(bounds.max[0]).toBeCloseTo(5.226251859505506, 9);
    expect(bounds.max[1]).toBeCloseTo(3.695518130045147, 9);
    expect(bounds.min[2]).toBeCloseTo(0, 9);
    expect(bounds.max[2]).toBeCloseTo(0, 9);
  });
});

describe('measureItemBounds', () => {
  it('is a point at the origin when there is nothing to measure', () => {
    expect(measureItemBounds([])).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
  });

  it('unions every element', () => {
    const model = parseItemModel(
      itemModel({
        elements: [
          itemElement({ from: [0, 0, 0], to: [4, 4, 4], rotation: undefined }),
          itemElement({ from: [-3, 1, 2], to: [1, 9, 2], rotation: undefined }),
        ],
      }),
    );

    const bounds = measureItemBounds(model.elements);
    expect(bounds.min).toEqual([-3, 0, 0]);
    expect(bounds.max).toEqual([4, 9, 4]);
  });
});

describe('buildItemSpriteElement', () => {
  it('describes vanilla item/generated: a 16x16 quad one unit thick', () => {
    const element = buildItemSpriteElement('layer0', 'minecraft:item/netherite_sword');

    expect(element.from).toEqual([0, 0, 7.5]);
    expect(element.to).toEqual([16, 16, 8.5]);
    expect(element.rotations).toEqual([]);
    expect(element.faces.map((face) => face.direction)).toEqual(['north', 'south']);
  });

  it('fills the quad with the texture, mirroring the back face', () => {
    const element = buildItemSpriteElement('layer0', 'item/custom/tlaloc/tlaloc_probe');
    const data = buildItemElementGeometry(element, { width: 16, height: 16 }, SINGLE_TEXTURE);

    expect([...data.uvs]).toEqual([
      // north
      0, 1, 1, 1, 0, 0, 1, 0,
      // south
      1, 1, 0, 1, 1, 0, 0, 0,
    ]);
    expect(data.groups).toEqual([{ textureIndex: 0, start: 0, count: 12 }]);
  });

  it('falls back to a synthetic key when the model declared no texture', () => {
    const element = buildItemSpriteElement(null, '');
    expect(element.faces.map((face) => face.textureKey)).toEqual(['sprite', 'sprite']);
  });

  it('places the quad in the middle of the block, facing north', () => {
    const element = buildItemSpriteElement('layer0', 'item/custom/tlaloc/tlaloc_probe');
    const data = buildItemElementGeometry(element, { width: 16, height: 16 }, SINGLE_TEXTURE);

    const axes = [0, 1, 2].map((axis) =>
      [...data.positions].filter((_, index) => index % 3 === axis),
    );
    expect(Math.min(...axes[0])).toBeCloseTo(0, 6);
    expect(Math.max(...axes[0])).toBeCloseTo(16, 6);
    expect(Math.min(...axes[1])).toBeCloseTo(0, 6);
    expect(Math.max(...axes[1])).toBeCloseTo(16, 6);
    expect(Math.min(...axes[2])).toBeCloseTo(7.5, 6);
    expect(Math.max(...axes[2])).toBeCloseTo(8.5, 6);

    // North is the low-z side, so the front of the sprite is the north quad.
    const north = [...data.positions.slice(0, 12)].filter((_, index) => index % 3 === 2);
    expect(north).toEqual([7.5, 7.5, 7.5, 7.5]);
  });
});
