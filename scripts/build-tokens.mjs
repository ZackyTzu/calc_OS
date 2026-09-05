// Reduce the TI-Toolkit 8X token sheet to the tokens valid on a TI-84 Plus CE.
// Output: src/lib/tibasic/tokens.json  { "DE": { "a": "Disp ", "d": "Disp " }, "BB0F": {...}, ... }
//   a = accessible (ASCII) spelling, the canonical form used in program sources
//   d = display form (Unicode) used when listing programs for humans
//   v = extra accepted spellings (variants), optional
import { readFileSync, writeFileSync } from 'node:fs';

const sheet = JSON.parse(readFileSync(new URL('../data/tokens/8X.json', import.meta.url), 'utf8'));

const MODEL_ORDER = ['TI-82', 'TI-83', 'TI-83+', 'TI-84+', 'TI-84+CSE', 'TI-84+CE'];
const TARGET = ['TI-84+CE', '5.8'];

function key(model, os) {
  const m = MODEL_ORDER.indexOf(model);
  const parts = (os || '0').split('.').slice(0, 2).map(Number);
  return [m < 0 ? 99 : m, parts[0] || 0, parts[1] || 0];
}
function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
const target = key(...TARGET);
function active(ver) {
  if (cmp(key(ver.since.model, ver.since['os-version']), target) > 0) return false;
  if (ver.until && cmp(key(ver.until.model, ver.until['os-version']), target) <= 0) return false;
  return true;
}

const out = {};
let count = 0;
// Program "version" byte level implied by a token's first OS, mirroring tivars_lib_py get_version().
const LEVELS = [
  [['TI-84+CE', '5.3'], 0x0c], [['TI-84+CE', '5.2'], 0x0b], [['TI-84+CSE', '4.0'], 0x0a],
  [['TI-84+', '2.55'], 0x07], [['TI-84+', '2.53'], 0x06], [['TI-84+', '2.30'], 0x05], [['TI-84+', '2.21'], 0x04],
  [['TI-83+', '1.16'], 0x03], [['TI-83+', '1.15'], 0x02], [['TI-83+', '1.00'], 0x01],
];
function levelOf(since) {
  const k = key(since.model, since['os-version']);
  for (const [[m, os], lvl] of LEVELS) if (cmp(k, key(m, os)) >= 0) return lvl;
  return 0;
}
function emit(hex, ver) {
  const en = ver.langs.en;
  const entry = { a: en.accessible, d: en.display };
  const lvl = levelOf(ver.since);
  if (lvl) entry.s = lvl;
  const variants = (en.variants || []).filter((v) => v !== en.accessible && v !== en.display);
  if (variants.length) entry.v = variants;
  out[hex] = entry;
  count++;
}
for (const [k, v] of Object.entries(sheet)) {
  const hex1 = k.slice(1);
  if (Array.isArray(v)) {
    for (const ver of v) if (active(ver)) emit(hex1, ver);
  } else {
    for (const [k2, vers] of Object.entries(v)) {
      for (const ver of vers) if (active(ver)) emit(hex1 + k2.slice(1), ver);
    }
  }
}

// Sanity: accessible spellings must be unique so tokenization is unambiguous.
const seen = new Map();
for (const [hex, e] of Object.entries(out)) {
  if (seen.has(e.a)) throw new Error(`accessible spelling collision: ${JSON.stringify(e.a)} ${seen.get(e.a)} vs ${hex}`);
  seen.set(e.a, hex);
}

writeFileSync(new URL('../src/lib/tibasic/tokens.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${count} tokens`);
