/**
 * Specs for the local order reference.
 *
 * The reference is the one piece of the confirmation that looks like data, so it has to be
 * reproducible: the same instant and the same nonce must produce the same string on every
 * machine, and the degenerate inputs must still produce something readable instead of throwing.
 */

import {
  ORDER_REFERENCE_NONCE_SPACE,
  createOrderReference,
  orderReferenceDay,
} from './order-reference';

describe('orderReferenceDay', () => {
  it('renders the UTC calendar day', () => {
    expect(orderReferenceDay(new Date('2026-10-18T12:00:00Z'))).toBe('20261018');
  });

  it('uses UTC rather than the runner timezone', () => {
    // 23:30 on the 18th in UTC-5 is already the 19th in UTC.
    expect(orderReferenceDay(new Date('2026-10-18T23:30:00-05:00'))).toBe('20261019');
  });

  it('degrades an invalid date to a well-formed day', () => {
    expect(orderReferenceDay(new Date('not a date'))).toBe('00000000');
  });
});

describe('createOrderReference', () => {
  it('produces a readable reference from a date and a nonce', () => {
    expect(createOrderReference(new Date('2026-10-18T12:00:00Z'), 12345)).toBe(
      'YOKAI-20261018-09IX',
    );
  });

  it('pads a short suffix so the shape never changes', () => {
    expect(createOrderReference(new Date('2026-10-18T12:00:00Z'), 0)).toBe('YOKAI-20261018-0000');
  });

  it('wraps the nonce instead of growing the suffix', () => {
    expect(createOrderReference(new Date('2026-10-18T12:00:00Z'), ORDER_REFERENCE_NONCE_SPACE)).toBe(
      'YOKAI-20261018-0000',
    );
    expect(createOrderReference(new Date('2026-10-18T12:00:00Z'), -1)).toBe(
      'YOKAI-20261018-ZZZZ',
    );
  });

  it('turns an unusable nonce into zero', () => {
    expect(createOrderReference(new Date('2026-10-18T12:00:00Z'), Number.NaN)).toBe(
      'YOKAI-20261018-0000',
    );
  });

  it('stays well-formed when the clock is not', () => {
    expect(createOrderReference(new Date('not a date'), 5)).toBe('YOKAI-00000000-0005');
  });

  it('gives two demos on the same day different references', () => {
    const date = new Date('2026-10-18T12:00:00Z');

    expect(createOrderReference(date, 1)).not.toBe(createOrderReference(date, 2));
  });
});
