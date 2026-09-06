// Game Boy ROM to TI-Boy CE AppVars. A port of tiboyce-romgen (calc84maniac, GPL-3.0):
// https://github.com/calc84maniac/tiboyce/blob/master/tiboyce-romgen/romgen.c
// The output is byte for byte identical to the original tool; src/lib/tiboy/romgen.test.ts checks
// SHA-256 hashes of reference files produced by the compiled C program.
import { appvarEntry, buildFile, type VarEntry } from '../tifiles/tifile';

/** Largest AppVar payload romgen will produce. */
export const MAX_VAR_SIZE = 65512;
const PAGE = 0x4000;
const MAX_PAGES = 256;

export interface GbHeader {
  /** Title from the cartridge header, at most 15 characters, non-printable bytes replaced by '?'. */
  title: string;
  /** Game Boy Color flag (0x143 bit 7). */
  cgb: boolean;
  /** Runs only on Game Boy Color (0x143 == 0xC0). */
  cgbOnly: boolean;
  cartridgeType: number;
  cartridgeTypeName: string;
  /** ROM size declared in the header, 0 when the code is unknown. */
  declaredRomSize: number;
  ramSize: number;
  headerChecksumOk: boolean;
}

const CARTRIDGE_TYPES: Record<number, string> = {
  0x00: 'ROM only', 0x01: 'MBC1', 0x02: 'MBC1 + RAM', 0x03: 'MBC1 + RAM + battery',
  0x05: 'MBC2', 0x06: 'MBC2 + battery', 0x08: 'ROM + RAM', 0x09: 'ROM + RAM + battery',
  0x0f: 'MBC3 + clock + battery', 0x10: 'MBC3 + clock + RAM + battery', 0x11: 'MBC3', 0x12: 'MBC3 + RAM', 0x13: 'MBC3 + RAM + battery',
  0x19: 'MBC5', 0x1a: 'MBC5 + RAM', 0x1b: 'MBC5 + RAM + battery', 0x1c: 'MBC5 + rumble', 0x1d: 'MBC5 + rumble + RAM', 0x1e: 'MBC5 + rumble + RAM + battery',
  0x20: 'MBC6', 0x22: 'MBC7', 0xfc: 'Pocket Camera', 0xfd: 'Bandai TAMA5', 0xfe: 'HuC3', 0xff: 'HuC1',
};

/** romgen replaces every byte outside 0x20..0x7F with '?'. */
export function sanitizeTitle(title: string): string {
  let out = '';
  for (const ch of title) {
    const c = ch.charCodeAt(0);
    out += c < 0x20 || c > 0x7f ? '?' : ch;
  }
  return out;
}

export function parseGbHeader(rom: Uint8Array): GbHeader | null {
  if (rom.length < 0x150) return null;
  let raw = '';
  for (let i = 0x134; i < 0x143; i++) {
    if (rom[i] === 0) break;
    raw += String.fromCharCode(rom[i]);
  }
  let hc = 0;
  for (let i = 0x134; i <= 0x14c; i++) hc = (hc - rom[i] - 1) & 0xff;
  const sizeCode = rom[0x148];
  const ramCodes = [0, 0, 0x2000, 0x8000, 0x20000, 0x10000];
  return {
    title: sanitizeTitle(raw),
    cgb: (rom[0x143] & 0x80) !== 0,
    cgbOnly: rom[0x143] === 0xc0,
    cartridgeType: rom[0x147],
    cartridgeTypeName: CARTRIDGE_TYPES[rom[0x147]] ?? `unknown type 0x${rom[0x147].toString(16).padStart(2, '0')}`,
    declaredRomSize: sizeCode <= 8 ? 0x8000 << sizeCode : 0,
    ramSize: ramCodes[rom[0x149]] ?? 0,
    headerChecksumOk: hc === rom[0x14d],
  };
}

/** A name prefix romgen accepts: a capital letter followed by up to four letters or digits. */
export function validatePrefix(prefix: string): string | null {
  if (prefix.length === 0) return 'Enter a name.';
  if (prefix.length > 5) return 'At most 5 characters: the emulator uses the other 3 for its own files.';
  if (!/^[A-Z]/.test(prefix)) return 'The name must start with a capital letter.';
  if (!/^[A-Z][A-Za-z0-9]*$/.test(prefix)) return 'Only letters and digits are allowed.';
  return null;
}

/** A prefix derived from the header title, for the name field's default. */
export function suggestPrefix(title: string): string {
  const letters = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fromLetter = letters.replace(/^[0-9]+/, '');
  const base = (fromLetter || 'GAME').slice(0, 5);
  return /^[A-Z]/.test(base) ? base : 'GAME';
}

interface PageInfo { length: number; index: number }

/**
 * Bytes of a 16 KB page worth keeping: trailing bytes equal to the last byte are dropped and the
 * emulator refills them. Mirrors get_page_length in romgen.c exactly, including its rounding.
 */
function pageLength(rom: Uint8Array, offset: number): number {
  const remaining = rom.length - offset;
  const full = remaining < PAGE ? remaining : PAGE;
  let len = full;
  const trim = rom[offset + len - 1];
  do {
    len--;
  } while (len > 0 && rom[offset + len - 1] === trim);
  if (len === 0 && trim === 0) return 0;
  return ((len & 0xff) !== 0 ? len | 0xff : len) + 1;
}

/**
 * Chooses the subset of the first n pages whose lengths sum to the largest value not above
 * MAX_VAR_SIZE and moves it to the end of the array, in the same order romgen's best_fit does.
 * Returns how many pages were chosen.
 */
function bestFit(pages: PageInfo[], n: number): number {
  const sorted = pages.slice(0, n).sort((a, b) => a.length - b.length || a.index - b.index);
  for (let i = 0; i < n; i++) pages[i] = sorted[i];

  const width = MAX_VAR_SIZE + 1;
  const reachable = new Uint8Array((n + 1) * width);
  reachable[0] = 1;
  for (let p = 0; p < n; p++) {
    const len = pages[p].length;
    const prev = p * width;
    const cur = prev + width;
    reachable.copyWithin(cur, prev, cur);
    for (let sum = len; sum <= MAX_VAR_SIZE; sum++) {
      if (reachable[prev + sum - len]) reachable[cur + sum] = 1;
    }
  }

  let size = MAX_VAR_SIZE;
  while (!reachable[n * width + size]) size--;

  let count = 0;
  for (let p = n - 1; p >= 0; p--) {
    const len = pages[p].length;
    if (size >= len && reachable[p * width + size - len]) {
      count++;
      size -= len;
      const tmp = pages[n - count];
      pages[n - count] = pages[p];
      pages[p] = tmp;
    }
  }
  return count;
}

function u8(v: number): Uint8Array {
  return new Uint8Array([v & 0xff]);
}
function u16le(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
}
function ascii(s: string): Uint8Array {
  return Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export interface RomPlan {
  pageCount: number;
  /** For each output AppVar, in order, the pages it holds (index and kept byte count). */
  groups: { index: number; dataLength: number }[][];
}

/** The expensive part of the conversion: page trimming and bin packing. Depends only on the ROM. */
export function planRom(rom: Uint8Array): RomPlan {
  if (rom.length < 0x150) throw new Error('Not a valid Game Boy ROM: the file is shorter than a cartridge header.');
  const pages: PageInfo[] = [];
  while (pages.length * PAGE < rom.length) {
    if (pages.length === MAX_PAGES) throw new Error('ROM is too large: TI-Boy CE supports up to 4 MB.');
    pages.push({ length: pageLength(rom, pages.length * PAGE) + 3, index: pages.length });
  }
  const pageCount = pages.length;
  const groups: RomPlan['groups'] = [];
  let remaining = pageCount;
  while (remaining > 0) {
    let toUse = bestFit(pages, remaining);
    if (toUse <= 0) throw new Error('Could not fit a ROM page into an AppVar.');
    const group: RomPlan['groups'][number] = [];
    while (toUse > 0) {
      toUse--;
      remaining--;
      group.push({ index: pages[remaining].index, dataLength: pages[remaining].length - 3 });
    }
    groups.push(group);
  }
  return { pageCount, groups };
}

export interface ConvertedRom {
  /** Metadata AppVar first, then the ROM data AppVars, all archived. */
  entries: VarEntry[];
  /** The same variables as .8xv files, identical to romgen's output. */
  files: { filename: string; bytes: Uint8Array }[];
  pages: number;
  title: string;
}

/**
 * Splits a Game Boy ROM into the AppVars TI-Boy CE loads.
 * @param prefix at most 5 characters, capital letter first (see validatePrefix)
 * @param title shown in the emulator's ROM list; defaults to the header title
 * @param plan a cached planRom(rom) result, so renaming does not repeat the packing
 */
export function convertRom(rom: Uint8Array, prefix: string, title?: string, plan: RomPlan = planRom(rom)): ConvertedRom {
  const prefixError = validatePrefix(prefix);
  if (prefixError) throw new Error(prefixError);
  const header = parseGbHeader(rom);
  if (!header) throw new Error('Not a valid Game Boy ROM: the file is shorter than a cartridge header.');
  const shownTitle = sanitizeTitle(title && title.length > 0 ? title : header.title);
  if (shownTitle.length > 255) throw new Error('The title is too long (255 characters at most).');

  const romVars = plan.groups.map((group, i) => {
    const parts: Uint8Array[] = [];
    for (const { index, dataLength } of group) {
      // A final partial page can be rounded past the end of the file; romgen reads uninitialised
      // memory there (real cartridge dumps are power-of-two sizes, so it never happens). Pad with zeros.
      const data = new Uint8Array(dataLength);
      data.set(rom.subarray(index * PAGE, Math.min(rom.length, index * PAGE + dataLength)));
      parts.push(u8(index), u16le(dataLength), data);
    }
    return appvarEntry(`${prefix}R${String(i).padStart(2, '0')}`, concat(parts), true);
  });

  const meta = concat([ascii('TIBOYCE\0'), u8(plan.pageCount), u8(shownTitle.length), ascii(shownTitle)]);
  const entries = [appvarEntry(prefix, meta, true), ...romVars];
  return {
    entries,
    files: entries.map((e) => ({ filename: `${e.name}.8xv`, bytes: buildFile([e], '') })),
    pages: plan.pageCount,
    title: shownTitle,
  };
}
