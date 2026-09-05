// Generate a TI-Nspire CX II Python program (MicroPython dialect) from a Subject content spec.
// The program is a text-menu solver: pick a unit, a formula, the unknown, type the knowns.
// Formulas are translated from the content's TI-BASIC expressions to Python.
import { lex } from '../programs/tiexpr';
import type { Equation, Subject } from '../programs/types';
import { variablesIn } from '../programs/tiexpr';

export interface PythonProgram { filename: string; source: string }

const FN_MAP: Record<string, string> = {
  sqrt: 'math.sqrt', ln: 'math.log', log: 'math.log10', abs: 'abs', 'e^^': 'math.exp', '10^^': 'pow10',
  int: 'math.floor', round: 'round', max: 'max', min: 'min',
  normalcdf: 'normalcdf', invNorm: 'invNorm', binompdf: 'binompdf', binomcdf: 'binomcdf',
  geometpdf: 'geometpdf', geometcdf: 'geometcdf', tcdf: 'tcdf', invT: 'invT', 'chi^2cdf': 'chi2cdf',
};
const TRIG: Record<string, [string, string]> = {
  sin: ['sind', 'math.sin'], cos: ['cosd', 'math.cos'], tan: ['tand', 'math.tan'],
  'sin^-1': ['asind', 'math.asin'], 'cos^-1': ['acosd', 'math.acos'], 'tan^-1': ['atand', 'math.atan'],
};

/** Translate a TI-BASIC expression to Python. Variables become v['X'] (or `bind` overrides). */
export function toPython(expr: string, mode: 'deg' | 'rad' | undefined, bind: Record<string, string> = {}): string {
  const toks = lex(expr);
  let out = '';
  let i = 0;
  const varRef = (name: string) => bind[name] ?? `v['${name}']`;
  while (i < toks.length) {
    const t = toks[i];
    switch (t.t) {
      case 'num': { const str = String(t.v); out += /^\d+$/.test(str) ? `${str}.0` : str; break; }
      case 'var': out += varRef(t.v); break;
      case 'op':
        if (t.v === '~') out += '-';
        else if (t.v === '^') out += '**';
        else if (t.v === 'nCr' || t.v === 'nPr') {
          // rewrite `a nCr b` as ncr(a, b): the previous emitted operand is a simple token in our content
          const m = /(\w+\['\w'\]|[\w.]+)$/.exec(out);
          if (!m) throw new Error(`Cannot translate ${t.v} in ${expr}`);
          const left = m[0];
          out = out.slice(0, out.length - left.length);
          const next = toks[i + 1];
          if (!next || (next.t !== 'var' && next.t !== 'num')) throw new Error(`Cannot translate ${t.v} in ${expr}`);
          const right = next.t === 'var' ? varRef(next.v) : String(next.v);
          out += `${t.v === 'nCr' ? 'ncr' : 'npr'}(${left}, ${right})`;
          i++;
        } else if (t.v === '!') out += '!'; // handled below (not used in content)
        else out += t.v;
        break;
      case 'lp': out += '('; break;
      case 'rp': out += ')'; break;
      case 'comma': out += ', '; break;
      case 'fn': {
        if (t.v === 'solve') {
          // solve(expr, VAR, guess) -> solve(lambda x: expr[VAR->x], guess)
          let depth = 0;
          let j = i + 1;
          const exprToks: typeof toks = [];
          for (; j < toks.length; j++) {
            const k = toks[j];
            if (k.t === 'lp' || k.t === 'fn') depth++;
            if (k.t === 'rp') { if (depth === 0) break; depth--; }
            if (k.t === 'comma' && depth === 0) break;
            exprToks.push(k);
          }
          const varTok = toks[j + 1];
          if (varTok?.t !== 'var') throw new Error(`Bad solve( in ${expr}`);
          const inner = toPython(rebuild(exprToks), mode, { ...bind, [varTok.v]: 'x' });
          // guess: tokens after second comma until matching rp
          let g = j + 3;
          const guessToks: typeof toks = [];
          depth = 0;
          for (; g < toks.length; g++) {
            const k = toks[g];
            if (k.t === 'lp' || k.t === 'fn') depth++;
            if (k.t === 'rp') { if (depth === 0) break; depth--; }
            guessToks.push(k);
          }
          const guess = toPython(rebuild(guessToks), mode, bind);
          out += `solve(lambda x: ${inner}, ${guess})`;
          i = g + 1;
          continue;
        }
        if (TRIG[t.v]) out += (mode === 'deg' ? TRIG[t.v][0] : TRIG[t.v][1]) + '(';
        else if (FN_MAP[t.v]) out += FN_MAP[t.v] + '(';
        else throw new Error(`No Python translation for ${t.v}( in ${expr}`);
        break;
      }
    }
    i++;
  }
  return out;
}

function rebuild(toks: ReturnType<typeof lex>): string {
  return toks.map((t) => {
    switch (t.t) {
      case 'num': return String(t.v);
      case 'var': return t.v;
      case 'op': return t.v === 'nCr' ? ' nCr ' : t.v === 'nPr' ? ' nPr ' : t.v;
      case 'fn': return t.v + '(';
      case 'lp': return '(';
      case 'rp': return ')';
      case 'comma': return ',';
    }
  }).join('');
}

/** Python helpers embedded in every generated program (MicroPython-compatible, no f-strings). */
const PRELUDE = `import math

def fmt(x):
    try:
        if x == int(x) and abs(x) < 1e15:
            return str(int(x))
    except Exception:
        pass
    return "%.6g" % x

def ask(name):
    while True:
        s = input(name + " = ")
        try:
            return float(s)
        except Exception:
            pass
        try:
            return float(eval(s, {"pi": math.pi, "e": math.e, "sqrt": math.sqrt}))
        except Exception:
            print("Enter a number, e.g. 9.8 or 2*pi")

def menu(title, items):
    while True:
        print("")
        print("== " + title + " ==")
        for i in range(len(items)):
            print(str(i + 1) + ") " + items[i])
        print("0) Back")
        s = input("> ").strip()
        if s == "0" or s == "":
            return -1
        try:
            k = int(s)
        except Exception:
            k = 0
        if 1 <= k <= len(items):
            return k - 1

def pow10(x):
    return 10.0 ** x
def sind(x):
    return math.sin(math.radians(x))
def cosd(x):
    return math.cos(math.radians(x))
def tand(x):
    return math.tan(math.radians(x))
def asind(x):
    return math.degrees(math.asin(x))
def acosd(x):
    return math.degrees(math.acos(x))
def atand(x):
    return math.degrees(math.atan(x))

def solve(f, guess):
    x = guess
    for i in range(100):
        fx = f(x)
        if abs(fx) < 1e-12:
            return x
        h = max(1e-6, abs(x) * 1e-6)
        d = (f(x + h) - f(x - h)) / (2 * h)
        if d == 0:
            break
        nx = x - fx / d
        if abs(nx - x) < 1e-12:
            return nx
        x = nx
    return x

def ncr(n, k):
    n = int(round(n)); k = int(round(k))
    if k < 0 or k > n:
        return 0
    r = 1
    for i in range(k):
        r = r * (n - i) // (i + 1)
    return r
def npr(n, k):
    n = int(round(n)); k = int(round(k))
    r = 1
    for i in range(k):
        r = r * (n - i)
    return r

def erf(x):
    # Abramowitz-Stegun 7.1.26, max error 1.5e-7
    s = 1 if x >= 0 else -1
    x = abs(x)
    t = 1.0 / (1.0 + 0.3275911 * x)
    y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * math.exp(-x * x)
    return s * y
def phi(z):
    return 0.5 * (1.0 + erf(z / math.sqrt(2.0)))
def normalcdf(lo, hi, mu=0.0, sigma=1.0):
    return phi((hi - mu) / sigma) - phi((lo - mu) / sigma)
def invNorm(p, mu=0.0, sigma=1.0):
    if p <= 0 or p >= 1:
        raise ValueError("area must be between 0 and 1")
    lo, hi = -40.0, 40.0
    for i in range(200):
        mid = (lo + hi) / 2
        if phi(mid) < p:
            lo = mid
        else:
            hi = mid
    return mu + sigma * (lo + hi) / 2
def binompdf(n, p, k):
    return ncr(n, k) * p ** k * (1 - p) ** (n - k)
def binomcdf(n, p, k):
    t = 0.0
    for i in range(int(round(k)) + 1):
        t += binompdf(n, p, i)
    return t
def geometpdf(p, k):
    return (1 - p) ** (k - 1) * p
def geometcdf(p, k):
    return 1 - (1 - p) ** k

def _gammaln(x):
    c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
    y = x
    tmp = x + 5.5
    tmp -= (x + 0.5) * math.log(tmp)
    ser = 1.000000000190015
    for j in range(6):
        y += 1
        ser += c[j] / y
    return -tmp + math.log(2.5066282746310005 * ser / x)
def _betacf(a, b, x):
    qab = a + b; qap = a + 1; qam = a - 1
    c = 1.0; d = 1 - qab * x / qap
    if abs(d) < 1e-30: d = 1e-30
    d = 1 / d; h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        if abs(d) < 1e-30: d = 1e-30
        c = 1 + aa / c
        if abs(c) < 1e-30: c = 1e-30
        d = 1 / d; h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        if abs(d) < 1e-30: d = 1e-30
        c = 1 + aa / c
        if abs(c) < 1e-30: c = 1e-30
        d = 1 / d
        de = d * c
        h *= de
        if abs(de - 1) < 3e-12: break
    return h
def _betai(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    bt = math.exp(_gammaln(a + b) - _gammaln(a) - _gammaln(b) + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return bt * _betacf(a, b, x) / a
    return 1 - bt * _betacf(b, a, 1 - x) / b
def tcdf(lo, hi, df):
    def F(t):
        x = df / (df + t * t)
        p = 0.5 * _betai(df / 2.0, 0.5, x)
        return 1 - p if t > 0 else p
    return F(hi) - F(lo)
def invT(area, df):
    lo, hi = -200.0, 200.0
    for i in range(200):
        mid = (lo + hi) / 2
        if tcdf(-1e99, mid, df) < area:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
def _gammp(a, x):
    if x <= 0: return 0.0
    if x < a + 1:
        ap = a; s = 1.0 / a; de = s
        for n in range(500):
            ap += 1; de *= x / ap; s += de
            if abs(de) < abs(s) * 3e-12: break
        return s * math.exp(-x + a * math.log(x) - _gammaln(a))
    b = x + 1 - a; c = 1e30; d = 1 / b; h = d
    for i in range(1, 500):
        an = -i * (i - a); b += 2
        d = an * d + b
        if abs(d) < 1e-30: d = 1e-30
        c = b + an / c
        if abs(c) < 1e-30: c = 1e-30
        d = 1 / d; de = d * c; h *= de
        if abs(de - 1) < 3e-12: break
    return 1 - math.exp(-x + a * math.log(x) - _gammaln(a)) * h
def chi2cdf(lo, hi, df):
    return _gammp(df / 2.0, hi / 2.0) - _gammp(df / 2.0, lo / 2.0)

def evalf(expr, X):
    e = expr.replace("^", "**")
    return float(eval(e, {"X": X, "x": X, "pi": math.pi, "e": math.e, "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos, "tan": math.tan, "ln": math.log, "log": math.log10, "abs": abs}))

def pages(lines):
    n = 0
    for ln in lines:
        print(ln)
        n += 1
        if n % 8 == 0:
            input("-- more --")
    input("Enter to go back")
`;

function pyStr(s: string): string {
  return JSON.stringify(s);
}

/** Translate a TI-BASIC code block (the subset used by content) into Python statements. */
function translateCode(lines: string[], eq: Equation): string[] {
  const out: string[] = [];
  let indent = 0;
  const pad = () => '    '.repeat(indent);
  const bind: Record<string, string> = {};
  const mode = eq.mode;
  const stmt = (line: string): string => {
    let m: RegExpExecArray | null;
    if ((m = /^Input "([^"]*)",Str(\d)$/.exec(line))) return `Str${m[2]} = input(${pyStr(m[1] + ' ')})`;
    if ((m = /^String>Equ\(Str(\d),\{Y1\}\)$/.exec(line))) return `Y1 = (lambda s: (lambda X: evalf(s, X)))(Str${m[1]})`;
    if ((m = /^Disp "([^"]*)"$/.exec(line))) return `print(${pyStr(m[1])})`;
    if (line === 'Pause ') return 'input("Enter to continue")';
    if ((m = /^(.*)->([A-Z])$/.exec(line))) return `v['${m[2]}'] = ${exprPy(m[1])}`;
    throw new Error(`${eq.id}: cannot translate code line: ${line}`);
  };
  const exprPy = (e: string): string => {
    // Function-variable forms ({Y1}(A), solve({Y1},X,G)) are rewritten by hand: the expressions that
    // use them in our content are otherwise plain arithmetic on single-letter variables.
    if (/\{Y1\}/.test(e)) {
      let s = e.replace(/\{Y1\}\(([A-Z])\)/g, (_all, a) => `Y1(v['${a}'])`);
      s = s.replace(/solve\(\{Y1\},X,([A-Z])\)/g, (_all, g) => `solve(Y1, v['${g}'])`);
      s = s.replace(/(?<![A-Za-z'])([A-Z])(?![A-Za-z0-9'])/g, (m) => `v['${m}']`);
      return s.replace(/\^\^2/g, '**2').replace(/\^/g, '**').replace(/~/g, '-');
    }
    return toPython(e, mode, bind);
  };
  const cond = (c: string): string => toPython(c.replace(/!=/g, '!=').replace(/>=/g, '>=').replace(/<=/g, '<=').replace(/([^<>!])=/g, '$1=='), mode, bind)
    .replace(/(?<![<>!=])==(?!=)/g, '==');
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line === 'Then') continue;
    if (line === 'Else') { indent--; out.push(pad() + 'else:'); indent++; continue; }
    if (line === 'End') { indent--; continue; }
    const ifBlock = /^If (.*)$/.exec(line);
    if (ifBlock && lines[idx + 1] === 'Then') {
      out.push(pad() + `if ${condPy(ifBlock[1], mode, bind)}:`);
      indent++;
      continue;
    }
    const ifLine = /^If ([^:]*):(.*)$/.exec(line);
    if (ifLine) { out.push(pad() + `if ${condPy(ifLine[1], mode, bind)}: ${stmt(ifLine[2])}`); continue; }
    out.push(pad() + stmt(line));
  }
  void cond;
  return out;
}

/** TI comparison/boolean expression to Python. */
function condPy(c: string, mode: 'deg' | 'rad' | undefined, bind: Record<string, string>): string {
  // split on comparison operators, translate operands separately
  const parts = c.split(/(>=|<=|!=|=|>|<| and | or )/);
  return parts.map((p, i) => {
    if (i % 2 === 1) return p === '=' ? ' == ' : p === ' and ' ? ' and ' : p === ' or ' ? ' or ' : ` ${p} `;
    return p.trim() === '' ? '' : toPython(p.trim(), mode, bind);
  }).join('');
}

export function generatePython(subject: Subject): PythonProgram {
  const L: string[] = [];
  L.push(`# ${subject.title} - calc_OS (https://zackytzu.github.io/calc_OS/)`);
  L.push('# Text-menu solver for TI-Nspire CX II Python. Type the number of a choice and press enter.');
  L.push(PRELUDE);
  const consts = subject.constants ?? [];
  L.push(`CONST = {${consts.map((c) => `'${c.sym}': ${c.value}`).join(', ')}}`);
  L.push('');

  // Equation table: one Python function per equation to keep the data simple.
  const eqFns: string[] = [];
  subject.topics.forEach((topic, ti) => {
    topic.equations.forEach((eq, ei) => {
      const fn = `eq_${ti}_${ei}`;
      eqFns.push(fn);
      const names = Object.fromEntries(eq.vars.map((v) => [v.sym, v.name]));
      L.push(`def ${fn}():`);
      L.push(`    # ${eq.display}`);
      L.push(`    names = ${pyDict(names)}`);
      L.push(`    while True:`);
      L.push(`        c = menu(${pyStr(eq.menu)}, ["Solve", "Notes"])`);
      L.push(`        if c < 0: return`);
      L.push(`        if c == 1:`);
      L.push(`            pages(${pyList([eq.display, ...eq.notes])})`);
      L.push(`            continue`);
      L.push(`        print(${pyStr(eq.display)})`);
      if (eq.compute) {
        const c = eq.compute;
        L.push(`        v = dict(CONST)`);
        for (const sym of c.inputs) L.push(`        v['${sym}'] = ask(${pyStr(names[sym])})`);
        L.push(`        try:`);
        if (c.py) {
          for (const ln of c.py) L.push(`            ${ln}`);
        } else if (c.code) {
          for (const ln of translateCode(c.code, eq)) L.push(`            ${ln}`);
        } else {
          for (const o of c.outputs) L.push(`            v['${o.sym}'] = ${toPython(o.expr, eq.mode)}`);
        }
        for (const o of c.outputs) L.push(`            print(${pyStr(o.name)} + " = " + fmt(v['${o.sym}']))`);
        L.push(`        except Exception as e:`);
        L.push(`            print("Cannot compute: " + str(e))`);
        L.push(`        input("Enter to continue")`);
      } else {
        const keys = Object.keys(eq.solve!);
        L.push(`        keys = ${pyList(keys)}`);
        L.push(`        k = menu("SOLVE FOR", [names[s] for s in keys])`);
        L.push(`        if k < 0: continue`);
        L.push(`        target = keys[k]`);
        L.push(`        uses = ${pyDict(Object.fromEntries(keys.map((k) => [k, variablesIn(eq.solve![k]).filter((x) => x !== k)])))}`);
        L.push(`        v = dict(CONST)`);
        L.push(`        for sym in ${pyList(eq.vars.map((x) => x.sym))}:`);
        L.push(`            if sym != target and sym in uses[target] and sym not in CONST:`);
        L.push(`                v[sym] = ask(names[sym])`);
        L.push(`        try:`);
        keys.forEach((k, i) => {
          L.push(`            ${i === 0 ? 'if' : 'elif'} target == '${k}': r = ${toPython(eq.solve![k], eq.mode)}`);
        });
        L.push(`            print(names[target] + " = " + fmt(r))`);
        L.push(`        except Exception as e:`);
        L.push(`            print("Cannot compute: " + str(e))`);
        L.push(`        input("Enter to continue")`);
      }
      L.push('');
    });
  });

  // Topics
  subject.topics.forEach((topic, ti) => {
    L.push(`def topic_${ti}():`);
    const items = topic.equations.map((e) => e.menu);
    if (topic.notes?.length) items.push('Notes');
    L.push(`    while True:`);
    L.push(`        c = menu(${pyStr(topic.menu.toUpperCase())}, ${pyList(items)})`);
    L.push(`        if c < 0: return`);
    topic.equations.forEach((_eq, ei) => {
      L.push(`        ${ei === 0 ? 'if' : 'elif'} c == ${ei}: eq_${ti}_${ei}()`);
    });
    if (topic.notes?.length) {
      L.push(`        ${topic.equations.length === 0 ? 'if' : 'elif'} c == ${topic.equations.length}: pages(${pyList(topic.notes)})`);
    }
    L.push('');
  });

  // Main
  L.push('def main():');
  L.push(`    print(${pyStr(subject.title)})`);
  for (const line of subject.intro ?? []) L.push(`    print(${pyStr(line)})`);
  L.push('    while True:');
  const mainItems = subject.topics.map((t) => t.menu);
  if (consts.length) mainItems.push('Settings');
  L.push(`        c = menu(${pyStr(subject.title)}, ${pyList(mainItems)})`);
  L.push('        if c < 0:');
  L.push('            print("Bye")');
  L.push('            return');
  subject.topics.forEach((_t, ti) => L.push(`        ${ti === 0 ? 'if' : 'elif'} c == ${ti}: topic_${ti}()`));
  if (consts.length) {
    L.push(`        elif c == ${subject.topics.length}:`);
    for (const c of consts) L.push(`            CONST['${c.sym}'] = ask(${pyStr(c.name)})`);
  }
  L.push('');
  L.push('main()');
  return { filename: `${subject.program}.py`, source: L.join('\n') + '\n' };
}

function pyList(items: string[]): string {
  return '[' + items.map(pyStr).join(', ') + ']';
}
function pyDict(obj: Record<string, string | string[]>): string {
  return '{' + Object.entries(obj).map(([k, v]) => `'${k}': ${Array.isArray(v) ? pyList(v) : pyStr(v)}`).join(', ') + '}';
}
