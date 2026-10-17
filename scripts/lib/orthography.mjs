/**
 * Orthography correction for the store copy.
 *
 * ## Why this module exists
 *
 * The store copy was exported from Tebex and carries a small number of Spanish
 * words written without their mandatory accent. The sibling `categoria.txt` and
 * `info.txt` files were checked as a repair source and are **byte-identical** to
 * the JSON for every one of the 48 descriptions, so they cannot restore the
 * missing accents. Verification of that claim lives in `src/tooling/`.
 *
 * Because no in-repo source attests the accented spelling for some of these
 * words, the fix list below is deliberately tiny, explicit, and auditable:
 * every entry is either
 *   (a) a word whose accented spelling IS attested elsewhere in the same corpus
 *       (evidence recorded per entry), or
 *   (b) a common noun whose accent is mandatory and unambiguous in Spanish.
 *
 * Proper nouns (`Odin`, `Ponce`) and words that are already correct (`Brujo`,
 * `Hongo`, `Algodones`, `seleccionados`) are intentionally absent, as are
 * joke/character names where intent cannot be confirmed from the corpus
 * (`Pollo Ricky Ricon`).
 *
 * Matching is word-bounded, so `Algodones` (already correct) is never touched by
 * the `Algodon` rule.
 */

/**
 * Accent corrections applied to all generated display copy.
 * `from` values are matched as whole words, so substring damage is impossible.
 */
export const ACCENT_FIXES = Object.freeze([
  // Cupón — corpus attests `Cupón` x16 and `cupón` x18.
  { from: "Cupon", to: "Cupón", evidence: "corpus attests Cupon x6 vs Cupón x16" },
  { from: "CUPON", to: "CUPÓN", evidence: "case variant of the Cupón correction" },
  { from: "cupon", to: "cupón", evidence: "case variant of the Cupón correction" },

  // Clérigo — corpus attests `clérigo` x2.
  { from: "Clerigo", to: "Clérigo", evidence: "corpus attests Clerigo x2 vs clérigo x2" },
  { from: "CLERIGO", to: "CLÉRIGO", evidence: "case variant of the Clérigo correction" },
  { from: "clerigo", to: "clérigo", evidence: "case variant of the Clérigo correction" },

  // Héroe — corpus attests `Héroe` x6 and `héroe` x2.
  { from: "Heroe", to: "Héroe", evidence: "corpus attests Heroe x3 vs Héroe x6" },
  { from: "HEROE", to: "HÉROE", evidence: "case variant of the Héroe correction" },
  { from: "heroe", to: "héroe", evidence: "case variant of the Héroe correction" },

  // Ojón — corpus attests `Ojón` x4.
  { from: "Ojon", to: "Ojón", evidence: "corpus attests Ojon x2 vs Ojón x4" },
  { from: "OJON", to: "OJÓN", evidence: "case variant of the Ojón correction" },
  { from: "ojon", to: "ojón", evidence: "case variant of the Ojón correction" },

  // Armería — mandatory accent (vowel hiatus); no accented form in the corpus.
  { from: "Armeria", to: "Armería", evidence: "mandatory Spanish accent; no corpus counter-form" },
  { from: "ARMERIA", to: "ARMERÍA", evidence: "case variant of the Armería correction" },
  { from: "armeria", to: "armería", evidence: "case variant of the Armería correction" },

  // Fénix — mandatory accent; no accented form in the corpus.
  { from: "Fenix", to: "Fénix", evidence: "mandatory Spanish accent; no corpus counter-form" },
  { from: "FENIX", to: "FÉNIX", evidence: "case variant of the Fénix correction" },
  { from: "fenix", to: "fénix", evidence: "case variant of the Fénix correction" },

  // Células — mandatory accent; no accented form in the corpus.
  { from: "Celulas", to: "Células", evidence: "mandatory Spanish accent; no corpus counter-form" },
  { from: "CELULAS", to: "CÉLULAS", evidence: "case variant of the Células correction" },
  { from: "celulas", to: "células", evidence: "case variant of the Células correction" },

  // Testículos — mandatory accent; no accented form in the corpus.
  { from: "Testiculos", to: "Testículos", evidence: "mandatory Spanish accent; no corpus counter-form" },
  { from: "TESTICULOS", to: "TESTÍCULOS", evidence: "case variant of the Testículos correction" },
  { from: "testiculos", to: "testículos", evidence: "case variant of the Testículos correction" },
]);

/**
 * Every plain form that must never survive into generated display copy. Used by
 * the catalog verifier and the unit specs as the accent-stripping gate.
 */
export const RESIDUAL_PLAIN_FORMS = Object.freeze([...new Set(ACCENT_FIXES.map((fix) => fix.from))]);

const WORD_CHAR = "A-Za-z\u00C0-\u024F";

function toWordBoundedPattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![${WORD_CHAR}])${escaped}(?![${WORD_CHAR}])`, "g");
}

const COMPILED_FIXES = ACCENT_FIXES.map((fix) => ({ ...fix, pattern: toWordBoundedPattern(fix.from) }));

/**
 * Applies the accent corrections to a piece of copy.
 *
 * @param {string} value
 * @returns {string} the corrected copy
 */
export function restoreAccents(value) {
  let out = String(value);
  for (const { pattern, to } of COMPILED_FIXES) {
    out = out.replace(pattern, to);
  }
  return out;
}

/**
 * Reports which residual plain forms a piece of copy still contains, with the
 * count. Used by the verifier so a regression is reported, not just silent.
 *
 * @param {string} value
 * @returns {Array<{ form: string, count: number }>}
 */
export function findResidualPlainForms(value) {
  const text = String(value);
  const hits = [];
  for (const form of RESIDUAL_PLAIN_FORMS) {
    const count = (text.match(toWordBoundedPattern(form)) ?? []).length;
    if (count > 0) hits.push({ form, count });
  }
  return hits;
}
