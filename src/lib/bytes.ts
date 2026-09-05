// Small byte helpers shared by the file-format and protocol code.

export function concat(...parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function u8(n: number): Uint8Array {
  return new Uint8Array([n & 0xff]);
}
export function u16be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 8) & 0xff, n & 0xff]);
}
export function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}
export function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
export function readU16be(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}
export function readU32be(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
export function readU16le(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}
export function readU64be(b: Uint8Array, o: number): number {
  // Values we read (memory sizes) fit comfortably in a double.
  return readU32be(b, o) * 0x1_0000_0000 + readU32be(b, o + 4);
}

/** Latin-1 string to bytes (calculator names and comments are plain ASCII). */
export function latin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
export function fromLatin1(b: Uint8Array): string {
  let s = '';
  for (const c of b) {
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export function hex(b: Uint8Array, sep = ' '): string {
  return Array.from(b, (x) => x.toString(16).toUpperCase().padStart(2, '0')).join(sep);
}

export function fromHex(s: string): Uint8Array {
  const clean = s.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
