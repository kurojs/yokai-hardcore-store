/**
 * The player's Minecraft username and the avatar URL it implies.
 *
 * There is no account system behind this. The username is an *identifier* the visitor types once
 * so the storefront can show their skin; it is not authentication, and nothing here proves the
 * visitor owns the name. That distinction is the reason this module is small and honest: it
 * validates exactly the same rule the checkout already uses, and it builds a URL. It never
 * claims a session.
 *
 * Keeping it pure means the whole decision table — a missing name, a name with surrounding
 * spaces, a name that is too long, a name with an accent — is testable with no DOM, no storage
 * and no network.
 */

import { validateMinecraftUsername } from '../checkout/username';

/** Where the chosen username survives a reload. Versioned so a future shape change can ignore it. */
export const PLAYER_STORAGE_KEY = 'yokai.player.v1';

/** Minotar's helmet render is a 8x8 face crop; 64px covers a 32px avatar on a 2x display. */
export const MINOTAR_HELMET_SIZE = 64;

/** The largest size Minotar serves that this store will ever ask for. */
const MAX_AVATAR_SIZE = 256;

/**
 * The username as it should be stored, or `null` when it cannot be one.
 *
 * The checkout's validator owns the rule: 3 to 16 characters from `A-Z`, `a-z`, `0-9` and `_`,
 * with surrounding whitespace forgiven and inner whitespace rejected. Reusing it means the two
 * places that ask for a username can never disagree about what a username is.
 */
export function normalisePlayerName(raw: string | null | undefined): string | null {
  const result = validateMinecraftUsername(raw);
  return result.ok ? result.value : null;
}

/**
 * The Minotar helmet URL for a username, or `null` when the name is not a valid one.
 *
 * Returning `null` rather than a URL to an empty name is what lets the caller render nothing:
 * a broken or placeholder avatar is worse than no avatar, because it silently claims a player
 * exists. The name is percent-encoded even though the accepted character set needs no escaping
 * today — the encoder is a guard against a future loosening, not decoration.
 */
export function minotarHelmetUrl(
  raw: string | null | undefined,
  size: number = MINOTAR_HELMET_SIZE,
): string | null {
  const name = normalisePlayerName(raw);
  if (name === null) return null;

  const requested = Number.isFinite(size) ? Math.trunc(size) : MINOTAR_HELMET_SIZE;
  const clamped = Math.min(Math.max(requested, 8), MAX_AVATAR_SIZE);

  return `https://minotar.net/helm/${encodeURIComponent(name)}/${clamped}.png`;
}
