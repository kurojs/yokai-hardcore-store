import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PricePipe } from './price.pipe';

/** Minimal host, so the pipe is also proven usable from a template and not only in isolation. */
@Component({
  imports: [PricePipe],
  template: `
    <p class="amount">{{ amount | price }}</p>
    <p class="missing">{{ missing | price }}</p>
  `,
})
class PriceHost {
  readonly amount = 12;
  readonly missing: number | null = null;
}

describe('PricePipe', () => {
  it('formats catalog amounts the way the rest of the app does', () => {
    const pipe = new PricePipe();

    expect(pipe.transform(1)).toBe('$1.00');
    expect(pipe.transform(3)).toBe('$3.00');
    expect(pipe.transform(1234.5)).toBe('$1,234.50');
  });

  it('returns an empty string rather than $NaN for absent or non-finite amounts', () => {
    const pipe = new PricePipe();

    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
    expect(pipe.transform(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('honours an explicit locale instead of hard-coding one', () => {
    // Only the decimal separator is asserted: it is the stable fact across ICU versions.
    expect(new PricePipe().transform(1.5, 'de-DE')).toContain('1,50');
  });

  it('renders through a template, and renders nothing for a missing price', async () => {
    await TestBed.configureTestingModule({ imports: [PriceHost] }).compileComponents();
    const fixture = TestBed.createComponent(PriceHost);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.amount')?.textContent?.trim()).toBe('$12.00');
    expect(host.querySelector('.missing')?.textContent?.trim()).toBe('');
  });
});
