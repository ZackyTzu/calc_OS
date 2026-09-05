import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mathbotPython } from './mathbot-py';

const hasPython = spawnSync('python3', ['--version']).status === 0;

function ask(questions: string[]): string {
  const r = spawnSync('python3', ['-c', mathbotPython.source], { input: questions.join('\n') + '\nquit\n', encoding: 'utf8', timeout: 60000 });
  if (r.stderr) throw new Error(r.stderr);
  return r.stdout;
}

describe('Nspire MathBot (Python)', () => {
  it('compiles and avoids MicroPython-unfriendly features', () => {
    expect(mathbotPython.source).not.toMatch(/\bimport re\b|math\.gcd|math\.comb|fractions|statistics|:=/);
    if (!hasPython) return;
    const r = spawnSync('python3', ['-c', 'import ast,sys; t=ast.parse(sys.stdin.read()); print(any(isinstance(n, ast.JoinedStr) for n in ast.walk(t)))'], { input: mathbotPython.source, encoding: 'utf8' });
    expect(r.stdout.trim()).toBe('False');
  });

  it('answers the documented question types', () => {
    if (!hasPython) return;
    const out = ask([
      'solve 3x-7=11', 'solve x^2-5x+6=0', 'quadratic 1,-5,6', 'factor 360', 'is 97 prime', 'gcd 12, 18', 'sqrt 72',
      'mean 4, 8, 15', 'slope (1,2) (4,8)', '12% of 80', '% change 50 to 65', 'derivative of x^2 at 3',
      'integral of x^2 from 0 to 2', '2+3*4', '3x+2 when x=4', 'simplify 6/8', '0.375 as a fraction', 'circle r=3',
      'solve x^3-x=0', 'help', 'hello there',
    ]);
    expect(out).toContain('x = 6');
    expect(out).toContain('x1 = 3');
    expect(out).toContain('x2 = 2');
    expect(out).toContain('360 = 2^3 * 3^2 * 5');
    expect(out).toContain('97 is prime');
    expect(out).toContain('gcd = 6');
    expect(out).toContain('lcm = 36');
    expect(out).toContain('sqrt(72) = 6 sqrt(2)');
    expect(out).toContain('mean = 9');
    expect(out).toContain('median = 8');
    expect(out).toContain('slope = (y2-y1)/(x2-x1) = 2');
    expect(out).toContain('12% of 80 = 9.6');
    expect(out).toContain('= 30%');
    expect(out).toContain("f'(3) = 6");
    expect(out).toContain('= 2.66667');
    expect(out).toContain('= 14');
    expect(out).toContain('3x+2 at x = 4: 14');
    expect(out).toContain('6/8 = 3/4');
    expect(out).toContain('0.375 = 3/8');
    expect(out).toContain('area = pi r^2 = 28.2743');
    expect(out).toMatch(/x = -1\s[\s\S]*x = 0\s[\s\S]*x = 1/);
    expect(out).toContain('Ask me things like');
    expect(out).toContain('I could not work that out');
    expect(out).toContain('Bye');
  });
});
