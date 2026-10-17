/**
 * Text normalization primitives for the catalog pipeline.
 *
 * Pure functions only: no I/O, no globals, no locale-dependent behavior.
 * Diacritics are folded with an explicit NFD pass rather than
 * `String.prototype.toLocaleLowerCase`, so results never depend on the host
 * locale or ICU data.
 */

/**
 * Collapses every whitespace run (including non-breaking spaces and newlines)
 * into a single ASCII space and trims the ends.
 */
export function collapseWhitespace(value) {
  return String(value)
    .replace(/[\s\u00A0\u2007\u202F]+/g, " ")
    .trim();
}

/**
 * Folds Latin diacritics to their base letters (`Cáliz` -> `Caliz`, `ñ` -> `n`).
 *
 * Uses canonical decomposition and drops combining marks, so it covers the full
 * Latin-1/Latin-Extended range present in the store copy without a hand-written
 * replacement table.
 */
export function foldAccents(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Strips straight and typographic quotation marks, which are not part of a name. */
export function stripQuotes(value) {
  return String(value).replace(/["'\u201C\u201D\u2018\u2019]/g, "");
}

/**
 * Builds a URL-safe slug: accent-folded, lowercase ASCII, single-hyphenated.
 *
 * Every run of characters outside `[A-Za-z0-9]` collapses to one hyphen, so the
 * real-data quirks (`Alimento Yokai  para...`, `Cofres/Ofertas`, `Fort-Craft`,
 * `Cupón de Invocación "Todo Está Pegajoso"`) all resolve without special cases.
 *
 * @throws {Error} when the input has no slug-able characters at all.
 */
export function slugify(value) {
  const slug = foldAccents(stripQuotes(value))
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!slug) {
    throw new Error(
      `slugify produced an empty slug for ${JSON.stringify(String(value))}; ` +
        `the value has no ASCII alphanumeric characters`,
    );
  }
  return slug;
}

/**
 * Normalizes a value for identity comparison: accent-folded, quote-free,
 * whitespace-collapsed, lowercase. Used to pair JSON category names with the
 * on-disk folder names, which differ by separator (`Cofres/Ofertas` vs
 * `Cofres_Ofertas`).
 */
export function comparisonKey(value) {
  return collapseWhitespace(foldAccents(stripQuotes(value)))
    .replace(/[/_\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
