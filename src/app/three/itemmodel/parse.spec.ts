/**
 * Specs for the item model parser.
 *
 * Every case here is a decision the format forces and a `.bbmodel` parser would get wrong:
 * axis-angle rotation, a UV space that `texture_size` reinterprets, `#` texture indirection,
 * the `particle` key that is not a face texture, and a parent-driven sprite that is a valid
 * model rather than a failure.
 */

import { parseItemModel } from './parse';
import type { ItemModel } from './types';
import {
  itemDisplay,
  itemElement,
  itemFace,
  itemFaces,
  itemModel,
  itemRotation,
  spriteModel,
} from './testing/fixtures';

/** Runs the parser and returns the thrown message, failing the test when nothing throws. */
function messageOfThrown(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected the parser to throw, but it returned normally');
}

describe('parseItemModel', () => {
  describe('texture_size', () => {
    it('defaults to the 16-unit UV space when the file does not declare a size', () => {
      const model = parseItemModel(itemModel({ texture_size: undefined }));
      expect(model.textureSize).toEqual({ width: 16, height: 16 });
    });

    it('reads the declared size, including a non-square one', () => {
      const model = parseItemModel(itemModel({ texture_size: [64, 128] }));
      expect(model.textureSize).toEqual({ width: 64, height: 128 });
    });

    it('rejects a size that is not two positive numbers', () => {
      expect(messageOfThrown(() => parseItemModel(itemModel({ texture_size: [64] })))).toContain(
        'texture_size must have 2 components',
      );
      expect(messageOfThrown(() => parseItemModel(itemModel({ texture_size: [64, 0] })))).toContain(
        'texture_size must be positive',
      );
      expect(messageOfThrown(() => parseItemModel(itemModel({ texture_size: '64' })))).toContain(
        'missing or invalid required array "texture_size"',
      );
      expect(messageOfThrown(() => parseItemModel(itemModel({ texture_size: [64, 'tall'] })))).toContain(
        'texture_size[1] must be a finite number',
      );
    });
  });

  describe('textures', () => {
    it('keeps the path behind a key, and flags the particle declaration', () => {
      const model = parseItemModel(itemModel());

      expect(model.textures).toEqual([
        {
          key: '0',
          path: 'item/custom/tlaloc/tlaloc_probe',
          isParticle: false,
          isNamespaced: false,
        },
        {
          key: 'particle',
          path: 'item/custom/tlaloc/tlaloc_probe',
          isParticle: true,
          isNamespaced: false,
        },
      ]);
    });

    it('marks a namespaced path as delegated to another resource pack', () => {
      const model = parseItemModel(
        itemModel({ textures: { 0: 'minecraft:item/netherite_sword' } }),
      );
      expect(model.textures[0].isNamespaced).toBe(true);
    });

    it('rejects a texture whose value is not a string', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ textures: { 0: 4 } })),
        ),
      ).toContain('textures["0"] must be a non-empty string');
    });
  });

  describe('the # texture indirection', () => {
    it('resolves a face texture key into the path declared by textures', () => {
      const model = parseItemModel(
        itemModel({
          textures: { base: 'item/custom/tlaloc/tlaloc_probe' },
          elements: [itemElement({ faces: itemFaces('#base') })],
        }),
      );

      for (const face of model.elements[0].faces) {
        expect(face.textureKey).toBe('base');
        expect(face.texturePath).toBe('item/custom/tlaloc/tlaloc_probe');
      }
    });

    it('fails on a key that the textures map does not declare', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ faces: itemFaces('#missing') })] })),
        ),
      ).toContain('which matches no key in "textures"');
    });

    it('refuses the particle declaration as a face texture', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ faces: itemFaces('#particle') })] })),
        ),
      ).toContain('is the "particle" texture declaration and not a face texture');
    });

    it('rejects a bare path in place of a # reference', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(
            itemModel({
              textures: { 0: 'item/custom/tlaloc/tlaloc_hat' },
              elements: [itemElement({ faces: itemFaces('item/custom/tlaloc/tlaloc_hat') })],
            }),
          ),
        ),
      ).toContain('a face texture must reference the "textures" map as "#name"');
    });
  });

  describe('element rotation', () => {
    it('accepts the object form and preserves angle, axis and origin', () => {
      const model = parseItemModel(
        itemModel({
          elements: [itemElement({ rotation: itemRotation({ angle: 22.5, axis: 'x', origin: [7, 3.9, 4.95866] }) })],
        }),
      );

      expect(model.elements[0].rotations).toEqual([
        { angle: 22.5, axis: 'x', origin: [7, 3.9, 4.95866] },
      ]);
    });

    it('accepts the array form and preserves the order it was written in', () => {
      const model = parseItemModel(
        itemModel({
          elements: [
            itemElement({
              rotation: [
                itemRotation({ angle: 45, axis: 'y', origin: [8, 8, 8] }),
                itemRotation({ angle: -22.5, axis: 'z', origin: [8, 8, 8] }),
              ],
            }),
          ],
        }),
      );

      expect(model.elements[0].rotations.map((rotation) => [rotation.axis, rotation.angle])).toEqual(
        [
          ['y', 45],
          ['z', -22.5],
        ],
      );
    });

    it('reports a missing rotation as an empty list rather than a zero rotation', () => {
      const model = parseItemModel(itemModel({ elements: [itemElement({ rotation: undefined })] }));
      expect(model.elements[0].rotations).toEqual([]);
    });

    it('rejects an unknown axis, a missing origin and an empty array', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ rotation: itemRotation({ axis: 'w' }) })] })),
        ),
      ).toContain('.axis must be one of x, y, z');

      expect(
        messageOfThrown(() =>
          parseItemModel(
            itemModel({ elements: [itemElement({ rotation: { angle: 45, axis: 'y' } })] }),
          ),
        ),
      ).toContain('elements[0].rotation.origin');

      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ rotation: [] })] })),
        ),
      ).toContain('is an empty array; either omit the field or provide a rotation');
    });
  });

  describe('faces', () => {
    it('keeps the six directions in a fixed order regardless of file order', () => {
      const model = parseItemModel(itemModel());
      expect(model.elements[0].faces.map((face) => face.direction)).toEqual([
        'east',
        'west',
        'up',
        'down',
        'south',
        'north',
      ]);
    });

    it('accepts a subset of faces', () => {
      const model = parseItemModel(
        itemModel({ elements: [itemElement({ faces: { north: itemFace(), up: itemFace() } })] }),
      );
      expect(model.elements[0].faces.map((face) => face.direction)).toEqual(['up', 'north']);
    });

    it('keeps the authored UV order, mirrored or not', () => {
      const mirrored = itemFace({ uv: [16, 0, 0, 16] });
      const model = parseItemModel(itemModel({ elements: [itemElement({ faces: { south: mirrored } })] }));
      expect(model.elements[0].faces[0].uv).toEqual([16, 0, 0, 16]);
    });

    it('defaults the face rotation to zero and rejects a non-multiple of 90', () => {
      const model = parseItemModel(
        itemModel({ elements: [itemElement({ faces: { up: itemFace() } })] }),
      );
      expect(model.elements[0].faces[0].rotation).toBe(0);

      expect(
        messageOfThrown(() =>
          parseItemModel(
            itemModel({ elements: [itemElement({ faces: { up: itemFace({ rotation: 45 }) } })] }),
          ),
        ),
      ).toContain('rotation must be a multiple of 90 degrees');
    });

    it('rejects an element with no faces and a UV rect that is not four numbers', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ faces: {} })] })),
        ),
      ).toContain('has no faces');

      expect(
        messageOfThrown(() =>
          parseItemModel(
            itemModel({ elements: [itemElement({ faces: { up: itemFace({ uv: [0, 0, 16] }) } })] }),
          ),
        ),
      ).toContain('.uv must have exactly 4 components');
    });

    it('rejects an element whose from/to is not a 3-component vector', () => {
      expect(
        messageOfThrown(() =>
          parseItemModel(itemModel({ elements: [itemElement({ from: [0, 0] })] })),
        ),
      ).toContain('elements[0].from must have exactly 3 components');
    });
  });

  describe('UVs outside the texture', () => {
    it('warns once, names an example, and keeps the face', () => {
      // On a 64x64 texture a v of 22.5 is pixel 90, past the bottom edge. This is the real
      // defect in `tlaloc_hat.json`, scaled down to one face.
      const model = parseItemModel(
        itemModel({ elements: [itemElement({ faces: { down: itemFace({ uv: [4.5, 22.5, 3.75, 24] }) } })] }),
      );

      expect(model.warnings).toHaveLength(1);
      expect(model.warnings[0]).toContain('1 face(s) sample outside the 64x64 texture');
      expect(model.warnings[0]).toContain('elements[0].faces.down uv 4.5, 22.5, 3.75, 24');
      expect(model.elements[0].faces[0].uv).toEqual([4.5, 22.5, 3.75, 24]);
    });

    it('stays silent for a UV rect inside the texture', () => {
      const model = parseItemModel(
        itemModel({ elements: [itemElement({ faces: { down: itemFace({ uv: [0, 0, 15.5, 15] }) } })] }),
      );
      expect(model.warnings).toEqual([]);
    });
  });

  describe('display', () => {
    it('keeps only the contexts the file declares', () => {
      const model = parseItemModel(
        itemModel({
          display: { gui: itemDisplay(), thirdperson_righthand: itemDisplay() },
        }),
      );
      expect(model.display.map((entry) => entry.context)).toEqual(['gui', 'thirdperson_righthand']);
      expect(model.display[0]).toEqual({
        context: 'gui',
        rotation: [0, 0, 0],
        translation: [0, 0, 0],
        scale: [1, 1, 1],
      });
    });

    it('fills absent fields with the format defaults', () => {
      const model = parseItemModel(itemModel({ display: { gui: { rotation: [158.17, -36.65, 156.02] } } }));
      expect(model.display[0].rotation).toEqual([158.17, -36.65, 156.02]);
      expect(model.display[0].translation).toEqual([0, 0, 0]);
      expect(model.display[0].scale).toEqual([1, 1, 1]);
    });

    it('warns about an unknown context instead of failing the model', () => {
      const model = parseItemModel(itemModel({ display: { gui: itemDisplay(), hud: itemDisplay() } }));
      expect(model.display.map((entry) => entry.context)).toEqual(['gui']);
      expect(model.warnings).toEqual([
        'display.hud is not one of the eight known contexts and was ignored',
      ]);
    });

    it('reports no contexts when the file has no display block', () => {
      expect(parseItemModel(itemModel({ display: undefined })).display).toEqual([]);
    });
  });

  describe('parent-driven sprites', () => {
    it('is a sprite when the file declares a parent and no elements', () => {
      const model = parseItemModel(spriteModel());

      expect(model.kind).toBe('sprite');
      expect(model.elements).toEqual([]);
      expect(model.sprite).toEqual({
        textureKey: 'layer0',
        texturePath: 'minecraft:item/netherite_sword',
        parent: 'minecraft:item/handheld',
      });
    });

    it('prefers layer0 over any other declared texture', () => {
      const model = parseItemModel(
        spriteModel({ textures: { other: 'item/custom/tlaloc/tlaloc_hat', layer0: 'item/custom/tlaloc/tlaloc_staff' } }),
      );
      expect(model.sprite?.textureKey).toBe('layer0');
      expect(model.sprite?.texturePath).toBe('item/custom/tlaloc/tlaloc_staff');
    });

    it('is still a sprite, with a warning, when it declares no usable texture', () => {
      const model = parseItemModel(spriteModel({ textures: {} }));

      expect(model.kind).toBe('sprite');
      expect(model.sprite).toEqual({
        textureKey: null,
        texturePath: null,
        parent: 'minecraft:item/handheld',
      });
      expect(model.warnings).toEqual([
        'the model delegates to parent "minecraft:item/handheld" and declares no texture of its own; it will render untextured',
      ]);
    });

    it('ignores the particle declaration when choosing the sprite texture', () => {
      const model = parseItemModel(
        spriteModel({ textures: { particle: 'item/custom/tlaloc/tlaloc_hat' } }),
      );
      expect(model.sprite?.textureKey).toBeNull();
    });

    it('treats an empty elements array as no elements', () => {
      const model = parseItemModel(spriteModel({ elements: [] }));
      expect(model.kind).toBe('sprite');
    });

    it('prefers declared elements over the parent', () => {
      const model = parseItemModel(
        spriteModel({ textures: { 0: 'item/custom/tlaloc/tlaloc_probe' }, elements: [itemElement()] }),
      );
      expect(model.kind).toBe('geometry');
      expect(model.sprite).toBeNull();
      expect(model.elements).toHaveLength(1);
    });
  });

  describe('inputs that cannot be rendered at all', () => {
    it('fails when there are no elements and no parent', () => {
      expect(messageOfThrown(() => parseItemModel({ textures: {} }))).toContain(
        'the document has no renderable "elements" and no "parent"',
      );
    });

    it('fails when the elements array is empty and there is no parent', () => {
      expect(messageOfThrown(() => parseItemModel({ elements: [] }))).toContain(
        '"elements" is empty and there is no "parent" to inherit geometry from',
      );
    });

    it('fails on a document that is not an object, and prefixes the message', () => {
      for (const value of [null, 42, 'model', ['elements']]) {
        const message = messageOfThrown(() => parseItemModel(value));
        expect(message.startsWith('itemmodel: ')).toBe(true);
        expect(message).toContain('model document must be an object');
      }
    });

    it('never returns a geometry model with zero elements', () => {
      const built: ItemModel[] = [
        parseItemModel(itemModel()),
        parseItemModel(spriteModel()),
        parseItemModel(spriteModel({ textures: {} })),
      ];
      for (const model of built) {
        if (model.kind === 'geometry') expect(model.elements.length).toBeGreaterThan(0);
      }
    });
  });
});
