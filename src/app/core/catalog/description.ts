/**
 * Turning a catalog product's description into readable sections.
 *
 * The data is the reason this module exists. A real description is one unbroken paragraph of
 * 500–1,430 characters that mixes an introduction with editorial labels:
 *
 * ```
 * ¡Aliméntate como todo un guerrero …! Características del Alimento: Cantidad: Se entrega un
 * set de 10 unidades. Origen: Producto cocinado … Efectos Temporales: Velocidad IX durante 10
 * segundos: Aumenta significativamente … Descripción: Los Algodones …
 * ```
 *
 * Rendering that inside a single `<p>{{ description }}</p>` is not a stylistic preference: it
 * collapses every one of those boundaries into a wall of text. So the text is split into
 * blocks, each with an optional label, and the page renders a block per paragraph with the
 * label emphasised.
 *
 * ## The rule, and why it is a heuristic rather than a parser
 *
 * There is no grammar to parse. The source is prose with colons in it, and the colons are used
 * for at least four different purposes: structural labels (`Cantidad:`), inline headings
 * (`Efectos Temporales:`), value lists (`Pociones:`), and ordinary punctuation (`… es más que
 * una bebida:`). Rather than pretend otherwise, a candidate is accepted as a label only when it
 * looks like the editorial labels the data actually uses:
 *
 * - it starts with a capital letter and is 2–42 characters and at most 6 words;
 * - it contains no sentence punctuation, quotes, brackets or `¡`/`¿`;
 * - no more than two *content* words appear in a row, where a content word is capitalised or a
 *   numeral and a connector (`de`, `del`, `la`, `y`, …) breaks the run. That single rule is what
 *   separates `Características del Pico Luminoso` (one label) from `Rey Slime Gigante Habilidad
 *   Especial` (a value that swallowed the next label), and it is measured against all 48 real
 *   descriptions in `description.spec.ts`.
 *
 * Two deliberate fallbacks:
 *
 * - A label may begin mid-segment when the *whole* segment before the colon is too long to be a
 *   label but its last one to three words are one. That is how `Armaduras:` inside the cofre's
 *   item list and `Habilidad Especial:` after a boss's name are found.
 * - A label may not begin in the middle of a noun phrase: if the discarded prefix ends in a
 *   connector (`… Características del`), the split is refused. Losing a heading is a smaller
 *   defect than rendering `Características del` as the tail of the previous sentence.
 *
 * ## The guarantee that matters
 *
 * The split never rewrites the text. Concatenating the blocks (`label + ': ' + body`) and
 * collapsing whitespace reproduces the original description exactly — no characters dropped, no
 * characters duplicated — and a spec asserts that for all 48 catalog products. A mis-detected
 * label is therefore a cosmetic blemish, never data loss.
 *
 * Newlines are honoured as hard breaks, because a future catalog might keep them. The committed
 * document has none today (verified over all 48 descriptions), which is exactly why the label
 * rule above has to exist.
 */

/** One readable section of a product description. */
export interface DescriptionBlock {
  /**
   * The structural label without its trailing colon, or `null` for ordinary prose.
   *
   * Never case-transformed: the catalog's editorial voice is part of the content.
   */
  readonly label: string | null;
  /** The section's text. Empty when the label is a heading for the sections after it. */
  readonly body: string;
}

/** Longest candidate accepted as a label. Between the data's longest real label and a sentence. */
const MAX_LABEL_CHARS = 42;

/** Most words a label may hold. `Características de la Motosierra Acelerada` is five. */
const MAX_LABEL_WORDS = 6;

/**
 * Most capitalised-or-numeric words allowed in an unbroken run inside a label.
 *
 * `Suerte II Origen Místico` is four (rejected); `Salud al Instante II` never exceeds two
 * because `al` resets the run (accepted).
 */
const MAX_CONTENT_RUN = 2;

/** Characters that mark a candidate as prose, a quotation or a value rather than a label. */
const FORBIDDEN_IN_LABEL = /[¡¿!?".,;()[\]/]/;

/**
 * Words that continue a noun phrase rather than start one.
 *
 * Used twice: to break a run of capitalised words, and to refuse a split that would leave the
 * previous section ending in `… Características del`.
 */
const CONNECTORS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'para',
  'por',
  'un',
  'una',
  'y',
]);

/** How many trailing words may be re-examined as a label when the whole segment is too long. */
const MAX_LABEL_TAIL_WORDS = 3;

/** Lowercase-and-strip-accents, so `Del` and `del` are the same connector. */
function foldWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** A word that carries meaning inside a label: capitalised, or a number/roman numeral. */
function isContentWord(word: string): boolean {
  return /^\p{Lu}/u.test(word) || /^[\dIVXL]+$/.test(word);
}

/** Whether `candidate` has the shape of the editorial labels this catalog uses. */
function isLabelShaped(candidate: string): boolean {
  const label = candidate.trim();
  if (label.length < 2 || label.length > MAX_LABEL_CHARS) return false;
  if (FORBIDDEN_IN_LABEL.test(label)) return false;
  if (/\s{2,}/.test(label)) return false;
  if (!/^\p{Lu}/u.test(label)) return false;

  const words = label.split(/\s+/);
  if (words.length > MAX_LABEL_WORDS) return false;
  if (!words.some(isContentWord)) return false;

  let run = 0;
  for (const word of words) {
    if (!isContentWord(word)) {
      run = 0;
      continue;
    }
    run += 1;
    if (run > MAX_CONTENT_RUN) return false;
  }
  return true;
}

/** Whether a split would leave the previous section ending in `… del` / `… de la`. */
function endsWithConnector(prefix: string): boolean {
  const words = prefix.trim().split(/\s+/);
  return CONNECTORS.has(foldWord(words[words.length - 1] ?? ''));
}

interface LabelMatch {
  /** The label text, trimmed, without its colon. */
  readonly label: string;
  /** Where the label starts, relative to the start of the candidate segment. */
  readonly offset: number;
}

/**
 * Decides whether the text before a colon is a label, and where it starts.
 *
 * @returns `null` when the colon is ordinary punctuation, or when splitting there would cut a
 *   noun phrase in half.
 */
function matchLabel(candidate: string): LabelMatch | null {
  if (isLabelShaped(candidate)) {
    return { label: candidate.trim(), offset: candidate.indexOf(candidate.trim()) };
  }

  const trimmed = candidate.trimEnd();
  const words = trimmed.trim().split(/\s+/);
  if (words.length < 2) return null;

  const maxTail = Math.min(MAX_LABEL_TAIL_WORDS, words.length - 1);
  for (let tailWords = maxTail; tailWords >= 1; tailWords -= 1) {
    const tail = words.slice(words.length - tailWords).join(' ');
    if (!isLabelShaped(tail)) continue;

    const prefix = words.slice(0, words.length - tailWords).join(' ');
    // A valid tail after a dangling connector means the tail is the object of that connector,
    // not a heading: `… Características del | Pico Luminoso` must stay one phrase.
    if (endsWithConnector(prefix)) return null;

    const offset = trimmed.length - tail.length;
    // The candidate may carry leading whitespace from the previous section; the tail must still
    // be a real suffix of the text, which it is by construction.
    return { label: tail, offset: Math.max(0, offset) };
  }

  return null;
}

/**
 * Where the sentence containing `before` starts, so a label after `!` or `.` is found even when
 * the previous section was long.
 */
function sentenceStartBefore(paragraph: string, before: number): number {
  let start = 0;
  for (let index = 0; index < before; index += 1) {
    if (!/[.!?…]/.test(paragraph[index] ?? '')) continue;
    if (!/\s/.test(paragraph[index + 1] ?? '')) continue;
    let next = index + 1;
    while (next < before && /\s/.test(paragraph[next] ?? '')) next += 1;
    start = next;
  }
  return start;
}

interface Boundary {
  /** Absolute index where the label starts. Everything before it belongs to the previous block. */
  readonly labelStart: number;
  /** Absolute index of the label's colon. */
  readonly colonIndex: number;
  readonly label: string;
}

/** Finds every accepted label boundary in one paragraph, left to right. */
function findBoundaries(paragraph: string): readonly Boundary[] {
  const boundaries: Boundary[] = [];
  let previousLabelEnd = 0;
  let colon = -1;

  while ((colon = paragraph.indexOf(':', colon + 1)) >= 0) {
    // `12:30` and `http://` are not labels: a label's colon is followed by whitespace or ends
    // the paragraph.
    if (colon + 1 < paragraph.length && !/\s/.test(paragraph[colon + 1] ?? '')) continue;

    const start = Math.max(previousLabelEnd, sentenceStartBefore(paragraph, colon));
    const match = matchLabel(paragraph.slice(start, colon));
    if (match === null) continue;

    boundaries.push({ labelStart: start + match.offset, colonIndex: colon, label: match.label });
    previousLabelEnd = colon + 1;
  }

  return boundaries;
}

/**
 * Splits `text` into readable sections.
 *
 * Total: any string, including `''`, yields an array. Order is preserved and the concatenation
 * of the blocks reproduces the input (see the module comment).
 */
export function parseDescription(text: string): readonly DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];

  for (const rawParagraph of text.replace(/\r\n?/g, '\n').split(/\n+/)) {
    const paragraph = rawParagraph.trim();
    if (paragraph.length === 0) continue;

    const boundaries = findBoundaries(paragraph);
    let cursor = 0;

    for (let index = 0; index <= boundaries.length; index += 1) {
      const boundary = boundaries[index];
      const end = boundary === undefined ? paragraph.length : boundary.labelStart;
      const body = paragraph.slice(cursor, end).trim();
      const label = index === 0 ? null : (boundaries[index - 1]?.label ?? null);

      if (label !== null || body.length > 0) blocks.push({ label, body });
      if (boundary !== undefined) cursor = boundary.colonIndex + 1;
    }
  }

  return blocks;
}

/**
 * The text a block renders as, label colon included.
 *
 * Exported because both the presentational component's spec and the real-catalog reconstruction
 * spec need the same definition of "what the reader sees", and two copies of it could disagree.
 */
export function descriptionBlockText(block: DescriptionBlock): string {
  return block.label === null ? block.body : `${block.label}: ${block.body}`.trimEnd();
}
