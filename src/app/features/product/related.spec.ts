/**
 * Specs for the related-products rule.
 *
 * The rule exists because four of the ten categories hold exactly one product: a strip that
 * simply rendered "the rest of this category" would be an empty section on those pages. What
 * these tests pin is that the fallback is a rule and not a silent empty list — it widens, it
 * spreads across categories, and it only disappears when a catalog cannot produce anything.
 *
 * Most assertions run against the committed 48-product catalog so a change in the data is
 * visible here instead of showing up as an empty strip on a real page.
 */

import { buildCatalogIndex, type CatalogEntry } from '../../core/catalog/catalog-index';
import { parseCatalogResponse } from '../../core/catalog/catalog-validation';
import { readCommittedCatalogDocument } from '../../core/catalog/testing/committed-catalog';
import { category, indexOf, product } from '../../core/catalog/testing/entities';
import { RELATED_COUNT, selectRelated } from './related';

const index = buildCatalogIndex(parseCatalogResponse(readCommittedCatalogDocument()));

/** The real entry for `slug`; fails the test rather than the page if the catalog moves. */
function entryOf(slug: string): CatalogEntry {
  const entry = index.entries.find((candidate) => candidate.product.slug === slug);
  if (entry === undefined) throw new Error(`no product with slug "${slug}" in the catalog`);
  return entry;
}

function slugs(entries: readonly CatalogEntry[]): string[] {
  return entries.map((entry) => entry.product.slug);
}

describe('selectRelated', () => {
  it('picks the following products of the same category, in catalog order', () => {
    const selection = selectRelated(index.entries, entryOf('10-algodones-de-azucar'), RELATED_COUNT);

    expect(selection?.kind).toBe('same-category');
    expect(slugs(selection!.entries)).toEqual([
      '10-cuencos-de-arroz',
      '10-galletas-creeper',
      '10-gelatinas-de-slime',
    ]);
    expect(selection!.entries.every((entry) => entry.category.id === 'alimento-yokai-para-guerreros-y-pets')).toBe(true);
  });

  it('shows what the category has when it has fewer products than the limit', () => {
    // Cofres/Ofertas holds three products, so a cofre page can only ever offer two siblings.
    const selection = selectRelated(index.entries, entryOf('cofre-de-runas'), RELATED_COUNT);

    expect(selection?.kind).toBe('same-category');
    expect(selection!.entries).toHaveLength(2);
    expect(slugs(selection!.entries)).not.toContain('cofre-de-runas');
  });

  it('widens to one product per other category when the product is alone in its category', () => {
    const selection = selectRelated(index.entries, entryOf('cupon-canjeable-para-familiar'), RELATED_COUNT);

    expect(selection?.kind).toBe('other-categories');
    expect(selection!.entries).toHaveLength(3);
    // One per category, never two from the same one: products are alphabetical, so three
    // consecutive entries would otherwise often all be food.
    expect(new Set(selection!.entries.map((entry) => entry.category.id)).size).toBe(3);
    expect(selection!.entries.map((entry) => entry.category.slug)).toEqual([
      'alimento-yokai-para-guerreros-y-pets',
      'bosque-de-las-ninfas',
      'artefactos-magicos',
    ]);
    expect(slugs(selection!.entries)).not.toContain('cupon-canjeable-para-familiar');
  });

  it('applies the same widening to every single-product category', () => {
    // A rule that only worked for `mascotas` would be a special case dressed as a rule.
    for (const slug of ['cupon-canjeable-para-familiar', 'flow-del-end', 'resucitar', 'bolsa-de-10-yokai']) {
      const selection = selectRelated(index.entries, entryOf(slug), RELATED_COUNT);

      expect(selection?.kind).toBe('other-categories');
      expect(selection!.entries).toHaveLength(3);
      expect(selection!.entries.map((entry) => entry.category.id)).not.toContain(
        entryOf(slug).category.id,
      );
    }
  });

  it('honours a smaller limit', () => {
    expect(selectRelated(index.entries, entryOf('10-algodones-de-azucar'), 2)?.entries).toHaveLength(2);
    expect(selectRelated(index.entries, entryOf('cupon-canjeable-para-familiar'), 1)?.entries).toHaveLength(1);
  });

  it('returns null for a limit that cannot describe a section', () => {
    const current = entryOf('10-algodones-de-azucar');

    expect(selectRelated(index.entries, current, 0)).toBeNull();
    expect(selectRelated(index.entries, current, -2)).toBeNull();
    expect(selectRelated(index.entries, current, 1.5)).toBeNull();
    expect(selectRelated(index.entries, current, Number.NaN)).toBeNull();
  });

  it('returns null when the catalog has no other category to widen into', () => {
    const lonely = indexOf(
      [category('solo')],
      [product('only-one', 'solo'), product('only-two', 'solo')],
    );

    expect(selectRelated(lonely.entries, lonely.entries[0]!, 3)?.kind).toBe('same-category');
    expect(selectRelated([lonely.entries[0]!], lonely.entries[0]!, 3)).toBeNull();
  });

  it('never mutates the catalog it reads', () => {
    const before = slugs(index.entries);

    selectRelated(index.entries, entryOf('cupon-canjeable-para-familiar'), RELATED_COUNT);

    expect(slugs(index.entries)).toEqual(before);
  });
});
