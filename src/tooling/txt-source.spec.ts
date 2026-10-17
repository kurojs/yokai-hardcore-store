/**
 * Unit specs for the `.txt` copy parsers in `scripts/lib/txt-source.mjs`.
 *
 * The fixtures are the literal file contents from the store source, including the
 * two label positions (`Cantidad:` above the description heading and folded into
 * the paragraph) that a naive parser gets wrong.
 */

import {
  parseCategoryTxt,
  parseInfoTxt,
  parseLabeledDocument,
  readLabel,
} from '../../scripts/lib/txt-source.mjs';

const CATEGORY_TXT = [
  'Categoría: Cofres/Ofertas',
  '',
  'Descripción:',
  '¡Explora nuestra selección exclusiva de cofres y ofertas diseñadas para potenciar tu experiencia de supervivencia en el mundo!',
].join('\n');

const INFO_TXT = [
  'Nombre: 10 ALGODONES DE AZUCAR',
  'Precio: $1',
  'Categoría: Alimento Yokai  para guerreros y pets',
  '',
  'Descripción:',
  '¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!',
].join('\n');

/** Real shape: `Cantidad:` sits above the heading, in the labelled header. */
const INFO_TXT_CANTIDAD_IN_HEADER = [
  'Nombre: Coca Peruana',
  'Precio: $4',
  'Categoría: Bosque de las Ninfas',
  'Cantidad: 30 unidades',
  '',
  'Descripción:',
  'La Coca Peruana es una delicia exótica.',
].join('\n');

/** Real shape: `Cantidad:` is folded into the description paragraph. */
const INFO_TXT_CANTIDAD_IN_BODY = [
  'Nombre: Agua Bendita',
  'Precio: $1',
  'Categoría: Bosque de las Ninfas',
  '',
  'Descripción:',
  'Cantidad: 15 unidades Descripción: El Agua Bendita es una poderosa poción.',
].join('\n');

describe('parseLabeledDocument', () => {
  it('splits the labelled header from the description', () => {
    const { header, description } = parseLabeledDocument(INFO_TXT);
    expect(header).toBe(
      'Nombre: 10 ALGODONES DE AZUCAR\nPrecio: $1\nCategoría: Alimento Yokai  para guerreros y pets',
    );
    expect(description).toBe('¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!');
  });

  it('keeps a body-folded Cantidad label inside the description', () => {
    const { description } = parseLabeledDocument(INFO_TXT_CANTIDAD_IN_BODY);
    expect(description).toContain('Cantidad: 15 unidades');
  });

  it('keeps a header-side Cantidad label out of the description', () => {
    const { description } = parseLabeledDocument(INFO_TXT_CANTIDAD_IN_HEADER);
    expect(description).toBe('La Coca Peruana es una delicia exótica.');
  });

  it('collapses whitespace inside the description', () => {
    const { description } = parseLabeledDocument('Nombre: x\n\nDescripción:\na  b\n\n c');
    expect(description).toBe('a b c');
  });

  it('accepts CRLF line endings and a byte-order mark', () => {
    const crlf = `\uFEFF${INFO_TXT.replace(/\n/g, '\r\n')}`;
    expect(parseLabeledDocument(crlf).description).toContain('Algodones de Azúcar Goblin');
  });

  it('throws when the description heading is missing', () => {
    expect(() => parseLabeledDocument('Nombre: x\nPrecio: $1')).toThrow(/no standalone "Descripción:" heading/);
  });
});

describe('readLabel', () => {
  it('reads a plain label', () => {
    expect(readLabel('Nombre: 25 SUSHI\nPrecio: $5', 'Nombre')).toBe('25 SUSHI');
  });

  it('reads a label whose name carries an accent', () => {
    expect(readLabel('Categoría: Mascotas', 'Categor[ií]a')).toBe('Mascotas');
  });

  it('returns null for an absent label', () => {
    expect(readLabel('Nombre: x', 'Precio')).toBeNull();
  });

  it('returns null when the label has no value', () => {
    expect(readLabel('Nombre:', 'Nombre')).toBeNull();
  });

  it('does not match a label that is a suffix of another', () => {
    expect(readLabel('SubNombre: x', 'Nombre:[ \\t]*(.*)')).toBeNull();
  });
});

describe('parseCategoryTxt', () => {
  it('reads the accented display name, which differs from the folder name', () => {
    const parsed = parseCategoryTxt(CATEGORY_TXT);
    expect(parsed.name).toBe('Cofres/Ofertas');
    expect(parsed.description).toContain('selección exclusiva');
  });

  it('reads an all-caps accented category name', () => {
    const parsed = parseCategoryTxt('Categoría: RESUCITACIÓN\n\nDescripción:\nVuelve a la vida.');
    expect(parsed.name).toBe('RESUCITACIÓN');
    expect(parsed.description).toBe('Vuelve a la vida.');
  });

  it('throws when the Categoría header is missing', () => {
    expect(() => parseCategoryTxt('Descripción:\nonly a description')).toThrow(/no "Categoría:" header/);
  });
});

describe('parseInfoTxt', () => {
  it('reads the name, price and description', () => {
    const parsed = parseInfoTxt(INFO_TXT);
    expect(parsed.name).toBe('10 ALGODONES DE AZUCAR');
    expect(parsed.priceUsd).toBe(1);
    expect(parsed.categoryLabel).toBe('Alimento Yokai  para guerreros y pets');
    expect(parsed.description).toContain('Algodones de Azúcar Goblin');
  });

  it('parses the whole real price range', () => {
    for (const [label, expected] of [
      ['$1', 1],
      ['$2', 2],
      ['$4', 4],
      ['$5', 5],
      ['$10', 10],
    ] as const) {
      const parsed = parseInfoTxt(`Nombre: x\nPrecio: ${label}\nCategoría: Mascotas\n\nDescripción:\ny`);
      expect(parsed.priceUsd).toBe(expected);
    }
  });

  it('does not introduce floating point drift', () => {
    const parsed = parseInfoTxt('Nombre: x\nPrecio: $0.30\nCategoría: Mascotas\n\nDescripción:\ny');
    expect(Object.is(parsed.priceUsd, 0.3)).toBe(true);
  });

  it('throws on an unparseable price', () => {
    expect(() => parseInfoTxt('Nombre: x\nPrecio: gratis\nCategoría: Mascotas\n\nDescripción:\ny')).toThrow(
      /unparseable price/,
    );
  });

  it('throws when the name is missing', () => {
    expect(() => parseInfoTxt('Precio: $1\nCategoría: Mascotas\n\nDescripción:\ny')).toThrow(
      /no "Nombre:" header/,
    );
  });

  it('throws when the category is missing, naming the product', () => {
    expect(() => parseInfoTxt('Nombre: Fort-Craft\nPrecio: $1\n\nDescripción:\ny')).toThrow(
      /Fort-Craft/,
    );
  });
});
