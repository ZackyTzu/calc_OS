// TI-BASIC text <-> token bytes for the TI-84 Plus CE.
//
// Source text uses the "accessible" spellings from the TI-Toolkit sheet:
//   ->  store        ^^2  squared      ^^-1 inverse     ~  negation (unary minus)
//   != >= <=         pi   theta        e^^( 10^^(       [n] stats n, {Y1} function var
// Greedy longest-match is what the calculator itself does when it tokenizes typed
// text, so "Disp" inside a string still becomes the Disp token. That is normal and
// round-trips back to the same text.
import { BY_HEX, BY_NAME, MAX_NAME_LENGTH, TWO_BYTE_PREFIXES } from './tokens';

export class TokenizeError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public snippet: string,
  ) {
    super(`${message} (line ${line}, column ${column}): ${JSON.stringify(snippet)}`);
    this.name = 'TokenizeError';
  }
}

/**
 * Inside a string literal the calculator's own keyboard produces one token per typed character,
 * so text is encoded letter by letter. Only these unambiguous symbol spellings are still
 * recognised inside strings; word-like names such as "pi", "mu", "theta", "sin(" are NOT, so
 * "formula" stays f-o-r-m-u-l-a instead of becoming "forμla".
 */
const STRING_ESCAPES = ['->', '^^-1', '^^2', '^^3', '>=', '<=', '!=', '...'];

export function tokenize(source: string): Uint8Array {
  const text = source.replace(/\r\n?/g, '\n');
  const out: number[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let inString = false;
  while (i < text.length) {
    let matched = 0;
    if (inString && text[i] !== '"' && text[i] !== '\n') {
      {
        const esc = STRING_ESCAPES.find((e) => text.startsWith(e, i));
        const name = esc ?? text[i];
        const tok = BY_NAME.get(name);
        if (tok && (esc || name.length === 1)) {
          for (const b of tok.bytes) out.push(b);
          matched = name.length;
        }
      }
    }
    if (!matched) {
      const max = Math.min(MAX_NAME_LENGTH, text.length - i);
      for (let len = max; len >= 1; len--) {
        const tok = BY_NAME.get(text.substr(i, len));
        if (tok) {
          for (const b of tok.bytes) out.push(b);
          matched = len;
          break;
        }
      }
      if (matched === 1 && text[i] === '"') inString = !inString;
      else if (matched === 1 && text[i] === '\n') inString = false;
    }
    if (!matched) {
      throw new TokenizeError('Unknown token', line, i - lineStart + 1, text.slice(i, i + 12));
    }
    i += matched;
    for (let k = lineStart; k < i; k++) if (text[k] === '\n') { line++; lineStart = k + 1; }
  }
  return new Uint8Array(out);
}

export interface DetokenizeOptions {
  /** 'accessible' (default) gives round-trippable ASCII; 'display' gives what the calculator shows. */
  form?: 'accessible' | 'display';
}

export function detokenize(bytes: Uint8Array, opts: DetokenizeOptions = {}): string {
  const form = opts.form ?? 'accessible';
  let s = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let key = b.toString(16).toUpperCase().padStart(2, '0');
    let tok = undefined;
    if (TWO_BYTE_PREFIXES.has(b) && i + 1 < bytes.length) {
      const key2 = key + bytes[i + 1].toString(16).toUpperCase().padStart(2, '0');
      tok = BY_HEX.get(key2);
      if (tok) { key = key2; i += 2; }
    }
    if (!tok) {
      tok = BY_HEX.get(key);
      i += 1;
    }
    if (!tok) {
      s += `[?${key}]`;
      continue;
    }
    s += form === 'display' ? tok.display : tok.accessible;
  }
  return s;
}

/** Tokens that talk to the real-time clock bump the version byte by 0x20 (TI Connect / tivars convention). */
const CLOCK_TOKENS = new Set(['EF00', 'EF01', 'EF02', 'EF03', 'EF04', 'EF07', 'EF08', 'EF09', 'EF0A', 'EF0B', 'EF0C', 'EF0D', 'EF0E', 'EF0F', 'EF10']);

/** The program "version" byte TI Connect would write for these tokens (highest OS any token needs). */
export function programVersion(bytes: Uint8Array): number {
  let level = 0;
  let clock = false;
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let key = b.toString(16).toUpperCase().padStart(2, '0');
    let tok = undefined;
    if (TWO_BYTE_PREFIXES.has(b) && i + 1 < bytes.length) {
      const key2 = key + bytes[i + 1].toString(16).toUpperCase().padStart(2, '0');
      tok = BY_HEX.get(key2);
      if (tok) { key = key2; i += 2; }
    }
    if (!tok) { tok = BY_HEX.get(key); i += 1; }
    if (!tok) continue;
    if (tok.level > level) level = tok.level;
    if (CLOCK_TOKENS.has(key)) clock = true;
  }
  return level + (clock ? 0x20 : 0);
}

/** Number of bytes a source program occupies once tokenized. */
export function tokenizedSize(source: string): number {
  return tokenize(source).length;
}
