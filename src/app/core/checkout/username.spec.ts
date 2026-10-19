/**
 * Specs for the Minecraft username rule.
 *
 * The matrix is the point: the checkout's only field must accept the real shape of a Java
 * Edition name and reject everything else for a reason the visitor can read. Boundary lengths,
 * the trimmed-paste case and the accented name are all covered because each one is a plausible
 * thing a person types.
 */

import {
  MINECRAFT_USERNAME_MAX_LENGTH,
  MINECRAFT_USERNAME_MIN_LENGTH,
  validateMinecraftUsername,
} from './username';

describe('validateMinecraftUsername', () => {
  it('accepts a legal Java Edition name', () => {
    expect(validateMinecraftUsername('Steve_123')).toEqual({ ok: true, value: 'Steve_123' });
  });

  it('accepts the exact length boundaries', () => {
    expect(validateMinecraftUsername('abc')).toEqual({ ok: true, value: 'abc' });
    expect(validateMinecraftUsername('a'.repeat(MINECRAFT_USERNAME_MAX_LENGTH))).toEqual({
      ok: true,
      value: 'a'.repeat(MINECRAFT_USERNAME_MAX_LENGTH),
    });
  });

  it('rejects a name that is too short', () => {
    expect(validateMinecraftUsername('ab')).toEqual({ ok: false, problem: 'too-short' });
  });

  it('rejects a name that is too long', () => {
    const seventeen = 'a'.repeat(MINECRAFT_USERNAME_MAX_LENGTH + 1);

    expect(validateMinecraftUsername(seventeen)).toEqual({ ok: false, problem: 'too-long' });
  });

  it('rejects a name containing a space', () => {
    expect(validateMinecraftUsername('Steve Smith')).toEqual({
      ok: false,
      problem: 'illegal-characters',
    });
  });

  it('rejects a name containing a hyphen', () => {
    expect(validateMinecraftUsername('Steve-Smith')).toEqual({
      ok: false,
      problem: 'illegal-characters',
    });
  });

  it('rejects an empty value, including nullish input', () => {
    expect(validateMinecraftUsername('')).toEqual({ ok: false, problem: 'empty' });
    expect(validateMinecraftUsername('   ')).toEqual({ ok: false, problem: 'empty' });
    expect(validateMinecraftUsername(null)).toEqual({ ok: false, problem: 'empty' });
    expect(validateMinecraftUsername(undefined)).toEqual({ ok: false, problem: 'empty' });
  });

  it('rejects an accented name instead of folding it', () => {
    // "José" is four characters and an accent is not in the game's character set. Removing the
    // accent would deliver to a different account, so the validator refuses rather than repairs.
    expect(validateMinecraftUsername('José')).toEqual({
      ok: false,
      problem: 'illegal-characters',
    });
  });

  it('trims a pasted name but keeps its interior untouched', () => {
    expect(validateMinecraftUsername('  Steve  ')).toEqual({ ok: true, value: 'Steve' });
  });

  it('accepts digits and underscores on their own', () => {
    expect(validateMinecraftUsername('123')).toEqual({ ok: true, value: '123' });
    expect(validateMinecraftUsername('___')).toEqual({ ok: true, value: '___' });
  });

  it('reports length before character set when both are wrong', () => {
    // One actionable error is better than two: the visitor shortens the name first.
    expect(validateMinecraftUsername('Steve Smith Smith')).toEqual({
      ok: false,
      problem: 'too-long',
    });
  });

  it('keeps the two length constants aligned with the rule it documents', () => {
    expect(MINECRAFT_USERNAME_MIN_LENGTH).toBe(3);
    expect(MINECRAFT_USERNAME_MAX_LENGTH).toBe(16);
  });
});
