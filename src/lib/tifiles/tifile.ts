// Read and write TI-83+/84+ family variable files (.8xp, .8xv, .8xg, ...).
//
// Layout (all multi-byte integers little-endian):
//   "**TI83F*"  1A 0A 00  comment[42]  dataLength:u16
//   entries...                                      (dataLength bytes)
//   checksum:u16 = sum of all entry bytes mod 65536
// Entry (TI-83+ style, header length 0x0D):
//   000D  size:u16  type:u8  name[8]  version:u8  flag:u8(0x80=archived)  size:u16  data[size]
// Older TI-83 style entries have header length 0x0B and omit version/flag.
import { concat, latin1, fromLatin1, u16le, readU16le, u8 } from '../bytes';
import { VarType, isProgram } from './types';
import { programVersion } from '../tibasic/tokenizer';

export interface VarEntry {
  name: string;
  type: number;
  data: Uint8Array;
  archived: boolean;
  version: number;
}

export interface TIFile {
  signature: string;
  comment: string;
  entries: VarEntry[];
  /** True when the stored checksum matched. */
  checksumOk: boolean;
}

export const SIGNATURE_83F = '**TI83F*';
const MAGIC = new Uint8Array([0x1a, 0x0a, 0x00]);
const HEADER_LEN = 8 + 3 + 42 + 2; // 55

export class TIFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TIFileError';
  }
}

export function checksum(bytes: Uint8Array): number {
  let sum = 0;
  for (const b of bytes) sum = (sum + b) & 0xffff;
  return sum;
}

function padName(name: string): Uint8Array {
  const out = new Uint8Array(8);
  out.set(latin1(name).slice(0, 8));
  return out;
}

export function encodeEntry(e: VarEntry): Uint8Array {
  if (e.data.length > 0xffff) throw new TIFileError(`Variable ${e.name} is too large (${e.data.length} bytes)`);
  return concat(
    u16le(0x0d),
    u16le(e.data.length),
    u8(e.type),
    padName(e.name),
    u8(e.version & 0xff),
    u8(e.archived ? 0x80 : 0x00),
    u16le(e.data.length),
    e.data,
  );
}

export function buildFile(entries: VarEntry[], comment = 'Created by calc_OS'): Uint8Array {
  if (entries.length === 0) throw new TIFileError('A TI file needs at least one variable');
  const body = concat(...entries.map(encodeEntry));
  if (body.length > 0xffff) throw new TIFileError('File body exceeds 65535 bytes');
  const c = new Uint8Array(42);
  c.set(latin1(comment).slice(0, 42));
  return concat(latin1(SIGNATURE_83F), MAGIC, c, u16le(body.length), body, u16le(checksum(body)));
}

export function parseFile(bytes: Uint8Array): TIFile {
  if (bytes.length < HEADER_LEN + 2) throw new TIFileError('File is too short to be a TI variable file');
  const signature = fromLatin1(bytes.slice(0, 8));
  if (signature !== SIGNATURE_83F) {
    if (/^\*\*TI/.test(signature)) throw new TIFileError(`${signature.replace(/\*/g, '')} files are for a different calculator family`);
    throw new TIFileError('Not a TI variable file (bad signature)');
  }
  const comment = fromLatin1(bytes.slice(11, 53));
  const dataLength = readU16le(bytes, 53);
  const body = bytes.slice(HEADER_LEN, HEADER_LEN + dataLength);
  if (body.length !== dataLength) throw new TIFileError('File is truncated');
  const stored = readU16le(bytes, HEADER_LEN + dataLength);
  const checksumOk = stored === checksum(body);

  const entries: VarEntry[] = [];
  let o = 0;
  while (o + 4 <= body.length) {
    const headerLen = readU16le(body, o);
    if (headerLen !== 0x0d && headerLen !== 0x0b) throw new TIFileError(`Unexpected entry header length 0x${headerLen.toString(16)} at offset ${o}`);
    const size = readU16le(body, o + 2);
    const type = body[o + 4];
    const name = fromLatin1(body.slice(o + 5, o + 13));
    let version = 0;
    let archived = false;
    let p = o + 13;
    if (headerLen === 0x0d) {
      version = body[p];
      archived = (body[p + 1] & 0x80) !== 0;
      p += 2;
    }
    const size2 = readU16le(body, p);
    p += 2;
    if (size2 !== size) throw new TIFileError(`Entry ${name}: size fields disagree (${size} vs ${size2})`);
    const data = body.slice(p, p + size);
    if (data.length !== size) throw new TIFileError(`Entry ${name} is truncated`);
    entries.push({ name, type, data, archived, version });
    o = p + size;
  }
  if (entries.length === 0) throw new TIFileError('File contains no variables');
  return { signature, comment, entries, checksumOk };
}

/** Wrap already-tokenized TI-BASIC into a program variable. */
export function programEntry(
  name: string,
  tokens: Uint8Array,
  opts: { locked?: boolean; archived?: boolean; version?: number } = {},
): VarEntry {
  validateName(name, opts.locked ? VarType.PROTECTED_PROGRAM : VarType.PROGRAM);
  if (tokens.length > 0xffff - 2) throw new TIFileError('Program is too large');
  return {
    name,
    type: opts.locked ? VarType.PROTECTED_PROGRAM : VarType.PROGRAM,
    data: concat(u16le(tokens.length), tokens),
    archived: opts.archived ?? false,
    version: opts.version ?? programVersion(tokens),
  };
}

/** Raw token bytes of a program entry (strips the leading length word). */
export function programTokens(e: VarEntry): Uint8Array {
  if (!isProgram(e.type)) throw new TIFileError(`${e.name} is not a program`);
  const len = readU16le(e.data, 0);
  return e.data.slice(2, 2 + len);
}

export function appvarEntry(name: string, payload: Uint8Array, archived = true): VarEntry {
  validateName(name, VarType.APPVAR);
  return { name, type: VarType.APPVAR, data: concat(u16le(payload.length), payload), archived, version: 0 };
}

/** Program and appvar names: 1-8 chars, A-Z and 0-9, starting with a letter. */
export function validateName(name: string, type: number): void {
  if (isProgram(type) || type === VarType.APPVAR) {
    if (!/^[A-Z][A-Z0-9]{0,7}$/.test(name)) {
      throw new TIFileError(`Invalid variable name "${name}": use 1-8 characters, A-Z or 0-9, starting with a letter`);
    }
  }
}

/** Total bytes an entry will occupy on the calculator (variable data plus VAT overhead estimate). */
export function onCalcSize(e: VarEntry): number {
  return e.data.length + 9 + e.name.length;
}
