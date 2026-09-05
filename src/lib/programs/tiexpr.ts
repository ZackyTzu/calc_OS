// Evaluate the subset of TI-BASIC expressions used in our content on the JavaScript side.
// Used by tests to prove every rearranged formula is algebraically consistent, and by the
// website to preview a solver without a calculator. Not a general TI-BASIC interpreter.

export type Vars = Record<string, number>;

type Tok = { t: 'num'; v: number } | { t: 'var'; v: string } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: 'lp' } | { t: 'rp' } | { t: 'comma' };

const FUNCTIONS = ['sqrt(', 'sin^-1(', 'cos^-1(', 'tan^-1(', 'sin(', 'cos(', 'tan(', 'ln(', 'log(', 'abs(', 'e^^(', '10^^(', 'int(', 'round(', 'solve(', 'nDeriv(', 'fnInt(', 'max(', 'min(', 'normalcdf(', 'invNorm(', 'binompdf(', 'binomcdf(', 'geometpdf(', 'geometcdf(', 'chi^2cdf(', 'tcdf(', 'invT('];

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
    if (src.startsWith('nCr', i)) { out.push({ t: 'op', v: 'nCr' }); i += 3; continue; }
    if (src.startsWith('nPr', i)) { out.push({ t: 'op', v: 'nPr' }); i += 3; continue; }
    const fn = FUNCTIONS.find((f) => src.startsWith(f, i));
    if (fn) { out.push({ t: 'fn', v: fn.slice(0, -1) }); i += fn.length; continue; }
    if (src.startsWith('pi', i)) { out.push({ t: 'num', v: Math.PI }); i += 2; continue; }
    if (src.startsWith('theta', i)) { out.push({ t: 'var', v: 'theta' }); i += 5; continue; }
    if (src.startsWith('^^-1', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: -1 }); i += 4; continue; }
    if (src.startsWith('^^2', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: 2 }); i += 3; continue; }
    if (src.startsWith('^^3', i)) { out.push({ t: 'op', v: '^' }, { t: 'num', v: 3 }); i += 3; continue; }
    if ('+-*/^~!'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
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
        case 'normalcdf': return normalcdf(args[0], args[1], args[2] ?? 0, args[3] ?? 1);
        case 'invNorm': return invNorm(args[0], args[1] ?? 0, args[2] ?? 1);
        case 'binompdf': return binompdf(args[0], args[1], args[2]);
        case 'binomcdf': { let acc = 0; for (let k = 0; k <= args[2]; k++) acc += binompdf(args[0], args[1], k); return acc; }
        case 'geometpdf': return Math.pow(1 - args[0], args[1] - 1) * args[0];
        case 'geometcdf': return 1 - Math.pow(1 - args[0], args[1]);
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
    while (peek()?.t === 'op' && (peek() as { v: string }).v === '!') { next(); base = factorial(base); }
    while (peek()?.t === 'op' && (peek() as { v: string }).v === '^') {
      next();
      const e = unary();
      base = Math.pow(base, e);
    }
    return base;
  }
  function combin(): number {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === 'nCr' || t.v === 'nPr')) {
        next();
        const k = unary();
        v = t.v === 'nCr' ? choose(v, k) : perm(v, k);
      } else break;
    }
    return v;
  }
  function term(): number {
    let v = combin();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) {
        next();
        const r = combin();
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

function factorial(n: number): number {
  if (n < 0 || n !== Math.floor(n)) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function perm(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r *= n - i;
  return r;
}
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return perm(n, k) / factorial(k);
}
function binompdf(n: number, p: number, k: number): number {
  return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}
/** Standard normal CDF via erfc (Numerical Recipes approximation, |error| < 1.2e-7). */
function phi(z: number): number {
  return 0.5 * (1 + erfRescaled(z));
}
function erfRescaled(z: number): number {
  // erf(z / sqrt 2) computed with the same approximation
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? y : -y;
}
function normalcdf(lo: number, hi: number, mu: number, sigma: number): number {
  const a = (lo - mu) / sigma, b = (hi - mu) / sigma;
  return phi(b) - phi(a);
}
/** Acklam's inverse normal approximation, refined with one Newton step. */
function invNorm(p: number, mu: number, sigma: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  let x: number;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= ph) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const e = phi(x) - p;
  x -= e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return mu + sigma * x;
}
