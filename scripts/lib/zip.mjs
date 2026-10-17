/**
 * Minimal, dependency-free ZIP reader.
 *
 * The boss archives live on the read-only Drive mount and cannot be expanded in
 * place, and the pipeline must stay reproducible without shelling out to
 * PowerShell (`Expand-Archive`) or requiring an npm dependency. Reading the ZIP
 * central directory directly is ~70 lines and handles exactly the `store` and
 * `deflate` methods that both archives use.
 *
 * A CRC-32 check runs on every extracted entry, so a truncated or corrupted
 * archive fails loudly instead of silently producing a broken asset.
 *
 * Limitations, stated rather than silently assumed: ZIP64 is unsupported, which
 * is acceptable because neither archive exceeds a few megabytes.
 */

import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT = 0xffff;

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

/** Computes the CRC-32 of a buffer, matching the ZIP specification. */
export function crc32(buffer) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer) {
  const earliest = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_COMMENT);
  for (let offset = buffer.length - EOCD_MIN_SIZE; offset >= earliest; offset--) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("not a ZIP archive: end-of-central-directory record not found");
}

/**
 * Reads the ZIP central directory.
 *
 * @param {Buffer} buffer
 * @returns {Array<{ name: string, compressionMethod: number, crc: number,
 *   compressedSize: number, uncompressedSize: number, localHeaderOffset: number }>}
 */
export function readCentralDirectory(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];

  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new Error(`corrupt ZIP: bad central directory signature at offset ${offset}`);
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.push({
      name,
      compressionMethod: buffer.readUInt16LE(offset + 10),
      crc: buffer.readUInt32LE(offset + 16),
      compressedSize: buffer.readUInt32LE(offset + 20),
      uncompressedSize: buffer.readUInt32LE(offset + 24),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * Extracts one entry by its exact archive path.
 *
 * @param {Buffer} buffer
 * @param {string} entryName
 * @returns {Buffer}
 * @throws {Error} when the entry is absent or fails its CRC check
 */
export function extractEntry(buffer, entryName) {
  const entry = readCentralDirectory(buffer).find((candidate) => candidate.name === entryName);
  if (!entry) throw new Error(`ZIP entry not found: ${entryName}`);

  const local = entry.localHeaderOffset;
  if (buffer.readUInt32LE(local) !== LOCAL_SIGNATURE) {
    throw new Error(`corrupt ZIP: bad local header for ${entryName}`);
  }
  const nameLength = buffer.readUInt16LE(local + 26);
  const extraLength = buffer.readUInt16LE(local + 28);
  const dataStart = local + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  let data;
  if (entry.compressionMethod === 0) data = Buffer.from(compressed);
  else if (entry.compressionMethod === 8) data = inflateRawSync(compressed);
  else throw new Error(`unsupported ZIP compression method ${entry.compressionMethod} for ${entryName}`);

  if (data.length !== entry.uncompressedSize) {
    throw new Error(
      `ZIP entry ${entryName} size mismatch: expected ${entry.uncompressedSize}, got ${data.length}`,
    );
  }
  const actual = crc32(data);
  if (actual !== entry.crc) {
    throw new Error(
      `ZIP entry ${entryName} failed its CRC check: expected ${entry.crc.toString(16)}, got ${actual.toString(16)}`,
    );
  }
  return data;
}
