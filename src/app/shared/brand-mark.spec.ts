/**
 * Specs for the brand mark.
 *
 * The mark is decorative, so what matters is that it cannot leak into the accessibility tree,
 * that it never blocks the layout while the image decodes, and that it scales from one number
 * instead of carrying a fixed pixel size.
 */

import { TestBed } from '@angular/core/testing';

import { BrandMark } from './brand-mark';

async function render(size?: number): Promise<{ host: HTMLElement }> {
  const fixture = TestBed.createComponent(BrandMark);
  if (size !== undefined) fixture.componentRef.setInput('size', size);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement };
}

describe('BrandMark', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BrandMark] }).compileComponents();
  });

  it('is decorative: the image is hidden and the surrounding link carries the name', async () => {
    const { host } = await render();
    const image = host.querySelector('img');

    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws the shipped enderman icon, not a generated one', async () => {
    const { host } = await render();

    expect(host.querySelector('img')?.getAttribute('src')).toBe('brand/enderman.png');
  });

  it('scales the tile from the size input', async () => {
    const { host } = await render(16);
    const tile = host.querySelector('.mark') as HTMLElement;

    expect(tile.style.width).toBe('16px');
    expect(tile.style.height).toBe('16px');
  });

  it('decodes off the critical path', async () => {
    const { host } = await render();

    expect(host.querySelector('img')?.getAttribute('decoding')).toBe('async');
  });
});
