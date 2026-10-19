/**
 * The demo checkout's only field, validated as a Minecraft: Java Edition username.
 *
 * The rule is the real one: 3 to 16 characters from `A-Z`, `a-z`, `0-9` and `_`. It is here, in
 * `core/`, as a pure function rather than in the component because the component should not own
 * a rule that a future real delivery integration would also have to enforce — and because a
 * pure function can be tested over the whole matrix without a DOM.
 *
 * Two choices worth naming:
 *
 * - **Surrounding whitespace is trimmed, inner whitespace is not accepted.** A pasted
 *   `" Steve "` is a convenient typo to forgive; `"Steve Smith"` is not a Minecraft name, and
 *   silently removing the space would send the visitor to the wrong account.
 * - **Length is checked before the character set.** A 17-character name with a space reports
 *   "too long" rather than "illegal characters", because the length is the first thing the
 *   visitor has to change, and one error at a time is easier to act on than two.
 *
 * This is a demo-shaped field: a real store would ask the game's API whether the account exists
 * before delivering anything. Nothing here checks existence, because there is no backend and
 * nothing is delivered.
 */

/** Shortest legal Java Edition username. */
export const MINECRAFT_USERNAME_MIN_LENGTH = 3;

/** Longest legal Java Edition username. */
export const MINECRAFT_USERNAME_MAX_LENGTH = 16;

/** The legal character set: ASCII letters, digits and underscore. No accents, no spaces. */
export const MINECRAFT_USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

/** Why a username was rejected. `ui-text.ts` turns each one into the sentence shown. */
export type MinecraftUsernameProblem = 'empty' | 'too-short' | 'too-long' | 'illegal-characters';

/** A username that passed, or the first rule it failed. */
export type MinecraftUsernameValidation =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly problem: MinecraftUsernameProblem };

/**
 * Validates `raw` as a Minecraft username.
 *
 * @param raw what the visitor typed. `null`/`undefined` are treated as empty rather than
 *   throwing: the value comes from a DOM input, which is always a string, but a caller with a
 *   missing value should get a normal validation result.
 * @returns the trimmed value when it is legal, otherwise the first problem found.
 */
export function validateMinecraftUsername(
  raw: string | null | undefined,
): MinecraftUsernameValidation {
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (value.length === 0) return { ok: false, problem: 'empty' };
  if (value.length < MINECRAFT_USERNAME_MIN_LENGTH) return { ok: false, problem: 'too-short' };
  if (value.length > MINECRAFT_USERNAME_MAX_LENGTH) return { ok: false, problem: 'too-long' };
  if (!MINECRAFT_USERNAME_PATTERN.test(value)) return { ok: false, problem: 'illegal-characters' };

  return { ok: true, value };
}
