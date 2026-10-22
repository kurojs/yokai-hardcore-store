/**
 * The player the storefront is showing a skin for, and the only writer of it.
 *
 * Shape of the decision:
 *
 * - **One injectable, two signals.** The header renders the avatar, the account dialog writes the
 *   name, and neither knows where the name is remembered.
 * - **The name is an identifier, not a session.** There is no password, no token and no server
 *   call here. The store can say "this visitor told us they are `Notch`"; it cannot say the
 *   visitor *is* `Notch`, and it must never be described as if it could.
 * - **Storage can only degrade.** A corrupt, unreadable or absent entry resolves to "nobody
 *   signed in" rather than throwing on the way to the component tree — the same discipline the
 *   cart adapter uses.
 */

import { Injectable, InjectionToken, computed, inject, signal, type Signal } from '@angular/core';

import type { StorageLike } from '../cart/cart-persistence';
import { PLAYER_STORAGE_KEY, minotarHelmetUrl, normalisePlayerName } from './player-name';

/**
 * The storage the chosen username is remembered in.
 *
 * A token rather than `localStorage` directly so a spec can pass a fake, and so `core/` never
 * touches a browser global at module load time. The factory still tolerates `localStorage`
 * throwing in a sandboxed frame or a privacy mode.
 */
export const PLAYER_STORAGE = new InjectionToken<StorageLike | null>('PLAYER_STORAGE', {
  providedIn: 'root',
  factory: (): StorageLike | null => {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  },
});

/** The stored username, or `null` when there is none or it is not a usable name. */
export function readStoredPlayer(storage: StorageLike | null | undefined): string | null {
  if (!storage) return null;

  try {
    return normalisePlayerName(storage.getItem(PLAYER_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Writes the username. Returns `false` when the name is not valid or storage refused. */
export function writeStoredPlayer(
  storage: StorageLike | null | undefined,
  raw: string,
): boolean {
  const name = normalisePlayerName(raw);
  if (name === null) return false;
  if (!storage) return false;

  try {
    storage.setItem(PLAYER_STORAGE_KEY, name);
    return true;
  } catch {
    return false;
  }
}

/** Forgets the username. Returns `false` only when storage refused; `null` storage is a no-op. */
export function clearStoredPlayer(storage: StorageLike | null | undefined): boolean {
  if (!storage) return true;

  try {
    storage.removeItem(PLAYER_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly storage = inject(PLAYER_STORAGE);
  private readonly name = signal<string | null>(readStoredPlayer(this.storage));

  /** The signed-in username, or `null`. The header decides between avatar and sign-in button. */
  readonly playerName: Signal<string | null> = this.name.asReadonly();

  /** Whether a name is known. */
  readonly isSignedIn = computed<boolean>(() => this.name() !== null);

  /**
   * The Minotar helmet URL for the current player, or `null`.
   *
   * `null` rather than an empty URL is what keeps the header from issuing a request when nobody
   * is signed in: the `<img>` is not rendered at all.
   */
  readonly avatarUrl = computed<string | null>(() => minotarHelmetUrl(this.name()));

  /**
   * Remembers `raw` as the current player.
   *
   * Returns `false` when the name cannot be one, so the dialog can keep its error message and
   * the header stays as it was. A storage failure still updates this tab: the visitor asked for
   * it, and losing the avatar because a quota is full would be a worse surprise than losing the
   * preference on reload.
   */
  signIn(raw: string): boolean {
    const name = normalisePlayerName(raw);
    if (name === null) return false;

    this.name.set(name);
    writeStoredPlayer(this.storage, name);
    return true;
  }

  /** Forgets the current player, in this tab and in storage. */
  signOut(): void {
    this.name.set(null);
    clearStoredPlayer(this.storage);
  }
}
