/**
 * What the `/dev/items` route shows, kept framework-free.
 *
 * A viewer component should own a canvas and a lifecycle and nothing else, so the strings it
 * renders and the choices it offers are built here, where they are unit testable without a
 * TestBed or a WebGL context.
 */

import type { ItemSceneStats, ItemTextureStatus } from './scene';
import { itemTextureFileName } from './textures';
import { ITEM_DISPLAY_CONTEXTS, type ItemDisplayContext, type ItemModel } from './types';

/** One file the dev route can preview. */
export interface ItemPreviewModel {
  /** Stable id, used as the switcher's value. */
  readonly id: string;
  /** Label shown on the switcher button. */
  readonly label: string;
  /** Document-relative URL: `<base href>` carries the deployment prefix, the route does not. */
  readonly url: string;
}

/**
 * The four documents under `public/models/items/tlaloc/`.
 *
 * Two are real geometry with their own textures, and two delegate to a vanilla parent whose
 * texture lives in the game's jar. Both kinds belong in the preview: the degraded sprite is a
 * state a store page will hit, not an error page.
 */
export const ITEM_PREVIEW_MODELS: readonly ItemPreviewModel[] = [
  {
    id: 'tlaloc_hat',
    label: 'Tlaloc hat',
    url: 'models/items/tlaloc/tlaloc_hat.json',
  },
  {
    id: 'tlaloc_staff',
    label: 'Tlaloc staff',
    url: 'models/items/tlaloc/tlaloc_staff.json',
  },
  {
    id: 'netherite_sword',
    label: 'Netherite sword (sprite)',
    url: 'models/items/tlaloc/netherite_sword.json',
  },
  { id: 'paper', label: 'Paper (sprite)', url: 'models/items/tlaloc/paper.json' },
];

/**
 * The `display` contexts a model declares, in the format's own order.
 *
 * In the file's order they would move around whenever the asset is re-exported; in this order
 * the switcher is stable, and a sprite (which declares none) offers nothing to click.
 */
export function displayChoicesFor(model: ItemModel): readonly ItemDisplayContext[] {
  return ITEM_DISPLAY_CONTEXTS.filter((context) =>
    model.display.some((display) => display.context === context),
  );
}

/**
 * The context a preview should open in: `gui` when the file has it, because that is the pose
 * a store page shows, otherwise the first declared one, otherwise the identity.
 */
export function initialDisplayContext(
  choices: readonly ItemDisplayContext[],
): ItemDisplayContext | null {
  if (choices.includes('gui')) return 'gui';
  return choices[0] ?? null;
}

/** One HUD line for the model that is mounted. */
export function describeItemScene(stats: ItemSceneStats): string {
  return [
    stats.kind === 'sprite' ? 'sprite' : 'model',
    `${stats.elements} ${stats.elements === 1 ? 'element' : 'elements'}`,
    `${stats.faces} faces`,
    `${stats.triangles} triangles`,
    `${stats.displayContexts.length}/${ITEM_DISPLAY_CONTEXTS.length} display contexts`,
    stats.warnings.length === 1 ? '1 warning' : `${stats.warnings.length} warnings`,
  ].join(' · ');
}

/** The vanilla parent a sprite delegates to, or `null` for a model with its own geometry. */
export function describeItemParent(model: ItemModel): string | null {
  if (model.kind !== 'sprite' || model.sprite === null) return null;
  return `parent: ${model.sprite.parent}`;
}

/**
 * One HUD line per texture, naming the file the model means.
 *
 * The *file* is what a reader needs: an item model never names a PNG, and "texture not
 * available" is useless without the name of the one that was looked for.
 */
export function describeTextureStatus(status: ItemTextureStatus): string {
  const file = itemTextureFileName(status.path);
  if (status.status === 'unavailable') {
    return `missing: ${status.key} → ${file} (not beside the model)`;
  }
  return `loaded: ${status.key} → ${file}${status.emissive ? ' + emissive' : ''}`;
}
