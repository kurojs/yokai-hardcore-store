/**
 * Turning a catalog description's blocks into a readable page layout.
 *
 * `parseDescription` already decides *where* the sections are; this module decides *what each
 * section is*. The difference matters because the committed data is a single unbroken paragraph:
 * an introduction, label/value pairs (`Cantidad: Se entrega un set de 10 unidades.`), inline
 * headings (`Efectos Temporales:`), effect lines (`Velocidad IX durante 10 segundos: Aumenta …`)
 * and long prose all arrive through the same colon-delimited channel. Rendered uniformly they
 * read as a wall of text, so each block becomes a part with a shape the template can style:
 * a lead, a heading, an aligned fact row, an effect row, or prose.
 *
 * ## Why length decides fact versus prose
 *
 * The data has no marker for "this is a value" and "this is a paragraph". Inventing a grammar
 * would be worse than a threshold: a fact is a short body (`Se entrega un set de 10 unidades.`)
 * and prose is a long one (the closing `Descripción:` sections run to hundreds of characters).
 * `PROSE_THRESHOLD` sits well above every real value and well below every real prose block, so a
 * misfire is cosmetic rather than structural. Nothing here tries to understand the Spanish.
 *
 * ## No text is ever rewritten
 *
 * Labels lose their trailing colon (the colon was the split point, not content) and that is the
 * only character this module drops. Case, accents, exclamation marks and spelling are preserved
 * exactly: the catalog's editorial voice — including its SHOUTING rune names — is content. The
 * spec reconstructs all 48 committed descriptions from the parts to prove it.
 *
 * ## Why the effect icons are an explicit map
 *
 * Minecraft has no public API that answers "what texture is the Spanish effect `Caída Lenta`?".
 * Deriving the texture id from the label would mean guessing at translations at render time or
 * shipping a Java edition locale dump, and either one breaks silently when the catalog renames an
 * effect. An explicit, hand-audited map has exactly one failure mode — an effect that renders
 * without an icon — and the icon is decorative, so that failure is visible but harmless.
 */

import { parseDescription, type DescriptionBlock } from './description';

/** One styled piece of a product description, in reading order. */
export type DescriptionPart =
  | { readonly kind: 'lead'; readonly text: string }
  | { readonly kind: 'heading'; readonly title: string }
  | { readonly kind: 'fact'; readonly label: string; readonly value: string }
  | { readonly kind: 'text'; readonly title: string | null; readonly text: string }
  | {
      readonly kind: 'effect';
      /** The block label verbatim, level and duration included: `Velocidad IX durante 10 segundos`. */
      readonly label: string;
      /** The block body verbatim. */
      readonly detail: string;
      /** Vanilla texture id (`speed`), or `null` when the effect has no icon on file. */
      readonly icon: string | null;
    };

/**
 * Bodies longer than this are prose, not values.
 *
 * The longest real value in the committed catalog is a `Libros encantados` sentence of ~90
 * characters; the shortest real prose block is several hundred. 160 sits in the gap.
 */
const PROSE_THRESHOLD = 160;

/**
 * Spanish effect name (folded: no accents, lowercase) to vanilla texture id.
 *
 * Texture names match `assets/minecraft/textures/mob_effect/<id>.png` in the Java edition.
 * Aliases are deliberate: the catalog uses both `Velocidad` and `Rapidez`, both `Salud Mejorada`
 * and `Impulso a la Salud`, and writes several effects in the plural (`Náuseas II`).
 */
export const EFFECT_ICONS: Record<string, string> = {
  fuerza: 'strength',
  regeneracion: 'regeneration',
  velocidad: 'speed',
  rapidez: 'speed',
  suerte: 'luck',
  'heroe de la aldea': 'hero_of_the_village',
  resistencia: 'resistance',
  'resistencia al fuego': 'fire_resistance',
  'salud mejorada': 'health_boost',
  'impulso a la salud': 'health_boost',
  luminiscencia: 'glowing',
  saturacion: 'saturation',
  'caida lenta': 'slow_falling',
  hambre: 'hunger',
  supersalto: 'jump_boost',
  malpresagio: 'bad_omen',
  'vision nocturna': 'night_vision',
  'respiracion acuatica': 'water_breathing',
  absorcion: 'absorption',
  'prisa minera': 'haste',
  'fatiga minera': 'mining_fatigue',
  invisibilidad: 'invisibility',
  levitacion: 'levitation',
  veneno: 'poison',
  marchitamiento: 'wither',
  ceguera: 'blindness',
  oscuridad: 'darkness',
  'gracia del delfin': 'dolphins_grace',
  'poder del conducto': 'conduit_power',
  lentitud: 'slow',
  debilidad: 'weakness',
  nausea: 'nausea',
  nauseas: 'nausea',
  resplandor: 'glowing',
  'salud instantanea': 'instant_health',
  'salud al instante': 'instant_health',
  'dano instantaneo': 'instant_damage',
};

/** Roman levels the catalog uses, longest first so the alternation cannot match a prefix. */
const ROMAN_LEVEL = '(?:viii|vii|iii|vi|iv|ix|ii|x|v|i)';

/**
 * Folded name to a matcher that accepts the name, an optional roman level and an optional
 * `durante N segundos` tail — nothing else.
 *
 * Sorted longest-first so `resistencia al fuego` is tried before `resistencia`: with anchors the
 * result is the same for a full match, but the order documents the intent and keeps the matcher
 * list readable while debugging.
 */
const EFFECT_MATCHERS: readonly { readonly icon: string; readonly pattern: RegExp }[] =
  Object.entries(EFFECT_ICONS)
    .sort(([left], [right]) => right.length - left.length)
    .map(([name, icon]) => ({
      icon,
      pattern: new RegExp(
        `^${escapeRegExp(name)}(?:\\s+${ROMAN_LEVEL})?(?:\\s+durante\\s+\\d+\\s+segundos?)?$`,
      ),
    }));

/** Escapes a map key so it can be embedded in a matcher without becoming a pattern itself. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lowercase, accent-free, single-spaced: `Caída Lenta` and `caida lenta` become the same key. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The vanilla texture id for an effect label, or `null` when the label is not an effect.
 *
 * `Versatilidad`, `Función` and plain values such as `3 unidades` are not effects; neither is a
 * label that merely starts like one (`Velocidad de ataque mejorada`).
 */
export function effectIcon(label: string): string | null {
  const folded = fold(label);
  for (const matcher of EFFECT_MATCHERS) {
    if (matcher.pattern.test(folded)) return matcher.icon;
  }
  return null;
}

/** Turns one parsed block into the part the template renders. */
function toPart(block: DescriptionBlock, leadTaken: boolean): DescriptionPart {
  const { label, body } = block;

  if (label === null) {
    // The first unlabeled block is the introduction. A later one is still prose, but it must not
    // take the lead treatment: that would give the page two openings.
    return leadTaken ? { kind: 'text', title: null, text: body } : { kind: 'lead', text: body };
  }

  if (body.length === 0) return { kind: 'heading', title: label };

  const icon = effectIcon(label);
  if (icon !== null) return { kind: 'effect', label, detail: body, icon };

  if (body.length > PROSE_THRESHOLD) return { kind: 'text', title: label, text: body };

  return { kind: 'fact', label, value: body };
}

/**
 * Lays out `text` as parts, in reading order.
 *
 * Total: `''` and whitespace-only input yield `[]`. Every part carries the source text verbatim
 * except a label's colon; concatenating the parts (see `description-layout.spec.ts`) reproduces
 * the input apart from those colons and runs of whitespace.
 */
export function layoutDescription(text: string): readonly DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  let leadTaken = false;

  for (const block of parseDescription(text)) {
    // An unlabeled empty body cannot become anything readable; `parseDescription` does not
    // produce it, but the layout stays total if it ever does.
    if (block.label === null && block.body.length === 0) continue;

    parts.push(toPart(block, leadTaken));
    if (block.label === null) leadTaken = true;
  }

  return parts;
}
