// Write (and read, for tests) TI-Nspire .tns documents the way Luna does:
// a zip-like container whose first local header is "*TIMLP" + document version, whose end record
// is "TIPD", and whose XML entries are raw-deflated then XOR-encrypted with a 3DES-CTR keystream.
// Reference: https://github.com/ndless-nspire/Luna (MPL 1.1). Constants in tns-constants.ts.
import { deflateSync, inflateSync } from 'fflate';
import { concat, fromHex, latin1, readU16le, readU32be, u16le, u32be } from '../bytes';
import { desKeySchedule, tripleDesEncryptBlock } from './des';
import { DEFAULT_PROCESSED_DOCUMENT_XML, LUA_FOOTER, LUA_HEADER, PY_FOOTER, PY_HEADER, TIEN_CRYPTED_HEADER } from './tns-constants';

const K1 = desKeySchedule(new Uint8Array([0x16, 0xa7, 0xa7, 0x32, 0x68, 0xa7, 0xba, 0x73]));
const K2 = desKeySchedule(new Uint8Array([0xd9, 0xa8, 0x86, 0xa4, 0x34, 0x45, 0x94, 0x10]));
const K3 = desKeySchedule(new Uint8Array([0x3d, 0x80, 0x8c, 0xb5, 0xdf, 0xb3, 0x80, 0x6b]));
const IVEC_BASE = 0x6fe21307;

/** XOR data with the TI document keystream (symmetric: encrypts and decrypts). */
export function docCrypt(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data);
  let counter = 0;
  for (let off = 0; off < out.length; off += 8) {
    const cur = (IVEC_BASE + counter) >>> 0;
    counter = (counter + 1) % 1024;
    const iv = new Uint8Array([0, 0, 0, 0, cur & 0xff, (cur >>> 8) & 0xff, (cur >>> 16) & 0xff, (cur >>> 24) & 0xff]);
    const ks = tripleDesEncryptBlock(iv, K1, K2, K3);
    for (let i = 0; i < 8 && off + i < out.length; i++) out[off + i] ^= ks[i];
  }
  return out;
}

// ---- CRC32 -----------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- container ---------------------------------------------------------------
export interface TnsEntry {
  name: string;
  /** Bytes as stored in the container. */
  stored: Uint8Array;
  /** 13 = TI encrypted (stored as-is), 8 = deflate, 0 = stored. */
  method: 0 | 8 | 13;
  uncompressedSize: number;
  internalAttr: number;
}

const DOS_DATE = 0x00200000; // what minizip produces for an all-zero date
const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

export function writeContainer(entries: TnsEntry[], tiVersion = 0x0500): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  entries.forEach((e, idx) => {
    const name = latin1(e.name);
    const crc = crc32(e.stored);
    const sig = idx === 0
      ? concat(latin1('*TIMLP'), latin1(tiVersion.toString(16).toUpperCase().padStart(4, '0')))
      : new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const local = concat(
      sig, u16le(20), u16le(0), u16le(e.method), u32(DOS_DATE), u32(crc), u32(e.stored.length), u32(e.uncompressedSize),
      u16le(name.length), u16le(0), name, e.stored,
    );
    central.push(concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), u16le(0), u16le(20), u16le(0), u16le(e.method), u32(DOS_DATE), u32(crc),
      u32(e.stored.length), u32(e.uncompressedSize), u16le(name.length), u16le(0), u16le(0), u16le(0), u16le(e.internalAttr),
      u32(0), u32(offset), name,
    ));
    parts.push(local);
    offset += local.length;
  });
  const centralBytes = concat(...central);
  const end = concat(latin1('TIPD'), u16le(0), u16le(0), u16le(entries.length), u16le(entries.length), u32(centralBytes.length), u32(offset), u16le(0));
  return concat(...parts, centralBytes, end);
}

/** Header + encrypted raw-deflate of an XML-compressed buffer, as stored for Problem*.xml / Document.xml. */
export function encryptedXmlEntry(name: string, xmlc: Uint8Array): TnsEntry {
  const deflated = deflateSync(xmlc, { level: 6 });
  const stored = concat(fromHex(TIEN_CRYPTED_HEADER), docCrypt(deflated));
  return { name, stored, method: 13, uncompressedSize: stored.length, internalAttr: 0 };
}

export function defaultDocumentEntry(): TnsEntry {
  const stored = fromHex(DEFAULT_PROCESSED_DOCUMENT_XML);
  return { name: 'Document.xml', stored, method: 13, uncompressedSize: stored.length, internalAttr: 0 };
}

function deflatedEntry(name: string, data: Uint8Array, isText: boolean): TnsEntry {
  return { name, stored: deflateSync(data, { level: 6 }), method: 8, uncompressedSize: data.length, internalAttr: isText ? 1 : 0 };
}

/** A .tns holding one or more Python scripts; the first one opens when the document is opened. */
export function buildPythonTns(scripts: { name: string; source: string }[]): Uint8Array {
  if (!scripts.length) throw new Error('need at least one script');
  const entries: TnsEntry[] = [defaultDocumentEntry()];
  const first = scripts[0].name;
  if (first.length > 240) throw new Error('Python script filenames limited to 240 characters');
  const xmlc = concat(fromHex(PY_HEADER), latin1(first), fromHex(PY_FOOTER));
  entries.push(encryptedXmlEntry('Problem1.xml', xmlc));
  for (const s of scripts) entries.push(deflatedEntry(s.name, new TextEncoder().encode(s.source), true));
  return writeContainer(entries);
}

/** A .tns holding one Lua script (OS 3.0.2+). */
export function buildLuaTns(source: string): Uint8Array {
  const fixed = source.replace(/\]\]>/g, ']]><![CDATA[');
  const xmlc = concat(fromHex(LUA_HEADER), new TextEncoder().encode(fixed), fromHex(LUA_FOOTER));
  return writeContainer([defaultDocumentEntry(), encryptedXmlEntry('Problem1.xml', xmlc)]);
}

// ---- reader (tests, and the file browser preview) ------------------------------
export interface TnsReadEntry { name: string; method: number; stored: Uint8Array; decoded: Uint8Array | null }

export function readTns(bytes: Uint8Array): TnsReadEntry[] {
  const out: TnsReadEntry[] = [];
  let p = 0;
  const readU32 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | ((bytes[o + 3] << 24) >>> 0);
  for (;;) {
    const isFirst = bytes[p] === 0x2a && bytes[p + 1] === 0x54; // "*T"
    const isStd = bytes[p] === 0x50 && bytes[p + 1] === 0x4b && bytes[p + 2] === 0x03 && bytes[p + 3] === 0x04;
    if (!isFirst && !isStd) break;
    const h = p + (isFirst ? 10 : 4);
    const method = readU16le(bytes, h + 4);
    const csize = readU32(h + 14) >>> 0;
    const nameLen = readU16le(bytes, h + 22);
    const extraLen = readU16le(bytes, h + 24);
    const name = new TextDecoder().decode(bytes.slice(h + 26, h + 26 + nameLen));
    const dataStart = h + 26 + nameLen + extraLen;
    const stored = bytes.slice(dataStart, dataStart + csize);
    let decoded: Uint8Array | null = null;
    try {
      if (method === 8) decoded = inflateSync(stored);
      else if (method === 13 && stored.length > 40) decoded = inflateSync(docCrypt(stored.slice(40)));
      else if (method === 0) decoded = stored;
    } catch { decoded = null; }
    out.push({ name, method, stored, decoded });
    p = dataStart + csize;
  }
  return out;
}

void readU32be; void u32be;
