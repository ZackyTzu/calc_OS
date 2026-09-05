// Generates the Nspire Python programs and actually runs them with CPython, driving the text menus
// through stdin. Exercises every formula path once. Requires python3 on the PATH (CI has it).
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { generatePython } from './python-gen';
import { subjects } from '../programs';

function run(source: string, stdin: string): { out: string; err: string; status: number | null } {
  const r = spawnSync('python3', ['-c', source], { input: stdin, encoding: 'utf8', timeout: 60000 });
  return { out: r.stdout ?? '', err: r.stderr ?? '', status: r.status };
}

const hasPython = spawnSync('python3', ['--version']).status === 0;

describe.each(subjects.map((s) => [s.program, s] as const))('%s Nspire Python', (_name, subject) => {
  const prog = generatePython(subject);

  it('compiles', () => {
    if (!hasPython) return;
    const r = spawnSync('python3', ['-c', 'import sys; compile(sys.stdin.read(), "prog.py", "exec")'], { input: prog.source, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('avoids features MicroPython lacks', () => {
    expect(prog.source).not.toMatch(/math\.comb\(|math\.erf\(|import statistics|:=|^\s*match /m);
    if (!hasPython) return;
    // f-strings: ask Python's own parser rather than guessing with a regex
    const r = spawnSync('python3', ['-c', 'import ast,sys; t=ast.parse(sys.stdin.read()); print(any(isinstance(n, ast.JoinedStr) for n in ast.walk(t)))'], { input: prog.source, encoding: 'utf8' });
    expect(r.stdout.trim()).toBe('False');
  });

  it('runs every formula once without crashing', () => {
    if (!hasPython) return;
    // Build one stdin script: main menu -> each topic -> each equation -> Solve -> first unknown -> inputs...
    const lines: string[] = [];
    subject.topics.forEach((topic, ti) => {
      topic.equations.forEach((eq, ei) => {
        lines.push(String(ti + 1)); // topic
        lines.push(String(ei + 1)); // equation
        lines.push('1');            // Solve
        if (eq.compute) {
          for (const sym of eq.compute.inputs) lines.push(sampleInput(eq.vars.find((v) => v.sym === sym)!.name));
          if (eq.compute.py) {
            for (const l of eq.compute.py) if (/input\(/.test(l)) lines.push('1,2,3');
          } else if (eq.compute.code) {
            // code blocks may ask for f(x) text
            if (eq.compute.code.some((l) => /Input "f\(x\)="/.test(l))) lines.push('X^2-4');
          }
        } else {
          lines.push('1');          // first solvable variable
          const target = Object.keys(eq.solve!)[0];
          for (const v of eq.vars) if (v.sym !== target && eq.solve![target].includes(v.sym)) lines.push(sampleInput(v.name));
        }
        lines.push('');             // Enter to continue
        lines.push('0');            // back from equation menu
        lines.push('0');            // back from topic menu
      });
      if (topic.notes?.length) {
        lines.push(String(ti + 1), String(topic.equations.length + 1));
        for (let i = 0; i < 8; i++) lines.push(''); // page through
        lines.push('0');
      }
    });
    lines.push('0'); // quit
    const r = run(prog.source, lines.join('\n') + '\n');
    expect(r.err, r.err.slice(-2000)).toBe('');
    expect(r.status).toBe(0);
    expect(r.out).toContain('Bye');
    // A crash inside a formula is reported, not raised; make sure none happened.
    expect(r.out).not.toMatch(/Cannot compute: (name|invalid syntax|unsupported)/);
  });
});

describe('PHYSICS1 Nspire Python results', () => {
  it('computes v = v0 + a t correctly', () => {
    if (!hasPython) return;
    const prog = generatePython(subjects[0]);
    // Kinematics -> v=v0+at -> Solve -> v -> v0=2, a=3, t=4 -> 14
    const r = run(prog.source, ['1', '1', '1', '1', '2', '3', '4', '', '0', '0', '0'].join('\n') + '\n');
    expect(r.out).toContain('v (m/s) = 14');
  });
});

function sampleInput(name: string): string {
  if (/deg/.test(name)) return '30';
  if (/^(p|q)( hat)?( ?[0-9])?$|^p0$|p guess|probab|area|confidence|^r$/.test(name)) return '0.5';
  if (/successes/.test(name)) return '2';
  if (/^(n|k|df)\b/.test(name)) return '10';
  if (/^mu/.test(name)) return '0.3';
  return '2';
}
