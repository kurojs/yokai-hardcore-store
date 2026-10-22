import { TestBed } from '@angular/core/testing';

import type { StorageLike } from '../cart/cart-persistence';
import { PLAYER_STORAGE_KEY } from './player-name';
import {
  PLAYER_STORAGE,
  PlayerStore,
  clearStoredPlayer,
  readStoredPlayer,
  writeStoredPlayer,
} from './player-store';

/** An in-memory `StorageLike`, so no spec depends on jsdom's `localStorage`. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  readonly values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

function failingStorage(): StorageLike {
  const refuse = (): never => {
    throw new Error('quota exceeded');
  };

  return { getItem: refuse, setItem: refuse, removeItem: refuse };
}

describe('player persistence', () => {
  it('reads a stored name', () => {
    expect(readStoredPlayer(memoryStorage({ [PLAYER_STORAGE_KEY]: 'Notch' }))).toBe('Notch');
  });

  it('normalises what was stored, so a padded name is still usable', () => {
    expect(readStoredPlayer(memoryStorage({ [PLAYER_STORAGE_KEY]: '  Notch ' }))).toBe('Notch');
  });

  it('degrades a corrupt entry to "nobody signed in"', () => {
    expect(readStoredPlayer(memoryStorage({ [PLAYER_STORAGE_KEY]: 'not a name!' }))).toBeNull();
    expect(readStoredPlayer(memoryStorage({ [PLAYER_STORAGE_KEY]: '' }))).toBeNull();
    expect(readStoredPlayer(memoryStorage())).toBeNull();
    expect(readStoredPlayer(null)).toBeNull();
  });

  it('does not throw when storage itself throws', () => {
    expect(readStoredPlayer(failingStorage())).toBeNull();
    expect(writeStoredPlayer(failingStorage(), 'Notch')).toBe(false);
    expect(clearStoredPlayer(failingStorage())).toBe(false);
  });

  it('writes the normalised name and refuses an invalid one without touching storage', () => {
    const storage = memoryStorage();

    expect(writeStoredPlayer(storage, '  Notch  ')).toBe(true);
    expect(storage.values.get(PLAYER_STORAGE_KEY)).toBe('Notch');

    expect(writeStoredPlayer(storage, 'ab')).toBe(false);
    expect(storage.values.get(PLAYER_STORAGE_KEY)).toBe('Notch');
  });

  it('clears the entry', () => {
    const storage = memoryStorage({ [PLAYER_STORAGE_KEY]: 'Notch' });

    expect(clearStoredPlayer(storage)).toBe(true);
    expect(storage.values.has(PLAYER_STORAGE_KEY)).toBe(false);
  });
});

describe('PlayerStore', () => {
  it('starts signed out, with no avatar and no stored name', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: memoryStorage() }],
    });

    const store = TestBed.inject(PlayerStore);

    expect(store.playerName()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
    // `null`, not an empty string: a caller can skip the `<img>` entirely.
    expect(store.avatarUrl()).toBeNull();
  });

  it('restores the stored player on construction', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: memoryStorage({ [PLAYER_STORAGE_KEY]: 'Notch' }) }],
    });

    const store = TestBed.inject(PlayerStore);

    expect(store.playerName()).toBe('Notch');
    expect(store.isSignedIn()).toBe(true);
    expect(store.avatarUrl()).toBe('https://minotar.net/helm/Notch/64.png');
  });

  it('signs in with a valid name and persists it', () => {
    const storage = memoryStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: storage }],
    });

    const store = TestBed.inject(PlayerStore);

    expect(store.signIn('  Notch  ')).toBe(true);
    expect(store.playerName()).toBe('Notch');
    expect(store.avatarUrl()).toBe('https://minotar.net/helm/Notch/64.png');
    expect(storage.values.get(PLAYER_STORAGE_KEY)).toBe('Notch');
  });

  it('rejects an invalid name and leaves the previous player in place', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: memoryStorage({ [PLAYER_STORAGE_KEY]: 'Notch' }) }],
    });

    const store = TestBed.inject(PlayerStore);

    expect(store.signIn('Steve Smith')).toBe(false);
    expect(store.playerName()).toBe('Notch');
  });

  it('signs out from memory and storage', () => {
    const storage = memoryStorage({ [PLAYER_STORAGE_KEY]: 'Notch' });
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: storage }],
    });

    const store = TestBed.inject(PlayerStore);
    store.signOut();

    expect(store.playerName()).toBeNull();
    expect(store.avatarUrl()).toBeNull();
    expect(storage.values.has(PLAYER_STORAGE_KEY)).toBe(false);
  });

  it('still signs in when storage refuses, because this tab asked for it', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLAYER_STORAGE, useValue: failingStorage() }],
    });

    const store = TestBed.inject(PlayerStore);

    expect(store.signIn('Notch')).toBe(true);
    expect(store.playerName()).toBe('Notch');
  });
});
