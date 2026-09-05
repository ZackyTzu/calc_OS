import { describe, expect, it } from 'vitest';
import { buildFile, parseFile, programEntry, programTokens, appvarEntry, checksum, TIFileError } from './tifile';
import { tokenize, detokenize } from '../tibasic/tokenizer';
import { VarType } from './types';
import { hex } from '../bytes';

describe('8xp files', () => {
  it('builds a program file with the documented layout', () => {
    const tokens = tokenize('Disp "HI"');
    const file = buildFile([programEntry('HELLO', tokens)], 'test');
    expect(file.length).toBe(55 + 17 + 2 + tokens.length + 2);
    expect(hex(file.slice(0, 11))).toBe('2A 2A 54 49 38 33 46 2A 1A 0A 00');
    // data length = entry header (17) + 2 + tokens
    expect(file[53]).toBe(17 + 2 + tokens.length);
    expect(file[54]).toBe(0);
    const body = file.slice(55, file.length - 2);
    expect(hex(body.slice(0, 17))).toBe('0D 00 07 00 05 48 45 4C 4C 4F 00 00 00 00 00 07 00');
    const stored = file[file.length - 2] | (file[file.length - 1] << 8);
    expect(stored).toBe(checksum(body));
  });

  it('parses what it builds', () => {
    const src = 'ClrHome\nDisp "ROUND TRIP"';
    const file = buildFile([programEntry('RT', tokenize(src), { locked: true, archived: true })]);
    const parsed = parseFile(file);
    expect(parsed.checksumOk).toBe(true);
    expect(parsed.comment).toBe('Created by calc_OS');
    expect(parsed.entries).toHaveLength(1);
    const e = parsed.entries[0];
    expect(e.name).toBe('RT');
    expect(e.type).toBe(VarType.PROTECTED_PROGRAM);
    expect(e.archived).toBe(true);
    expect(detokenize(programTokens(e))).toBe(src);
  });

  it('supports groups with several variables', () => {
    const file = buildFile([
      programEntry('A', tokenize('Disp 1')),
      appvarEntry('DATA', new Uint8Array([1, 2, 3])),
    ]);
    const parsed = parseFile(file);
    expect(parsed.entries.map((e) => e.name)).toEqual(['A', 'DATA']);
    expect(parsed.entries[1].type).toBe(VarType.APPVAR);
    expect(parsed.entries[1].archived).toBe(true);
    expect(hex(parsed.entries[1].data)).toBe('03 00 01 02 03');
  });

  it('rejects bad names and foreign files', () => {
    expect(() => programEntry('lower', tokenize('1'))).toThrow(TIFileError);
    expect(() => programEntry('1ABC', tokenize('1'))).toThrow(TIFileError);
    expect(() => programEntry('TOOLONGNAME', tokenize('1'))).toThrow(TIFileError);
    const bad = new Uint8Array(70);
    bad.set(new TextEncoder().encode('**TI89**'));
    expect(() => parseFile(bad)).toThrow(/different calculator/);
  });

  it('flags checksum mismatches', () => {
    const file = buildFile([programEntry('A', tokenize('Disp 1'))]);
    file[file.length - 1] ^= 0xff;
    expect(parseFile(file).checksumOk).toBe(false);
  });
});
