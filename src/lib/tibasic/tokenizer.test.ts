import { describe, expect, it } from 'vitest';
import { tokenize, detokenize, TokenizeError } from './tokenizer';
import { hex } from '../bytes';

describe('tokenize', () => {
  it('encodes a simple Disp statement', () => {
    expect(hex(tokenize('Disp "HI"'))).toBe('DE 2A 48 49 2A');
  });
  it('uses the store arrow and negation tokens', () => {
    expect(hex(tokenize('~9.8->G'))).toBe('B0 39 3A 38 04 47');
  });
  it('prefers the longest match', () => {
    expect(hex(tokenize('X>=Y'))).toBe('58 6E 59');
    expect(hex(tokenize('X>Frac'))).toBe('58 03');
    expect(hex(tokenize('sin^-1(X'))).toBe('C3 58');
  });
  it('handles two-byte tokens and lowercase text', () => {
    expect(hex(tokenize('Str1'))).toBe('AA 00');
    expect(hex(tokenize('ab'))).toBe('BB B0 BB B1');
    expect(hex(tokenize('[n]'))).toBe('62 02');
  });
  it('encodes newlines as 3F', () => {
    expect(hex(tokenize('ClrHome\nDisp 1'))).toBe('E1 3F DE 31');
    expect(hex(tokenize('ClrHome\r\nDisp 1'))).toBe('E1 3F DE 31');
  });
  it('rejects unknown characters with a location', () => {
    expect(() => tokenize('Disp 1\nDisp §')).toThrow(TokenizeError);
    try {
      tokenize('Disp 1\nDisp §');
    } catch (e) {
      expect((e as TokenizeError).line).toBe(2);
    }
  });
});

describe('detokenize', () => {
  it('round-trips accessible spellings', () => {
    const src = 'ClrHome\nInput "V0=",V\nV^^2/(2A)->D\nDisp "D=",D\nIf D>=0 and V!=0\nThen\nDisp "ok"\nEnd\n' +
      'Menu("PHYSICS 1","Kinematics",1,"Quit",9)\nLbl 1\nsqrt(2GH)->V\ntheta->T\n[n]->N\ne^^(2)->E\n{Y1}(3)->Z';
    expect(detokenize(tokenize(src))).toBe(src);
  });
  it('can render display forms', () => {
    expect(detokenize(tokenize('X^^2->Y'), { form: 'display' })).toBe('X²→Y');
  });
});

describe('programVersion', () => {
  it('follows the TI Connect / tivars version rules', async () => {
    const { programVersion } = await import('./tokenizer');
    expect(programVersion(tokenize('Disp 1'))).toBe(0x00);
    expect(programVersion(tokenize('Disp toString(1)'))).toBe(0x0b);
    expect(programVersion(tokenize('Wait 1'))).toBe(0x0b);
    expect(programVersion(tokenize('BackgroundOn BLUE'))).toBe(0x0a);
    expect(programVersion(tokenize('startTmr'))).toBe(0x20 + 0x03);
  });
});

describe('string literals', () => {
  it('encodes text inside strings letter by letter', () => {
    // "mu" must not become the μ token, "pi" must not become π, "sin(" stays letters.
    expect(hex(tokenize('Disp "formula"'))).toBe('DE 2A BB B5 BB BF BB C2 BB BD BB C5 BB BC BB B0 2A');
    expect(hex(tokenize('"spin"'))).toBe('2A BB C3 BB C0 BB B8 BB BE 2A');
    expect(detokenize(tokenize('Disp "sin(x) and cos(x)"'), { form: 'display' })).toBe('Disp "sin(x) and cos(x)"');
  });
  it('still allows symbol escapes inside strings and code outside them', () => {
    expect(detokenize(tokenize('Disp "x^^2->y",pi'), { form: 'display' })).toBe('Disp "x²→y",π');
    expect(hex(tokenize('"A":pi'))).toBe('2A 41 2A 3E AC');
  });
  it('closes strings at end of line', () => {
    expect(hex(tokenize('Disp "A\npi'))).toBe('DE 2A 41 3F AC');
  });
});
