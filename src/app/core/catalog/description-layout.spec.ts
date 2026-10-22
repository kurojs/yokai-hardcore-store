/**
 * Specs for the description layout.
 *
 * The splitter's own tests live in `description.spec.ts`; these are about classification: which
 * block becomes a lead, a heading, a fact, prose or an effect, and — the one that would catch a
 * real regression — whether the parts still carry the committed catalog's text.
 */

import { effectIcon, layoutDescription, type DescriptionPart } from './description-layout';
import { readCommittedCatalogDocument } from './testing/committed-catalog';

interface CatalogDocument {
  readonly products: readonly { readonly slug: string; readonly description: string }[];
}

const CATALOG = readCommittedCatalogDocument() as CatalogDocument;

function descriptionOf(slug: string): string {
  const product = CATALOG.products.find((entry) => entry.slug === slug);
  if (product === undefined) throw new Error(`missing catalog product ${slug}`);
  return product.description;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** What one part contributes to the reader's text, as the template renders it. */
function partText(part: DescriptionPart): string {
  switch (part.kind) {
    case 'lead':
      return part.text;
    case 'heading':
      return part.title;
    case 'fact':
      return `${part.label} ${part.value}`;
    case 'text':
      return part.title === null ? part.text : `${part.title} ${part.text}`;
    case 'effect':
      return `${part.label} ${part.detail}`;
  }
}

function kinds(parts: readonly DescriptionPart[]): string[] {
  return parts.map((part) => part.kind);
}

/** The label a part renders, or `null` for parts that are pure text. */
function labelOf(part: DescriptionPart): string | null {
  switch (part.kind) {
    case 'lead':
      return null;
    case 'heading':
      return part.title;
    case 'fact':
      return part.label;
    case 'text':
      return part.title;
    case 'effect':
      return part.label;
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The source with the colon removed from every label the layout turned into a part.
 *
 * Not every colon in the data is a label colon: `description.ts` refuses candidate labels longer
 * than six words, so `Héroe de la Aldea IV durante 25 segundos:` never becomes a block and stays
 * inside the preceding body, colon included. Only the colons that did become labels are dropped,
 * and only those may be missing from the rendered text.
 */
function sourceWithoutLabelColons(source: string, parts: readonly DescriptionPart[]): string {
  const colons: number[] = [];
  let cursor = 0;

  for (const part of parts) {
    const label = labelOf(part);
    if (label === null) continue;

    const match = new RegExp(`${escapeRegExp(label)}\\s*:`).exec(source.slice(cursor));
    if (match === null) continue;

    const colon = cursor + match.index + match[0].length - 1;
    colons.push(colon);
    cursor = colon + 1;
  }

  let text = '';
  let from = 0;
  for (const colon of colons) {
    text += source.slice(from, colon);
    from = colon + 1;
  }
  return text + source.slice(from);
}

describe('layoutDescription', () => {
  it('yields a lead, a heading, a fact and an effect for a real product', () => {
    const parts = layoutDescription(descriptionOf('10-algodones-de-azucar'));

    expect(parts.filter((part) => part.kind === 'lead')).toHaveLength(1);
    expect(kinds(parts)).toContain('heading');
    expect(kinds(parts)).toContain('fact');
    expect(kinds(parts)).toContain('effect');
  });

  it('resolves the vanilla icon without touching the verbatim effect label', () => {
    const effect = layoutDescription(descriptionOf('10-algodones-de-azucar')).find(
      (part) => part.kind === 'effect',
    );

    expect(effect).toBeDefined();
    if (effect?.kind !== 'effect') throw new Error('expected an effect part');
    expect(effect.label).toBe('Velocidad IX durante 10 segundos');
    expect(effect.icon).toBe('speed');
  });

  it('renders a lone label as a heading and the effect after it as an effect row', () => {
    const parts = layoutDescription('Efectos Temporales: Velocidad II: Corre mas rapido.');

    expect(kinds(parts)).toEqual(['heading', 'effect']);
    expect(parts[0]).toEqual({ kind: 'heading', title: 'Efectos Temporales' });
    expect(parts[1]).toEqual({
      kind: 'effect',
      label: 'Velocidad II',
      detail: 'Corre mas rapido.',
      icon: 'speed',
    });
  });

  it('returns nothing for an empty description', () => {
    expect(layoutDescription('')).toEqual([]);
  });

  it('turns an unlabeled text into a single lead', () => {
    expect(layoutDescription('Azúcar hilado por goblins.')).toEqual([
      { kind: 'lead', text: 'Azúcar hilado por goblins.' },
    ]);
  });

  it('keeps every committed description reconstructible from its parts', () => {
    for (const product of CATALOG.products) {
      const parts = layoutDescription(product.description);
      const rendered = collapse(parts.map(partText).join(' '));
      // Headings and fact rows render their label without the colon that split it from the body;
      // every other character — accents, caps, punctuation, the colons inside prose — is content.
      const source = collapse(sourceWithoutLabelColons(product.description, parts));

      expect(rendered, product.slug).toBe(source);
    }
  });
});

describe('effectIcon', () => {
  it('accepts a level and a duration, and folds accents and case', () => {
    expect(effectIcon('Caída Lenta IV durante 30 segundos')).toBe('slow_falling');
    expect(effectIcon('IMPULSO A LA SALUD X')).toBe('health_boost');
    expect(effectIcon('Resistencia al Fuego')).toBe('fire_resistance');
  });

  it('rejects labels that merely start like an effect', () => {
    expect(effectIcon('Versatilidad')).toBeNull();
    expect(effectIcon('Velocidad de ataque mejorada')).toBeNull();
    expect(effectIcon('Función')).toBeNull();
  });
});
