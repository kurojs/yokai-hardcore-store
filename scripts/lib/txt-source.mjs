/**
 * Parsers for the store's `.txt` copy files.
 *
 * Both files use the same two-part layout:
 *
 * ```
 * Nombre: 10 ALGODONES DE AZUCAR        <- labelled header lines
 * Precio: $1
 * Categoría: Alimento Yokai  para ...
 *
 * Descripción:                          <- description heading
 * <free text, possibly with trailing labels folded into the paragraph>
 * ```
 *
 * The description heading is treated as the single structural delimiter: some
 * files carry an extra `Cantidad:` label either above or inside the paragraph,
 * and splitting on the heading keeps every one of those cases correct without
 * enumerating label names.
 *
 * Pure functions only. Reading the files is the caller's job.
 */

import { collapseWhitespace } from "./slugs.mjs";

const DESCRIPTION_HEADING = /^Descripci[oó]n:[ \t]*$/m;
const PRICE = /^\$\s*([0-9]+(?:\.[0-9]+)?)$/;

/**
 * Splits a `.txt` document into its labelled header and its description body.
 *
 * @param {string} raw
 * @returns {{ header: string, description: string }}
 * @throws {Error} when the description heading is missing
 */
export function parseLabeledDocument(raw) {
  const text = String(raw).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const match = DESCRIPTION_HEADING.exec(text);
  if (!match) {
    throw new Error('malformed copy file: no standalone "Descripción:" heading found');
  }
  return {
    header: text.slice(0, match.index).trim(),
    description: collapseWhitespace(text.slice(match.index + match[0].length)),
  };
}

/**
 * Reads a `Label: value` line from a header block.
 *
 * @param {string} header
 * @param {string} label a regex-safe label, where the accent may be optional
 * @returns {string | null}
 */
export function readLabel(header, label) {
  const match = new RegExp(`^${label}:[ \\t]*(.*)$`, "m").exec(header);
  if (!match) return null;
  const value = match[1].trim();
  return value.length > 0 ? value : null;
}

/**
 * Parses a `categoria.txt` file.
 *
 * @param {string} raw
 * @returns {{ name: string, description: string }}
 * @throws {Error} when the `Categoría:` header is missing
 */
export function parseCategoryTxt(raw) {
  const { header, description } = parseLabeledDocument(raw);
  const name = readLabel(header, "Categor[ií]a");
  if (!name) throw new Error('malformed categoria.txt: no "Categoría:" header value');
  return { name, description };
}

/**
 * Parses an `info.txt` file.
 *
 * @param {string} raw
 * @returns {{ name: string, priceUsd: number, categoryLabel: string, description: string }}
 * @throws {Error} on a missing name, a missing category, or an unparseable price
 */
export function parseInfoTxt(raw) {
  const { header, description } = parseLabeledDocument(raw);

  const name = readLabel(header, "Nombre");
  if (!name) throw new Error('malformed info.txt: no "Nombre:" header value');

  const categoryLabel = readLabel(header, "Categor[ií]a");
  if (!categoryLabel) throw new Error(`malformed info.txt for ${JSON.stringify(name)}: no "Categoría:" header value`);

  const priceLabel = readLabel(header, "Precio");
  if (!priceLabel) throw new Error(`malformed info.txt for ${JSON.stringify(name)}: no "Precio:" header value`);

  const priceMatch = PRICE.exec(priceLabel);
  if (!priceMatch) {
    throw new Error(`unparseable price ${JSON.stringify(priceLabel)} in info.txt for ${JSON.stringify(name)}`);
  }

  return { name, priceUsd: Number(priceMatch[1]), categoryLabel, description };
}
