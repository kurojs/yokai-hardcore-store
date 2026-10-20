/**
 * The three languages the storefront speaks, and the pure rules around them.
 *
 * This file is the only place that knows how a stored value becomes a language. The store reads
 * it, the switcher offers the same list, and nothing else has an opinion — which is what would
 * let a future URL-prefixed strategy replace {@link readStoredLanguage} without touching a
 * single consumer.
 *
 * Every function here takes its collaborators as arguments instead of reaching for globals:
 * `core/` stays testable without a DOM, and a spec can hand it a fake storage or a fake
 * document without stubbing anything.
 */

/** A language the UI chrome is authored in. Catalog content is not translated. */
export type Language = 'es' | 'en' | 'ja';

/**
 * The languages in switcher order.
 *
 * Spanish first because it is the default and the store's own data language; English second
 * because it is the lingua franca the server's international players expect.
 */
export const LANGUAGES: readonly Language[] = ['es', 'en', 'ja'];

/** Used when nothing valid is stored. */
export const DEFAULT_LANGUAGE: Language = 'es';

/**
 * Language names in their own language.
 *
 * Endonyms, deliberately: a Japanese visitor looking for their own language scans `日本語`, not
 * "Japanese", and the same is true of `Español` and `English`. This is data, not translated copy,
 * so it does not live in the dictionaries and cannot drift between them.
 */
export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  es: 'Español',
  en: 'English',
  ja: '日本語',
};

/** Where the visitor's choice is remembered. */
export const LANGUAGE_STORAGE_KEY = 'yokai.language';

/** @returns whether `value` is one of the authored languages. */
export function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en' || value === 'ja';
}

/**
 * Turns anything at all into a usable language.
 *
 * Storage is untrusted: it is user-writable, it survives deployments, and a renamed or retired
 * language leaves its old value behind. A garbage value must therefore fall back to the default
 * rather than reach a dictionary lookup, because `UI_TEXT[garbage]` is `undefined` and the whole
 * page would render blank. Surrounding whitespace and casing are forgiven (`"EN "` is English);
 * anything else is not guessed at.
 */
export function normalizeLanguage(value: unknown): Language {
  if (typeof value !== 'string') return DEFAULT_LANGUAGE;
  const candidate = value.trim().toLowerCase();
  return isLanguage(candidate) ? candidate : DEFAULT_LANGUAGE;
}

/** The slice of `Storage` the language choice needs; a structural type keeps `core/` DOM-free. */
export interface LanguageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the remembered language, falling back safely.
 *
 * `getItem` can throw when storage is disabled (some privacy modes) or when the document is
 * sandboxed. A storefront must render in *some* language in that case, so the failure is
 * swallowed and the default is returned.
 */
export function readStoredLanguage(
  storage: LanguageStorage | null | undefined,
): Language {
  if (storage === null || storage === undefined) return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(storage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Remembers the chosen language.
 *
 * A failed write is not a reason to break the page: the language still applies for this visit,
 * and the next visit simply starts from the default again.
 */
export function persistLanguage(
  storage: LanguageStorage | null | undefined,
  language: Language,
): void {
  if (storage === null || storage === undefined) return;
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage full or denied: the in-memory choice is still correct.
  }
}

/**
 * The shape {@link applyDocumentLanguage} needs.
 *
 * Structural rather than `Document` so `core/` never names a DOM global. The injectable store
 * passes Angular's `DOCUMENT`; a spec passes a one-property object.
 */
export interface LanguageDocument {
  readonly documentElement: { lang: string };
}

/**
 * Keeps `<html lang>` equal to the active language.
 *
 * This is not decoration. `lang` drives screen-reader pronunciation, the hyphenation dictionary,
 * spellcheck, and the browser's own font fallback for CJK. A page whose visible copy is Japanese
 * while `lang="es"` is mispronounced from the first word.
 */
export function applyDocumentLanguage(
  target: LanguageDocument,
  language: Language,
): void {
  target.documentElement.lang = language;
}
