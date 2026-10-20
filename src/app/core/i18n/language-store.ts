/**
 * The active language, and the only writer of it.
 *
 * Shape of the decision:
 *
 * - **One injectable, one signal.** Pages, the shell and the switcher all read `language()` and
 *   `text()`; none of them knows where the choice came from. Replacing localStorage with a route
 *   prefix or a cookie would change this file and nothing else.
 * - **Spanish by default.** The store's data is Spanish, so an unanswered preference must not
 *   produce a half-translated page.
 * - **`<html lang>` follows.** It is written synchronously at construction and on every change,
 *   not in an effect: the store is the sole writer, and a synchronous write leaves the document
 *   correct before the first change-detection pass. An effect would make correctness depend on
 *   when change detection happens to run.
 *
 * There is no SSR in this application, so the static `lang="es"` in `index.html` is only the
 * pre-hydration value; the store corrects it on the first visit with a non-Spanish preference.
 */

import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import {
  LANGUAGES,
  applyDocumentLanguage,
  persistLanguage,
  readStoredLanguage,
  type Language,
  type LanguageStorage,
} from './language';
import { uiText, type UiText } from './ui-text';

/**
 * The storage the language choice is remembered in.
 *
 * A token rather than `localStorage` directly for two reasons: a spec can hand the store a fake
 * without touching the global object, and `core/` never reaches for a browser global at module
 * load time. The factory still handles the real thing failing to exist (SSR, sandboxed frames,
 * privacy modes) by returning `null`, which every helper in `language.ts` accepts.
 */
export const LANGUAGE_STORAGE = new InjectionToken<LanguageStorage | null>('LANGUAGE_STORAGE', {
  providedIn: 'root',
  factory: (): LanguageStorage | null => {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  },
});

@Injectable({ providedIn: 'root' })
export class LanguageStore {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LANGUAGE_STORAGE);

  private readonly active = signal<Language>(readStoredLanguage(this.storage));

  /** The active language. Reads only; call {@link set} to change it. */
  readonly language = this.active.asReadonly();

  /** The active dictionary. Every consumer reads copy through this signal. */
  readonly text = computed<UiText>(() => uiText(this.active()));

  /** The languages the switcher offers, in display order. */
  readonly languages = LANGUAGES;

  constructor() {
    applyDocumentLanguage(this.document, this.active());
  }

  /**
   * Switches language, remembers it and updates `<html lang>`.
   *
   * Re-selecting the active language is a no-op: a `<select>` fires `change` only for a real
   * change, but a programmatic caller should not rewrite storage for nothing.
   */
  set(language: Language): void {
    if (language === this.active()) return;
    this.active.set(language);
    applyDocumentLanguage(this.document, language);
    persistLanguage(this.storage, language);
  }
}
