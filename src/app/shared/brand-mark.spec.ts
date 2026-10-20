/**
 * Specs for the brand mark.
 *
 * The mark is decorative, so what matters is that it cannot leak into the accessibility tree
 * and that it scales from one number instead of carrying a fixed pixel size.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('is decorative and inherits its colour from the surrounding text', async () => {
    const { host } = await render();
    const svg = host.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    // No font is involved: the mark is paths, so it cannot degrade into a missing glyph.
    expect(svg?.querySelector('text')).toBeNull();
  });

  it('draws a horned mask and its face holes at any requested size', async () => {
    const { host } = await render(16);
    const svg = host.querySelector('svg');
    const paths = [...host.querySelectorAll('path')];

    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 64 64');
    expect(paths).toHaveLength(3);
    expect(paths[0]?.getAttribute('fill-rule')).toBe('evenodd');
  });
});
