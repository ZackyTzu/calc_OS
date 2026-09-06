import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { convertRom, parseGbHeader, suggestPrefix, validatePrefix } from './romgen';
import reference from './__fixtures__/romgen-reference.json';

// The reference hashes were produced by compiling tiboyce-romgen/romgen.c and running it on ROMs
// built by the same deterministic generator as below (xorshift32), so the two implementations are
// compared byte for byte without storing megabytes of fixtures.

function* xorshift(seed: number): Generator<number> {
  let x = seed >>> 0;
  for (;;) {
    x ^= (x << 13) >>> 0; x >>>= 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0; x >>>= 0;
    yield x & 0xff;
  }
}
function gen(seed: number, n: number): Uint8Array {
  const g = xorshift(seed);
  return Uint8Array.from({ length: n }, () => g.next().value as number);
}
function fill(byte: number, n: number): Uint8Array {
  return new Uint8Array(n).fill(byte);
}
function page(kind: string, seed: number): Uint8Array {
  const g = xorshift(seed);
  const next = () => g.next().value as number;
  switch (kind) {
    case 'random': return gen(seed, 0x4000);
    case 'zero': return fill(0, 0x4000);
    case 'ff': return fill(0xff, 0x4000);
    case 'lastdiff': { const p = fill(0x11, 0x4000); p[0x3fff] = 0x22; return p; }
    case 'tailrun': {
      const cut = 1 + ((next() | (next() << 8)) % 0x3fff);
      const f = [0, 0xff, 0x42][next() % 3];
      return concat(gen(seed ^ 0x5555, cut), fill(f, 0x4000 - cut));
    }
    case 'exact256': {
      const cut = 256 * (1 + (next() % 63));
      return concat(gen(seed ^ 0xaaaa, cut), fill(0, 0x4000 - cut));
    }
    case 'small': {
      const n = 1 + (next() % 40);
      return concat(gen(seed ^ 0x1234, n), fill(0, 0x4000 - n));
    }
    default: throw new Error(kind);
  }
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function writeHeader(rom: Uint8Array, title: string, cgb: boolean) {
  rom.fill(0, 0x134, 0x144);
  rom.set(Uint8Array.from(title.slice(0, 16), (c) => c.charCodeAt(0)), 0x134);
  if (cgb) rom[0x143] = 0x80;
  rom[0x147] = 0x1b;
  const n = Math.max(1, Math.floor(rom.length / 0x8000));
  rom[0x148] = 31 - Math.clz32(n);
  rom[0x149] = 0x03;
  let hc = 0;
  for (let i = 0x134; i <= 0x14c; i++) hc = (hc - rom[i] - 1) & 0xff;
  rom[0x14d] = hc;
}
interface Case { rom: string; kinds: string[]; truncate: number | null; prefix: string; title: string | null; size: number; files: Record<string, string>; file_sizes: Record<string, number> }
function buildRom(c: Case): Uint8Array {
  let rom = concat(...c.kinds.map((k, i) => page(k, 1000 * i + 7)));
  if (c.truncate) rom = rom.slice(0, c.truncate);
  writeHeader(rom, 'TEST ' + c.rom.split('.')[0].toUpperCase(), c.rom.endsWith('.gbc'));
  return rom;
}
const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('romgen port', () => {
  for (const c of reference as Case[]) {
    it(`matches tiboyce-romgen for ${c.rom} (${c.size} bytes, ${Object.keys(c.files).length} AppVars)`, () => {
      const rom = buildRom(c);
      expect(rom.length).toBe(c.size);
      const out = convertRom(rom, c.prefix, c.title ?? undefined);
      const names = out.files.map((f) => f.filename).sort();
      expect(names).toEqual(Object.keys(c.files).sort());
      for (const f of out.files) {
        expect(f.bytes.length, f.filename).toBe(c.file_sizes[f.filename]);
        // For a ROM that is not a multiple of 16 KB the C tool copies bytes from past the end of its
        // buffer into the last page, so only the metadata file and the sizes are reproducible there.
        if (c.truncate && f.filename !== `${c.prefix}.8xv`) continue;
        expect(sha256(f.bytes), f.filename).toBe(c.files[f.filename]);
      }
      expect(out.entries.every((e) => e.archived && e.type === 0x15)).toBe(true);
      expect(out.entries.every((e) => e.data.length - 2 <= 65512)).toBe(true);
    });
  }

  it('reads the cartridge header', () => {
    const c = (reference as Case[])[1];
    const h = parseGbHeader(buildRom(c))!;
    expect(h.title).toBe('TEST ROM64K');
    expect(h.cgb).toBe(true);
    expect(h.cartridgeTypeName).toBe('MBC5 + RAM + battery');
    expect(h.declaredRomSize).toBe(0x10000);
    expect(h.ramSize).toBe(0x8000);
    expect(h.headerChecksumOk).toBe(true);
    expect(parseGbHeader(new Uint8Array(100))).toBeNull();
  });

  it('uses the header title when none is given and sanitizes it like romgen', () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0x50, 0x4f, 0x4b, 0x45, 0x4d, 0x4f, 0x4e, 0x20, 0x52, 0x45, 0x44, 0x00, 0x00, 0x00, 0x00, 0x80], 0x134);
    expect(parseGbHeader(rom)!.title).toBe('POKEMON RED');
    rom.set([0x41, 0x07, 0xe9], 0x134);
    expect(convertRom(rom, 'PKMN').title).toBe('A??EMON RED');
  });

  it('validates the name prefix the way romgen does', () => {
    expect(validatePrefix('POKE')).toBeNull();
    expect(validatePrefix('Ab9zZ')).toBeNull();
    expect(validatePrefix('POKEMON')).toMatch(/5 characters/);
    expect(validatePrefix('pok')).toMatch(/capital/);
    expect(validatePrefix('1UP')).toMatch(/capital/);
    expect(validatePrefix('PO-K')).toMatch(/letters and digits/);
    expect(suggestPrefix('POKEMON RED')).toBe('POKEM');
    expect(suggestPrefix('1942')).toBe('GAME');
    expect(suggestPrefix("Zelda: Link's")).toBe('ZELDA');
  });
});
