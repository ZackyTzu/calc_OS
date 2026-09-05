// Emits TI-BASIC source for the TI-84 Plus CE with automatic label allocation, menu paging,
// and text wrapping. The result is plain text in the tokenizer's accessible spelling.

export const SCREEN_COLS = 26;
export const SCREEN_ROWS = 10;
export const MENU_MAX_OPTIONS = 9;
export const MENU_OPTION_MAX = 14;
export const MENU_TITLE_MAX = 16;
export const INPUT_PROMPT_MAX = 16;

const LABEL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class Label {
  constructor(public readonly name: string) {}
  toString() { return this.name; }
}

export interface MenuItem { label: string; target: Label }

export class ProgramBuilder {
  private lines: string[] = [];
  private labelIndex = 0;
  private used = new Set<string>();
  /** Labels reserved but not yet placed with `place()`. */
  private pending = new Set<string>();

  /** Reserve a fresh two-character label. */
  label(): Label {
    for (;;) {
      const i = this.labelIndex++;
      const a = LABEL_CHARS[Math.floor(i / LABEL_CHARS.length)];
      const b = LABEL_CHARS[i % LABEL_CHARS.length];
      if (a === undefined) throw new Error('Out of labels');
      const name = a + b;
      if (!this.used.has(name)) {
        this.used.add(name);
        this.pending.add(name);
        return new Label(name);
      }
    }
  }

  /** Emit `Lbl X` here. */
  place(l: Label): void {
    if (!this.pending.has(l.name)) throw new Error(`Label ${l.name} placed twice or never reserved`);
    this.pending.delete(l.name);
    this.lines.push(`Lbl ${l.name}`);
  }

  raw(line: string): void {
    this.lines.push(line);
  }
  goto(l: Label): void {
    this.lines.push(`Goto ${l.name}`);
  }
  clrHome(): void {
    this.lines.push('ClrHome');
  }
  pause(): void {
    this.lines.push('Pause ');
  }

  /** Disp a string, wrapped to the screen width; empty string prints a blank line. */
  disp(text: string): void {
    for (const line of wrap(text, SCREEN_COLS)) this.lines.push(`Disp "${escapeString(line)}"`);
  }
  /** Disp a label and a value: value appears right-aligned on the following line. */
  dispValue(label: string, expr: string): void {
    this.lines.push(`Disp "${escapeString(label.slice(0, SCREEN_COLS))}",${expr}`);
  }
  input(prompt: string, sym: string): void {
    if (prompt.length > INPUT_PROMPT_MAX) throw new Error(`Input prompt too long: "${prompt}"`);
    this.lines.push(`Input "${escapeString(prompt)}",${sym}`);
  }
  store(expr: string, sym: string): void {
    this.lines.push(`${expr}->${sym}`);
  }

  /**
   * Emit a menu, paging automatically. `items` are the choices; `tail` entries (e.g. "Back")
   * appear on every page. When paging, a "Next" entry links pages together.
   */
  menu(title: string, items: MenuItem[], tail: MenuItem[] = []): void {
    if (title.length > MENU_TITLE_MAX) throw new Error(`Menu title too long: "${title}"`);
    for (const it of [...items, ...tail]) {
      if (it.label.length > MENU_OPTION_MAX) throw new Error(`Menu option too long: "${it.label}"`);
      if (it.label.length === 0) throw new Error('Empty menu option');
    }
    let rest = items;
    for (;;) {
      const roomForNext = rest.length > MENU_MAX_OPTIONS - tail.length ? 1 : 0;
      const cap = MENU_MAX_OPTIONS - tail.length - roomForNext;
      const page = rest.slice(0, cap);
      rest = rest.slice(cap);
      const entries: MenuItem[] = [...page];
      let nextLabel: Label | null = null;
      if (rest.length) {
        nextLabel = this.label();
        entries.push({ label: 'Next...', target: nextLabel });
      }
      entries.push(...tail);
      const parts = entries.map((e) => `"${escapeString(e.label)}",${e.target.name}`);
      this.lines.push(`Menu("${escapeString(title)}",${parts.join(',')})`);
      if (!nextLabel) break;
      this.place(nextLabel);
    }
  }

  /**
   * Show paragraphs of text, wrapped and paged: at most `rows` lines per screen, Pause between
   * screens. `header` (if given) is repeated at the top of each page.
   */
  pages(paragraphs: string[], header?: string, rows = SCREEN_ROWS - 1): void {
    const lines: string[] = [];
    for (const p of paragraphs) {
      if (p === '') { lines.push(''); continue; }
      lines.push(...wrap(p, SCREEN_COLS));
    }
    const perPage = rows - (header ? 1 : 0);
    for (let i = 0; i < Math.max(1, lines.length); i += perPage) {
      this.clrHome();
      if (header) this.lines.push(`Disp "${escapeString(header.slice(0, SCREEN_COLS))}"`);
      for (const l of lines.slice(i, i + perPage)) this.lines.push(`Disp "${escapeString(l)}"`);
      this.pause();
    }
  }

  source(): string {
    if (this.pending.size) throw new Error(`Labels reserved but never placed: ${[...this.pending].join(', ')}`);
    return this.lines.join('\n');
  }
}

/** TI-BASIC strings cannot contain a double quote; use an apostrophe instead. */
export function escapeString(s: string): string {
  return s.replace(/"/g, "'");
}

/** Greedy word wrap to `width` columns; words longer than the width are split. */
export function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length);
  const out: string[] = [];
  let cur = '';
  for (let w of words) {
    while (w.length > width) {
      if (cur) { out.push(cur); cur = ''; }
      out.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}
