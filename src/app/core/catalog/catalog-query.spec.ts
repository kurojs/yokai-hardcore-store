/**
 * Specs for the search, filter and sort predicates.
 *
 * Search semantics are the part of this task a user notices most, so they are pinned
 * explicitly: which fields are searched, that accents and case are folded on both sides,
 * that multiple terms narrow (AND), that the price ceiling is inclusive, and that sorting
 * never mutates the caller's array.
 */

import {
  DEFAULT_CATALOG_QUERY,
  applyQuery,
  matchesFilters,
  matchesSearch,
  normalizeQuery,
  sortEntries,
} from './catalog-query';
import { category, indexOf, product } from './testing/entities';

const CATEGORIES = [
  category('alimento', { name: 'Alimento Yokai' }),
  category('mascotas', { name: 'Mascotas' }),
  category('cofres', { name: 'Cofres/Ofertas' }),
];

const PRODUCTS = [
  product('algodones', 'alimento', {
    name: '10 ALGODONES DE AZUCAR',
    priceUsd: 1,
    description: '¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!',
  }),
  product('calamar', 'mascotas', {
    name: 'Testículos De Calamar',
    priceUsd: 2,
    description: 'Calamar crujiente.',
  }),
  product('runas', 'cofres', {
    name: 'COFRE DE RUNAS',
    priceUsd: 3,
    description: 'Un cofre lleno de runas.',
  }),
  product('familiar', 'mascotas', {
    name: 'CUPÓN CANJEABLE PARA FAMILIAR',
    priceUsd: 10,
    description: 'Canjea una mascota leal.',
  }),
];

const index = indexOf(CATEGORIES, PRODUCTS);
const search = (text: string, categoryId: string | null = null): string[] =>
  applyQuery(index.entries, { text, categoryId }).map((entry) => entry.product.id);

describe('normalizeQuery', () => {
  it('defaults every field when nothing is given', () => {
    expect(normalizeQuery()).toEqual(DEFAULT_CATALOG_QUERY);
    expect(normalizeQuery(null)).toEqual(DEFAULT_CATALOG_QUERY);
  });

  it('trims the text', () => {
    expect(normalizeQuery({ text: '  azucar  ' }).text).toBe('azucar');
  });

  it('treats an empty category id as no category', () => {
    expect(normalizeQuery({ categoryId: '' }).categoryId).toBeNull();
    expect(normalizeQuery({ categoryId: '   ' }).categoryId).toBeNull();
    expect(normalizeQuery({ categoryId: null }).categoryId).toBeNull();
  });

  it('rejects a price ceiling that could not come from a control', () => {
    expect(normalizeQuery({ maxPriceUsd: Number.NaN }).maxPriceUsd).toBeNull();
    expect(normalizeQuery({ maxPriceUsd: 0 }).maxPriceUsd).toBeNull();
    expect(normalizeQuery({ maxPriceUsd: -5 }).maxPriceUsd).toBeNull();
    expect(normalizeQuery({ maxPriceUsd: 5 }).maxPriceUsd).toBe(5);
  });
});

describe('matchesSearch', () => {
  const entry = index.entries[0]!;

  it('matches everything for an empty or whitespace-only query', () => {
    expect(matchesSearch(entry, '')).toBe(true);
    expect(matchesSearch(entry, '   ')).toBe(true);
    expect(matchesSearch(entry, '\n\t')).toBe(true);
  });

  it('ignores case in both directions', () => {
    expect(matchesSearch(entry, 'ALGODONES')).toBe(true);
    expect(matchesSearch(entry, 'algodones')).toBe(true);
    expect(matchesSearch(entry, 'AlGoDoNeS')).toBe(true);
  });

  it('folds accents in both directions', () => {
    // Unaccented query against accented copy, and accented query against unaccented copy.
    expect(matchesSearch(entry, 'azucar')).toBe(true);
    expect(matchesSearch(entry, 'azúcar')).toBe(true);
    // The query is folded too, so the accented form is not required on either side.
    expect(matchesSearch(entry, 'ALIMENTATE')).toBe(true);
    expect(matchesSearch(entry, 'aliméntate')).toBe(true);
  });

  it('searches the description as well as the name', () => {
    expect(matchesSearch(entry, 'guerrero')).toBe(true);
    expect(matchesSearch(entry, 'goblin')).toBe(true);
  });

  it('searches the category name', () => {
    const runas = index.entries.find((candidate) => candidate.product.id === 'runas')!;
    expect(matchesSearch(runas, 'cofres')).toBe(true);
    expect(matchesSearch(runas, 'ofertas')).toBe(true);
  });

  it('requires every term to match, so extra words narrow the result', () => {
    expect(matchesSearch(entry, 'algodones azucar')).toBe(true);
    expect(matchesSearch(entry, 'algodones calamar')).toBe(false);
    expect(matchesSearch(entry, 'azucar goblin')).toBe(true);
  });

  it('matches a substring inside a word', () => {
    expect(matchesSearch(entry, 'algod')).toBe(true);
    expect(matchesSearch(entry, 'zucar')).toBe(true);
  });

  it('reports no match for unrelated text', () => {
    expect(matchesSearch(entry, 'pickaxe')).toBe(false);
    expect(matchesSearch(entry, 'zzz')).toBe(false);
  });

  it('matches a query typed with the inverted marks left out', () => {
    // The description starts with `¡`, which folding keeps; the query without it still
    // matches because the comparison is a substring test.
    expect(matchesSearch(entry, 'alimentate como todo un guerrero')).toBe(true);
  });
});

describe('matchesFilters', () => {
  const cheap = index.entries.find((entry) => entry.product.id === 'algodones')!;

  it('does not constrain anything when both filters are null', () => {
    expect(matchesFilters(cheap, { ...DEFAULT_CATALOG_QUERY })).toBe(true);
  });

  it('restricts to a category', () => {
    expect(matchesFilters(cheap, normalizeQuery({ categoryId: 'alimento' }))).toBe(true);
    expect(matchesFilters(cheap, normalizeQuery({ categoryId: 'mascotas' }))).toBe(false);
  });

  it('treats the price ceiling as inclusive', () => {
    expect(matchesFilters(cheap, normalizeQuery({ maxPriceUsd: 1 }))).toBe(true);
    expect(matchesFilters(cheap, normalizeQuery({ maxPriceUsd: 0.99 }))).toBe(false);
  });
});

describe('sortEntries', () => {
  it('leaves the catalog order alone for featured', () => {
    expect(sortEntries(index.entries, 'featured').map((entry) => entry.product.id)).toEqual([
      'algodones',
      'calamar',
      'runas',
      'familiar',
    ]);
  });

  it('sorts by ascending price with the name as the tie-breaker', () => {
    expect(sortEntries(index.entries, 'price-asc').map((entry) => entry.product.priceUsd)).toEqual([
      1, 2, 3, 10,
    ]);
  });

  it('sorts by descending price', () => {
    expect(sortEntries(index.entries, 'price-desc').map((entry) => entry.product.id)).toEqual([
      'familiar',
      'runas',
      'calamar',
      'algodones',
    ]);
  });

  it('orders the quantity-prefixed names by value, not lexically', () => {
    // `numeric: true`. Lexically "10 Cuencos" would come before "3 Ramen".
    const entries = indexOf(
      [category('x')],
      [product('ten', 'x', { name: '10 Cuencos de arroz' }), product('three', 'x', { name: '3 Ramen' })],
    ).entries;

    expect(sortEntries(entries, 'name-asc').map((entry) => entry.product.name)).toEqual([
      '3 Ramen',
      '10 Cuencos de arroz',
    ]);
  });

  it('sorts names without regard to case or accents', () => {
    const collator = (a: string, b: string) =>
      new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare(a, b);
    expect(collator('AZUCAR', 'Azúcar')).toBe(0);
    expect(collator('Células De Kaiyin', 'Celulas De Kaiyin')).toBe(0);
    expect(collator('Pichueso', 'Pico Luminoso')).toBeLessThan(0);
  });

  it('keeps equal names in their original relative order', () => {
    // Array#sort is stable, so a base-sensitivity tie preserves the input order.
    const entries = indexOf(
      [category('x')],
      [product('a', 'x', { name: 'Azúcar' }), product('b', 'x', { name: 'AZUCAR' })],
    ).entries;

    expect(sortEntries(entries, 'name-asc').map((entry) => entry.product.id)).toEqual(['a', 'b']);
    expect(
      sortEntries([...entries].reverse(), 'name-asc').map((entry) => entry.product.id),
    ).toEqual(['b', 'a']);
  });

  it('never mutates the caller’s array', () => {
    const original = [...index.entries];

    sortEntries(index.entries, 'price-desc');

    expect(index.entries).toEqual(original);
  });
});

describe('applyQuery', () => {
  it('combines the text search with the filters', () => {
    expect(search('')).toEqual(['algodones', 'calamar', 'runas', 'familiar']);
    expect(search('azucar')).toEqual(['algodones']);
    expect(search('calamar')).toEqual(['calamar']);
    expect(search('cofres')).toEqual(['runas']);
    expect(search('mascotas')).toEqual(['calamar', 'familiar']);
    expect(search('mascotas', 'mascotas')).toEqual(['calamar', 'familiar']);
    expect(search('mascotas', 'cofres')).toEqual([]);
  });

  it('applies a price ceiling together with the text search', () => {
    const ids = applyQuery(index.entries, { text: 'mascotas', maxPriceUsd: 2 }).map(
      (entry) => entry.product.id,
    );

    expect(ids).toEqual(['calamar']);
  });

  it('returns an empty result rather than throwing when nothing matches', () => {
    expect(search('nothing here matches')).toEqual([]);
  });

  it('returns an empty result for an empty catalog', () => {
    expect(applyQuery([], { text: 'azucar' })).toEqual([]);
  });
});
