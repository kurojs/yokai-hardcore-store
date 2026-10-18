/**
 * Parser specs: hitbox filtering, hidden cubes, and precise failures on malformed input.
 *
 * The parser is the only layer that decides what exists, so these tests pin the arithmetic
 * (`rendered + filtered == source`) and the error text rather than only the happy path.
 */

import { isEmissiveTextureName, isHitboxBoneName, parseBbModel } from './parse';
import { bone, cube, face, model, TINY_PNG_DATA_URI } from './testing/fixtures';

describe('isHitboxBoneName', () => {
  it('matches the four collision-bone spellings used by the real asset', () => {
    expect(isHitboxBoneName('ob_tlalochitbox')).toBe(true);
    expect(isHitboxBoneName('ob_tlalochitbox2')).toBe(true);
    expect(isHitboxBoneName('ob_tlalochitbox3')).toBe(true);
    expect(isHitboxBoneName('hitbox')).toBe(true);
  });

  it('is case-insensitive and matches anywhere in the name', () => {
    expect(isHitboxBoneName('HitBox_Handle')).toBe(true);
  });

  it('leaves visible bones alone', () => {
    expect(isHitboxBoneName('head')).toBe(false);
    expect(isHitboxBoneName('body_all')).toBe(false);
    expect(isHitboxBoneName('loincloth0')).toBe(false);
    expect(isHitboxBoneName('staff_slash')).toBe(false);
  });
});

describe('isEmissiveTextureName', () => {
  it('recognises the Blockbench `_e` companion naming', () => {
    expect(isEmissiveTextureName('tlaloc_e.png')).toBe(true);
    expect(isEmissiveTextureName('armour_e.jpg')).toBe(true);
  });

  it('recognises an explicit emissive name', () => {
    expect(isEmissiveTextureName('body-emissive.png')).toBe(true);
  });

  it('does not treat the base atlas as emissive', () => {
    expect(isEmissiveTextureName('tlaloc.png')).toBe(false);
    expect(isEmissiveTextureName('entity_atlas.png')).toBe(false);
  });
});

describe('parseBbModel', () => {
  it('parses a minimal document into one bone and one cube', () => {
    const parsed = parseBbModel(model());

    expect(parsed.name).toBe('probe');
    expect(parsed.resolution).toEqual({ width: 16, height: 16 });
    expect(parsed.bones).toHaveLength(1);
    expect(parsed.bones[0].name).toBe('root');
    expect(parsed.bones[0].depth).toBe(0);
    expect(parsed.cubes).toHaveLength(1);
    expect(parsed.cubes[0].uuid).toBe('cube-1');
    expect(parsed.cubes[0].boneUuid).toBe('bone-1');
    expect(parsed.cubes[0].faces).toHaveLength(6);
    expect(parsed.warnings).toEqual([]);
  });

  it('records bone nesting depth and child links', () => {
    const parsed = parseBbModel(
      model({
        elements: [cube({ uuid: 'cube-a' }), cube({ uuid: 'cube-b' })],
        outliner: [
          bone({
            children: [
              'cube-a',
              bone({ uuid: 'bone-2', name: 'child', children: ['cube-b'] }),
            ],
          }),
        ],
      }),
    );

    expect(parsed.bones.map((item) => [item.name, item.depth])).toEqual([
      ['root', 0],
      ['child', 1],
    ]);
    expect(parsed.bones[0].childBoneUuids).toEqual(['bone-2']);
    expect(parsed.bones[0].cubeUuids).toEqual(['cube-a']);
    expect(parsed.bones[1].parentUuid).toBe('bone-1');
    expect(parsed.cubes[1].boneUuid).toBe('bone-2');
  });

  it('drops a hitbox bone together with its whole subtree', () => {
    const parsed = parseBbModel(
      model({
        elements: [
          cube({ uuid: 'cube-visible' }),
          cube({ uuid: 'cube-hitbox' }),
          cube({ uuid: 'cube-deep' }),
        ],
        outliner: [
          bone({
            children: [
              'cube-visible',
              bone({
                name: 'ob_bosshitbox',
                uuid: 'bone-hitbox',
                children: [
                  'cube-hitbox',
                  // A nested bone inside the hitbox bone: its cube must go too.
                  bone({ name: 'hitbox_inner', uuid: 'bone-inner', children: ['cube-deep'] }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    expect(parsed.cubes.map((item) => item.uuid)).toEqual(['cube-visible']);
    expect(parsed.bones.map((item) => item.name)).toEqual(['root']);
    expect(parsed.hitboxBoneNames).toEqual(['ob_bosshitbox']);
    expect(parsed.cubesFilteredAsHitbox).toBe(2);
    expect(parsed.cubesFilteredAsHidden).toBe(0);
    // The dropped cubes are still accounted for, so the totals reconcile.
    expect(parsed.cubes.length + parsed.cubesFilteredAsHitbox).toBe(3);
  });

  it('drops cubes Blockbench marked hidden', () => {
    const parsed = parseBbModel(
      model({
        elements: [
          cube({ uuid: 'cube-visible' }),
          cube({ uuid: 'cube-hidden', visibility: false }),
        ],
        outliner: [bone({ children: ['cube-visible', 'cube-hidden'] })],
      }),
    );

    expect(parsed.cubes.map((item) => item.uuid)).toEqual(['cube-visible']);
    expect(parsed.cubesFilteredAsHidden).toBe(1);
  });

  it('skips a face whose texture is null and keeps the rest', () => {
    const parsed = parseBbModel(
      model({
        elements: [
          cube({
            faces: {
              north: face(),
              south: face({ texture: null }),
              east: face(),
              west: face(),
              up: face(),
              down: face(),
            },
          }),
        ],
      }),
    );

    expect(parsed.cubes[0].faces.map((item) => item.direction).sort()).toEqual([
      'down',
      'east',
      'north',
      'up',
      'west',
    ]);
  });

  it('reads the emissive flag from the texture name', () => {
    const parsed = parseBbModel(
      model({
        textures: [
          { name: 'atlas.png', source: TINY_PNG_DATA_URI },
          { name: 'atlas_e.png', source: TINY_PNG_DATA_URI },
        ],
      }),
    );

    expect(parsed.textures.map((item) => [item.index, item.name, item.isEmissive])).toEqual([
      [0, 'atlas.png', false],
      [1, 'atlas_e.png', true],
    ]);
  });

  it('warns, without failing, about a UV rotation Blockbench would round to 90 degrees', () => {
    const parsed = parseBbModel(
      model({
        elements: [
          cube({
            faces: {
              north: face({ rotation: 45 }),
              south: face(),
              east: face(),
              west: face(),
              up: face(),
              down: face(),
            },
          }),
        ],
      }),
    );

    expect(parsed.cubes[0].faces.find((item) => item.direction === 'north')?.rotation).toBe(45);
    expect(parsed.warnings.join('\n')).toMatch(/45.*UV rotation/);
  });

  it('warns about duplicate bone names and rescale=true', () => {
    const parsed = parseBbModel(
      model({
        elements: [cube({ rescale: true })],
        outliner: [
          bone({
            children: [
              'cube-1',
              bone({ uuid: 'bone-2', name: 'root' }),
            ],
          }),
        ],
      }),
    );

    const warnings = parsed.warnings.join('\n');
    expect(warnings).toMatch(/duplicate bone names: root/);
    expect(warnings).toMatch(/rescale=true/);
  });

  it('warns about cubes no outliner entry references', () => {
    const parsed = parseBbModel(
      model({
        elements: [cube({ uuid: 'cube-1' }), cube({ uuid: 'cube-orphan' })],
      }),
    );

    expect(parsed.warnings.join('\n')).toMatch(/1 cube\(s\).*never referenced/);
  });

  describe('malformed input', () => {
    it('rejects a non-object document', () => {
      expect(() => parseBbModel(null)).toThrow(/bbmodel: model document must be an object/);
    });

    it('rejects a document without elements', () => {
      expect(() => parseBbModel(model({ elements: undefined }))).toThrow(
        /bbmodel: missing or invalid required array "elements"/,
      );
    });

    it('rejects a document without an outliner', () => {
      expect(() => parseBbModel(model({ outliner: undefined }))).toThrow(
        /bbmodel: missing or invalid required array "outliner"/,
      );
    });

    it('rejects a cube with a malformed box', () => {
      expect(() => parseBbModel(model({ elements: [cube({ from: [0, 0] })] }))).toThrow(
        /\(elements\[0\]\)\.from must have at least 3 components, received 2/,
      );
    });

    it('rejects an outliner entry pointing at an unknown cube', () => {
      expect(() => parseBbModel(model({ outliner: [bone({ children: ['ghost'] })] }))).toThrow(
        /outliner\[0\]\.children\[0\] references cube uuid "ghost" which is not present in "elements"/,
      );
    });

    it('rejects duplicate element uuids', () => {
      expect(() =>
        parseBbModel(model({ elements: [cube(), cube({ name: 'other' })] })),
      ).toThrow(/duplicate element uuid "cube-1"/);
    });

    it('rejects a cube with no textured faces', () => {
      expect(() => parseBbModel(model({ elements: [cube({ faces: {} })] }))).toThrow(
        /element "cube-1" \(elements\[0\]\) has no textured faces/,
      );
    });

    it('rejects a document whose whole outliner was filtered out', () => {
      expect(() =>
        parseBbModel(
          model({
            outliner: [bone({ name: 'hitbox', uuid: 'bone-h', children: ['cube-1'] })],
          }),
        ),
      ).toThrow(/the outliner contains no renderable bone/);
    });

    it('rejects a document with a bone but no renderable cube', () => {
      expect(() =>
        parseBbModel(
          model({
            elements: [cube({ visibility: false })],
            outliner: [bone({ children: ['cube-1'] })],
          }),
        ),
      ).toThrow(/the outliner references no renderable cube/);
    });
  });

  describe('defensive keyframe shapes', () => {
    it('reads the array form the real asset uses', () => {
      const parsed = parseBbModel(
        model({
          animations: [
            {
              name: 'move',
              loop: 'loop',
              length: 1,
              animators: {
                'bone-1': {
                  type: 'bone',
                  keyframes: [
                    { channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
                    { channel: 'position', time: 1, data_points: [{ x: 0, y: 2, z: 0 }] },
                  ],
                },
              },
            },
          ],
        }),
      );

      expect(parsed.animations[0].channels).toHaveLength(1);
      expect(parsed.animations[0].channels[0].times).toEqual([0, 1]);
      expect(parsed.animations[0].channels[0].values).toEqual([
        [0, 0, 0],
        [0, 2, 0],
      ]);
      expect(parsed.warnings).toEqual([]);
    });

    it('recovers a timestamp-keyed object form and says so', () => {
      const parsed = parseBbModel(
        model({
          animations: [
            {
              name: 'move',
              animators: {
                'bone-1': {
                  keyframes: {
                    0: [{ channel: 'position', data_points: [{ x: 1, y: 0, z: 0 }] }],
                    2: [{ channel: 'position', data_points: [{ x: 3, y: 0, z: 0 }] }],
                  },
                },
              },
            },
          ],
        }),
      );

      expect(parsed.animations[0].channels[0].times).toEqual([0, 2]);
      expect(parsed.warnings.join('\n')).toMatch(/keyed by time instead of an array/);
    });

    it('reads numeric strings, skips Molang expressions, and warns', () => {
      const parsed = parseBbModel(
        model({
          animations: [
            {
              name: 'move',
              animators: {
                'bone-1': {
                  keyframes: [
                    { channel: 'position', time: 0, data_points: [{ x: '1', y: 0, z: 0 }] },
                    {
                      channel: 'position',
                      time: 1,
                      data_points: [{ x: 'math.sin(query.anim_time)', y: 0, z: 0 }],
                    },
                  ],
                },
              },
            },
          ],
        }),
      );

      expect(parsed.animations[0].channels[0].values).toEqual([[1, 0, 0]]);
      expect(parsed.warnings.join('\n')).toMatch(/non-numeric expression/);
    });

    it('warns when an animator points at a node that was filtered out', () => {
      const parsed = parseBbModel(
        model({
          animations: [
            {
              name: 'move',
              animators: {
                'bone-hitbox': {
                  name: 'ob_bosshitbox',
                  keyframes: [{ channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] }],
                },
              },
            },
          ],
        }),
      );

      expect(parsed.animations[0].channels).toEqual([]);
      expect(parsed.warnings.join('\n')).toMatch(/matches no rendered bone or cube/);
    });
  });
});
