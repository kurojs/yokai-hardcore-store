/**
 * Specs for the no-banner placeholder identity.
 *
 * The hash is pinned to measured values so an accidental change to the algorithm is caught:
 * the point of the function is that a category looks the same forever, and "it returns a
 * number in range" would not notice a re-shuffle.
 */

import {
  CATEGORY_PLACEHOLDER_VARIANTS,
  categoryMonogram,
  categoryPlaceholderVariant,
} from './category-visual';

describe('categoryMonogram', () => {
  it('uses the first letter, keeping its accent', () => {
    expect(categoryMonogram('Mascotas')).toBe('M');
    expect(categoryMonogram('Armería De Héroe')).toBe('A');
    expect(categoryMonogram('RESUCITACIÓN')).toBe('R');
    expect(categoryMonogram('cofres/Ofertas')).toBe('C');
    expect(categoryMonogram('Yokai Coins')).toBe('Y');
  });

  it('skips leading characters that are not letters', () => {
    expect(categoryMonogram('  espacios')).toBe('E');
    expect(categoryMonogram('10 Algodones')).toBe('A');
    expect(categoryMonogram('-guion')).toBe('G');
  });

  it('falls back when the name has no letters at all', () => {
    expect(categoryMonogram('')).toBe('?');
    expect(categoryMonogram('12345')).toBe('?');
    expect(categoryMonogram('¡¿!')).toBe('?');
  });
});

describe('categoryPlaceholderVariant', () => {
  it('is stable for a given slug', () => {
    expect(categoryPlaceholderVariant('mascotas')).toBe(categoryPlaceholderVariant('mascotas'));
  });

  it('pins the variant of each real category', () => {
    // Measured against `data/catalog.json`'s own category order, and cross-checked with a
    // second FNV-1a implementation (BigInt masking instead of `Math.imul`); both agree.
    expect(categoryPlaceholderVariant('alimento-yokai-para-guerreros-y-pets')).toBe(3);
    expect(categoryPlaceholderVariant('armeria-de-aventurero')).toBe(4);
    expect(categoryPlaceholderVariant('armeria-de-heroe')).toBe(2);
    expect(categoryPlaceholderVariant('artefactos-magicos')).toBe(1);
    expect(categoryPlaceholderVariant('bosque-de-las-ninfas')).toBe(3);
    expect(categoryPlaceholderVariant('cofres-ofertas')).toBe(0);
    expect(categoryPlaceholderVariant('emboscada-a-jugadores')).toBe(1);
    expect(categoryPlaceholderVariant('mascotas')).toBe(2);
    expect(categoryPlaceholderVariant('resucitacion')).toBe(0);
    expect(categoryPlaceholderVariant('yokai-coins')).toBe(5);
  });

  it('spreads the real categories across the variants', () => {
    // Three identical placeholders in one grid would read as a rendering bug.
    const slugs = [
      'alimento-yokai-para-guerreros-y-pets',
      'armeria-de-aventurero',
      'armeria-de-heroe',
      'artefactos-magicos',
      'bosque-de-las-ninfas',
      'cofres-ofertas',
      'emboscada-a-jugadores',
      'mascotas',
      'resucitacion',
      'yokai-coins',
    ];
    const variants = slugs.map((slug) => categoryPlaceholderVariant(slug));

    expect(new Set(variants).size).toBe(6);
    for (const variant of variants) {
      expect(variant).toBeGreaterThanOrEqual(0);
      expect(variant).toBeLessThan(CATEGORY_PLACEHOLDER_VARIANTS);
    }
  });

  it('never returns an out-of-range index', () => {
    for (const slug of ['', 'a', 'mascotas', 'x'.repeat(200)]) {
      const variant = categoryPlaceholderVariant(slug);
      expect(Number.isInteger(variant)).toBe(true);
      expect(variant).toBeGreaterThanOrEqual(0);
      expect(variant).toBeLessThan(CATEGORY_PLACEHOLDER_VARIANTS);
    }
  });

  it('degrades to variant 0 instead of dividing by zero', () => {
    expect(categoryPlaceholderVariant('mascotas', 1)).toBe(0);
    expect(categoryPlaceholderVariant('mascotas', 0)).toBe(0);
    expect(categoryPlaceholderVariant('mascotas', 2.5)).toBe(0);
  });
});
