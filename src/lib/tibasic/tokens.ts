// Token table for the TI-84 Plus CE, generated from the TI-Toolkit token sheet
// (see data/tokens/README.md and scripts/build-tokens.mjs).
import raw from './tokens.json';

export interface TokenInfo {
  /** Token bytes, one or two. */
  bytes: Uint8Array;
  /** Upper-case hex of the bytes, e.g. "DE" or "BB0F". */
  hex: string;
  /** Canonical ASCII spelling used in program source, e.g. "Disp ", "^^2", "->". */
  accessible: string;
  /** What the calculator shows, e.g. "Disp ", "²", "→". */
  display: string;
  variants: string[];
  /** Program version byte implied by this token (0 when it exists since the TI-82/83). */
  level: number;
}

type RawEntry = { a: string; d: string; v?: string[]; s?: number };
const entries = raw as Record<string, RawEntry>;

export const TOKENS: TokenInfo[] = [];
export const BY_HEX = new Map<string, TokenInfo>();
/** Every accepted spelling -> token. Accessible spellings win over display forms and variants. */
export const BY_NAME = new Map<string, TokenInfo>();
export const TWO_BYTE_PREFIXES = new Set<number>();

for (const [hexKey, e] of Object.entries(entries)) {
  const bytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hexKey.slice(i * 2, i * 2 + 2), 16);
  const t: TokenInfo = { bytes, hex: hexKey, accessible: e.a, display: e.d, variants: e.v ?? [], level: e.s ?? 0 };
  TOKENS.push(t);
  BY_HEX.set(hexKey, t);
  if (bytes.length === 2) TWO_BYTE_PREFIXES.add(bytes[0]);
}
// Accessible spellings first so they always take priority.
for (const t of TOKENS) BY_NAME.set(t.accessible, t);
for (const t of TOKENS) if (!BY_NAME.has(t.display)) BY_NAME.set(t.display, t);
for (const t of TOKENS) for (const v of t.variants) if (!BY_NAME.has(v)) BY_NAME.set(v, t);

export const MAX_NAME_LENGTH = Math.max(...Array.from(BY_NAME.keys(), (k) => k.length));

/** Well-known single tokens used by the generators. */
export const TOKEN = {
  NEWLINE: 0x3f,
  COLON: 0x3e,
  QUOTE: 0x2a,
  STORE: 0x04,
} as const;
