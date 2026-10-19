/**
 * Reads the committed `data/catalog.json` for specs that must run against the real data.
 *
 * The file is read, never written. The repository root is found by walking up from this
 * file rather than by counting `../`, so the helper keeps working if a spec moves, and it
 * deliberately avoids `new URL('../../', import.meta.url)`: the Vite/Vitest transform
 * rewrites that literal form into an asset URL, which `fileURLToPath` then rejects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function findRepoRoot(start: string): string {
  let directory = start;
  for (let depth = 0; depth < 12; depth += 1) {
    if (fs.existsSync(path.join(directory, 'data', 'catalog.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`could not find data/catalog.json above ${start}`);
}

/** Absolute path of the committed catalog document. */
export const COMMITTED_CATALOG_PATH = path.join(
  findRepoRoot(path.dirname(fileURLToPath(import.meta.url))),
  'data',
  'catalog.json',
);

/** The committed catalog exactly as it sits on disk. */
export function readCommittedCatalogText(): string {
  return fs.readFileSync(COMMITTED_CATALOG_PATH, 'utf8');
}

/** The committed catalog, parsed. Untrusted until it passes the validator. */
export function readCommittedCatalogDocument(): unknown {
  return JSON.parse(readCommittedCatalogText()) as unknown;
}
