/**
 * Specs for the language rules.
 *
 * Everything here is a pure function taking its collaborator as an argument, so these run without
 * a TestBed and without a real DOM. The cases that matter are the boundaries: what happens with
 * no stored value, with a value from a retired language, and with storage that throws.
 */

import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_STORAGE_KEY,
  applyDocumentLanguage,
  isLanguage,
  normalizeLanguage,
  persistLanguage,
  readStoredLanguage,
  type LanguageStorage,
} from './language';

/** A `Storage` stand-in that records what was written. */
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

describe('normalizeLanguage', () => {
  it('accepts every authored language', () => {
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('ja')).toBe('ja');
  });

  it('forgives surrounding whitespace and casing', () => {
    expect(normalizeLanguage(' EN ')).toBe('en');
    expect(normalizeLanguage('Ja')).toBe('ja');
  });

  it('falls back to the default for anything that is not a language', () => {
    // Storage is user-writable and survives deployments, so these are real inputs, not paranoia.
    expect(normalizeLanguage('fr')).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage('')).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage('es-ES')).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage(null)).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage(42)).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage({ language: 'ja' })).toBe(DEFAULT_LANGUAGE);
  });
});

describe('isLanguage', () => {
  it('narrows only the three authored values', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('ja')).toBe(true);
    expect(isLanguage('ES')).toBe(false);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe('LANGUAGES', () => {
  it('lists three distinct languages, default first', () => {
    expect(LANGUAGES).toEqual(['es', 'en', 'ja']);
    expect(new Set(LANGUAGES).size).toBe(3);
    expect(LANGUAGES[0]).toBe(DEFAULT_LANGUAGE);
  });

  it('names every language with a non-empty endonym', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_LABELS[language].length).toBeGreaterThan(0);
    }
    expect(new Set(LANGUAGES.map((language) => LANGUAGE_LABELS[language])).size).toBe(3);
  });
});

describe('readStoredLanguage', () => {
  it('returns the stored language', () => {
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'ja' }))).toBe('ja');
  });

  it('falls back when nothing was stored', () => {
    expect(readStoredLanguage(memoryStorage())).toBe(DEFAULT_LANGUAGE);
  });

  it('falls back when a garbage value was stored', () => {
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'klingon' }))).toBe(
      DEFAULT_LANGUAGE,
    );
  });

  it('falls back when storage is missing or throws', () => {
    expect(readStoredLanguage(null)).toBe(DEFAULT_LANGUAGE);
    expect(readStoredLanguage(undefined)).toBe(DEFAULT_LANGUAGE);

    const throwing: LanguageStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    expect(readStoredLanguage(throwing)).toBe(DEFAULT_LANGUAGE);
  });
});

describe('persistLanguage', () => {
  it('writes the choice under the one storage key', () => {
    const storage = memoryStorage();

    persistLanguage(storage, 'en');

    expect(storage.values.get(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('never throws when storage is missing or refuses the write', () => {
    expect(() => persistLanguage(null, 'ja')).not.toThrow();

    const throwing: LanguageStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => persistLanguage(throwing, 'ja')).not.toThrow();
  });
});

describe('applyDocumentLanguage', () => {
  it('writes the language onto the document element', () => {
    const target = { documentElement: { lang: 'es' } };

    applyDocumentLanguage(target, 'ja');

    expect(target.documentElement.lang).toBe('ja');
  });
});
