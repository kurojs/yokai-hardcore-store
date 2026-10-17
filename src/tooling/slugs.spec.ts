/**
 * Unit specs for the text primitives in `scripts/lib/slugs.mjs`.
 *
 * Every case in the `slugify` block is a value that actually occurs in the store
 * source, not an invented one.
 */

import {
  collapseWhitespace,
  comparisonKey,
  foldAccents,
  slugify,
  stripQuotes,
} from '../../scripts/lib/slugs.mjs';

describe('collapseWhitespace', () => {
  it('collapses the double spaces present in real product names', () => {
    expect(collapseWhitespace('Bolsa  de 10 Yokai')).toBe('Bolsa de 10 Yokai');
    expect(collapseWhitespace('Ojo De  Odin')).toBe('Ojo De Odin');
    expect(collapseWhitespace('Cupón de la Horda del  Gran Kan')).toBe('Cupón de la Horda del Gran Kan');
  });

  it('collapses the double space inside a real category name', () => {
    expect(collapseWhitespace('Alimento Yokai  para guerreros y pets')).toBe(
      'Alimento Yokai para guerreros y pets',
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(collapseWhitespace('  5 OBENTO  ')).toBe('5 OBENTO');
  });

  it('normalizes tabs, newlines and non-breaking spaces to single spaces', () => {
    expect(collapseWhitespace('a\t\tb\n c\u00A0d\u202Fef')).toBe('a b c d ef');
  });

  it('leaves an already-normalized value untouched', () => {
    expect(collapseWhitespace('Fort-Craft')).toBe('Fort-Craft');
  });
});

describe('foldAccents', () => {
  it('folds the accented characters the store copy actually uses', () => {
    expect(foldAccents('Cáliz de Ponce de León')).toBe('Caliz de Ponce de Leon');
    expect(foldAccents('Corazón De Hydra')).toBe('Corazon De Hydra');
    expect(foldAccents('Artefactos Mágicos')).toBe('Artefactos Magicos');
    expect(foldAccents('RESUCITACIÓN')).toBe('RESUCITACION');
  });

  it('folds ñ and ü, which appear in the copy', () => {
    expect(foldAccents('diseñadas')).toBe('disenadas');
    expect(foldAccents('pingüino')).toBe('pinguino');
  });

  it('folds uppercase accents', () => {
    expect(foldAccents('CUPÓN')).toBe('CUPON');
  });

  it('leaves unaccented ASCII unchanged', () => {
    expect(foldAccents('Fort-Craft 5000')).toBe('Fort-Craft 5000');
  });
});

describe('stripQuotes', () => {
  it('removes the literal quotes the JSON name carries around a product title', () => {
    expect(stripQuotes('Cupón de Invocación "Todo Está Pegajoso"')).toBe(
      'Cupón de Invocación Todo Está Pegajoso',
    );
  });

  it('removes typographic quotes as well', () => {
    expect(stripQuotes('\u201CTodo Está Pegajoso\u201D')).toBe('Todo Está Pegajoso');
  });
});

describe('slugify', () => {
  it('produces the canonical slug from an all-caps product name', () => {
    expect(slugify('COFRE CON ARMAMENTO')).toBe('cofre-con-armamento');
  });

  it('single-hyphenates a double space', () => {
    expect(slugify('Bolsa  de 10 Yokai')).toBe('bolsa-de-10-yokai');
    expect(slugify('Ojo De  Odin')).toBe('ojo-de-odin');
  });

  it('folds a slash, which the Cofres category name contains', () => {
    expect(slugify('Cofres/Ofertas')).toBe('cofres-ofertas');
  });

  it('folds accents', () => {
    expect(slugify('Cáliz de Ponce de León')).toBe('caliz-de-ponce-de-leon');
    expect(slugify('Artefactos Mágicos')).toBe('artefactos-magicos');
    expect(slugify('RESUCITACIÓN')).toBe('resucitacion');
  });

  it('drops the quotes in the quoting case without leaving a stray hyphen', () => {
    expect(slugify('Cupón de Invocación "Todo Está Pegajoso"')).toBe(
      'cupon-de-invocacion-todo-esta-pegajoso',
    );
    expect(slugify('Cupón de Invocación  Todo Está Pegajoso')).toBe(
      'cupon-de-invocacion-todo-esta-pegajoso',
    );
  });

  it('keeps an existing hyphen and digits', () => {
    expect(slugify('Fort-Craft')).toBe('fort-craft');
    expect(slugify('Motosierra multi usos 5000')).toBe('motosierra-multi-usos-5000');
    expect(slugify('10 ALGODONES DE AZUCAR')).toBe('10-algodones-de-azucar');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Fort Craft--  ')).toBe('fort-craft');
    expect(slugify('...50% OFF...')).toBe('50-off');
  });

  it('is idempotent', () => {
    const once = slugify('Cupón de Invocación "Todo Está Pegajoso"');
    expect(slugify(once)).toBe(once);
  });

  it('throws when a value has no ASCII alphanumeric characters at all', () => {
    expect(() => slugify('¡¿?')).toThrow(/empty slug/);
    expect(() => slugify('   ')).toThrow(/empty slug/);
  });
});

describe('comparisonKey', () => {
  it('pairs the JSON category name with its differently-separated folder name', () => {
    expect(comparisonKey('Cofres/Ofertas')).toBe(comparisonKey('Cofres_Ofertas'));
  });

  it('pairs the JSON product name with its quote-free folder name', () => {
    expect(comparisonKey('Cupón de Invocación "Todo Está Pegajoso"')).toBe(
      comparisonKey('Cupón de Invocación  Todo Está Pegajoso'),
    );
  });

  it('pairs names that differ only by whitespace', () => {
    expect(comparisonKey('Alimento Yokai  para guerreros y pets')).toBe(
      comparisonKey('Alimento Yokai para guerreros y pets'),
    );
  });

  it('does not confuse two genuinely different products', () => {
    expect(comparisonKey('COFRE CON ARMAMENTO')).not.toBe(comparisonKey('COFRE DE RUNAS'));
  });
});
