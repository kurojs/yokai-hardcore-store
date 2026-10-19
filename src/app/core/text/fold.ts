/**
 * Text folding for search matching.
 *
 * The catalog's Spanish copy is diacritic heavy and — more importantly — *inconsistent*
 * about it, because product names and descriptions come from different authoring passes.
 * `Azúcar` appears accented inside a description while the same word is `AZUCAR` in the
 * product name, and `Armería De Héroe` sits next to the source folder `Armeria De Heroe`.
 * A literal substring match would therefore fail for whichever variant the user happens to
 * type, and a Spanish speaker on an English keyboard layout cannot type the accented form
 * at all.
 *
 * Folding both sides of every comparison removes both problems: case and diacritics stop
 * mattering, and the catalog's own inconsistency stops leaking into search results.
 *
 * Unicode NFD decomposition is used instead of a hand-written character table because it
 * also covers marks a Spanish-focused table would miss (`ü`, `à`, `ç`) at no extra cost,
 * and it cannot fall out of date with the data.
 */

/** The combining-mark block NFD produces for Latin diacritics. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Folds `value` for comparison: decompose, strip combining marks, then lowercase.
 *
 * Lowercasing *after* stripping is deliberate. Some code points only decompose into a
 * base letter plus a mark once case is normalised (Turkish dotted `İ`, U+0130), so the
 * reverse order would leave a stray mark behind.
 *
 * The result is only ever used to compare, never to display.
 */
export function foldForSearch(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}
