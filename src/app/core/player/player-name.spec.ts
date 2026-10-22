import { MINOTAR_HELMET_SIZE, minotarHelmetUrl, normalisePlayerName } from './player-name';

/**
 * The name rules are the checkout's, reused rather than re-implemented. These specs pin the
 * boundary between "a name we will store" and "a name we will draw a skin for", because that
 * boundary decides whether an avatar appears at all.
 */
describe('normalisePlayerName', () => {
  it('returns null for a missing or empty value', () => {
    expect(normalisePlayerName(null)).toBeNull();
    expect(normalisePlayerName(undefined)).toBeNull();
    expect(normalisePlayerName('')).toBeNull();
    expect(normalisePlayerName('   ')).toBeNull();
  });

  it('trims surrounding whitespace, because a pasted name is a convenient typo to forgive', () => {
    expect(normalisePlayerName('  Steve  ')).toBe('Steve');
    expect(normalisePlayerName('\tNotch\n')).toBe('Notch');
  });

  it('accepts letters, digits and the underscore', () => {
    expect(normalisePlayerName('Notch')).toBe('Notch');
    expect(normalisePlayerName('a_b_1')).toBe('a_b_1');
    expect(normalisePlayerName('___')).toBe('___');
    expect(normalisePlayerName('A'.repeat(16))).toBe('A'.repeat(16));
  });

  it('rejects every shape a Minecraft username cannot be', () => {
    expect(normalisePlayerName('ab')).toBeNull(); // too short
    expect(normalisePlayerName('A'.repeat(17))).toBeNull(); // too long
    expect(normalisePlayerName('Steve Smith')).toBeNull(); // inner space
    expect(normalisePlayerName('José')).toBeNull(); // accent
    expect(normalisePlayerName('steve!')).toBeNull(); // punctuation
    expect(normalisePlayerName('スティーブ')).toBeNull(); // non-ASCII
  });
});

describe('minotarHelmetUrl', () => {
  it('builds the helmet render for a valid name', () => {
    expect(minotarHelmetUrl('Notch')).toBe(
      `https://minotar.net/helm/Notch/${MINOTAR_HELMET_SIZE}.png`,
    );
  });

  it('keeps an underscore readable rather than escaping it', () => {
    expect(minotarHelmetUrl('a_b')).toBe(`https://minotar.net/helm/a_b/${MINOTAR_HELMET_SIZE}.png`);
  });

  it('returns null instead of a URL for an invalid name, so no image is requested', () => {
    expect(minotarHelmetUrl(null)).toBeNull();
    expect(minotarHelmetUrl('')).toBeNull();
    expect(minotarHelmetUrl('ab')).toBeNull();
    expect(minotarHelmetUrl('Steve Smith')).toBeNull();
  });

  it('honours a custom size and clamps it to what Minotar can serve', () => {
    expect(minotarHelmetUrl('Notch', 32)).toBe('https://minotar.net/helm/Notch/32.png');
    expect(minotarHelmetUrl('Notch', 32.9)).toBe('https://minotar.net/helm/Notch/32.png');
    expect(minotarHelmetUrl('Notch', 4)).toBe('https://minotar.net/helm/Notch/8.png');
    expect(minotarHelmetUrl('Notch', 4096)).toBe('https://minotar.net/helm/Notch/256.png');
    expect(minotarHelmetUrl('Notch', Number.NaN)).toBe(
      `https://minotar.net/helm/Notch/${MINOTAR_HELMET_SIZE}.png`,
    );
  });
});
