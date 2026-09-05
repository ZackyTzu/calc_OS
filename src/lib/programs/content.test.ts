import { describe, expect, it } from 'vitest';
import { subjects, generateAcademic, lint } from './index';
import { evaluate, variablesIn } from './tiexpr';
import { tokenize } from '../tibasic/tokenizer';
import { buildFile, programEntry, parseFile } from '../tifiles/tifile';
import type { Equation } from './types';

const CONSTS = { G: 9.8 };

function randomValue(name: string, rng: () => number): number {
  if (/deg/.test(name)) return 10 + rng() * 60;          // angles 10..70 degrees
  if (/^mu/.test(name)) return 0.05 + rng() * 0.5;       // friction coefficients
  if (/shape/.test(name)) return 0.2 + rng() * 0.8;      // inertia shape factor
  return 0.5 + rng() * 4;                                // everything else 0.5..4.5
}

/** Deterministic PRNG so failures are reproducible. */
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkEquation(eq: Equation): string[] {
  const problems: string[] = [];
  const rng = mulberry(42);
  const names = Object.fromEntries(eq.vars.map((v) => [v.sym, v.name]));
  const opts = { mode: eq.mode };
  if (eq.compute) {
    let ok = false;
    for (let trial = 0; trial < 30 && !ok; trial++) {
      const vars: Record<string, number> = { ...CONSTS };
      for (const i of eq.compute.inputs) vars[i] = randomValue(names[i], rng);
      try {
        for (const o of eq.compute.outputs) vars[o.sym] = evaluate(o.expr, vars, opts);
        ok = eq.compute.outputs.every((o) => isFinite(vars[o.sym]));
      } catch (e) { problems.push(`${eq.id}: ${(e as Error).message}`); return problems; }
    }
    if (!ok) problems.push(`${eq.id}: compute outputs are not finite`);
    return problems;
  }
  const solvable = Object.keys(eq.solve!);
  for (const S of solvable) {
    const exprS = eq.solve![S];
    for (const R of solvable) {
      if (R === S) continue;
      if (!variablesIn(exprS).includes(R)) continue; // R does not feed S
      let passed = false;
      let lastErr = '';
      for (let trial = 0; trial < 60 && !passed; trial++) {
        const vars: Record<string, number> = { ...CONSTS };
        for (const v of eq.vars) vars[v.sym] = randomValue(v.name, rng);
        try {
          // Make the drawn values physically consistent first: recompute one variable (not S,
          // preferably not R) from its own formula so the set satisfies the equation.
          const seeds = solvable.filter((x) => x !== S).sort((a, b) => Number(a === R) - Number(b === R));
          let seeded = false;
          for (const X of seeds) {
            const x0 = evaluate(eq.solve![X], vars, opts);
            if (isFinite(x0)) { vars[X] = x0; seeded = true; break; }
          }
          if (!seeded) { lastErr = 'could not draw consistent inputs'; continue; }
          const s = evaluate(exprS, vars, opts);               // S from the others
          if (!isFinite(s)) { lastErr = 'S not finite'; continue; }
          const withS = { ...vars, [S]: s };
          const r2 = evaluate(eq.solve![R], withS, opts);      // recover R from S and the rest
          if (!isFinite(r2)) { lastErr = 'R not finite'; continue; }
          const sBack = evaluate(exprS, { ...withS, [R]: r2 }, opts); // forward check
          const tol = 1e-6 * Math.max(1, Math.abs(s));
          if (Math.abs(sBack - s) <= tol) passed = true;
          else lastErr = `S=${s} but recomputed ${sBack} after solving ${R}=${r2} (orig ${vars[R]})`;
        } catch (e) { lastErr = (e as Error).message; }
      }
      if (!passed) problems.push(`${eq.id}: solve[${S}] and solve[${R}] are inconsistent: ${lastErr}`);
    }
  }
  return problems;
}

describe.each(subjects.map((s) => [s.program, s] as const))('%s content', (_name, subject) => {
  it('has consistent formulas (every rearrangement agrees with the others)', () => {
    const problems: string[] = [];
    for (const t of subject.topics) for (const e of t.equations) problems.push(...checkEquation(e));
    expect(problems).toEqual([]);
  });

  it('respects calculator text limits', () => {
    for (const t of subject.topics) {
      expect(t.menu.length, t.menu).toBeLessThanOrEqual(14);
      for (const e of t.equations) {
        expect(e.menu.length, e.menu).toBeLessThanOrEqual(14);
        expect(e.display.length, e.display).toBeLessThanOrEqual(26);
        for (const v of e.vars) expect(v.name.length + 1, v.name).toBeLessThanOrEqual(16);
        for (const o of e.compute?.outputs ?? []) expect(o.name.length + 1, o.name).toBeLessThanOrEqual(16);
      }
    }
  });

  it('generates lint-clean TI-BASIC that tokenizes and fits in a program file', () => {
    const prog = generateAcademic(subject);
    const issues = lint(prog.source);
    expect(issues.map((i) => `${i.line}: ${i.message} :: ${i.text}`)).toEqual([]);
    const tokens = tokenize(prog.source);
    expect(tokens.length).toBeLessThan(60000);
    const file = buildFile([programEntry(prog.name, tokens, { archived: true })]);
    const parsed = parseFile(file);
    expect(parsed.entries[0].name).toBe(subject.program);
    expect(parsed.checksumOk).toBe(true);
  });
});
