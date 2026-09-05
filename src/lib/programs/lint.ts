// Structural checks for generated TI-BASIC. These catch the mistakes that would otherwise only
// show up as ERR:SYNTAX / ERR:LABEL on the calculator.
import { tokenize, TokenizeError } from '../tibasic/tokenizer';
import { INPUT_PROMPT_MAX, MENU_MAX_OPTIONS, MENU_OPTION_MAX, MENU_TITLE_MAX, SCREEN_COLS } from './builder';

export interface LintIssue { line: number; message: string; text: string }

const BLOCK_OPEN = /^(If .*)$/;
const LOOP_OPEN = /^(For\(|While |Repeat )/;

/** Split a TI-BASIC line into string literals and code segments (strings end at a quote or at end of line). */
export function splitStrings(line: string): { code: string; strings: string[] } {
  const strings: string[] = [];
  let code = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      const end = line.indexOf('"', i + 1);
      const s = end < 0 ? line.slice(i + 1) : line.slice(i + 1, end);
      strings.push(s);
      code += '"';
      i = end < 0 ? line.length : end + 1;
    } else {
      code += line[i++];
    }
  }
  return { code, strings };
}

export function lint(source: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = source.split('\n');
  const labels = new Map<string, number>();
  const targets: { name: string; line: number }[] = [];
  const stack: { kind: string; line: number }[] = [];

  lines.forEach((text, idx) => {
    const line = idx + 1;
    const push = (message: string) => issues.push({ line, message, text });
    const { code, strings } = splitStrings(text);

    for (const s of strings) {
      if (s.includes('"')) push('String contains a double quote');
    }
    // Parentheses balance (closing parens may be omitted at end of line in TI-BASIC, but we require balance)
    let depth = 0;
    for (const ch of code) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (depth < 0) { push('Unbalanced parentheses'); break; }
    }
    if (depth > 0) push('Unclosed parenthesis');

    const lbl = /^Lbl ([A-Z0-9theta]{1,5})$/.exec(text);
    if (lbl) {
      if (lbl[1].replace('theta', 'T').length > 2) push('Label longer than 2 characters');
      if (labels.has(lbl[1])) push(`Duplicate label ${lbl[1]} (first at line ${labels.get(lbl[1])})`);
      labels.set(lbl[1], line);
    }
    const gt = /^Goto ([A-Z0-9]+)$/.exec(text);
    if (gt) targets.push({ name: gt[1], line });

    if (text.startsWith('Menu(')) {
      const parts = splitMenu(text);
      if (!parts) push('Cannot parse Menu(');
      else {
        if (parts.title.length > MENU_TITLE_MAX) push(`Menu title longer than ${MENU_TITLE_MAX}`);
        if (parts.options.length > MENU_MAX_OPTIONS) push(`Menu has ${parts.options.length} options (max ${MENU_MAX_OPTIONS})`);
        if (parts.options.length === 0) push('Menu has no options');
        for (const o of parts.options) {
          if (o.label.length > MENU_OPTION_MAX) push(`Menu option "${o.label}" longer than ${MENU_OPTION_MAX}`);
          targets.push({ name: o.target, line });
        }
      }
    }
    if (/^Disp "/.test(text)) {
      for (const s of strings) if (s.length > SCREEN_COLS) push(`Disp string longer than ${SCREEN_COLS}: "${s}"`);
    }
    if (/^Output\(/.test(text)) {
      const m = /^Output\((\d+),(\d+),"([^"]*)"/.exec(text);
      if (m && Number(m[2]) - 1 + m[3].length > SCREEN_COLS) push('Output( text runs past column 26');
    }
    if (/^Input "/.test(text)) {
      for (const s of strings) if (s.length > INPUT_PROMPT_MAX) push(`Input prompt longer than ${INPUT_PROMPT_MAX}: "${s}"`);
    }
    // Block structure
    if (BLOCK_OPEN.test(text) && lines[idx + 1]?.trim() === 'Then') stack.push({ kind: 'If', line });
    else if (LOOP_OPEN.test(text)) stack.push({ kind: text.split(/[ (]/)[0], line });
    else if (text === 'End') {
      if (!stack.length) push('End without a matching If/For/While/Repeat');
      else stack.pop();
    } else if (text === 'Else') {
      if (!stack.length || stack[stack.length - 1].kind !== 'If') push('Else outside an If/Then block');
    }
  });
  for (const s of stack) issues.push({ line: s.line, message: `${s.kind} block never closed with End`, text: lines[s.line - 1] });
  for (const t of targets) {
    if (!labels.has(t.name)) issues.push({ line: t.line, message: `Jump to undefined label ${t.name}`, text: lines[t.line - 1] });
  }
  try {
    tokenize(source);
  } catch (e) {
    if (e instanceof TokenizeError) issues.push({ line: e.line, message: e.message, text: lines[e.line - 1] ?? '' });
    else throw e;
  }
  return issues;
}

export function splitMenu(text: string): { title: string; options: { label: string; target: string }[] } | null {
  const m = /^Menu\("([^"]*)"(.*)\)$/.exec(text);
  if (!m) return null;
  const rest = m[2];
  const options: { label: string; target: string }[] = [];
  const re = /,"([^"]*)",([A-Z0-9]+)/g;
  let mm: RegExpExecArray | null;
  let consumed = 0;
  while ((mm = re.exec(rest))) {
    options.push({ label: mm[1], target: mm[2] });
    consumed = re.lastIndex;
  }
  if (consumed !== rest.length) return null;
  return { title: m[1], options };
}
