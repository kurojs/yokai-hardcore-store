/**
 * The three dictionaries, selected by the active language.
 *
 * `Record<Language, UiText>` is the compile-time guard this whole layer exists for:
 *
 * - every dictionary is annotated `UiText`, so a **missing key** is an error in that file;
 * - the map is annotated `Record<Language, UiText>`, so a **missing language** is an error here;
 * - both reject excess keys too, because the dictionaries are object literals assigned to a
 *   typed target. The result is that no dictionary can silently fall behind another, and the UI
 *   can never render `undefined` because a key was spelled differently in one language.
 */

import type { Language } from './language';
import { EN_UI_TEXT } from './dictionaries/en';
import { ES_UI_TEXT } from './dictionaries/es';
import { JA_UI_TEXT } from './dictionaries/ja';
import type { UiText } from './ui-text-model';

export type { UiText } from './ui-text-model';

/** Spanish is first because it is the store's own language and the fallback for every page. */
export const UI_TEXT: Record<Language, UiText> = {
  es: ES_UI_TEXT,
  en: EN_UI_TEXT,
  ja: JA_UI_TEXT,
};

/**
 * @returns the dictionary for `language`.
 *
 * Total by construction: the parameter is the closed `Language` union and the map covers it, so
 * there is no `undefined` branch to defend against here. The defence against a bad stored value
 * lives in `normalizeLanguage`, at the boundary where untrusted input enters.
 */
export function uiText(language: Language): UiText {
  return UI_TEXT[language];
}
