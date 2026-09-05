import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { desBlock, desKeySchedule } from './des';
import { buildLuaTns, buildPythonTns, crc32, docCrypt, readTns } from './tns';
import { fromHex, hex } from '../bytes';
import { LUA_FOOTER, LUA_HEADER, PY_FOOTER, PY_HEADER } from './tns-constants';

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url)));

describe('DES', () => {
  it('matches the FIPS test vector', () => {
    const ks = desKeySchedule(fromHex('133457799BBCDFF1'));
    expect(hex(desBlock(fromHex('0123456789ABCDEF'), ks), '')).toBe('85E813540F0AB405');
    expect(hex(desBlock(fromHex('85E813540F0AB405'), ks, true), '')).toBe('0123456789ABCDEF');
  });
});

describe('crc32', () => {
  it('matches the standard value', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
});

describe('TNS container', () => {
  it('decrypts the Problem1.xml written by the real Luna (proves keystream + layout)', () => {
    const entries = readTns(fixture('luna_hello_py.tns'));
    expect(entries.map((e) => [e.name, e.method])).toEqual([['Document.xml', 13], ['Problem1.xml', 13], ['calc_os_hello.py', 8]]);
    const problem = entries[1].decoded!;
    const expected = new Uint8Array([...fromHex(PY_HEADER), ...new TextEncoder().encode('calc_os_hello.py'), ...fromHex(PY_FOOTER)]);
    expect(hex(problem)).toBe(hex(expected));
    expect(new TextDecoder().decode(entries[2].decoded!)).toBe(readFileSync(new URL('./__fixtures__/hello.py', import.meta.url), 'utf8'));
  });

  it('decrypts the Lua problem written by Luna', () => {
    const entries = readTns(fixture('luna_hello_lua.tns'));
    const lua = readFileSync(new URL('./__fixtures__/hello.lua', import.meta.url), 'utf8');
    const expected = new Uint8Array([...fromHex(LUA_HEADER), ...new TextEncoder().encode(lua), ...fromHex(LUA_FOOTER)]);
    expect(hex(entries[1].decoded!)).toBe(hex(expected));
  });

  it('produces a container identical in structure to Luna for the same Python input', () => {
    const src = readFileSync(new URL('./__fixtures__/hello.py', import.meta.url), 'utf8');
    const ours = buildPythonTns([{ name: 'calc_os_hello.py', source: src }]);
    const ref = fixture('luna_hello_py.tns');
    // headers
    expect(new TextDecoder().decode(ours.slice(0, 10))).toBe('*TIMLP0500');
    expect(new TextDecoder().decode(ours.slice(ours.length - 22, ours.length - 18))).toBe('TIPD');
    // Document.xml entry (no compression involved) must be byte-identical
    expect(hex(ours.slice(0, 0x160))).toBe(hex(ref.slice(0, 0x160)));
    // remaining entries decode to the same content
    const a = readTns(ours), b = readTns(ref);
    expect(a.map((e) => e.name)).toEqual(b.map((e) => e.name));
    // Document.xml is an opaque blob copied verbatim (compared above); the others must decode identically.
    for (let i = 1; i < a.length; i++) expect(hex(a[i].decoded!)).toBe(hex(b[i].decoded!));
  });

  it('round-trips a Lua script', () => {
    const src = 'print("a]]>b")';
    const entries = readTns(buildLuaTns(src));
    const text = new TextDecoder().decode(entries[1].decoded!);
    expect(text).toContain('<![CDATA[print("a]]><![CDATA[b")]]>');
  });

  it('keystream is self-inverse', () => {
    const data = new Uint8Array(100).map((_, i) => i);
    expect(hex(docCrypt(docCrypt(data)))).toBe(hex(data));
  });
});
