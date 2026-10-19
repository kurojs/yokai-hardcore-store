/**
 * Specs for the description renderer.
 *
 * The splitter is specified in `core/`, so these tests are about markup: a block per paragraph,
 * the label emphasised, a heading-only block marked as such, and — the one that would catch a
 * real regression — the rendered text still being the description the catalog holds.
 */

import { TestBed } from '@angular/core/testing';

import { readCommittedCatalogDocument } from '../core/catalog/testing/committed-catalog';
import { ProductDescription } from './product-description';

interface CatalogDocument {
  readonly products: readonly { readonly slug: string; readonly description: string }[];
}

const CATALOG = readCommittedCatalogDocument() as CatalogDocument;

function render(description: string): HTMLElement {
  const fixture = TestBed.createComponent(ProductDescription);
  fixture.componentRef.setInput('description', description);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function blocks(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.description__block')];
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

describe('ProductDescription', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProductDescription] });
  });

  it('renders one paragraph per section', () => {
    const host = render('Una introduccion. Cantidad: 3 unidades. Origen: El Nether.');

    expect(blocks(host)).toHaveLength(3);
    expect(blocks(host).map((block) => block.querySelector('.description__label')?.textContent)).toEqual([
      undefined,
      'Cantidad:',
      'Origen:',
    ]);
  });

  it('emphasises a label instead of leaving it as flat prose', () => {
    const host = render('Cantidad: 3 unidades.');

    expect(host.querySelector('strong.description__label')?.textContent).toBe('Cantidad:');
    expect(blocks(host)[0]?.textContent?.trim()).toBe('Cantidad: 3 unidades.');
  });

  it('marks a label with no value as a heading for the sections after it', () => {
    const host = render('Efectos Temporales: Velocidad II: Corre mas rapido.');

    expect(blocks(host)[0]?.classList.contains('description__block--heading')).toBe(true);
    expect(blocks(host)[1]?.classList.contains('description__block--heading')).toBe(false);
  });

  it('renders nothing for an empty description', () => {
    expect(blocks(render(''))).toHaveLength(0);
  });

  it('turns a real 1,432-character description into readable sections', () => {
    const product = CATALOG.products.find((entry) => entry.slug === '10-algodones-de-azucar')!;
    const host = render(product.description);
    const rendered = blocks(host);

    expect(rendered.length).toBeGreaterThan(4);
    expect(host.textContent).toContain('Efectos Temporales:');
    expect(host.textContent).toContain('Descripción:');
  });

  it('keeps the accents and the shouting exactly as the catalog holds them', () => {
    const acentuado = CATALOG.products.find((entry) => entry.slug === '10-algodones-de-azucar')!;
    const gritado = CATALOG.products.find((entry) => entry.slug === 'cofre-de-runas')!;

    expect(render(acentuado.description).textContent).toContain(
      '¡Aliméntate como todo un guerrero con los Algodones de Azúcar Goblin!',
    );
    // The description's own ALL-CAPS markers are content, not styling: never case-transformed.
    expect(render(gritado.description).textContent).toContain('RUNA SLIME');
  });

  it('renders the whole description, not a summary and not a mutation of it', () => {
    for (const slug of ['10-algodones-de-azucar', 'cofre-con-armamento', 'cofre-de-runas']) {
      const product = CATALOG.products.find((entry) => entry.slug === slug)!;
      // A label's colon is re-inserted between the strong element and its body, so comparing
      // per-paragraph text (joined with a space) is the honest equality check.
      const text = collapse(blocks(render(product.description)).map((block) => block.textContent ?? '').join(' '));

      expect(text, slug).toBe(collapse(product.description));
    }
  });
});
