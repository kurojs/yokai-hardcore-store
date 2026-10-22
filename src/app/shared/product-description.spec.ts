/**
 * Specs for the description renderer.
 *
 * The classification is specified in `core/catalog/description-layout.spec.ts`, so these tests
 * are about markup: the lead paragraph, the heading rule, the aligned fact row, the effect row
 * with its icon, and — the one that would catch a real regression — the rendered text still
 * being the description the catalog holds.
 */

import { TestBed } from '@angular/core/testing';

import { readCommittedCatalogDocument } from '../core/catalog/testing/committed-catalog';
import { ProductDescription } from './product-description';

interface CatalogDocument {
  readonly products: readonly { readonly slug: string; readonly description: string }[];
}

const CATALOG = readCommittedCatalogDocument() as CatalogDocument;

function descriptionOf(slug: string): string {
  const product = CATALOG.products.find((entry) => entry.slug === slug);
  if (product === undefined) throw new Error(`missing catalog product ${slug}`);
  return product.description;
}

function render(description: string): HTMLElement {
  const fixture = TestBed.createComponent(ProductDescription);
  fixture.componentRef.setInput('description', description);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

/** One element per rendered part. */
function parts(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.description > *')];
}

/**
 * The text of one part, with its child elements treated as separate words.
 *
 * A part is built from sibling elements (a fact's label and value, a titled prose block's
 * subheading and paragraph). `textContent` on the part would run them together, so each child
 * node contributes a word boundary the way the layout visually does. Control-flow comments
 * (`<!--container-->`) are not text and are skipped.
 */
function textOf(element: HTMLElement): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType !== Node.COMMENT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ');
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

describe('ProductDescription', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProductDescription] });
  });

  it('renders the introduction as a lead paragraph', () => {
    const host = render('Una introduccion que abre la ficha.');

    expect(parts(host)).toHaveLength(1);
    expect(host.querySelector('.description__lead')?.textContent).toBe(
      'Una introduccion que abre la ficha.',
    );
  });

  it('renders a short labeled value as a fact with label and value apart', () => {
    const host = render('Cantidad: 3 unidades.');

    const fact = host.querySelector('.description__fact');
    expect(fact).not.toBeNull();
    expect(fact?.querySelector('.description__fact-label')?.textContent).toBe('Cantidad');
    expect(fact?.querySelector('.description__fact-value')?.textContent).toBe('3 unidades.');
  });

  it('renders a label with no value as a section heading', () => {
    const host = render('Efectos Temporales:');

    const heading = host.querySelector('.description__heading');
    expect(heading?.textContent).toBe('Efectos Temporales');
    expect(host.querySelector('.description__fact')).toBeNull();
  });

  it('renders an effect row with the vanilla effect icon', () => {
    const host = render('Efectos Temporales: Velocidad II: Corre mas rapido.');

    const effect = host.querySelector('.description__effect');
    expect(effect).not.toBeNull();
    expect(effect?.querySelector('.description__effect-label')?.textContent).toBe('Velocidad II');
    expect(effect?.querySelector('.description__effect-detail')?.textContent).toBe(
      'Corre mas rapido.',
    );

    const icon = effect?.querySelector<HTMLImageElement>('img.description__effect-icon');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('src')?.endsWith('/mob_effect/speed.png')).toBe(true);
    expect(icon?.getAttribute('alt')).toBe('');
  });

  it('renders nothing for an empty description', () => {
    expect(parts(render(''))).toHaveLength(0);
  });

  it('turns a real 1,432-character description into a page layout', () => {
    const host = render(descriptionOf('10-algodones-de-azucar'));

    expect(host.querySelectorAll('.description__lead')).toHaveLength(1);
    expect(host.querySelectorAll('.description__heading').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.description__fact').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.description__effect').length).toBeGreaterThan(0);
  });

  it('keeps the accents and the shouting exactly as the catalog holds them', () => {
    const acentuado = render(descriptionOf('10-algodones-de-azucar'));
    const gritado = render(descriptionOf('cofre-de-runas'));

    expect(acentuado.textContent).toContain('Azúcar hilado por goblins');
    expect(acentuado.textContent).toContain('Descripción');
    // The description's own ALL-CAPS markers are content, not styling: never case-transformed.
    expect(gritado.textContent).toContain('RUNA SLIME');
  });

  it('renders the whole description, not a summary and not a mutation of it', () => {
    for (const slug of ['10-algodones-de-azucar', 'cofre-con-armamento', 'cofre-de-runas']) {
      const description = descriptionOf(slug);
      const text = parts(render(description)).map(textOf).join(' ');
      // Headings and fact labels render without the colon that split them from their body, so
      // both sides are compared colon-free; everything else must match character for character.
      const rendered = collapse(text.replace(/:/g, ''));

      expect(rendered, slug).toBe(collapse(description.replace(/:/g, '')));
    }
  });
});
