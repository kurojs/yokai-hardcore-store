/**
 * Specs for the dev route's view model.
 *
 * These are the parts of `/dev/items` that are decisions rather than plumbing: which models
 * are offered, which contexts a file can be posed in, which one it opens in, and what the HUD
 * says about a texture that is not there.
 */

import { parseItemModel } from './parse';
import {
  describeItemParent,
  describeItemScene,
  describeTextureStatus,
  displayChoicesFor,
  initialDisplayContext,
  ITEM_PREVIEW_MODELS,
} from './preview';
import type { ItemSceneStats } from './scene';
import { ITEM_DISPLAY_CONTEXTS } from './types';
import { itemDisplay, itemModel, spriteModel } from './testing/fixtures';

describe('ITEM_PREVIEW_MODELS', () => {
  it('offers the two real models and the two sprites', () => {
    expect(ITEM_PREVIEW_MODELS.map((model) => model.id)).toEqual([
      'tlaloc_hat',
      'tlaloc_staff',
      'netherite_sword',
      'paper',
    ]);
    expect(
      ITEM_PREVIEW_MODELS.every(
        (model) => model.url.startsWith('models/items/tlaloc/') && !model.url.startsWith('/'),
      ),
    ).toBe(true);
    expect(new Set(ITEM_PREVIEW_MODELS.map((model) => model.url)).size).toBe(
      ITEM_PREVIEW_MODELS.length,
    );
  });
});

describe('displayChoicesFor', () => {
  it('returns the declared contexts in the format order, not the file order', () => {
    const model = parseItemModel(
      itemModel({ display: { head: itemDisplay(), gui: itemDisplay(), ground: itemDisplay() } }),
    );

    expect(model.display.map((display) => display.context)).toEqual(['head', 'gui', 'ground']);
    expect(displayChoicesFor(model)).toEqual(['ground', 'gui', 'head']);
  });

  it('offers all eight for a file that declares all eight', () => {
    const model = parseItemModel(
      itemModel({ display: Object.fromEntries(ITEM_DISPLAY_CONTEXTS.map((context) => [context, itemDisplay()])) }),
    );
    expect(displayChoicesFor(model)).toEqual([...ITEM_DISPLAY_CONTEXTS]);
  });

  it('offers nothing for a sprite, which poses itself by delegation', () => {
    expect(displayChoicesFor(parseItemModel(spriteModel()))).toEqual([]);
  });
});

describe('initialDisplayContext', () => {
  it('opens in gui when the file has it', () => {
    expect(initialDisplayContext(['ground', 'gui', 'head'])).toBe('gui');
  });

  it('falls back to the first declared context, then to the identity', () => {
    expect(initialDisplayContext(['head', 'ground'])).toBe('head');
    expect(initialDisplayContext([])).toBeNull();
  });
});

describe('describeItemScene', () => {
  /** The numbers are passed in, so this is a formatting decision and not a parser test. */
  function stats(overrides: Partial<ItemSceneStats> = {}): ItemSceneStats {
    return {
      kind: 'geometry',
      elements: 29,
      faces: 174,
      meshes: 29,
      triangles: 348,
      textures: [],
      displayContexts: [...ITEM_DISPLAY_CONTEXTS],
      modelBounds: { min: [0, 0, 0], max: [16, 16, 16] },
      warnings: [],
      ...overrides,
    };
  }

  it('summarises the hat with its measured counts', () => {
    expect(describeItemScene(stats())).toBe(
      'model · 29 elements · 174 faces · 348 triangles · 8/8 display contexts · 0 warnings',
    );
  });

  it('calls a sprite a sprite, and counts its single quad', () => {
    expect(
      describeItemScene(stats({ kind: 'sprite', elements: 1, faces: 2, triangles: 4, displayContexts: [] })),
    ).toBe('sprite · 1 element · 2 faces · 4 triangles · 0/8 display contexts · 0 warnings');
  });

  it('reports warnings as a count a reader can act on', () => {
    expect(describeItemScene(stats({ warnings: ['one'] }))).toContain('1 warning');
    expect(describeItemScene(stats({ warnings: ['one', 'two'] }))).toContain('2 warnings');
  });
});

describe('describeItemParent', () => {
  it('names the vanilla parent of a sprite', () => {
    expect(describeItemParent(parseItemModel(spriteModel()))).toBe(
      'parent: minecraft:item/handheld',
    );
    expect(
      describeItemParent(parseItemModel(spriteModel({ parent: 'minecraft:item/generated' }))),
    ).toBe('parent: minecraft:item/generated');
  });

  it('says nothing for a model with its own geometry', () => {
    expect(describeItemParent(parseItemModel(itemModel()))).toBeNull();
  });
});

describe('describeTextureStatus', () => {
  it('names the file a loaded texture resolved to, including the emissive companion', () => {
    expect(
      describeTextureStatus({
        key: '0',
        path: 'item/custom/tlaloc/tlaloc_staff',
        url: '/models/items/tlaloc/tlaloc_staff.png',
        status: 'loaded',
        emissive: true,
      }),
    ).toBe('loaded: 0 → tlaloc_staff.png + emissive');

    expect(
      describeTextureStatus({
        key: '0',
        path: 'item/custom/tlaloc/tlaloc_hat',
        url: '/models/items/tlaloc/tlaloc_hat.png',
        status: 'loaded',
        emissive: false,
      }),
    ).toBe('loaded: 0 → tlaloc_hat.png');
  });

  it('names the file that was looked for when it is missing', () => {
    expect(
      describeTextureStatus({
        key: 'layer0',
        path: 'minecraft:item/netherite_sword',
        url: null,
        status: 'unavailable',
        emissive: false,
      }),
    ).toBe('missing: layer0 → netherite_sword.png (not beside the model)');
  });
});
