// Simulate the first screen a program shows, for previews on the website.
// Handles the subset of TI-BASIC our generated programs use for their opening screen:
// ClrHome, Disp, Output(, Menu(, and stops at the first wait (Pause, Input, Prompt, getKey loops).
import { splitStrings } from '../programs/lint';

export const COLS = 26;
export const ROWS = 10;

export interface ScreenPreview {
  rows: string[];
  /** 'menu' previews render the first row as a menu title bar. */
  kind: 'text' | 'menu';
}

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  let depth = 0;
  for (const ch of s) {
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
      if (ch === '(' || ch === '{' || ch === '[') depth++;
      if (ch === ')' || ch === '}' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur.length) out.push(cur);
  return out;
}

function display(text: string): string {
  return text
    .replace(/->/g, '→').replace(/\^\^2/g, '²').replace(/\^\^3/g, '³').replace(/\^\^-1/g, '⁻¹')
    .replace(/>=/g, '≥').replace(/<=/g, '≤').replace(/!=/g, '≠').replace(/\.\.\./g, '…').slice(0, COLS);
}

function valueText(expr: string): string | null {
  const t = expr.trim();
  if (/^~?[0-9.]+$/.test(t)) return t.replace('~', '-');
  return null;
}

export function previewTiBasic(source: string): ScreenPreview {
  const lines = source.split('\n');
  let rows: string[] = [];
  const push = (text: string) => {
    rows.push(text.slice(0, COLS));
    if (rows.length > ROWS) rows = rows.slice(rows.length - ROWS);
  };
  const pushRight = (text: string) => push(text.padStart(COLS));
  let skipDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipDepth > 0) {
      if (/^If .*$/.test(line) && lines[i + 1] === 'Then') skipDepth++;
      else if (/^(For\(|While |Repeat )/.test(line)) skipDepth++;
      else if (line === 'End') skipDepth--;
      continue;
    }
    if (/^If /.test(line)) {
      if (lines[i + 1] === 'Then') skipDepth = 1; // condition unknown: skip the block
      continue; // single-line If: skip
    }
    if (/^(For\(|While )/.test(line)) { skipDepth = 1; continue; }
    if (line === 'ClrHome') { rows = []; continue; }
    if (/^Disp /.test(line) || line === 'Disp') {
      for (const arg of splitArgs(line.slice(5))) {
        const a = arg.trim();
        if (/^".*"?$/.test(a)) push(display(a.replace(/^"/, '').replace(/"$/, '')));
        else {
          const v = valueText(a);
          if (v !== null) pushRight(v);
        }
      }
      continue;
    }
    if (/^Output\(/.test(line)) {
      const m = /^Output\((\d+),(\d+),(.*)\)$/.exec(line);
      if (m) {
        const r = Number(m[1]) - 1, c = Number(m[2]) - 1;
        const arg = m[3].trim();
        const text = /^"/.test(arg) ? display(arg.replace(/^"/, '').replace(/"$/, '')) : valueText(arg) ?? '';
        while (rows.length <= r) rows.push('');
        const row = rows[r].padEnd(COLS).split('');
        for (let k = 0; k < text.length && c + k < COLS; k++) row[c + k] = text[k];
        rows[r] = row.join('').trimEnd();
      }
      continue;
    }
    if (/^Menu\(/.test(line)) {
      const { strings } = splitStrings(line);
      const [title, ...options] = strings;
      const menuRows = [display(title ?? '')];
      options.forEach((o, idx) => menuRows.push(`${idx + 1}:${display(o)}`));
      return { rows: menuRows.slice(0, ROWS), kind: 'menu' };
    }
    if (/^Input /.test(line) || /^Prompt /.test(line)) {
      const { strings } = splitStrings(line);
      push(display(strings[0] ?? '?'));
      return { rows, kind: 'text' };
    }
    if (/^Pause/.test(line) || /^Repeat /.test(line) || /getKey/.test(line) || line === 'Return' || line === 'Stop') {
      return { rows, kind: 'text' };
    }
    // stores, Lbl, mode settings, matrix/list setup: no visible effect
  }
  return { rows, kind: 'text' };
}

/** First screen of a generated Nspire Python program: the intro prints and the first menu. */
export function previewPython(source: string): ScreenPreview {
  const rows: string[] = [];
  const main = source.indexOf('def main():');
  const body = main >= 0 ? source.slice(main) : source;
  for (const line of body.split('\n').slice(1)) {
    const p = /^\s+print\("((?:[^"\\]|\\.)*)"\)\s*$/.exec(line);
    if (p) { rows.push(JSON.parse(`"${p[1]}"`).slice(0, 34)); continue; }
    const m = /menu\("((?:[^"\\]|\\.)*)",\s*\[(.*)\]\)/.exec(line);
    if (m) {
      rows.push('', `== ${m[1]} ==`);
      const items = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
      items.forEach((it, i) => rows.push(`${i + 1}) ${it}`));
      rows.push('0) Back', '> ');
      break;
    }
    if (/input\(/.test(line)) { const q = /input\("([^"]*)"\)/.exec(line); rows.push(q ? q[1] : '? '); break; }
  }
  return { rows: rows.slice(0, 20), kind: 'text' };
}
