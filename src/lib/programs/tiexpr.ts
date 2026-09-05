// Evaluate the subset of TI-BASIC expressions used in our content on the JavaScript side.
// Used by tests to prove every rearranged formula is algebraically consistent, and by the
// website to preview a solver without a calculator. Not a general TI-BASIC interpreter.

export type Vars = Record<string, number>;

type Tok = { t: 'num'; v: number } | { t: 'var'; v: string } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: 'lp' } | { t: 'rp' } | { t: 'comma' };

const FUNCTIONS = ['sqrt(', 'sin^-1(', 'cos^-1(', 'tan^-1(', 'sin(', 'cos(', 'tan(', 'ln(', 'log(', 'abs(', 'e^^(', '10^^(', 'int(', 'round(', 'solve(', 'nDeriv(', 'fnInt(', 'max(', 'min('];

export function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      let text = src.slice(i, j);
      if (src.startsWith('|E', j)) {
        // scientific notation: 6.67|E~11
        let k = j + 2;
        let sign = '';
        if (src[k] === '~' || src[k] === '-') { sign = '-'; k++; }
        let m = k;
        while (m < src.length && /[0-9]/.test(src[m])) m++;
        text = `${text}e${sign}${src.slice(k, m)}`;
        j = m;
      }
      out.push({ t: 'num', v: parseFloat(text) });
      i = j;
      continue;
    }
    const fn = FUNCTIONS.find((f) => src.startsWith(f, i));
    if (fn) { out.push({ t: 'fn', v: fn.slice(0, -1) }); i += fn.length; continue; }
    if (src.startsWith('pi', i)) { out.push({ t: 'num', v: Math.PI }); i += 2; continue; }
    if (src.startsWith('theta', i)) { out.push({ t: 'var', v: 'theta' }); i += 5; continue; }
    if (src.startsWith('^^-1', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: -1 }); i += 4; continue; }
    if (src.startsWith('^^2', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: 2 }); i += 3; continue; }
    if (src.startsWith('^^3', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: 3 }); i += 3; continue; }
    if ('+-*/^~'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma' }); i++; continue; }
    if (/[A-Z]/.test(c)) { out.push({ t: 'var', v: c }); i++; continue; }
    throw new Error(`Cannot lex TI expression at "${src.slice(i, i + 10)}"`);
  }
  return out;
}

export interface EvalOptions { mode?: 'deg' | 'rad' }

/** Evaluate a TI expression. Implicit multiplication is deliberately NOT supported: content must use `*`. */
export function evaluate(src: string, vars: Vars, opts: EvalOptions = {}): number {
  const toks = lex(src);
  let p = 0;
  const deg = opts.mode === 'deg';
  const toRad = (x: number) => (deg ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (deg ? (x * 180) / Math.PI : x);
  const peek = () => toks[p];
  const next = () => toks[p++];

  function primary(): number {
    const t = next();
    if (!t) throw new Error(`Unexpected end of expression: ${src}`);
    if (t.t === 'num') return t.v;
    if (t.t === 'var') {
      if (!(t.v in vars)) throw new Error(`Variable ${t.v} is not defined for ${src}`);
      return vars[t.v];
    }
    if (t.t === 'op' && t.v === '~') return -unary();
    if (t.t === 'op' && t.v === '-') return -unary();
    if (t.t === 'lp') {
      const v = expr();
      if (peek()?.t === 'rp') next();
      return v;
    }
    if (t.t === 'fn') {
      const args: number[] = [];
      if (t.v === 'solve') {
        // solve(expression, variable, guess): numeric root of expression == 0 near guess
        const start = p;
        let depth = 0;
        let end = start;
        for (; end < toks.length; end++) {
          const k = toks[end];
          if (k.t === 'lp' || k.t === 'fn') depth++;
          if (k.t === 'rp') { if (depth === 0) break; depth--; }
          if (k.t === 'comma' && depth === 0) break;
        }
        const exprToks = toks.slice(start, end);
        p = end;
        if (next()?.t !== 'comma') throw new Error('solve( needs 3 arguments');
        const v = next();
        if (v?.t !== 'var') throw new Error('solve( second argument must be a variable');
        if (next()?.t !== 'comma') throw new Error('solve( needs 3 arguments');
        const guess = expr();
        if (peek()?.t === 'rp') next();
        const f = (x: number) => {
          const sub = evaluate(rebuild(exprToks), { ...vars, [v.v]: x }, opts);
          return sub;
        };
        return newton(f, guess);
      }
      args.push(expr());
      while (peek()?.t === 'comma') { next(); args.push(expr()); }
      if (peek()?.t === 'rp') next();
      const a = args[0];
      switch (t.v) {
        case 'sqrt': return Math.sqrt(a);
        case 'sin': return Math.sin(toRad(a));
        case 'cos': return Math.cos(toRad(a));
        case 'tan': return Math.tan(toRad(a));
        case 'sin^-1': return fromRad(Math.asin(a));
        case 'cos^-1': return fromRad(Math.acos(a));
        case 'tan^-1': return fromRad(Math.atan(a));
        case 'ln': return Math.log(a);
        case 'log': return Math.log10(a);
        case 'abs': return Math.abs(a);
        case 'e^^': return Math.exp(a);
        case '10^^': return Math.pow(10, a);
        case 'int': return Math.floor(a);
        case 'round': return args.length > 1 ? Number(a.toFixed(args[1])) : Math.round(a);
        case 'max': return Math.max(...args);
        case 'min': return Math.min(...args);
        default: throw new Error(`Unsupported function ${t.v}`);
      }
    }
    throw new Error(`Unexpected token in ${src}`);
  }
  function unary(): number {
    const t = peek();
    if (t?.t === 'op' && (t.v === '~' || t.v === '-')) { next(); return -unary(); }
    return power();
  }
  function power(): number {
    let base = primary();
    while (peek()?.t === 'op' && (peek() as { v: string }).v === '^') {
      next();
      const e = unary();
      base = Math.pow(base, e);
    }
    return base;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) {
        next();
        const r = unary();
        v = t.v === '*' ? v * r : v / r;
      } else if (t && (t.t === 'var' || t.t === 'lp' || t.t === 'fn' || t.t === 'num')) {
        throw new Error(`Implicit multiplication is not allowed in content expressions: ${src}`);
      } else break;
    }
    return v;
  }
  function expr(): number {
    let v = term();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '+' || t.v === '-')) {
        next();
        const r = term();
        v = t.v === '+' ? v + r : v - r;
      } else break;
    }
    return v;
  }
  const result = expr();
  if (p !== toks.length) throw new Error(`Trailing tokens in expression: ${src}`);
  return result;
}

function rebuild(toks: Tok[]): string {
  return toks
    .map((t) => {
      switch (t.t) {
        case 'num': return String(t.v);
        case 'var': return t.v;
        case 'op': return t.v;
        case 'fn': return t.v + '(';
        case 'lp': return '(';
        case 'rp': return ')';
        case 'comma': return ',';
      }
    })
    .join('');
}

function newton(f: (x: number) => number, guess: number): number {
  let x = guess;
  for (let i = 0; i < 100; i++) {
    const fx = f(x);
    if (!isFinite(fx)) break;
    if (Math.abs(fx) < 1e-12) return x;
    const h = Math.max(1e-6, Math.abs(x) * 1e-6);
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (d === 0 || !isFinite(d)) break;
    const nx = x - fx / d;
    if (Math.abs(nx - x) < 1e-12) return nx;
    x = nx;
  }
  return x;
}

/** Variable letters referenced by an expression. */
export function variablesIn(src: string): string[] {
  const seen = new Set<string>();
  for (const t of lex(src)) if (t.t === 'var') seen.add(t.v);
  return [...seen];
}
