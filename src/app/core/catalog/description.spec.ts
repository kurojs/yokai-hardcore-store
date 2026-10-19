/**
 * Specs for the description splitter.
 *
 * Three kinds of assertion, and the third is the important one:
 *
 * 1. The grammar on hand-written strings, so a rule change is visible in a small diff.
 * 2. The facts the product page depends on, measured against the committed catalog: the product
 *    the brief names, the description with no labels at all, and the size of the worst case.
 * 3. **Reconstruction.** For all 48 real descriptions, joining the blocks back together must
 *    reproduce the source. That is what makes the heuristic safe: a wrongly detected label can
 *    move a section boundary, but it can never drop or duplicate a character.
 */

import { readCommittedCatalogDocument } from './testing/committed-catalog';
import { parseDescription, descriptionBlockText } from './description';

interface CatalogDocument {
  readonly products: readonly { readonly slug: string; readonly description: string }[];
}

const CATALOG = readCommittedCatalogDocument() as CatalogDocument;

function product(slug: string): { readonly slug: string; readonly description: string } {
  const found = CATALOG.products.find((candidate) => candidate.slug === slug);
  if (found === undefined) throw new Error(`no product ${slug} in the committed catalog`);
  return found;
}

/** Whitespace-insensitive comparison: the split is allowed to move spaces, not characters. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function render(description: string): string {
  return collapse(parseDescription(description).map(descriptionBlockText).join(' '));
}

describe('parseDescription', () => {
  it('is total: empty and blank input produce no blocks', () => {
    expect(parseDescription('')).toEqual([]);
    expect(parseDescription('   \n\n  ')).toEqual([]);
  });

  it('keeps a plain description as one prose block', () => {
    const text = 'Un cofre con pociones y armaduras. Nada mas que contar.';

    expect(parseDescription(text)).toEqual([{ label: null, body: text }]);
  });

  it('separates the introduction from the first label', () => {
    expect(parseDescription('Una introduccion breve. Cantidad: 3 unidades.')).toEqual([
      { label: null, body: 'Una introduccion breve.' },
      { label: 'Cantidad', body: '3 unidades.' },
    ]);
  });

  it('keeps a label with no value, because it is a heading for what follows', () => {
    expect(parseDescription('Efectos Temporales: Velocidad II: Corre mas rapido.')).toEqual([
      { label: 'Efectos Temporales', body: '' },
      { label: 'Velocidad II', body: 'Corre mas rapido.' },
    ]);
  });

  it('splits back-to-back labels', () => {
    expect(parseDescription('Características del Alimento: Cantidad: 10 unidades.')).toEqual([
      { label: 'Características del Alimento', body: '' },
      { label: 'Cantidad', body: '10 unidades.' },
    ]);
  });

  it('honours newlines as hard breaks even though the committed data has none', () => {
    expect(parseDescription('Primera linea.\nSegunda linea.\n\nTercera linea.')).toEqual([
      { label: null, body: 'Primera linea.' },
      { label: null, body: 'Segunda linea.' },
      { label: null, body: 'Tercera linea.' },
    ]);
  });

  it('does not treat a colon inside a time or a URL as a label', () => {
    const text = 'Abre a las 10:30 y visita https://ejemplo.com/tienda hoy.';
    const blocks = parseDescription(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.label).toBeNull();
  });

  it('does not split a quoted name that ends in a colon', () => {
    const text = 'Invocamos al "Grupo Pegajoso": veinte slimes.';
    const blocks = parseDescription(text);

    expect(blocks.every((block) => block.label === null)).toBe(true);
  });

  it('does not split inside a run-on proper noun', () => {
    // "Rey Slime Gigante Habilidad Especial" is a value that glued itself to the next label;
    // the run of five capitalised words is what tells the splitter to leave it alone.
    const text = 'Jefe de Legion: Rey Slime Gigante Habilidad Especial: Se divide al morir.';
    const blocks = parseDescription(text);

    expect(blocks.map((block) => block.label)).toEqual(['Jefe de Legion', 'Habilidad Especial']);
    expect(blocks[0]?.body).toBe('Rey Slime Gigante');
  });

  it('recovers a label that starts at the end of a list instead of at a sentence', () => {
    const text = 'Puede contener: Pociones: 5 pociones de Fuerza II (90 segundos) Armaduras: 5 cascos.';
    const blocks = parseDescription(text);

    expect(blocks.map((block) => block.label)).toEqual([
      'Puede contener',
      'Pociones',
      'Armaduras',
    ]);
    expect(blocks[1]?.body).toBe('5 pociones de Fuerza II (90 segundos)');
  });

  it('refuses a split that would cut a noun phrase in half', () => {
    // "... Caracteristicas del | Pico Luminoso" would leave the previous section ending in "del".
    const text = 'Cantidad: 3 manzanas Caracteristicas del Pico Luminoso: rompe bloques.';
    const blocks = parseDescription(text);

    expect(blocks.map((block) => block.label)).toEqual(['Cantidad']);
    expect(blocks[0]?.body).toBe('3 manzanas Caracteristicas del Pico Luminoso: rompe bloques.');
  });
});

describe('parseDescription on the committed catalog', () => {
  it('finds the editorial labels in a product that has Efectos Temporales', () => {
    const blocks = parseDescription(product('10-algodones-de-azucar').description);
    const labels = blocks.map((block) => block.label);

    expect(labels).toEqual([
      null,
      'Características del Alimento',
      'Cantidad',
      'Origen',
      'Efectos Temporales',
      'Velocidad IX durante 10 segundos',
      'Descripción',
    ]);
    expect(blocks[0]?.body).toBe(
      '¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!',
    );
  });

  it('keeps a description with no labels at all as one block', () => {
    const blocks = parseDescription(product('cofre-de-runas').description);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.label).toBeNull();
    expect(blocks[0]?.body.length).toBeGreaterThan(400);
  });

  it('gives every description at least one block and no block an absurd label', () => {
    for (const entry of CATALOG.products) {
      const blocks = parseDescription(entry.description);

      expect(blocks.length, entry.slug).toBeGreaterThanOrEqual(1);
      for (const block of blocks) {
        if (block.label !== null) {
          expect(block.label.length, entry.slug).toBeLessThanOrEqual(42);
          expect(block.label, entry.slug).not.toMatch(/[.:!?¡¿"]/);
        }
      }
    }
  });

  it('reproduces every one of the 48 descriptions exactly', () => {
    for (const entry of CATALOG.products) {
      expect(render(entry.description), entry.slug).toBe(collapse(entry.description));
    }
  });
});
