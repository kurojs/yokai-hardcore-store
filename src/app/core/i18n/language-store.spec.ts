/**
 * Specs for the active-language store.
 *
 * The store is the one place that writes a language, so these specs pin the three side effects
 * that must travel together: the signal a page renders from, the stored preference and
 * `<html lang>`. They also pin the failure modes: unreadable storage must not leave the store
 * without a dictionary.
 */

import { TestBed } from '@angular/core/testing';

import { LANGUAGE_STORAGE, LanguageStore } from './language-store';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type LanguageStorage } from './language';

/** A `Storage` stand-in that records what was written, so persistence is observable. */
function memoryStorage(initial: Readonly<Record<string, string>> = {}): LanguageStorage & {
  readonly values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('LanguageStore', () => {
  afterEach(() => {
    document.documentElement.lang = DEFAULT_LANGUAGE;
    localStorage.clear();
  });

  describe('with the real storage', () => {
    it('starts in Spanish when nothing was stored', () => {
      localStorage.clear();
      TestBed.configureTestingModule({});

      const store = TestBed.inject(LanguageStore);

      expect(store.language()).toBe('es');
      expect(store.text().navHome).toBe('Inicio');
      expect(document.documentElement.lang).toBe('es');
    });

    it('restores the stored language on construction', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ja');
      TestBed.configureTestingModule({});

      const store = TestBed.inject(LanguageStore);

      expect(store.language()).toBe('ja');
      expect(document.documentElement.lang).toBe('ja');
    });

    it('falls back to Spanish when the stored value is garbage', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon');
      TestBed.configureTestingModule({});

      const store = TestBed.inject(LanguageStore);

      expect(store.language()).toBe('es');
      expect(document.documentElement.lang).toBe('es');
    });

    it('switches language, persists it and updates the document element', () => {
      TestBed.configureTestingModule({});
      const store = TestBed.inject(LanguageStore);

      store.set('en');

      expect(store.language()).toBe('en');
      expect(store.text().navHome).toBe('Home');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('with injected storage', () => {
    function createStore(storage: LanguageStorage | null): LanguageStore {
      TestBed.configureTestingModule({
        providers: [{ provide: LANGUAGE_STORAGE, useValue: storage }],
      });
      return TestBed.inject(LanguageStore);
    }

    it('reads the preference from the injected storage', () => {
      const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en' });

      const store = createStore(storage);

      expect(store.language()).toBe('en');
    });

    it('writes the choice to the injected storage', () => {
      const storage = memoryStorage();

      createStore(storage).set('ja');

      expect(storage.values.get(LANGUAGE_STORAGE_KEY)).toBe('ja');
    });

    it('still works when storage is unavailable', () => {
      const store = createStore(null);

      expect(store.language()).toBe('es');
      expect(() => store.set('ja')).not.toThrow();
      expect(store.language()).toBe('ja');
      expect(document.documentElement.lang).toBe('ja');
    });

    it('does not rewrite storage when the active language is re-selected', () => {
      const storage = memoryStorage();
      const store = createStore(storage);
      const writes: string[] = [];
      const original = storage.setItem;
      storage.setItem = (key, value) => {
        writes.push(value);
        original(key, value);
      };

      store.set('es');

      expect(writes).toEqual([]);
    });
  });
});
